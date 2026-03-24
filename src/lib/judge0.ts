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

// Run code against all test cases and return per-case verdicts
export interface TestCaseResult {
  passed: boolean;
  verdict: string;
  time_ms: number | null;
  memory_kb: number | null;
  actual_output: string | null;
  expected_output: string;
}

export async function runAllTestCases(
  sourceCode: string,
  languageId: number,
  testCases: Array<{ stdin: string; expected_stdout: string }>,
  timeLimitMs = 2000
): Promise<TestCaseResult[]> {
  // Submit all test cases in parallel
  const tokens = await Promise.all(
    testCases.map((tc) =>
      submitCode({
        sourceCode,
        languageId,
        stdin: tc.stdin,
        expectedOutput: tc.expected_stdout,
        cpuTimeLimit: timeLimitMs / 1000,
      })
    )
  );

  // Poll for all results (max 15s wait)
  const results: TestCaseResult[] = await Promise.all(
    tokens.map(async (token, i) => {
      let result: Judge0Result | null = null;
      for (let attempt = 0; attempt < 20; attempt++) {
        await new Promise((r) => setTimeout(r, 800));
        result = await getResult(token);
        if (result.status.id > 2) break; // no longer in queue/processing
      }

      if (!result) {
        return {
          passed: false,
          verdict: "Timeout",
          time_ms: null,
          memory_kb: null,
          actual_output: null,
          expected_output: testCases[i].expected_stdout,
        };
      }

      const expected = testCases[i].expected_stdout.trim();
      const actual   = (result.stdout ?? "").trim();

      return {
        passed:          result.status.id === JUDGE0_STATUS.ACCEPTED || actual === expected,
        verdict:         result.status.description,
        time_ms:         result.time ? Math.round(parseFloat(result.time) * 1000) : null,
        memory_kb:       result.memory ?? null,
        actual_output:   result.stdout,
        expected_output: testCases[i].expected_stdout,
      };
    })
  );

  return results;
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

  return {
    winnerDelta: Math.round(kW * (actualW - expectedW)),
    loserDelta:  Math.round(kL * (actualL - expectedL)),
  };
}