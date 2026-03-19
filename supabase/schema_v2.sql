-- ================================================================
-- ArenaX Schema v2 — Match Engine, Roadmap, Daily Streak
-- Run this in Supabase SQL Editor AFTER schema.sql
-- ================================================================

-- ── Alter problems: add match_duration_minutes ────────────────────
alter table public.problems
  add column if not exists match_duration_minutes integer not null default 30,
  add column if not exists test_cases jsonb not null default '[]'::jsonb;
-- test_cases format: [{ "stdin": "...", "expected_stdout": "..." }, ...]

-- ── Alter matches: add score + resign columns ────────────────────
alter table public.matches
  add column if not exists player_one_score     numeric(6,2) default null,
  add column if not exists player_two_score     numeric(6,2) default null,
  add column if not exists resigned_by          uuid references public.profiles(id),
  add column if not exists end_reason           text check (end_reason in ('ac', 'timeout', 'resign', 'draw'));

-- ── TABLE: matchmaking_queue ──────────────────────────────────────
create table if not exists public.matchmaking_queue (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  track      track_enum not null default 'dsa',
  joined_at  timestamptz not null default now(),
  status     text not null default 'waiting' check (status in ('waiting', 'matched', 'cancelled')),
  match_id   uuid references public.matches(id),
  unique (user_id, status) -- one active queue entry per user
);

create index if not exists idx_queue_status  on public.matchmaking_queue(status, joined_at);
create index if not exists idx_queue_user    on public.matchmaking_queue(user_id);

alter table public.matchmaking_queue enable row level security;

create policy "Users can see their own queue entry"
  on public.matchmaking_queue for select using (auth.uid() = user_id);

create policy "Users can insert own queue entry"
  on public.matchmaking_queue for insert with check (auth.uid() = user_id);

create policy "Users can update own queue entry"
  on public.matchmaking_queue for update using (auth.uid() = user_id);

-- ── FUNCTION: atomic matchmaking ─────────────────────────────────
-- Called from server action. Returns match_id if paired, null if waiting.
create or replace function public.try_match_players(
  p_user_id  uuid,
  p_track    track_enum default 'dsa'
)
returns uuid
language plpgsql
security definer
as $$
declare
  opponent_id   uuid;
  opponent_qid  uuid;
  new_match_id  uuid;
  problem_row   record;
  p1_elo        integer;
  p2_elo        integer;
begin
  -- Clean up stale entries older than 10 min
  update public.matchmaking_queue
    set status = 'cancelled'
    where status = 'waiting'
      and joined_at < now() - interval '10 minutes';

  -- Find a waiting opponent (not the same user, FIFO)
  select id, user_id into opponent_qid, opponent_id
  from public.matchmaking_queue
  where status = 'waiting'
    and track   = p_track
    and user_id != p_user_id
  order by joined_at asc
  limit 1
  for update skip locked;

  -- No opponent yet — just insert/update caller's entry
  if opponent_id is null then
    insert into public.matchmaking_queue (user_id, track, status)
    values (p_user_id, p_track, 'waiting')
    on conflict (user_id, status) do update set joined_at = now();
    return null;
  end if;

  -- Pick a random active problem for the track
  select * into problem_row
  from public.problems
  where track = p_track and is_active = true
  order by random()
  limit 1;

  if problem_row.id is null then
    raise exception 'No active problems available for track %', p_track;
  end if;

  -- Get ELO for both players
  select elo into p1_elo from public.user_ratings where user_id = p_user_id  and track = p_track;
  select elo into p2_elo from public.user_ratings where user_id = opponent_id and track = p_track;

  -- Create the match
  insert into public.matches (
    player_one_id, player_two_id, problem_id, track,
    player_one_elo_before, player_two_elo_before, status
  ) values (
    p_user_id, opponent_id, problem_row.id, p_track,
    coalesce(p1_elo, 800), coalesce(p2_elo, 800), 'in_progress'
  ) returning id into new_match_id;

  -- Mark both queue entries as matched
  update public.matchmaking_queue
    set status = 'matched', match_id = new_match_id
    where id = opponent_qid;

  insert into public.matchmaking_queue (user_id, track, status, match_id)
  values (p_user_id, p_track, 'matched', new_match_id)
  on conflict (user_id, status) do update
    set status = 'matched', match_id = new_match_id;

  return new_match_id;
end;
$$;

-- ── Realtime: enable broadcast for matches ───────────────────────
-- In Supabase dashboard: Database → Replication → enable matches + matchmaking_queue
-- (cannot do via SQL, must do in dashboard)

-- ================================================================
-- SEED: 10 problems
-- ================================================================
insert into public.problems (slug, title, description, difficulty, topics, track, is_active, match_duration_minutes, test_cases, elo_floor, elo_ceiling)
values

-- 1. Two Sum (Easy)
('two-sum',
'Two Sum',
E'## Problem\n\nGiven an array of integers `nums` and an integer `target`, return **indices** of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have **exactly one solution**, and you may not use the same element twice.\n\nYou can return the answer in any order.\n\n## Examples\n\n**Example 1:**\n```\nInput:  nums = [2,7,11,15], target = 9\nOutput: [0,1]\n```\n**Example 2:**\n```\nInput:  nums = [3,2,4], target = 6\nOutput: [1,2]\n```\n**Example 3:**\n```\nInput:  nums = [3,3], target = 6\nOutput: [0,1]\n```\n\n## Constraints\n- `2 <= nums.length <= 10^4`\n- `-10^9 <= nums[i] <= 10^9`\n- `-10^9 <= target <= 10^9`\n- Only one valid answer exists.\n\n## Input Format\nLine 1: space-separated integers (the array)\nLine 2: target integer\n\n## Output Format\nTwo space-separated integers (the indices)',
1,
ARRAY['arrays','hashing'],
'dsa', true, 20,
'[
  {"stdin": "2 7 11 15\n9",        "expected_stdout": "0 1"},
  {"stdin": "3 2 4\n6",            "expected_stdout": "1 2"},
  {"stdin": "3 3\n6",              "expected_stdout": "0 1"},
  {"stdin": "1 2 3 4 5\n9",        "expected_stdout": "3 4"},
  {"stdin": "-1 -2 -3 -4 -5\n-8",  "expected_stdout": "2 4"}
]'::jsonb,
600, 1000),

-- 2. Valid Parentheses (Easy)
('valid-parentheses',
'Valid Parentheses',
E'## Problem\n\nGiven a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is **valid**.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.\n\n## Examples\n\n**Example 1:**\n```\nInput:  s = "()\"\nOutput: true\n```\n**Example 2:**\n```\nInput:  s = "()[]{}\"\nOutput: true\n```\n**Example 3:**\n```\nInput:  s = "(]\"\nOutput: false\n```\n\n## Constraints\n- `1 <= s.length <= 10^4`\n- `s` consists of parentheses only `\'()[]{}\'`\n\n## Input Format\nA single string on one line.\n\n## Output Format\n`true` or `false`',
1,
ARRAY['stacks','strings'],
'dsa', true, 20,
'[
  {"stdin": "()",       "expected_stdout": "true"},
  {"stdin": "()[]{}",   "expected_stdout": "true"},
  {"stdin": "(]",       "expected_stdout": "false"},
  {"stdin": "([)]",     "expected_stdout": "false"},
  {"stdin": "{[]}",     "expected_stdout": "true"},
  {"stdin": "",         "expected_stdout": "true"},
  {"stdin": "(((",      "expected_stdout": "false"}
]'::jsonb,
600, 1000),

-- 3. Best Time to Buy and Sell Stock (Easy-Medium)
('best-time-to-buy-sell-stock',
'Best Time to Buy and Sell Stock',
E'## Problem\n\nYou are given an array `prices` where `prices[i]` is the price of a given stock on the `i`th day.\n\nYou want to maximize your profit by choosing a **single day** to buy one stock and choosing a **different day in the future** to sell that stock.\n\nReturn the **maximum profit** you can achieve from this transaction. If you cannot achieve any profit, return `0`.\n\n## Examples\n\n**Example 1:**\n```\nInput:  prices = [7,1,5,3,6,4]\nOutput: 5\nExplanation: Buy on day 2 (price=1), sell on day 5 (price=6). Profit = 6-1 = 5.\n```\n**Example 2:**\n```\nInput:  prices = [7,6,4,3,1]\nOutput: 0\nExplanation: No profit possible.\n```\n\n## Constraints\n- `1 <= prices.length <= 10^5`\n- `0 <= prices[i] <= 10^4`\n\n## Input Format\nSpace-separated integers on one line.\n\n## Output Format\nA single integer — max profit.',
2,
ARRAY['arrays','greedy'],
'dsa', true, 30,
'[
  {"stdin": "7 1 5 3 6 4",   "expected_stdout": "5"},
  {"stdin": "7 6 4 3 1",     "expected_stdout": "0"},
  {"stdin": "1 2",            "expected_stdout": "1"},
  {"stdin": "2 4 1",          "expected_stdout": "2"},
  {"stdin": "3 3 3 3",        "expected_stdout": "0"}
]'::jsonb,
800, 1200),

-- 4. Longest Substring Without Repeating Characters (Easy-Medium)
('longest-substring-no-repeat',
'Longest Substring Without Repeating Characters',
E'## Problem\n\nGiven a string `s`, find the length of the **longest substring** without repeating characters.\n\n## Examples\n\n**Example 1:**\n```\nInput:  s = "abcabcbb"\nOutput: 3\nExplanation: "abc" is the answer, with length 3.\n```\n**Example 2:**\n```\nInput:  s = "bbbbb"\nOutput: 1\nExplanation: "b" with length 1.\n```\n**Example 3:**\n```\nInput:  s = "pwwkew"\nOutput: 3\nExplanation: "wke" with length 3.\n```\n\n## Constraints\n- `0 <= s.length <= 5 * 10^4`\n- `s` consists of English letters, digits, symbols and spaces.\n\n## Input Format\nA single string on one line.\n\n## Output Format\nA single integer.',
2,
ARRAY['sliding window','strings','hashing'],
'dsa', true, 30,
'[
  {"stdin": "abcabcbb",  "expected_stdout": "3"},
  {"stdin": "bbbbb",     "expected_stdout": "1"},
  {"stdin": "pwwkew",    "expected_stdout": "3"},
  {"stdin": "",          "expected_stdout": "0"},
  {"stdin": "dvdf",      "expected_stdout": "3"},
  {"stdin": "aab",       "expected_stdout": "2"}
]'::jsonb,
800, 1200),

-- 5. Container With Most Water (Medium)
('container-with-most-water',
'Container With Most Water',
E'## Problem\n\nYou are given an integer array `height` of length `n`. There are `n` vertical lines drawn such that the two endpoints of the `i`th line are `(i, 0)` and `(i, height[i])`.\n\nFind two lines that together with the x-axis form a container that contains the **most water**.\n\nReturn the **maximum amount of water** a container can store.\n\n**Note:** You may not slant the container.\n\n## Examples\n\n**Example 1:**\n```\nInput:  height = [1,8,6,2,5,4,8,3,7]\nOutput: 49\n```\n**Example 2:**\n```\nInput:  height = [1,1]\nOutput: 1\n```\n\n## Constraints\n- `n == height.length`\n- `2 <= n <= 10^5`\n- `0 <= height[i] <= 10^4`\n\n## Input Format\nSpace-separated integers on one line.\n\n## Output Format\nA single integer.',
3,
ARRAY['two pointers','arrays'],
'dsa', true, 45,
'[
  {"stdin": "1 8 6 2 5 4 8 3 7",  "expected_stdout": "49"},
  {"stdin": "1 1",                  "expected_stdout": "1"},
  {"stdin": "4 3 2 1 4",            "expected_stdout": "16"},
  {"stdin": "1 2 1",                "expected_stdout": "2"},
  {"stdin": "2 3 4 5 18 17 6",      "expected_stdout": "17"}
]'::jsonb,
1000, 1400),

-- 6. Group Anagrams (Medium)
('group-anagrams',
'Group Anagrams',
E'## Problem\n\nGiven an array of strings `strs`, group the **anagrams** together. You can return the answer in **any order**.\n\nAn **anagram** is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.\n\n## Examples\n\n**Example 1:**\n```\nInput:  strs = ["eat","tea","tan","ate","nat","bat"]\nOutput: [["bat"],["nat","tan"],["ate","eat","tea"]]\n```\n**Example 2:**\n```\nInput:  strs = [""]\nOutput: [[""]]\n```\n**Example 3:**\n```\nInput:  strs = ["a"]\nOutput: [["a"]]\n```\n\n## Constraints\n- `1 <= strs.length <= 10^4`\n- `0 <= strs[i].length <= 100`\n- `strs[i]` consists of lowercase English letters.\n\n## Input Format\nSpace-separated strings on one line.\n\n## Output Format\nGroups on separate lines. Within each group, words are space-separated and sorted alphabetically. Groups are sorted by their first word.',
3,
ARRAY['hashing','strings','sorting'],
'dsa', true, 45,
'[
  {"stdin": "eat tea tan ate nat bat",  "expected_stdout": "bat\nate eat tea\nnat tan"},
  {"stdin": "a",                         "expected_stdout": "a"},
  {"stdin": "ab ba abc bca cab",         "expected_stdout": "ab ba\nabc bca cab"}
]'::jsonb,
1000, 1400),

-- 7. Product of Array Except Self (Medium)
('product-except-self',
'Product of Array Except Self',
E'## Problem\n\nGiven an integer array `nums`, return an array `answer` such that `answer[i]` is equal to the **product of all the elements** of `nums` except `nums[i]`.\n\nThe product of any prefix or suffix of `nums` is **guaranteed** to fit in a **32-bit** integer.\n\nYou must write an algorithm that runs in **O(n)** time and **without using the division operation**.\n\n## Examples\n\n**Example 1:**\n```\nInput:  nums = [1,2,3,4]\nOutput: [24,12,8,6]\n```\n**Example 2:**\n```\nInput:  nums = [-1,1,0,-3,3]\nOutput: [0,0,9,0,0]\n```\n\n## Constraints\n- `2 <= nums.length <= 10^5`\n- `-30 <= nums[i] <= 30`\n- The product of any prefix or suffix fits in a 32-bit integer.\n\n## Input Format\nSpace-separated integers on one line.\n\n## Output Format\nSpace-separated integers on one line.',
3,
ARRAY['arrays','prefix sum'],
'dsa', true, 45,
'[
  {"stdin": "1 2 3 4",       "expected_stdout": "24 12 8 6"},
  {"stdin": "-1 1 0 -3 3",   "expected_stdout": "0 0 9 0 0"},
  {"stdin": "2 3",            "expected_stdout": "3 2"},
  {"stdin": "0 0",            "expected_stdout": "0 0"},
  {"stdin": "1 1 1 1",        "expected_stdout": "1 1 1 1"}
]'::jsonb,
1000, 1400),

-- 8. Longest Palindromic Substring (Medium-Hard)
('longest-palindromic-substring',
'Longest Palindromic Substring',
E'## Problem\n\nGiven a string `s`, return the **longest palindromic substring** in `s`.\n\nA string is a palindrome if it reads the same forward and backward.\n\n## Examples\n\n**Example 1:**\n```\nInput:  s = "babad"\nOutput: "bab"\nExplanation: "aba" is also a valid answer.\n```\n**Example 2:**\n```\nInput:  s = "cbbd"\nOutput: "bb"\n```\n\n## Constraints\n- `1 <= s.length <= 1000`\n- `s` consists of only digits and English letters.\n\n## Input Format\nA single string on one line.\n\n## Output Format\nThe longest palindromic substring. If multiple answers exist, print any one.',
4,
ARRAY['strings','dynamic programming'],
'dsa', true, 60,
'[
  {"stdin": "babad",   "expected_stdout": "bab"},
  {"stdin": "cbbd",    "expected_stdout": "bb"},
  {"stdin": "a",       "expected_stdout": "a"},
  {"stdin": "racecar", "expected_stdout": "racecar"},
  {"stdin": "abcba",   "expected_stdout": "abcba"}
]'::jsonb,
1200, 1600),

-- 9. Minimum Path Sum (Medium-Hard)
('minimum-path-sum',
'Minimum Path Sum',
E'## Problem\n\nGiven a `m x n` grid filled with **non-negative numbers**, find a path from **top left** to **bottom right**, which minimizes the sum of all numbers along its path.\n\n**Note:** You can only move either **down** or **right** at any point in time.\n\n## Examples\n\n**Example 1:**\n```\nInput:\n3 1 1\n1 5 1\n4 2 1\nOutput: 7\nExplanation: Path 3→1→1→1→1 = 7\n```\n**Example 2:**\n```\nInput:\n1 2 3\n4 5 6\nOutput: 12\n```\n\n## Constraints\n- `m == grid.length`, `n == grid[i].length`\n- `1 <= m, n <= 200`\n- `0 <= grid[i][j] <= 200`\n\n## Input Format\nFirst line: two integers m n\nNext m lines: n space-separated integers each\n\n## Output Format\nA single integer — the minimum path sum.',
4,
ARRAY['dynamic programming','grids'],
'dsa', true, 60,
'[
  {"stdin": "3 3\n3 1 1\n1 5 1\n4 2 1",  "expected_stdout": "7"},
  {"stdin": "2 3\n1 2 3\n4 5 6",          "expected_stdout": "12"},
  {"stdin": "1 1\n5",                      "expected_stdout": "5"},
  {"stdin": "2 2\n1 3\n1 5",              "expected_stdout": "7"},
  {"stdin": "3 3\n1 2 3\n4 5 6\n7 8 9",  "expected_stdout": "21"}
]'::jsonb,
1200, 1600),

-- 10. Word Break (Hard)
('word-break',
'Word Break',
E'## Problem\n\nGiven a string `s` and a dictionary of strings `wordDict`, return `true` if `s` can be segmented into a space-separated sequence of one or more dictionary words.\n\n**Note:** The same word in the dictionary may be reused multiple times in the segmentation.\n\n## Examples\n\n**Example 1:**\n```\nInput:  s = "leetcode", wordDict = ["leet","code"]\nOutput: true\nExplanation: "leetcode" = "leet" + "code"\n```\n**Example 2:**\n```\nInput:  s = "applepenapple", wordDict = ["apple","pen"]\nOutput: true\n```\n**Example 3:**\n```\nInput:  s = "catsandog", wordDict = ["cats","dog","sand","and","cat"]\nOutput: false\n```\n\n## Constraints\n- `1 <= s.length <= 300`\n- `1 <= wordDict.length <= 1000`\n- `1 <= wordDict[i].length <= 20`\n- `s` and `wordDict[i]` consist of only lowercase English letters.\n- All strings in `wordDict` are unique.\n\n## Input Format\nLine 1: the string `s`\nLine 2: space-separated words of the dictionary\n\n## Output Format\n`true` or `false`',
5,
ARRAY['dynamic programming','strings'],
'dsa', true, 90,
'[
  {"stdin": "leetcode\nleet code",                          "expected_stdout": "true"},
  {"stdin": "applepenapple\napple pen",                    "expected_stdout": "true"},
  {"stdin": "catsandog\ncats dog sand and cat",            "expected_stdout": "false"},
  {"stdin": "cars\ncar ca rs",                             "expected_stdout": "true"},
  {"stdin": "aaaaaaa\naaa aaaa",                           "expected_stdout": "true"},
  {"stdin": "goalspecial\ngo goal goals special",          "expected_stdout": "false"}
]'::jsonb,
1400, 2400);

-- ================================================================
-- RLS: allow service role to update matches (needed for ELO update)
-- ================================================================
drop policy if exists "Service role can update matches" on public.matches;
create policy "Service role can update matches"
  on public.matches for all using (auth.role() = 'service_role');

-- Allow players to read their match
drop policy if exists "Players can view own matches" on public.matches;
create policy "Players can view own matches"
  on public.matches for select
  using (auth.uid() = player_one_id or auth.uid() = player_two_id);

-- ================================================================
-- Done! Next steps:
-- 1. In Supabase dashboard: Database → Replication → enable realtime
--    for tables: matches, matchmaking_queue
-- 2. Add JUDGE0_API_URL and JUDGE0_API_KEY to .env.local (when self-hosted)
-- ================================================================