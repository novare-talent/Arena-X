import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { runAllTestCases, calcScore, calcEloDelta, LANGUAGE_IDS } from "@/lib/judge0";
import { rateLimit } from "@/lib/rateLimit";
import { buildSubmission, HarnessUnsupportedError } from "@/lib/harness";

// Service client bypasses RLS for match/rating updates
function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Blocks on Judge0 (submit + poll); raise ceiling above default to avoid 504s.
export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Protect the single Judge0 VM from submission floods (fail-open).
  if (!(await rateLimit(`arena_submit:${user.id}`, 30, 60))) {
    return NextResponse.json({ error: "Too many submissions — slow down a moment." }, { status: 429 });
  }

  const { match_id, language, source_code } = await request.json();
  if (!match_id || !language || !source_code) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const languageId = LANGUAGE_IDS[language];
  if (!languageId) {
    return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
  }

  const service = getServiceClient();

  // Fetch match + problem
  const { data: match, error: matchErr } = await service
    .from("matches")
    .select("*, problems(*)")
    .eq("id", match_id)
    .single();

  if (matchErr || !match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }
  if (match.status !== "in_progress") {
    return NextResponse.json({ error: "Match already ended" }, { status: 400 });
  }

  const isP1 = match.player_one_id === user.id;
  const isP2 = match.player_two_id === user.id;
  if (!isP1 && !isP2) {
    return NextResponse.json({ error: "Not a player in this match" }, { status: 403 });
  }

  const problem = match.problems;
  const testCases: Array<{ stdin: string; expected_stdout: string }> = problem.test_cases ?? [];

  // Compose the source (wraps the user's function with a driver in function mode)
  let finalSource: string;
  try {
    finalSource = buildSubmission(problem, language, source_code);
  } catch (err) {
    if (err instanceof HarnessUnsupportedError) {
      return NextResponse.json({ error: "This problem currently supports Python and JavaScript only." }, { status: 400 });
    }
    throw err;
  }

  // Run against all test cases
  let tcResults;
  try {
    tcResults = await runAllTestCases(finalSource, languageId, testCases, problem.time_limit_ms);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const isConnRefused = msg.includes("ECONNREFUSED") || msg.includes("fetch failed");
    return NextResponse.json(
      { error: isConnRefused ? "Judge0 is not reachable. Add JUDGE0_API_URL to .env.local once your instance is running." : msg },
      { status: 503 }
    );
  }

  const passed = tcResults.filter((r) => r.passed).length;
  const total  = tcResults.length;
  const allAC  = passed === total;

  // Record submission
  const verdict = allAC ? "AC" : passed > 0 ? "WA" : "WA";
  await service.from("submissions").insert({
    match_id,
    user_id:          user.id,
    problem_id:       problem.id,
    language,
    source_code,
    verdict,
    test_cases_passed: passed,
    total_test_cases:  total,
  });

  // Calculate elapsed time since match started
  const startedAt  = new Date(match.started_at).getTime();
  const elapsedMs  = Date.now() - startedAt;
  const totalMs    = (match.problems.match_duration_minutes ?? 30) * 60 * 1000;
  const score      = calcScore(passed, total, elapsedMs, totalMs);

  // Update this player's score on match
  const scoreField = isP1 ? "player_one_score" : "player_two_score";
  const solveField = isP1 ? "player_one_solve_time_ms" : "player_two_solve_time_ms";

  const { data: updated } = await service
    .from("matches")
    .update({ [scoreField]: score, [solveField]: elapsedMs })
    .eq("id", match_id)
    .select("*")
    .single();

  // Determine if match should end now
  let matchEnded = false;
  let winnerId: string | null = null;
  let endReason: string | null = null;

  if (allAC) {
    // This player got full AC — they win immediately
    winnerId  = user.id;
    endReason = "ac";
    matchEnded = true;
  } else {
    // Check if opponent also submitted (both submitted, compare scores)
    const opponentScore = isP1 ? updated?.player_two_score : updated?.player_one_score;
    if (opponentScore !== null && opponentScore !== undefined) {
      matchEnded = true;
      endReason  = "timeout";
      const myScore = score;
      if (myScore > opponentScore) {
        winnerId = user.id;
      } else if (opponentScore > myScore) {
        winnerId = isP1 ? match.player_two_id : match.player_one_id;
      } else {
        winnerId = null; // draw
      }
    }
  }

  if (matchEnded) {
    await finalizeMatch(service, match_id, match, winnerId, endReason!);
  }

  // Reveal detailed I/O (expected/actual/stderr) only for the first few SAMPLE
  // cases — hidden cases return pass/fail + verdict only, so expected outputs
  // never reach the client (review #9 surfaces diagnostics without re-opening
  // the #15 answer-leak on hidden tests).
  const SAMPLE_CASES = 2;
  const clientResults = tcResults.map((r, i) =>
    i < SAMPLE_CASES ? r : {
      passed: r.passed, verdict: r.verdict, time_ms: r.time_ms, memory_kb: r.memory_kb,
      actual_output: null, expected_output: null, stderr: null, compile_output: null,
    }
  );

  return NextResponse.json({
    passed,
    total,
    all_ac:      allAC,
    score:       Math.round(score * 100) / 100,
    match_ended: matchEnded,
    winner_id:   winnerId,
    results:     clientResults,
  });
}

async function finalizeMatch(
  service: ReturnType<typeof getServiceClient>,
  matchId: string,
  match: Record<string, unknown>,
  winnerId: string | null,
  endReason: string
) {
  const p1Elo = match.player_one_elo_before as number;
  const p2Elo = match.player_two_elo_before as number;
  const p1Id  = match.player_one_id as string;
  const p2Id  = match.player_two_id as string;
  const track = match.track as string;

  let p1EloAfter = p1Elo;
  let p2EloAfter = p2Elo;
  let eloChange  = 0;

  if (winnerId) {
    const isP1Win  = winnerId === p1Id;
    const wElo     = isP1Win ? p1Elo : p2Elo;
    const lElo     = isP1Win ? p2Elo : p1Elo;
    const { winnerDelta, loserDelta } = calcEloDelta(wElo, lElo, "win");
    eloChange  = Math.abs(winnerDelta);
    p1EloAfter = isP1Win
      ? p1Elo + winnerDelta
      : Math.max(600, p1Elo + loserDelta);
    p2EloAfter = isP1Win
      ? Math.max(600, p2Elo + loserDelta)
      : p2Elo + winnerDelta;
  }

  // Guard: service key must be set
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[finalizeMatch] SUPABASE_SERVICE_ROLE_KEY is not set — ELO will not be updated");
    return;
  }

  // Atomically flip the match to completed — guarded on status still being
  // 'in_progress'. This is the concurrency gate (review #13): if two submits
  // (or a submit racing a resign/bot-finalize) reach here at once, only the
  // one that actually transitions the row proceeds to apply ELO. The loser of
  // the race updates 0 rows and bails, so ELO is never applied twice.
  const { data: flipped, error: matchUpdateErr } = await service.from("matches").update({
    status:               "completed",
    ended_at:             new Date().toISOString(),
    winner_id:            winnerId,
    end_reason:           endReason,
    player_one_elo_after: p1EloAfter,
    player_two_elo_after: p2EloAfter,
  }).eq("id", matchId).eq("status", "in_progress").select("id");
  if (matchUpdateErr) {
    console.error("[finalizeMatch] match update error:", matchUpdateErr);
    return;
  }
  if (!flipped || flipped.length === 0) {
    // Already finalized by a concurrent request — do not double-apply ELO.
    return;
  }

  // Update ELO + ratings via existing DB function
  if (winnerId) {
    const loserId = winnerId === p1Id ? p2Id : p1Id;
    const { error: rpcErr } = await service.rpc("update_elo_after_match", {
      p_winner_id:  winnerId,
      p_loser_id:   loserId,
      p_track:      track,
      p_elo_change: eloChange,
    });
    if (rpcErr) console.error("[finalizeMatch] update_elo_after_match error:", rpcErr);
  } else {
    // Draw — update matches_played and draws for both players in parallel
    await Promise.all([p1Id, p2Id].map(async (uid) => {
      const { data: r } = await service.from("user_ratings")
        .select("matches_played, draws").eq("user_id", uid).eq("track", track).single();
      if (r) {
        const { error: drawErr } = await service.from("user_ratings").update({
          matches_played: r.matches_played + 1,
          draws:          r.draws + 1,
        }).eq("user_id", uid).eq("track", track);
        if (drawErr) console.error("[finalizeMatch] draw update error:", drawErr);
      }
    }));
  }
}