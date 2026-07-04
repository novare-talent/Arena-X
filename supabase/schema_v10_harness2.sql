-- ================================================================
-- ArenaX Schema v10 — Finish function-mode conversion (Phase 2)
-- Run in Supabase SQL Editor (after v8/v9). Additive/idempotent.
--
-- Converts the last 3 seeded problems to io_mode='function':
--   • word-break        (string, string[]) -> bool     — no test-data change
--   • minimum-path-sum  (int[][])          -> int      — stdin reformatted to
--       the harness grid format: first line = row count, then each row
--   • group-anagrams    (string[])         -> string[][]— expected regenerated
--       to the canonical order (sort within group, then sort groups)
--
-- Descriptions are rewritten function-style (original prose, review #11).
-- ⚠️ Run AFTER deploying the app that has the string[][] + int[][] harness.
-- ================================================================

-- ── word-break ────────────────────────────────────────────────────
update public.problems set
  io_mode='function', function_name='word_break',
  param_spec='[{"name":"s","type":"string"},{"name":"words","type":"string[]"}]'::jsonb,
  return_spec='{"type":"bool"}'::jsonb,
  title='Word Break',
  description=E'## Problem\n\nGiven a string `s` and a list of words `words`, decide whether `s` can be formed by concatenating one or more words from the list. A word may be reused any number of times.\n\n## Function\nImplement `word_break(s, words)` returning a boolean.\n\n## Examples\n```\nword_break("leetcode", ["leet", "code"])                     -> true\nword_break("applepenapple", ["apple", "pen"])                -> true\nword_break("catsandog", ["cats","dog","sand","and","cat"])   -> false\n```\n\n## Constraints\n- `1 <= len(s) <= 300`\n- `1 <= len(words) <= 1000`; each word is 1..20 lowercase letters and unique.'
where slug='word-break';

-- ── minimum-path-sum (reformat stdin to row-count grid) ───────────
update public.problems set
  io_mode='function', function_name='min_path_sum',
  param_spec='[{"name":"grid","type":"int[][]"}]'::jsonb,
  return_spec='{"type":"int"}'::jsonb,
  title='Minimum Path Sum',
  description=E'## Problem\n\nYou are given a grid of non-negative integers. Starting at the top-left cell and moving only **right** or **down**, reach the bottom-right cell. Return the smallest possible sum of the numbers along such a path.\n\n## Function\nImplement `min_path_sum(grid)` returning an integer.\n\n## Examples\n```\nmin_path_sum([[3,1,1],[1,5,1],[4,2,1]]) -> 7\nmin_path_sum([[1,2,3],[4,5,6]])         -> 12\n```\n\n## Constraints\n- `1 <= rows, cols <= 200`\n- `0 <= grid[i][j] <= 200`',
  test_cases='[
    {"stdin": "3\n3 1 1\n1 5 1\n4 2 1", "expected_stdout": "7"},
    {"stdin": "2\n1 2 3\n4 5 6",        "expected_stdout": "12"},
    {"stdin": "1\n5",                    "expected_stdout": "5"},
    {"stdin": "2\n1 3\n1 5",            "expected_stdout": "7"},
    {"stdin": "3\n1 2 3\n4 5 6\n7 8 9", "expected_stdout": "21"}
  ]'::jsonb
where slug='minimum-path-sum';

-- ── group-anagrams (canonical expected order) ─────────────────────
update public.problems set
  io_mode='function', function_name='group_anagrams',
  param_spec='[{"name":"strs","type":"string[]"}]'::jsonb,
  return_spec='{"type":"string[][]"}'::jsonb,
  title='Group Anagrams',
  description=E'## Problem\n\nGiven a list of lowercase words `strs`, group together the words that are anagrams of each other (same letters in any order). Return the groups as a list of lists. Order does not matter — groups and the words inside them are compared after a canonical sort.\n\n## Function\nImplement `group_anagrams(strs)` returning a list of string lists.\n\n## Examples\n```\ngroup_anagrams(["eat","tea","tan","ate","nat","bat"])\n  -> [["ate","eat","tea"], ["bat"], ["nat","tan"]]\n```\n\n## Constraints\n- `1 <= len(strs) <= 10^4`\n- each word is 0..100 lowercase letters.',
  test_cases='[
    {"stdin": "eat tea tan ate nat bat", "expected_stdout": "ate eat tea\nbat\nnat tan"},
    {"stdin": "a",                        "expected_stdout": "a"},
    {"stdin": "ab ba abc bca cab",        "expected_stdout": "ab ba\nabc bca cab"}
  ]'::jsonb
where slug='group-anagrams';

-- ================================================================
-- Done. All 11 seeded problems are now io_mode='function'. Verify each with a
-- reference solution (see scripts/validate-harness.mjs).
-- ================================================================
