import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runAllTestCases, LANGUAGE_IDS } from "@/lib/judge0";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { problem_id, language, source_code } = await request.json();
  if (!problem_id || !language || !source_code) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const languageId = LANGUAGE_IDS[language];
  if (!languageId) {
    return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
  }

  // Fetch problem test cases
  const { data: problem, error: probErr } = await supabase
    .from("problems")
    .select("id, test_cases, time_limit_ms")
    .eq("id", problem_id)
    .single();

  if (probErr || !problem) {
    return NextResponse.json({ error: "Problem not found" }, { status: 404 });
  }

  const testCases: Array<{ stdin: string; expected_stdout: string }> = problem.test_cases ?? [];

  let tcResults;
  try {
    tcResults = await runAllTestCases(source_code, languageId, testCases, problem.time_limit_ms);
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

  return NextResponse.json({ passed, total, results: tcResults });
}