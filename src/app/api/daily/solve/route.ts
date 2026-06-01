import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { runAllTestCases, LANGUAGE_IDS } from "@/lib/judge0";

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

  const { language, source_code } = await request.json();
  if (!language || !source_code) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const languageId = LANGUAGE_IDS[language];
  if (!languageId) return NextResponse.json({ error: "Unsupported language" }, { status: 400 });

  const today = new Date().toISOString().split("T")[0];

  // Get today's daily challenge for this user
  const { data: daily } = await supabase
    .from("daily_challenges")
    .select("*, problems(*)")
    .eq("user_id", user.id)
    .eq("date", today)
    .single();

  if (!daily) return NextResponse.json({ error: "No daily challenge found for today" }, { status: 404 });
  if (daily.solved) return NextResponse.json({ error: "Already solved today's challenge", already_solved: true }, { status: 400 });

  const problem = daily.problems as { id: string; test_cases: Array<{ stdin: string; expected_stdout: string }>; time_limit_ms: number };
  const testCases = problem.test_cases ?? [];
  let results;
  try {
    results = await runAllTestCases(source_code, languageId, testCases, problem.time_limit_ms);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const isConnRefused = msg.includes("ECONNREFUSED") || msg.includes("fetch failed");
    return NextResponse.json(
      { error: isConnRefused ? "Judge0 is not reachable. Set JUDGE0_API_URL in .env.local once your instance is running." : msg },
      { status: 503 }
    );
  }
  const passed    = results.filter((r) => r.passed).length;
  const total     = results.length;
  const allAC     = passed === total;

  // Record submission
  await supabase.from("submissions").insert({
    user_id:           user.id,
    problem_id:        problem.id,
    language,
    source_code,
    verdict:           allAC ? "AC" : "WA",
    test_cases_passed: passed,
    total_test_cases:  total,
  });

  if (!allAC) {
    return NextResponse.json({ passed, total, all_ac: false, results });
  }

  // Mark solved and compute new streak
  const service = getServiceClient();

  // Check yesterday's challenge to compute streak
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const { data: yesterdayChallenge } = await service
    .from("daily_challenges")
    .select("solved, streak_count")
    .eq("user_id", user.id)
    .eq("date", yesterday)
    .single();

  const prevStreak = yesterdayChallenge?.solved ? (yesterdayChallenge?.streak_count ?? 0) : 0;
  const newStreak  = prevStreak + 1;

  await service
    .from("daily_challenges")
    .update({ solved: true, solved_at: new Date().toISOString(), streak_count: newStreak })
    .eq("id", daily.id);

  return NextResponse.json({ passed, total, all_ac: true, streak: newStreak, results });
}