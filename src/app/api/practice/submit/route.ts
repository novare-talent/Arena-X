import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAllTestCases, LANGUAGE_IDS } from "@/lib/judge0";
import { buildSubmission, HarnessUnsupportedError } from "@/lib/harness";

// Blocks on Judge0 (submit + poll); raise ceiling above default to avoid 504s.
export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { problem_id, language, source_code } = await request.json();
  if (!problem_id || !language || !source_code) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const languageId = LANGUAGE_IDS[language];
  if (!languageId) return NextResponse.json({ error: "Unsupported language" }, { status: 400 });

  // Service role — test_cases is not client-readable.
  const { data: problem } = await createAdminClient()
    .from("problems")
    .select("id, test_cases, time_limit_ms, io_mode, function_name, param_spec, return_spec")
    .eq("id", problem_id)
    .single();

  if (!problem) return NextResponse.json({ error: "Problem not found" }, { status: 404 });

  const testCases: Array<{ stdin: string; expected_stdout: string }> = problem.test_cases ?? [];

  let finalSource: string;
  try {
    finalSource = buildSubmission(problem, language, source_code);
  } catch (err) {
    if (err instanceof HarnessUnsupportedError) {
      return NextResponse.json({ error: "This problem currently supports Python and JavaScript only." }, { status: 400 });
    }
    throw err;
  }

  let results;
  try {
    results = await runAllTestCases(finalSource, languageId, testCases, problem.time_limit_ms);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const isConnRefused = msg.includes("ECONNREFUSED") || msg.includes("fetch failed");
    return NextResponse.json(
      { error: isConnRefused ? "Judge0 is not reachable. Set JUDGE0_API_URL in .env.local once your instance is running." : msg },
      { status: 503 }
    );
  }

  const passed = results.filter((r) => r.passed).length;
  const total  = results.length;
  const allAC  = passed === total;

  // Record as practice submission (no match_id)
  await supabase.from("submissions").insert({
    user_id:           user.id,
    problem_id:        problem.id,
    language,
    source_code,
    verdict:           allAC ? "AC" : "WA",
    test_cases_passed: passed,
    total_test_cases:  total,
  });

  return NextResponse.json({ passed, total, all_ac: allAC, results });
}