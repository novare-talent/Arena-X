# ArenaX — Judging Harness Design (review finding #8)

> Status: **design / not yet built.** Addresses the "judging core is broken end-to-end" finding: problems are written in LeetCode "return a value" framing but run on a raw **stdin/stdout** Judge0 backend, so a correct return-based solution scores 0/5 and is mislabeled (often NZEC). On a *rated* learning platform, judging correctness **is** the product.

---

## 1. Root cause

Two execution models are being conflated:

| | What the problem text says | What the judge actually does |
|---|---|---|
| Model | "**return** the indices…", "**return** true/false" | Runs the program, feeds `test_cases[].stdin` on **stdin**, compares **stdout** to `expected_stdout` |

A user pastes a LeetCode-style `class Solution: def isPalindrome(self, s) -> bool` — it never reads stdin, never prints, produces empty stdout → **Wrong Answer**, or exits in a way Judge0 reports as **Runtime Error (NZEC)**. The grader is correct *for a stdin/stdout problem*; the **spec lies about the model**.

There are only two honest fixes. We should do **both**, in order.

---

## 2. Fix A — interim (days): make every spec byte-exact to stdin/stdout

Cheap, no infra change. Keep the stdin/stdout judge, but remove all "return" language from problem bodies and make the I/O contract unambiguous.

- Replace "return X" → "**print** X to stdout", on its own line, exact format.
- Every problem already has `## Input Format` / `## Output Format` sections (good) — make the body consistent with them and add a **worked I/O example** (literal stdin block → literal stdout block).
- Provide **stdin-reading starter code** per language (the repo already has `DEFAULT_STARTERS` in `lib/judge0.ts` — make them problem-aware).
- Add the empty-output hint in the UI (**already shipped** in MatchArena: *"did you print instead of return?"*).

This stops the bleeding (correct solvers stop scoring 0) but still asks users to hand-write I/O parsing — which is friction and not what a LeetCode-trained audience expects. Hence Fix B.

---

## 3. Fix B — the real fix: a function harness

Let users write **just the function**. A per-language **driver** reads stdin, parses typed arguments, calls the user's function, and prints a **canonical** serialization of the return value. The user never touches I/O.

```
┌─────────────────────────────────────────────────────────────┐
│ Judge0 submission source =                                  │
│   [ driver_prelude ] + [ user_function ] + [ driver_main ]  │
│                                                             │
│  driver_main:                                               │
│    raw   = read_all_stdin()                                 │
│    args  = parse(raw, problem.param_spec)                   │
│    out    = user_function(*args)        # user code         │
│    print(canonicalize(out, problem.return_spec))            │
└─────────────────────────────────────────────────────────────┘
```

`expected_stdout` in `test_cases` becomes the **canonical** form of the expected return — so the comparison is exact and model-consistent.

### 3.1 Data model additions (`problems`)

```sql
alter table public.problems
  add column if not exists io_mode        text not null default 'stdio'
       check (io_mode in ('stdio','function')),
  add column if not exists function_name  text,            -- e.g. 'two_sum'
  add column if not exists param_spec      jsonb,           -- ordered arg types
  add column if not exists return_spec     jsonb;           -- return type

-- param_spec example (Two Sum):
--   [ {"name":"nums","type":"int[]"}, {"name":"target","type":"int"} ]
-- return_spec example: {"type":"int[]"}
```

Existing problems stay `io_mode='stdio'` and are untouched. New/migrated problems set `io_mode='function'` + the specs.

### 3.2 Type system (keep it small)

Support a deliberately tiny set first; it covers ~all early DSA problems:

`int`, `long`, `double`, `bool`, `string`, `int[]`, `string[]`, `int[][]`.

- **stdin wire format** (what `test_cases[].stdin` holds): one value per line, arrays as space-separated on a line, matrices as `rows` then each row on a line. (This is already roughly how the seeds encode inputs — so existing test data largely survives.)
- **canonical output**: `bool` → `true`/`false`; `int[]` → space-separated; `string` → as-is (no quotes); etc. One serializer per type, shared across languages by spec.

### 3.3 Drivers (one per language)

`src/lib/harness/<lang>.ts` produces the driver string from `(function_name, param_spec, return_spec)`:

- **python** (build first — most used): `sys.stdin` read, parse per spec, `print(canonical(globals()[fn](*args)))`.
- **javascript**: same shape with `fs.readFileSync(0)`.
- **cpp / c / java**: templated `main()` that parses and calls; more work (typed parsing), do after Python/JS prove the model.

The submit routes change from "send `source_code`" to "send `driver_prelude + source_code + driver_main`" **when `io_mode='function'`**; `stdio` problems keep the current path unchanged. This is a localized change in `runAllTestCases` callers (or push the composition into a `buildSubmission(problem, lang, userCode)` helper).

### 3.4 Migration path

1. Ship the schema columns (default `stdio` → zero behavior change).
2. Build the **Python + JS** drivers + the canonical serializer + `buildSubmission()`.
3. Convert a **handful** of problems to `io_mode='function'` (author `function_name`/`param_spec`/`return_spec`, regenerate `expected_stdout` from canonical form). Validate against a known-good reference solution per problem.
4. Update editor starters: function stub for `function` problems, stdin stub for `stdio`.
5. Add C++/Java/C drivers; convert the rest.

### 3.5 Bonus wins

- **Anti-cheat:** the harness lets you hide the literal I/O format and vary it, so copy-pasted solutions to the public problem don't trivially work.
- **Kills the NZEC/print-vs-return confusion** (#9) by construction.
- **Cleaner diagnostics:** the driver can emit a structured parse error ("could not read argument 2") instead of a raw runtime crash.

---

## 4. Recommendation & effort

- **Now:** Fix A (spec byte-exactness) on the live problems — low effort, immediately stops correct solutions scoring 0. Pairs with the diagnostics already shipped.
- **Next:** Fix B for **Python + JavaScript** only (covers most submissions), behind the `io_mode` flag so it's incremental and reversible. Rough effort: ~1–2 days for schema + serializer + 2 drivers + `buildSubmission()` + converting ~10 problems and validating.
- **Later:** C++/Java/C drivers.

Until Fix B lands for a given language, that language stays on the (now byte-exact) stdio path — no problem is ever in an ambiguous state, because behavior is gated on the per-problem `io_mode`.

---

## 5. Status (implemented)

Function mode is **live** for **Python, JavaScript, C++, and Java**. C is intentionally excluded (its array-by-pointer+size convention doesn't fit the uniform param model) — a function-mode problem attempted in C returns a clean 400. All 11 seeded problems are `io_mode='function'` (schema_v8 + v10). The editor shows a **typed** LeetCode-style stub per language.

## 6. Authoring a function-mode problem

### 6.1 Type system

| Harness type | stdin wire format | Python | JS | C++ | Java |
|---|---|---|---|---|---|
| `int` / `long` | one integer on a line | `int` | `number` | `int`/`long long` | `int`/`long` |
| `double` | one number on a line | `float` | `number` | `double` | `double` |
| `bool` | `true` / `false` | `bool` | `boolean` | `bool` | `boolean` |
| `string` | the whole line | `str` | `string` | `string` | `String` |
| `int[]` | space-separated ints on one line | `List[int]` | `number[]` | `vector<int>` | `int[]` |
| `string[]` | space-separated tokens on one line | `List[str]` | `string[]` | `vector<string>` | `String[]` |
| `int[][]` | a line with **row count R**, then R rows | `List[List[int]]` | `number[][]` | `vector<vector<int>>` | `int[][]` |
| `string[][]` | row count R, then R rows | `List[List[str]]` | `string[][]` | `vector<vector<string>>` | `String[][]` |

**Canonical output** (what `expected_stdout` must hold): scalars → `str`; `bool` → `true`/`false`; `int[]`/`string[]` → space-joined; `int[][]` → rows joined by newline. **`string[][]` is order-independent** — the driver sorts each group then sorts the groups, so `expected_stdout` must be in that sorted form (use the validator to generate it).

### 6.2 SQL template

```sql
update public.problems set
  io_mode='function',
  function_name='my_fn',
  param_spec='[{"name":"nums","type":"int[]"},{"name":"k","type":"int"}]'::jsonb,
  return_spec='{"type":"int"}'::jsonb
where slug='my-problem';
```
Write the description **function-style** ("Implement `my_fn(nums, k)` returning …"); do **not** include stdin/stdout format sections — the harness handles I/O.

### 6.3 Validate before shipping

Never trust a hand-written `expected_stdout`. Run a reference solution through the real driver:

```bash
node scripts/validate-harness.mjs spec.json solution.py        # or .js / .cpp / .java
```
`spec.json` = `{ function_name, param_spec, return_spec, test_cases:[{stdin,expected_stdout}] }`. The script composes the solution with the shipping harness and checks every case on the local toolchain (Python/JS/C++ always; Java needs a JDK). Green means the wiring — and your canonical `expected_stdout` — is correct.

### 6.4 Optional future work

A `/admin/problems` CRUD form (today DSA problems are SQL-authored) with `param_spec`/`return_spec` builders + a "validate" button that runs the check above. Not required for correctness; a convenience once problem volume grows.
