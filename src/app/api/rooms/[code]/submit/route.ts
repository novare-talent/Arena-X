import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { runAllTestCases, LANGUAGE_IDS } from "@/lib/judge0";

// POST /api/rooms/[code]/submit
// Body: { problem_id, language, code }
// Blocks on Judge0 (submit + poll); raise ceiling above default to avoid 504s.
export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: { code: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const code = params.code.toUpperCase();
  const { problem_id, language, code: sourceCode } = await req.json();

  const { data: room } = await supabase
    .from("rooms")
    .select("id, status, mode, settings, started_at")
    .eq("code", code)
    .maybeSingle();

  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (room.status !== "active") return NextResponse.json({ error: "Room is not active" }, { status: 409 });

  // Verify participant is active
  const { data: participant } = await supabase
    .from("room_participants")
    .select("status")
    .eq("room_id", room.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!participant || participant.status !== "active") {
    return NextResponse.json({ error: "Not an active participant" }, { status: 403 });
  }

  // Fetch problem test cases
  const { data: problem } = await supabase
    .from("problems")
    .select("id, test_cases, difficulty")
    .eq("id", problem_id)
    .maybeSingle();

  if (!problem) return NextResponse.json({ error: "Problem not found" }, { status: 404 });

  // Fetch room problems once — reused in blitz and sudden_death branches below
  const { data: roomProblems } = await supabase
    .from("room_problems")
    .select("order_index, problem_id")
    .eq("room_id", room.id)
    .order("order_index");

  const languageId = LANGUAGE_IDS[language];
  if (!languageId) return NextResponse.json({ error: "Unsupported language" }, { status: 400 });

  // Run test cases
  let results: Awaited<ReturnType<typeof runAllTestCases>>;
  try {
    results = await runAllTestCases(sourceCode, languageId, problem.test_cases as { stdin: string; expected_stdout: string }[]);
  } catch {
    return NextResponse.json({ error: "Code execution service unavailable" }, { status: 503 });
  }

  // Use `passed` (status==Accepted OR trimmed-output match) so rooms scores
  // identically to duels — a correct-but-trailing-whitespace answer counts.
  const passed = results.filter(r => r.passed).length;
  const total  = results.length;
  const allAc  = passed === total;
  const verdict = allAc ? "accepted" : results.some(r => r.verdict === "Time Limit Exceeded") ? "tle" : "wrong_answer";

  // Score: difficulty weight × (passed/total) × 100
  const difficultyWeight = [0, 100, 200, 300, 400, 500][problem.difficulty] ?? 100;
  const score = allAc ? difficultyWeight : Math.floor((passed / total) * difficultyWeight * 0.5);

  const solveTimeMs = room.started_at
    ? Date.now() - new Date(room.started_at).getTime()
    : null;

  // Save submission
  await supabase.from("room_submissions").insert({
    room_id: room.id,
    user_id: user.id,
    problem_id,
    language,
    code: sourceCode,
    verdict,
    score,
    passed_cases: passed,
    total_cases: total,
    solve_time_ms: solveTimeMs,
  });

  if (allAc) {
    // Update participant score — add this problem's score
    // Get all accepted problems' scores for this user to recalculate total
    const { data: mySubmissions } = await supabase
      .from("room_submissions")
      .select("problem_id, score")
      .eq("room_id", room.id)
      .eq("user_id", user.id)
      .eq("verdict", "accepted");

    // Deduplicate by problem_id (keep highest score per problem)
    const bestPerProblem = new Map<string, number>();
    for (const s of mySubmissions ?? []) {
      const cur = bestPerProblem.get(s.problem_id) ?? 0;
      if (s.score > cur) bestPerProblem.set(s.problem_id, s.score);
    }
    const totalScore = Array.from(bestPerProblem.values()).reduce((a, b) => a + b, 0);

    await supabase
      .from("room_participants")
      .update({ score: totalScore })
      .eq("room_id", room.id)
      .eq("user_id", user.id);

    // Blitz mode: check if this unlocks the next problem
    if (room.mode === "blitz") {
      const solvedIndices = new Set(
        (mySubmissions ?? []).map(s => s.problem_id)
      );
      solvedIndices.add(problem_id);

      const nextProblem = (roomProblems ?? []).find(
        rp => !solvedIndices.has(rp.problem_id)
      );

      // Check if all problems solved (finished)
      const allSolved = (roomProblems ?? []).every(rp => solvedIndices.has(rp.problem_id));
      if (allSolved) {
        await supabase
          .from("room_participants")
          .update({ status: "finished", finished_at: new Date().toISOString() })
          .eq("room_id", room.id)
          .eq("user_id", user.id);
      }

      return NextResponse.json({
        verdict, passed, total, score, results,
        next_problem_id: nextProblem?.problem_id ?? null,
        finished: allSolved,
      });
    }

    // Sudden Death mode: wrong answer = eliminated
    if (room.mode === "sudden_death") {
      const solved = new Set((mySubmissions ?? []).map(s => s.problem_id));
      solved.add(problem_id);
      const allDone = (roomProblems ?? []).every(rp => solved.has(rp.problem_id));
      if (allDone) {
        await supabase
          .from("room_participants")
          .update({ status: "finished", finished_at: new Date().toISOString() })
          .eq("room_id", room.id)
          .eq("user_id", user.id);
      }
    }
  } else if (room.mode === "sudden_death") {
    // Wrong answer in sudden death — eliminate
    await supabase
      .from("room_participants")
      .update({ status: "eliminated" })
      .eq("room_id", room.id)
      .eq("user_id", user.id);
  }

  return NextResponse.json({ verdict, passed, total, score, results });
}