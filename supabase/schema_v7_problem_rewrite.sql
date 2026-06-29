-- ================================================================
-- ArenaX Schema v7 — De-duplicate problem content (review #11)
-- Run in Supabase SQL Editor.
--
-- The review flagged two problems as VERBATIM LeetCode copies (#5 Longest
-- Palindromic Substring, #125 Valid Palindrome). Copyrighted text + it kills
-- anti-cheat (published solutions exist). These UPDATEs replace the title and
-- description with original phrasing while keeping the SAME algorithm and the
-- SAME stdin/stdout contract (so existing test_cases still pass).
--
-- Slugs are left unchanged (internal id; matches reference problem_id, not slug).
-- If a slug below doesn't exist on this DB, that UPDATE simply affects 0 rows.
--
-- NOTE: every seeded problem is a LeetCode classic. Treat this file as the
-- pattern and give the rest the same original-rewrite pass before any
-- commercial launch — or license the content.
-- ================================================================

-- ── #5 → "Longest Mirror Segment" ─────────────────────────────────
update public.problems
set title = 'Longest Mirror Segment',
    description = E'## Problem\n\nA string is a **mirror** when it reads the same left-to-right as right-to-left (for example `level` or `noon`). Given a string `s`, find the longest contiguous slice of `s` that is a mirror and print it.\n\nIf several slices tie for the longest length, print any one of them.\n\n## Examples\n\n**Example 1**\n```\nInput:  babad\nOutput: bab\n```\nThe slice `aba` would also be accepted.\n\n**Example 2**\n```\nInput:  cbbd\nOutput: bb\n```\n\n## Constraints\n- `1 <= |s| <= 1000`\n- `s` contains only letters and digits.\n\n## Input Format\nA single line containing `s`.\n\n## Output Format\nThe longest mirror slice. If multiple answers tie, print any one.'
where slug = 'longest-palindromic-substring';

-- ── #125 → "Clean Mirror Check" ───────────────────────────────────
update public.problems
set title = 'Clean Mirror Check',
    description = E'## Problem\n\nCall a string **clean-symmetric** if — after deleting every character that is not a letter or digit and treating uppercase and lowercase as equal — the characters that remain read identically forwards and backwards. An empty leftover counts as clean-symmetric.\n\nGiven a string `s`, print `true` if it is clean-symmetric, otherwise print `false`.\n\n## Examples\n\n**Example 1**\n```\nInput:  A man, a plan, a canal: Panama\nOutput: true\n```\n\n**Example 2**\n```\nInput:  race a car\nOutput: false\n```\n\n## Constraints\n- `1 <= |s| <= 2 * 10^5`\n- `s` consists of printable ASCII characters.\n\n## Input Format\nA single line containing `s`.\n\n## Output Format\n`true` or `false`.'
where slug = 'valid-palindrome';

-- ================================================================
-- Done. Verify the two problems render with the new titles/prose and that
-- their existing test cases still pass an intended reference solution.
-- ================================================================
