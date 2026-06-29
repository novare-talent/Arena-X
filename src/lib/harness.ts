// Function-execution harness (review finding #8).
//
// Problems run on a raw stdin/stdout Judge0 backend, but most DSA problems are
// naturally "write a function that returns X". When a problem is marked
// io_mode='function', the user writes ONLY the function; we wrap their code with
// a per-language driver that reads stdin, parses typed arguments, calls their
// function, and prints a CANONICAL serialization of the return value — so the
// stored `expected_stdout` (already canonical for the converted problems) matches
// exactly and the execution model is consistent with the spec.
//
// io_mode='stdio' problems are passed through unchanged (legacy path).

export type HarnessType =
  | "int" | "long" | "double" | "bool" | "string"
  | "int[]" | "string[]" | "int[][]";

export interface ParamSpec { name: string; type: HarnessType }
export interface ReturnSpec { type: HarnessType }

export interface HarnessProblem {
  io_mode?: string | null;
  function_name?: string | null;
  param_spec?: ParamSpec[] | null;
  return_spec?: ReturnSpec | null;
}

// Languages that have a driver today. Others fall back to an explicit error in
// function mode (never a silent misjudge).
export const HARNESS_LANGS = ["python", "javascript"] as const;
export type HarnessLang = (typeof HARNESS_LANGS)[number];

export function isFunctionMode(p: HarnessProblem): boolean {
  return p.io_mode === "function";
}
export function isHarnessSupported(lang: string): lang is HarnessLang {
  return (HARNESS_LANGS as readonly string[]).includes(lang);
}

/** Thrown when a function-mode problem is attempted in a language with no driver yet. */
export class HarnessUnsupportedError extends Error {
  constructor(public lang: string) {
    super(`HARNESS_UNSUPPORTED:${lang}`);
    this.name = "HarnessUnsupportedError";
  }
}

// ── Drivers ────────────────────────────────────────────────────────
// Each driver is appended AFTER the user's function definition.

function pythonDriver(fn: string, params: ParamSpec[], ret: ReturnSpec): string {
  const paramJson = JSON.stringify(params);
  const retType = ret.type;
  return `

# ── ArenaX harness (do not edit) ──────────────────────────────────
import sys as __ax_sys, json as __ax_json
def __ax_parse(__ax_lines, __ax_spec):
    __ax_i = 0; __ax_args = []
    for __ax_p in __ax_spec:
        __ax_t = __ax_p["type"]
        if __ax_t in ("int", "long"):
            __ax_args.append(int(__ax_lines[__ax_i])); __ax_i += 1
        elif __ax_t == "double":
            __ax_args.append(float(__ax_lines[__ax_i])); __ax_i += 1
        elif __ax_t == "bool":
            __ax_args.append(__ax_lines[__ax_i].strip() == "true"); __ax_i += 1
        elif __ax_t == "string":
            __ax_args.append(__ax_lines[__ax_i].rstrip("\\r")); __ax_i += 1
        elif __ax_t == "int[]":
            __ax_args.append([int(__ax_x) for __ax_x in __ax_lines[__ax_i].split()]); __ax_i += 1
        elif __ax_t == "string[]":
            __ax_args.append(__ax_lines[__ax_i].split()); __ax_i += 1
        elif __ax_t == "int[][]":
            __ax_r = int(__ax_lines[__ax_i]); __ax_i += 1; __ax_m = []
            for _ in range(__ax_r):
                __ax_m.append([int(__ax_x) for __ax_x in __ax_lines[__ax_i].split()]); __ax_i += 1
            __ax_args.append(__ax_m)
    return __ax_args
def __ax_ser(__ax_v, __ax_t):
    if __ax_t == "bool": return "true" if __ax_v else "false"
    if __ax_t in ("int", "long", "double", "string"): return str(__ax_v)
    if __ax_t in ("int[]", "string[]"): return " ".join(str(__ax_x) for __ax_x in __ax_v)
    if __ax_t == "int[][]": return "\\n".join(" ".join(str(__ax_x) for __ax_x in __ax_row) for __ax_row in __ax_v)
    return str(__ax_v)
if __name__ == "__main__":
    __ax_lines = __ax_sys.stdin.read().split("\\n")
    __ax_out = ${fn}(*__ax_parse(__ax_lines, __ax_json.loads(${JSON.stringify(paramJson)})))
    __ax_sys.stdout.write(__ax_ser(__ax_out, ${JSON.stringify(retType)}))
`;
}

function jsDriver(fn: string, params: ParamSpec[], ret: ReturnSpec): string {
  const paramJson = JSON.stringify(params);
  const retType = ret.type;
  return `

// ── ArenaX harness (do not edit) ──────────────────────────────────
const __ax_lines = require("fs").readFileSync(0, "utf8").split("\\n");
function __ax_parse(lines, spec) {
  let i = 0; const args = [];
  for (const p of spec) {
    const t = p.type;
    if (t === "int" || t === "long") args.push(parseInt(lines[i++], 10));
    else if (t === "double") args.push(parseFloat(lines[i++]));
    else if (t === "bool") args.push(lines[i++].trim() === "true");
    else if (t === "string") args.push(lines[i++].replace(/\\r$/, ""));
    else if (t === "int[]") { const l = lines[i++].trim(); args.push(l ? l.split(/\\s+/).map(Number) : []); }
    else if (t === "string[]") { const l = lines[i++].trim(); args.push(l ? l.split(/\\s+/) : []); }
    else if (t === "int[][]") { const r = parseInt(lines[i++], 10); const m = []; for (let k = 0; k < r; k++) { const l = lines[i++].trim(); m.push(l ? l.split(/\\s+/).map(Number) : []); } args.push(m); }
  }
  return args;
}
function __ax_ser(v, t) {
  if (t === "bool") return v ? "true" : "false";
  if (t === "int" || t === "long" || t === "double" || t === "string") return String(v);
  if (t === "int[]" || t === "string[]") return v.join(" ");
  if (t === "int[][]") return v.map(function (r) { return r.join(" "); }).join("\\n");
  return String(v);
}
process.stdout.write(__ax_ser(${fn}(...__ax_parse(__ax_lines, ${paramJson})), ${JSON.stringify(retType)}));
`;
}

/**
 * Compose the final source sent to Judge0. For io_mode='function' problems we
 * append the language driver to the user's function. For stdio problems we pass
 * the user code through unchanged.
 *
 * @throws HarnessUnsupportedError if a function-mode problem is run in a language
 *         that has no driver yet (caller should return a 400).
 */
export function buildSubmission(problem: HarnessProblem, lang: string, userCode: string): string {
  if (!isFunctionMode(problem)) return userCode;

  const fn = problem.function_name;
  const params = problem.param_spec;
  const ret = problem.return_spec;
  // Misconfigured function-mode problem — don't silently misjudge.
  if (!fn || !params || !ret) return userCode;

  if (!isHarnessSupported(lang)) throw new HarnessUnsupportedError(lang);

  const driver = lang === "python" ? pythonDriver(fn, params, ret) : jsDriver(fn, params, ret);
  return `${userCode}\n${driver}`;
}

// ── Editor starters (client-safe; function_name/param_spec are not answers) ──

const PY_DEFAULT: Record<HarnessType, string> = {
  int: "0", long: "0", double: "0.0", bool: "False", string: '""',
  "int[]": "[]", "string[]": "[]", "int[][]": "[]",
};

export function buildStarter(problem: HarnessProblem, lang: string): string | null {
  if (!isFunctionMode(problem) || !problem.function_name || !problem.param_spec || !problem.return_spec) {
    return null;
  }
  const fn = problem.function_name;
  const args = problem.param_spec.map((p) => p.name);

  if (lang === "python") {
    return `def ${fn}(${args.join(", ")}):
    # Write your solution here and RETURN the answer (no input/print needed).
    return ${PY_DEFAULT[problem.return_spec.type] ?? "None"}
`;
  }
  if (lang === "javascript") {
    return `function ${fn}(${args.join(", ")}) {
  // Write your solution here and RETURN the answer (no input/console.log needed).
}
`;
  }
  // Compiled languages: harness not available yet — signal the UI to disable.
  return null;
}
