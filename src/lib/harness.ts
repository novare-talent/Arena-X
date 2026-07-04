// Function-execution harness (review finding #8).
//
// Problems run on a raw stdin/stdout Judge0 backend, but DSA problems are
// naturally "write a function that returns X". When a problem is io_mode='function'
// the user writes ONLY the function (LeetCode-style, with a typed stub); we wrap
// their code with a per-language driver that reads stdin, parses typed arguments,
// calls their function, and prints a CANONICAL serialization of the return value.
//
// io_mode='stdio' problems are passed through unchanged (legacy path).

export type HarnessType =
  | "int" | "long" | "double" | "bool" | "string"
  | "int[]" | "string[]" | "int[][]" | "string[][]";

export interface ParamSpec { name: string; type: HarnessType }
export interface ReturnSpec { type: HarnessType }

export interface HarnessProblem {
  io_mode?: string | null;
  function_name?: string | null;
  param_spec?: ParamSpec[] | null;
  return_spec?: ReturnSpec | null;
}

// Languages with a driver. `c` is intentionally excluded from function mode:
// C's array-by-pointer+size convention doesn't fit the uniform param model, so
// function-mode problems fall back to a clean "unsupported" error for C.
export const HARNESS_LANGS = ["python", "javascript", "cpp", "java"] as const;
export type HarnessLang = (typeof HARNESS_LANGS)[number];

export function isFunctionMode(p: HarnessProblem): boolean {
  return p.io_mode === "function";
}
export function isHarnessSupported(lang: string): lang is HarnessLang {
  return (HARNESS_LANGS as readonly string[]).includes(lang);
}

/** Thrown when a function-mode problem is attempted in a language with no driver. */
export class HarnessUnsupportedError extends Error {
  constructor(public lang: string) {
    super(`HARNESS_UNSUPPORTED:${lang}`);
    this.name = "HarnessUnsupportedError";
  }
}

// ── Python driver (runtime-generic) ────────────────────────────────
function pythonDriver(fn: string, params: ParamSpec[], ret: ReturnSpec): string {
  const paramJson = JSON.stringify(params);
  return `

# ── ArenaX harness (do not edit) ──────────────────────────────────
import sys as __ax_sys, json as __ax_json
def __ax_parse(__ax_lines, __ax_spec):
    __ax_i = 0; __ax_args = []
    def take():
        nonlocal __ax_i
        __ax_v = __ax_lines[__ax_i] if __ax_i < len(__ax_lines) else ""
        __ax_i += 1
        return __ax_v
    for __ax_p in __ax_spec:
        __ax_t = __ax_p["type"]
        if __ax_t in ("int", "long"):
            __ax_args.append(int(take()))
        elif __ax_t == "double":
            __ax_args.append(float(take()))
        elif __ax_t == "bool":
            __ax_args.append(take().strip() == "true")
        elif __ax_t == "string":
            __ax_args.append(take().rstrip("\\r"))
        elif __ax_t == "int[]":
            __ax_args.append([int(x) for x in take().split()])
        elif __ax_t == "string[]":
            __ax_args.append(take().split())
        elif __ax_t == "int[][]":
            __ax_r = int(take()); __ax_args.append([[int(x) for x in take().split()] for _ in range(__ax_r)])
        elif __ax_t == "string[][]":
            __ax_r = int(take()); __ax_args.append([take().split() for _ in range(__ax_r)])
    return __ax_args
def __ax_ser(__ax_v, __ax_t):
    if __ax_t == "bool": return "true" if __ax_v else "false"
    if __ax_t in ("int", "long", "double", "string"): return str(__ax_v)
    if __ax_t in ("int[]", "string[]"): return " ".join(str(x) for x in __ax_v)
    if __ax_t == "int[][]": return "\\n".join(" ".join(str(x) for x in row) for row in __ax_v)
    if __ax_t == "string[][]":
        __ax_g = sorted([sorted(row) for row in __ax_v])
        return "\\n".join(" ".join(row) for row in __ax_g)
    return str(__ax_v)
if __name__ == "__main__":
    __ax_lines = __ax_sys.stdin.read().split("\\n")
    __ax_out = ${fn}(*__ax_parse(__ax_lines, __ax_json.loads(${JSON.stringify(paramJson)})))
    __ax_sys.stdout.write(__ax_ser(__ax_out, ${JSON.stringify(ret.type)}))
`;
}

// ── JavaScript driver (runtime-generic) ────────────────────────────
function jsDriver(fn: string, params: ParamSpec[], ret: ReturnSpec): string {
  const paramJson = JSON.stringify(params);
  return `

// ── ArenaX harness (do not edit) ──────────────────────────────────
const __ax_lines = require("fs").readFileSync(0, "utf8").split("\\n");
function __ax_parse(lines, spec) {
  let i = 0; const args = [];
  const take = () => (i < lines.length ? lines[i++] : "");
  for (const p of spec) {
    const t = p.type;
    if (t === "int" || t === "long") args.push(parseInt(take(), 10));
    else if (t === "double") args.push(parseFloat(take()));
    else if (t === "bool") args.push(take().trim() === "true");
    else if (t === "string") args.push(take().replace(/\\r$/, ""));
    else if (t === "int[]") { const l = take().trim(); args.push(l ? l.split(/\\s+/).map(Number) : []); }
    else if (t === "string[]") { const l = take().trim(); args.push(l ? l.split(/\\s+/) : []); }
    else if (t === "int[][]") { const r = parseInt(take(), 10); const m = []; for (let k = 0; k < r; k++) { const l = take().trim(); m.push(l ? l.split(/\\s+/).map(Number) : []); } args.push(m); }
    else if (t === "string[][]") { const r = parseInt(take(), 10); const m = []; for (let k = 0; k < r; k++) { const l = take().trim(); m.push(l ? l.split(/\\s+/) : []); } args.push(m); }
  }
  return args;
}
function __ax_cmp(a, b) { for (let i = 0; i < Math.min(a.length, b.length); i++) { if (a[i] < b[i]) return -1; if (a[i] > b[i]) return 1; } return a.length - b.length; }
function __ax_ser(v, t) {
  if (t === "bool") return v ? "true" : "false";
  if (t === "int" || t === "long" || t === "double" || t === "string") return String(v);
  if (t === "int[]" || t === "string[]") return v.join(" ");
  if (t === "int[][]") return v.map((r) => r.join(" ")).join("\\n");
  if (t === "string[][]") { const g = v.map((r) => [...r].sort()); g.sort(__ax_cmp); return g.map((r) => r.join(" ")).join("\\n"); }
  return String(v);
}
process.stdout.write(__ax_ser(${fn}(...__ax_parse(__ax_lines, ${paramJson})), ${JSON.stringify(ret.type)}));
`;
}

// ── C++ driver (codegen — static types need typed parse statements) ─
const CPP_TYPE: Record<HarnessType, string> = {
  int: "int", long: "long long", double: "double", bool: "bool", string: "string",
  "int[]": "vector<int>", "string[]": "vector<string>",
  "int[][]": "vector<vector<int>>", "string[][]": "vector<vector<string>>",
};
function cppParse(type: HarnessType, i: number): string {
  const n = `__a${i}`;
  switch (type) {
    case "int": case "long":   return `${CPP_TYPE[type]} ${n} = (${CPP_TYPE[type]})stoll(__ax_next());`;
    case "double":             return `double ${n} = stod(__ax_next());`;
    case "bool":               return `bool ${n} = (__ax_next() == "true");`;
    case "string":             return `string ${n} = __ax_next();`;
    case "int[]":              return `vector<int> ${n} = __ax_ivec(__ax_next());`;
    case "string[]":           return `vector<string> ${n} = __ax_svec(__ax_next());`;
    case "int[][]":            return `int __r${i} = stoi(__ax_next()); vector<vector<int>> ${n}; for (int _k = 0; _k < __r${i}; _k++) ${n}.push_back(__ax_ivec(__ax_next()));`;
    case "string[][]":         return `int __r${i} = stoi(__ax_next()); vector<vector<string>> ${n}; for (int _k = 0; _k < __r${i}; _k++) ${n}.push_back(__ax_svec(__ax_next()));`;
  }
}
function cppDriver(fn: string, params: ParamSpec[]): string {
  const decls = params.map((p, i) => cppParse(p.type, i)).join("\n  ");
  const args = params.map((_, i) => `__a${i}`).join(", ");
  return `

// ── ArenaX harness (do not edit) ──────────────────────────────────
namespace {
  vector<string> __ax_L; size_t __ax_ix = 0;
  string __ax_next() { return __ax_ix < __ax_L.size() ? __ax_L[__ax_ix++] : string(); }
  vector<int> __ax_ivec(const string& s) { vector<int> v; stringstream ss(s); int x; while (ss >> x) v.push_back(x); return v; }
  vector<string> __ax_svec(const string& s) { vector<string> v; stringstream ss(s); string x; while (ss >> x) v.push_back(x); return v; }
  string __ax_ser(bool x) { return x ? "true" : "false"; }
  string __ax_ser(int x) { return to_string(x); }
  string __ax_ser(long long x) { return to_string(x); }
  string __ax_ser(double x) { ostringstream o; o << x; return o.str(); }
  string __ax_ser(const string& x) { return x; }
  string __ax_ser(const vector<int>& v) { string r; for (size_t i = 0; i < v.size(); i++) { if (i) r += " "; r += to_string(v[i]); } return r; }
  string __ax_ser(const vector<string>& v) { string r; for (size_t i = 0; i < v.size(); i++) { if (i) r += " "; r += v[i]; } return r; }
  string __ax_ser(const vector<vector<int>>& v) { string r; for (size_t i = 0; i < v.size(); i++) { if (i) r += "\\n"; r += __ax_ser(v[i]); } return r; }
  string __ax_ser(vector<vector<string>> v) { for (auto& g : v) sort(g.begin(), g.end()); sort(v.begin(), v.end()); string r; for (size_t i = 0; i < v.size(); i++) { if (i) r += "\\n"; r += __ax_ser(v[i]); } return r; }
}
int main() {
  string __ln; while (getline(cin, __ln)) __ax_L.push_back(__ln);
  ${decls}
  auto __ax_out = ${fn}(${args});
  cout << __ax_ser(__ax_out);
  return 0;
}
`;
}

// ── Java driver (codegen) ──────────────────────────────────────────
const JAVA_TYPE: Record<HarnessType, string> = {
  int: "int", long: "long", double: "double", bool: "boolean", string: "String",
  "int[]": "int[]", "string[]": "String[]",
  "int[][]": "int[][]", "string[][]": "String[][]",
};
function javaParse(type: HarnessType, i: number): string {
  const n = `__a${i}`;
  switch (type) {
    case "int":       return `int ${n} = Integer.parseInt(__next().trim());`;
    case "long":      return `long ${n} = Long.parseLong(__next().trim());`;
    case "double":    return `double ${n} = Double.parseDouble(__next().trim());`;
    case "bool":      return `boolean ${n} = __next().trim().equals("true");`;
    case "string":    return `String ${n} = __next();`;
    case "int[]":     return `int[] ${n} = __iarr(__next());`;
    case "string[]":  return `String[] ${n} = __sarr(__next());`;
    case "int[][]":   return `int __r${i} = Integer.parseInt(__next().trim()); int[][] ${n} = new int[__r${i}][]; for (int _k = 0; _k < __r${i}; _k++) ${n}[_k] = __iarr(__next());`;
    case "string[][]":return `int __r${i} = Integer.parseInt(__next().trim()); String[][] ${n} = new String[__r${i}][]; for (int _k = 0; _k < __r${i}; _k++) ${n}[_k] = __sarr(__next());`;
  }
}
function javaDriver(fn: string, params: ParamSpec[], ret: ReturnSpec): string {
  const decls = params.map((p, i) => javaParse(p.type, i)).join("\n    ");
  const args = params.map((_, i) => `__a${i}`).join(", ");
  const serCall =
      ret.type === "bool"       ? `((__out) ? "true" : "false")`
    : ret.type === "string[][]" ? "__ser2(__out)"
    : ret.type === "int[][]"    ? "__ser2i(__out)"
    : (ret.type === "int[]" || ret.type === "string[]") ? "__ser1(__out)"
    : "String.valueOf(__out)";
  return `

// ── ArenaX harness (do not edit) — entry class must be Main for Judge0 ──
public class Main {
  static java.io.BufferedReader __br = new java.io.BufferedReader(new java.io.InputStreamReader(System.in));
  static String __next() { try { String l = __br.readLine(); return l == null ? "" : l; } catch (Exception e) { return ""; } }
  static int[] __iarr(String s) { s = s.trim(); if (s.isEmpty()) return new int[0]; String[] p = s.split("\\\\s+"); int[] a = new int[p.length]; for (int i = 0; i < p.length; i++) a[i] = Integer.parseInt(p[i]); return a; }
  static String[] __sarr(String s) { s = s.trim(); if (s.isEmpty()) return new String[0]; return s.split("\\\\s+"); }
  static String __ser1(int[] a) { StringBuilder b = new StringBuilder(); for (int i = 0; i < a.length; i++) { if (i > 0) b.append(" "); b.append(a[i]); } return b.toString(); }
  static String __ser1(String[] a) { return String.join(" ", a); }
  static String __ser2i(int[][] a) { StringBuilder b = new StringBuilder(); for (int i = 0; i < a.length; i++) { if (i > 0) b.append("\\n"); b.append(__ser1(a[i])); } return b.toString(); }
  static String __ser2(String[][] a) { for (String[] g : a) java.util.Arrays.sort(g); java.util.Arrays.sort(a, (x, y) -> { for (int i = 0; i < Math.min(x.length, y.length); i++) { int c = x[i].compareTo(y[i]); if (c != 0) return c; } return x.length - y.length; }); StringBuilder b = new StringBuilder(); for (int i = 0; i < a.length; i++) { if (i > 0) b.append("\\n"); b.append(String.join(" ", a[i])); } return b.toString(); }
  public static void main(String[] __args) {
    ${decls}
    ${JAVA_TYPE[ret.type]} __out = new Solution().${fn}(${args});
    System.out.print(${serCall});
  }
}
`;
}

/**
 * Compose the final source sent to Judge0. For io_mode='function' problems we
 * append the language driver to the user's code. For stdio problems we pass the
 * user code through unchanged.
 *
 * @throws HarnessUnsupportedError if a function-mode problem runs in a language
 *         with no driver (caller should return a 400).
 */
export function buildSubmission(problem: HarnessProblem, lang: string, userCode: string): string {
  if (!isFunctionMode(problem)) return userCode;

  const fn = problem.function_name;
  const params = problem.param_spec;
  const ret = problem.return_spec;
  if (!fn || !params || !ret) return userCode; // misconfigured — don't misjudge

  if (!isHarnessSupported(lang)) throw new HarnessUnsupportedError(lang);

  switch (lang) {
    case "python":     return `${userCode}\n${pythonDriver(fn, params, ret)}`;
    case "javascript": return `${userCode}\n${jsDriver(fn, params, ret)}`;
    case "cpp":        return `${userCode}\n${cppDriver(fn, params)}`;
    case "java":       return `${userCode}\n${javaDriver(fn, params, ret)}`;
  }
}

// ── Typed, LeetCode-style editor stubs (Phase 1) ───────────────────
// param_spec/return_spec are safe to expose (signature, not answers).

const PY_ANN: Record<HarnessType, string> = {
  int: "int", long: "int", double: "float", bool: "bool", string: "str",
  "int[]": "List[int]", "string[]": "List[str]", "int[][]": "List[List[int]]", "string[][]": "List[List[str]]",
};
const JS_ANN: Record<HarnessType, string> = {
  int: "number", long: "number", double: "number", bool: "boolean", string: "string",
  "int[]": "number[]", "string[]": "string[]", "int[][]": "number[][]", "string[][]": "string[][]",
};
const CPP_DEFAULT: Record<HarnessType, string> = {
  int: "0", long: "0", double: "0.0", bool: "false", string: '""',
  "int[]": "{}", "string[]": "{}", "int[][]": "{}", "string[][]": "{}",
};
const JAVA_DEFAULT: Record<HarnessType, string> = {
  int: "0", long: "0L", double: "0.0", bool: "false", string: '""',
  "int[]": "new int[0]", "string[]": "new String[0]", "int[][]": "new int[0][]", "string[][]": "new String[0][]",
};

/** A compact, language-agnostic signature line for the editor header, e.g.
 *  `two_sum(nums: int[], target: int) → int[]`. Null for stdio problems. */
export function signatureLine(problem: HarnessProblem): string | null {
  if (!isFunctionMode(problem) || !problem.function_name || !problem.param_spec || !problem.return_spec) {
    return null;
  }
  const ps = problem.param_spec.map((p) => `${p.name}: ${p.type}`).join(", ");
  return `${problem.function_name}(${ps}) → ${problem.return_spec.type}`;
}

export function buildStarter(problem: HarnessProblem, lang: string): string | null {
  if (!isFunctionMode(problem) || !problem.function_name || !problem.param_spec || !problem.return_spec) {
    return null;
  }
  const fn = problem.function_name;
  const params = problem.param_spec;
  const ret = problem.return_spec.type;

  if (lang === "python") {
    const usesList = [...params.map((p) => p.type), ret].some((t) => t.endsWith("[]"));
    const sig = params.map((p) => `${p.name}: ${PY_ANN[p.type]}`).join(", ");
    const header = usesList ? "from typing import List\n\n" : "";
    return `${header}def ${fn}(${sig}) -> ${PY_ANN[ret]}:
    # Write your solution here
    pass
`;
  }
  if (lang === "javascript") {
    const doc = params.map((p) => ` * @param {${JS_ANN[p.type]}} ${p.name}`).join("\n");
    return `/**
${doc}
 * @return {${JS_ANN[ret]}}
 */
function ${fn}(${params.map((p) => p.name).join(", ")}) {
  // Write your solution here
}
`;
  }
  if (lang === "cpp") {
    const sig = params.map((p) => {
      const t = CPP_TYPE[p.type];
      return t.startsWith("vector") ? `${t}& ${p.name}` : `${t} ${p.name}`;
    }).join(", ");
    return `#include <bits/stdc++.h>
using namespace std;

${CPP_TYPE[ret]} ${fn}(${sig}) {
    // Write your solution here
    return ${CPP_DEFAULT[ret]};
}
`;
  }
  if (lang === "java") {
    const sig = params.map((p) => `${JAVA_TYPE[p.type]} ${p.name}`).join(", ");
    return `class Solution {
    public ${JAVA_TYPE[ret]} ${fn}(${sig}) {
        // Write your solution here
        return ${JAVA_DEFAULT[ret]};
    }
}
`;
  }
  return null; // c: function mode unsupported
}
