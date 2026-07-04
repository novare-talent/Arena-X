#!/usr/bin/env node
/**
 * validate-harness.mjs — prove a function-mode problem is wired correctly.
 *
 * Composes a reference solution with the real harness driver (from
 * src/lib/harness.ts) and runs it against the problem's test cases using the
 * local toolchain, checking each expected_stdout. Use this before shipping a
 * new function-mode problem so a bad param_spec / return_spec / expected value
 * can't reach production.
 *
 * Usage:
 *   node scripts/validate-harness.mjs <spec.json> <solutionFile> [lang]
 *
 *   spec.json = { function_name, param_spec, return_spec, test_cases:[{stdin,expected_stdout}] }
 *   lang is inferred from the solution extension (.py .js .cpp .java) if omitted.
 *
 * Requires: npx (for esbuild), plus python3 / node / g++ / javac as needed.
 */
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [, , specPath, solPath, langArg] = process.argv;
if (!specPath || !solPath) {
  console.error("usage: node scripts/validate-harness.mjs <spec.json> <solutionFile> [lang]");
  process.exit(2);
}

const EXT_LANG = { py: "python", js: "javascript", cpp: "cpp", cc: "cpp", java: "java" };
const lang = langArg ?? EXT_LANG[solPath.split(".").pop()];
if (!lang) { console.error("cannot infer language; pass it as the 3rd arg"); process.exit(2); }

const spec = JSON.parse(readFileSync(specPath, "utf8"));
const solution = readFileSync(solPath, "utf8");
const problem = { io_mode: "function", function_name: spec.function_name, param_spec: spec.param_spec, return_spec: spec.return_spec };

// Transpile the real harness so we test the exact code that ships.
const tmp = mkdtempSync(join(tmpdir(), "ax-harness-"));
const harnessJs = join(tmp, "harness.mjs");
execSync(`npx --yes esbuild src/lib/harness.ts --format=esm --outfile=${harnessJs} --log-level=error`, { stdio: "inherit" });
const { buildSubmission } = await import(harnessJs);

const source = buildSubmission(problem, lang, solution);

function runOne(stdin) {
  if (lang === "python") { const f = join(tmp, "s.py"); writeFileSync(f, source); return execSync(`python3 ${f}`, { input: stdin }).toString(); }
  if (lang === "javascript") { const f = join(tmp, "s.js"); writeFileSync(f, source); return execSync(`node ${f}`, { input: stdin }).toString(); }
  if (lang === "cpp") { const f = join(tmp, "s.cpp"), b = join(tmp, "s"); writeFileSync(f, source); execSync(`g++ -std=c++17 -O2 -o ${b} ${f}`); return execSync(b, { input: stdin }).toString(); }
  if (lang === "java") { writeFileSync(join(tmp, "Main.java"), source); execSync(`javac ${join(tmp, "Main.java")}`); return execSync(`java -cp ${tmp} Main`, { input: stdin }).toString(); }
  throw new Error(`unsupported lang: ${lang}`);
}

let failures = 0;
for (const [i, tc] of (spec.test_cases ?? []).entries()) {
  let got, ok;
  try { got = runOne(tc.stdin); ok = got.trim() === String(tc.expected_stdout).trim(); }
  catch (e) { got = "ERROR: " + (e.stderr ? e.stderr.toString() : e.message).slice(0, 400); ok = false; }
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} case ${i + 1}${ok ? "" : `\n    stdin:    ${JSON.stringify(tc.stdin)}\n    expected: ${JSON.stringify(tc.expected_stdout)}\n    got:      ${JSON.stringify(got)}`}`);
}
console.log(`\n${failures === 0 ? "PASS" : "FAIL"} — ${(spec.test_cases ?? []).length - failures}/${(spec.test_cases ?? []).length} cases (${lang})`);
process.exit(failures === 0 ? 0 : 1);
