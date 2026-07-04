-- ================================================================
-- ArenaX Schema v9 — De-duplicate problem content, round 2 (review #11)
-- Run in Supabase SQL Editor (after v8).
--
-- Rewrites 6 more verbatim-LeetCode problems with ORIGINAL prose. These were
-- converted to io_mode='function' in v8, so the descriptions are also reframed
-- in function terms ("implement f(...) and return ...") and the stale
-- stdin/stdout "Input Format" sections are dropped — which ALSO removes the
-- return-vs-print confusion (#8) for these problems.
--
-- Only title + description change. Slugs, function_name, param_spec,
-- return_spec and test_cases are untouched, so judging is unaffected.
-- ================================================================

update public.problems set title = 'Pair Sum Indices',
  description = E'## Problem\n\nYou are given an integer array `nums` and a value `target`. Exactly one pair of **distinct positions** in `nums` adds up to `target`. Return those two positions as a list `[i, j]` (either order is accepted). You may not use the same position twice.\n\n## Function\nImplement `two_sum(nums, target)` and **return** the list of two indices.\n\n## Examples\n```\ntwo_sum([2, 7, 11, 15], 9) -> [0, 1]   # 2 + 7 = 9\ntwo_sum([3, 2, 4], 6)      -> [1, 2]\ntwo_sum([3, 3], 6)         -> [0, 1]\n```\n\n## Constraints\n- `2 <= len(nums) <= 10^4`\n- `-10^9 <= nums[i], target <= 10^9`\n- Exactly one valid pair exists.'
where slug = 'two-sum';

update public.problems set title = 'Bracket Balance',
  description = E'## Problem\n\nA string `s` is built only from the bracket characters `()[]{}`. Call it **balanced** when every opening bracket is later closed by a bracket of the same kind, and brackets close in the reverse of the order they opened. An empty string is balanced.\n\nReturn `true` when `s` is balanced, otherwise `false`.\n\n## Function\nImplement `is_valid(s)` returning a boolean.\n\n## Examples\n```\nis_valid("()[]{}") -> true\nis_valid("(]")     -> false\nis_valid("([)]")   -> false\nis_valid("{[]}")   -> true\n```\n\n## Constraints\n- `0 <= len(s) <= 10^4`\n- `s` contains only the characters ()[]{}.'
where slug = 'valid-parentheses';

update public.problems set title = 'Single Trade Profit',
  description = E'## Problem\n\n`prices[i]` is the price of an asset on day `i`. You may buy on one day and sell on a **strictly later** day, at most once. Return the largest profit you can make, or `0` if no trade is profitable.\n\n## Function\nImplement `max_profit(prices)` returning an integer.\n\n## Examples\n```\nmax_profit([7, 1, 5, 3, 6, 4]) -> 5   # buy at 1, sell at 6\nmax_profit([7, 6, 4, 3, 1])    -> 0   # prices only fall\n```\n\n## Constraints\n- `1 <= len(prices) <= 10^5`\n- `0 <= prices[i] <= 10^4`'
where slug = 'best-time-to-buy-sell-stock';

update public.problems set title = 'Longest Unique Run',
  description = E'## Problem\n\nGiven a string `s`, find the length of the longest **contiguous** block of characters in which no character appears more than once.\n\n## Function\nImplement `length_of_longest_substring(s)` returning an integer.\n\n## Examples\n```\nlength_of_longest_substring("abcabcbb") -> 3   # "abc"\nlength_of_longest_substring("bbbbb")    -> 1   # "b"\nlength_of_longest_substring("pwwkew")   -> 3   # "wke"\n```\n\n## Constraints\n- `0 <= len(s) <= 5 * 10^4`\n- `s` may contain letters, digits, symbols, and spaces.'
where slug = 'longest-substring-no-repeat';

update public.problems set title = 'Widest Basin',
  description = E'## Problem\n\nEach value in `height` is the height of a vertical wall, and the walls stand one unit apart along a line. Choosing any two walls, the water trapped between them equals the **shorter** of the two heights multiplied by the horizontal distance between them. Return the most water any pair of walls can hold.\n\n## Function\nImplement `max_area(height)` returning an integer.\n\n## Examples\n```\nmax_area([1, 8, 6, 2, 5, 4, 8, 3, 7]) -> 49\nmax_area([1, 1])                      -> 1\n```\n\n## Constraints\n- `2 <= len(height) <= 10^5`\n- `0 <= height[i] <= 10^4`'
where slug = 'container-with-most-water';

update public.problems set title = 'Products Without Self',
  description = E'## Problem\n\nGiven an integer array `nums`, return a new array `out` where `out[i]` is the product of **every element except** `nums[i]`. Do it without using division and in linear time.\n\n## Function\nImplement `product_except_self(nums)` returning a list of integers.\n\n## Examples\n```\nproduct_except_self([1, 2, 3, 4])      -> [24, 12, 8, 6]\nproduct_except_self([-1, 1, 0, -3, 3]) -> [0, 0, 9, 0, 0]\n```\n\n## Constraints\n- `2 <= len(nums) <= 10^5`\n- Every prefix/suffix product fits in a 32-bit integer.'
where slug = 'product-except-self';

-- ================================================================
-- Still original-worded but NOT yet done (more complex I/O, still on the
-- stdio path): group-anagrams, minimum-path-sum, word-break. Reword those
-- next if you want the whole bank clean.
-- ================================================================
