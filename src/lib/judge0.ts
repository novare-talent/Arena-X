// Judge0 CE integration
// Self-hosted: set JUDGE0_API_URL in .env.local (e.g. http://localhost:2358)
// API key: set JUDGE0_API_KEY (leave empty if no auth on self-hosted instance)

export type LangKey = "python" | "javascript" | "java" | "cpp" | "c";

export const LANGUAGE_IDS: Record<string, number> = {
  python:     71,  // Python 3.8
  javascript: 63,  // Node.js 12
  java:       62,  // Java 13
  cpp:        54,  // C++ 17
  c:          50,  // C 9
};

export const LANGUAGE_LABELS: Record<string, string> = {
  python:     "Python 3",
  javascript: "JavaScript (Node)",
  java:       "Java 13",
  cpp:        "C++ 17",
  c:          "C 9",
};

export const DEFAULT_STARTERS: Record<string, string> = {
  python: `import sys
input = sys.stdin.readline

def solve():
    # Read input and write your solution here
    pass

solve()
`,
  javascript: `const lines = require('fs').readFileSync('/dev/stdin','utf8').trim().split('\\n');
let idx = 0;

// Write your solution here
`,
  java: `import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        // Write your solution here
    }
}
`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    // Write your solution here
    return 0;
}
`,
  c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    // Write your solution here
    return 0;
}
`,
};

interface SubmitOptions {
  sourceCode: string;
  languageId: number;
  stdin: string;
  expectedOutput?: string;
  cpuTimeLimit?: number;
  memoryLimit?: number;
}

interface Judge0Result {
  token: string;
  status: { id: number; description: string };
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  time: string | null;
  memory: number | null;
}

function getHeaders() {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.JUDGE0_API_KEY) {
    headers["X-Auth-Token"] = process.env.JUDGE0_API_KEY;
  }
  return headers;
}

function baseUrl() {
  return (process.env.JUDGE0_API_URL ?? "http://localhost:2358").replace(/\/$/, "");
}

// Submit code — returns submission token
export async function submitCode(opts: SubmitOptions): Promise<string> {
  const url = `${baseUrl()}/submissions?base64_encoded=false&wait=false`;
  const body = {
    source_code:      opts.sourceCode,
    language_id:      opts.languageId,
    stdin:            opts.stdin,
    expected_output:  opts.expectedOutput,
    cpu_time_limit:   opts.cpuTimeLimit ?? 5,
    memory_limit:     opts.memoryLimit  ?? 262144,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Judge0 submit failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.token as string;
}

// Poll result for a single token
export async function getResult(token: string): Promise<Judge0Result> {
  const url = `${baseUrl()}/submissions/${token}?base64_encoded=false`;
  const res = await fetch(url, { headers: getHeaders() });

  if (!res.ok) {
    throw new Error(`Judge0 getResult failed: ${res.status}`);
  }

  return res.json() as Promise<Judge0Result>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Only fetch the fields we use — smaller payloads on the poll loop.
const BATCH_FIELDS = "token,status,stdout,stderr,compile_output,time,memory";

// Submit a whole batch in ONE round trip. Returns tokens in input order.
async function submitBatch(opts: SubmitOptions[]): Promise<string[]> {
  const url = `${baseUrl()}/submissions/batch?base64_encoded=false&wait=false`;
  const body = {
    submissions: opts.map((o) => ({
      source_code:     o.sourceCode,
      language_id:     o.languageId,
      stdin:           o.stdin,
      expected_output: o.expectedOutput,
      cpu_time_limit:  o.cpuTimeLimit ?? 5,
      memory_limit:    o.memoryLimit  ?? 262144,
    })),
  };
  const res = await fetch(url, { method: "POST", headers: getHeaders(), body: JSON.stringify(body) });
  if (!res.ok) {
    throw new Error(`Judge0 batch submit failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as Array<{ token?: string; error?: string }>;
  return data.map((d, i) => {
    if (!d.token) throw new Error(`Judge0 batch submit returned no token for #${i}: ${JSON.stringify(d)}`);
    return d.token;
  });
}

// Fetch a whole batch in ONE round trip, preserving order.
async function getBatch(tokens: string[]): Promise<Judge0Result[]> {
  const url = `${baseUrl()}/submissions/batch?tokens=${tokens.join(",")}&base64_encoded=false&fields=${BATCH_FIELDS}`;
  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) {
    throw new Error(`Judge0 batch get failed: ${res.status}`);
  }
  const data = (await res.json()) as { submissions: Judge0Result[] };
  return data.submissions;
}

// Poll a set of tokens to completion with early-start backoff (no fixed pre-sleep).
// Fast programs finish in <300ms, so we check quickly first then widen the gap.
async function pollToCompletion(
  tokens: string[],
  fetcher: (t: string[]) => Promise<Judge0Result[]>,
  budgetMs = 16000
): Promise<Judge0Result[]> {
  const deadline = Date.now() + budgetMs;
  let delay = 120;
  let results: Judge0Result[] = [];
  while (Date.now() < deadline) {
    await sleep(delay);
    results = await fetcher(tokens);
    if (results.length === tokens.length && results.every((r) => r?.status && r.status.id > 2)) break;
    delay = Math.min(Math.round(delay * 1.4), 600);
  }
  return results;
}

// Status IDs from Judge0
// 1=In Queue, 2=Processing, 3=Accepted, 4=Wrong Answer, 5=TLE, 6=CE, 11=RE, etc.
export const JUDGE0_STATUS = {
  IN_QUEUE:    1,
  PROCESSING:  2,
  ACCEPTED:    3,
  WRONG_ANSWER:4,
  TLE:         5,
  CE:          6,
  RE_SIGSEGV:  7,
  RE_SIGXFSZ:  8,
  RE_SIGFPE:   9,
  RE_SIGABRT:  10,
  RE_NZEC:     11,
  RE_OTHER:    12,
  IE:          13,
  EE:          14,
} as const;

// Map Judge0's internal status into a clean, user-facing verdict. The raw
// descriptions leak codes like "Runtime Error (NZEC)" / "(SIGSEGV)" that mean
// nothing to a solver — the real stderr/compile output is shown separately in
// the diagnostics panel, so here we just want a plain label.
export function friendlyVerdict(statusId: number): string {
  switch (statusId) {
    case JUDGE0_STATUS.ACCEPTED:      return "Accepted";
    case JUDGE0_STATUS.WRONG_ANSWER:  return "Wrong Answer";
    case JUDGE0_STATUS.TLE:           return "Time Limit Exceeded";
    case JUDGE0_STATUS.CE:            return "Compilation Error";
    case JUDGE0_STATUS.RE_SIGSEGV:
    case JUDGE0_STATUS.RE_SIGXFSZ:
    case JUDGE0_STATUS.RE_SIGFPE:
    case JUDGE0_STATUS.RE_SIGABRT:
    case JUDGE0_STATUS.RE_NZEC:
    case JUDGE0_STATUS.RE_OTHER:      return "Runtime Error";
    case JUDGE0_STATUS.IN_QUEUE:
    case JUDGE0_STATUS.PROCESSING:    return "Pending";
    default:                          return "Error";
  }
}

// Run code against all test cases and return per-case verdicts
export interface TestCaseResult {
  passed: boolean;
  verdict: string;
  time_ms: number | null;
  memory_kb: number | null;
  actual_output: string | null;
  expected_output: string;
  stderr: string | null;
  compile_output: string | null;
}

export async function runAllTestCases(
  sourceCode: string,
  languageId: number,
  testCases: Array<{ stdin: string; expected_stdout: string }>,
  timeLimitMs = 2000
): Promise<TestCaseResult[]> {
  if (testCases.length === 0) return [];

  const opts: SubmitOptions[] = testCases.map((tc) => ({
    sourceCode,
    languageId,
    stdin: tc.stdin,
    expectedOutput: tc.expected_stdout,
    cpuTimeLimit: timeLimitMs / 1000,
  }));

  // Fast path: submit + poll the whole batch in one round trip each.
  // Falls back to the legacy per-submission path if this Judge0 instance
  // doesn't have the batch endpoint enabled.
  let results: Judge0Result[];
  try {
    const tokens = await submitBatch(opts);
    results = await pollToCompletion(tokens, getBatch);
  } catch {
    const tokens = await Promise.all(opts.map(submitCode));
    results = await pollToCompletion(tokens, (ts) => Promise.all(ts.map(getResult)));
  }

  return testCases.map((tc, i) => {
    const result = results[i];
    if (!result?.status || result.status.id <= 2) {
      return {
        passed: false,
        verdict: "Timeout",
        time_ms: null,
        memory_kb: null,
        actual_output: null,
        expected_output: tc.expected_stdout,
        stderr: null,
        compile_output: null,
      };
    }

    const expected = tc.expected_stdout.trim();
    const actual   = (result.stdout ?? "").trim();
    const passed   = result.status.id === JUDGE0_STATUS.ACCEPTED || actual === expected;

    return {
      passed,
      verdict:         passed ? "Accepted" : friendlyVerdict(result.status.id),
      time_ms:         result.time ? Math.round(parseFloat(result.time) * 1000) : null,
      memory_kb:       result.memory ?? null,
      actual_output:   result.stdout,
      expected_output: tc.expected_stdout,
      stderr:          result.stderr ?? null,
      compile_output:  result.compile_output ?? null,
    };
  });
}

// Calculate match score: (passed/total)*100 - time_penalty
export function calcScore(
  passedCount: number,
  totalCount:  number,
  solveMs:     number,
  totalMs:     number
): number {
  const accuracy = (passedCount / totalCount) * 100;
  const timePenalty = (solveMs / totalMs) * 10;
  return Math.max(0, accuracy - timePenalty);
}

// Standard chess ELO delta
export function calcEloDelta(
  winnerElo: number,
  loserElo:  number,
  result:    "win" | "loss" | "draw",
  kFactor?:  number
): { winnerDelta: number; loserDelta: number } {
  const getK = (elo: number) => {
    if (elo < 900)  return 32;
    if (elo < 1300) return 24;
    return 16;
  };

  const kW = kFactor ?? getK(winnerElo);
  const kL = kFactor ?? getK(loserElo);

  const expectedW = 1 / (1 + Math.pow(10, (loserElo  - winnerElo) / 400));
  const expectedL = 1 / (1 + Math.pow(10, (winnerElo - loserElo)  / 400));

  const actualW = result === "win" ? 1 : result === "draw" ? 0.5 : 0;
  const actualL = result === "win" ? 0 : result === "draw" ? 0.5 : 1;

  const rawWinner = kW * (actualW - expectedW);
  const rawLoser  = kL * (actualL - expectedL);

  // Enforce minimum ±1 ELO change for decisive results so mismatched
  // ratings (e.g. Diamond vs Unrated) always move the needle.
  const clamp = (v: number, decisive: boolean) => {
    const r = Math.round(v);
    if (!decisive) return r;
    if (v > 0) return Math.max(1, r);
    if (v < 0) return Math.min(-1, r);
    return r;
  };

  const decisive = result !== "draw";
  return {
    winnerDelta: clamp(rawWinner, decisive),
    loserDelta:  clamp(rawLoser,  decisive),
  };
}