-- ================================================================
-- ArenaX Schema v8 — Function-execution harness (review #8)
-- Run in Supabase SQL Editor. Additive + idempotent.
--
-- Adds io_mode + function spec to problems, and converts the problems whose
-- inputs/outputs map cleanly onto the harness type system to io_mode='function'.
-- Their existing test_cases.expected_stdout is ALREADY the canonical
-- serialization of the return value, so no test data needs to change.
--
-- ⚠️ DEPLOY ORDER: ship the app first (it composes the driver only when
-- io_mode='function'). Until this runs, every problem stays 'stdio' (no change).
--
-- Type system: int, long, double, bool, string, int[], string[], int[][].
-- stdin wire format: one value per line; arrays = space-separated on one line.
-- ================================================================

alter table public.problems
  add column if not exists io_mode       text not null default 'stdio'
       check (io_mode in ('stdio','function')),
  add column if not exists function_name text,
  add column if not exists param_spec    jsonb,
  add column if not exists return_spec   jsonb;

-- ── Conversions (slug → function spec) ────────────────────────────
update public.problems set io_mode='function', function_name='two_sum',
  param_spec='[{"name":"nums","type":"int[]"},{"name":"target","type":"int"}]'::jsonb,
  return_spec='{"type":"int[]"}'::jsonb
where slug='two-sum';

update public.problems set io_mode='function', function_name='is_valid',
  param_spec='[{"name":"s","type":"string"}]'::jsonb,
  return_spec='{"type":"bool"}'::jsonb
where slug='valid-parentheses';

update public.problems set io_mode='function', function_name='max_profit',
  param_spec='[{"name":"prices","type":"int[]"}]'::jsonb,
  return_spec='{"type":"int"}'::jsonb
where slug='best-time-to-buy-sell-stock';

update public.problems set io_mode='function', function_name='length_of_longest_substring',
  param_spec='[{"name":"s","type":"string"}]'::jsonb,
  return_spec='{"type":"int"}'::jsonb
where slug='longest-substring-no-repeat';

update public.problems set io_mode='function', function_name='max_area',
  param_spec='[{"name":"height","type":"int[]"}]'::jsonb,
  return_spec='{"type":"int"}'::jsonb
where slug='container-with-most-water';

update public.problems set io_mode='function', function_name='product_except_self',
  param_spec='[{"name":"nums","type":"int[]"}]'::jsonb,
  return_spec='{"type":"int[]"}'::jsonb
where slug='product-except-self';

update public.problems set io_mode='function', function_name='longest_palindrome',
  param_spec='[{"name":"s","type":"string"}]'::jsonb,
  return_spec='{"type":"string"}'::jsonb
where slug='longest-palindromic-substring';

update public.problems set io_mode='function', function_name='word_break',
  param_spec='[{"name":"s","type":"string"},{"name":"words","type":"string[]"}]'::jsonb,
  return_spec='{"type":"bool"}'::jsonb
where slug='word-break';

-- NOT converted (keep stdio — output/input doesn't fit the simple harness yet):
--   group-anagrams   (multi-line grouped output)
--   minimum-path-sum (matrix with an "m n" header line, not row-count prefixed)
-- These still judge correctly on the stdio path.

-- ================================================================
-- Done. function_name / param_spec / return_spec are SAFE to expose to the
-- client (they describe the signature, not the answers); the app adds them to
-- PROBLEM_PUBLIC_COLUMNS so the editor can show a function stub.
-- ================================================================
