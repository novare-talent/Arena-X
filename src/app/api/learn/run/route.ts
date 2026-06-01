import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { LANGUAGE_IDS } from "@/lib/judge0";

function baseUrl() {
  return (process.env.JUDGE0_API_URL ?? "http://localhost:2358").replace(/\/$/, "");
}

function headers() {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.JUDGE0_API_KEY) h["X-Auth-Token"] = process.env.JUDGE0_API_KEY;
  return h;
}

// Fetch with a hard timeout
async function fetchWithTimeout(url: string, opts: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// Blocks on Judge0 (submit + poll); raise ceiling above default to avoid 504s.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { source_code, language, stdin = "" } = await req.json();
  if (!source_code || !language) {
    return NextResponse.json({ error: "Missing source_code or language" }, { status: 400 });
  }

  const languageId = LANGUAGE_IDS[language];
  if (!languageId) {
    return NextResponse.json({ error: `Unsupported language: ${language}` }, { status: 400 });
  }

  const url = `${baseUrl()}/submissions?base64_encoded=false&wait=true`;

  let res: Response;
  try {
    res = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          source_code,
          language_id: languageId,
          stdin,
          cpu_time_limit: 10,
          memory_limit: 262144,
        }),
      },
      12_000  // 12s hard timeout
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isAbort = msg.includes("aborted") || msg.includes("abort");
    const isDown  = msg.includes("ECONNREFUSED") || msg.includes("fetch failed");
    return NextResponse.json(
      {
        status_id: 0,
        status: "Judge0 Unreachable",
        stdout: "",
        stderr: isAbort
          ? "Execution timed out (Judge0 workers may be down). Try restarting your Judge0 instance."
          : isDown
          ? "Cannot connect to Judge0. Make sure your Judge0 instance is running."
          : msg,
        compile_output: "",
        time_ms: null,
        memory_kb: null,
      },
      { status: 200 } // return 200 so frontend can display the error in the output panel
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      {
        status_id: 0,
        status: "Judge0 Error",
        stdout: "",
        stderr: `Judge0 returned ${res.status}: ${text}`,
        compile_output: "",
        time_ms: null,
        memory_kb: null,
      },
      { status: 200 }
    );
  }

  const data = await res.json();

  return NextResponse.json({
    status_id:      data.status?.id ?? 0,
    status:         data.status?.description ?? "Unknown",
    stdout:         data.stdout ?? "",
    stderr:         data.stderr ?? "",
    compile_output: data.compile_output ?? "",
    time_ms:        data.time ? Math.round(parseFloat(data.time) * 1000) : null,
    memory_kb:      data.memory ?? null,
  });
}
