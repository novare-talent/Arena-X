-- ─────────────────────────────────────────────────────────────────────────────
-- Schema v4 — Custom Rooms + More DSA Problems
-- Run this in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: rooms
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.rooms (
  id           uuid primary key default gen_random_uuid(),
  code         text unique not null default upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
  host_id      uuid not null references public.profiles(id) on delete cascade,
  title        text not null default 'Untitled Room',
  mode         text not null default 'standard'
                 check (mode in ('standard', 'blitz', 'sudden_death', 'speed_run', 'marathon')),
  status       text not null default 'lobby'
                 check (status in ('lobby', 'active', 'completed')),
  visibility   text not null default 'private'
                 check (visibility in ('private', 'public')),
  max_players  integer not null default 8 check (max_players between 2 and 8),
  settings     jsonb not null default '{}'::jsonb,
  -- settings shape: { topics: string[], difficulty: string, num_questions: int, time_limit_minutes: int }
  started_at   timestamptz,
  ends_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index idx_rooms_code   on public.rooms(code);
create index idx_rooms_status on public.rooms(status, visibility);
create index idx_rooms_host   on public.rooms(host_id);

alter table public.rooms enable row level security;

create policy "Anyone can view rooms"
  on public.rooms for select using (true);

create policy "Authenticated users can create rooms"
  on public.rooms for insert with check (auth.uid() = host_id);

create policy "Host can update room"
  on public.rooms for update using (auth.uid() = host_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: room_participants
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.room_participants (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.rooms(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  status      text not null default 'active'
                check (status in ('active', 'eliminated', 'finished', 'left')),
  score       integer not null default 0,
  rank        integer,
  finished_at timestamptz,
  joined_at   timestamptz not null default now(),
  unique(room_id, user_id)
);

create index idx_room_participants_room on public.room_participants(room_id);
create index idx_room_participants_user on public.room_participants(user_id);

alter table public.room_participants enable row level security;

create policy "Anyone can view room participants"
  on public.room_participants for select using (true);

create policy "Users can join rooms"
  on public.room_participants for insert with check (auth.uid() = user_id);

create policy "Users can update own participation"
  on public.room_participants for update using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: room_problems
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.room_problems (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.rooms(id) on delete cascade,
  problem_id  uuid not null references public.problems(id),
  order_index integer not null,
  unique(room_id, order_index),
  unique(room_id, problem_id)
);

create index idx_room_problems_room on public.room_problems(room_id, order_index);

alter table public.room_problems enable row level security;

create policy "Anyone can view room problems"
  on public.room_problems for select using (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: room_submissions
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.room_submissions (
  id              uuid primary key default gen_random_uuid(),
  room_id         uuid not null references public.rooms(id) on delete cascade,
  user_id         uuid not null references public.profiles(id),
  problem_id      uuid not null references public.problems(id),
  language        text not null default 'python',
  code            text,
  verdict         text not null default 'pending'
                    check (verdict in ('pending','accepted','wrong_answer','tle','error')),
  score           integer not null default 0,
  passed_cases    integer not null default 0,
  total_cases     integer not null default 0,
  solve_time_ms   bigint,
  submitted_at    timestamptz not null default now()
);

create index idx_room_submissions_room    on public.room_submissions(room_id);
create index idx_room_submissions_user    on public.room_submissions(room_id, user_id);
create index idx_room_submissions_problem on public.room_submissions(room_id, problem_id, verdict);

alter table public.room_submissions enable row level security;

create policy "Participants can view room submissions"
  on public.room_submissions for select
  using (
    exists (
      select 1 from public.room_participants rp
      where rp.room_id = room_submissions.room_id
        and rp.user_id = auth.uid()
    )
  );

create policy "Users can submit to rooms they are in"
  on public.room_submissions for insert
  with check (
    auth.uid() = user_id and
    exists (
      select 1 from public.room_participants rp
      where rp.room_id = room_submissions.room_id
        and rp.user_id = auth.uid()
        and rp.status = 'active'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Enable Realtime
-- ─────────────────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_participants;
alter publication supabase_realtime add table public.room_submissions;

-- ─────────────────────────────────────────────────────────────────────────────
-- More DSA Problems (25 new problems, difficulties 1-5)
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.problems (slug, title, description, difficulty, topics, track, is_active, match_duration_minutes, test_cases, elo_floor, elo_ceiling)
values

-- Easy (difficulty 1)
('reverse-string',
'Reverse a String',
E'## Problem\n\nWrite a function that reverses a string. The input string is given as an array of characters `s`.\n\nYou must do this by modifying the input array in-place with O(1) extra memory.\n\n## Examples\n\n**Example 1:**\n```\nInput:  s = "hello"\nOutput: "olleh"\n```\n**Example 2:**\n```\nInput:  s = "Hannah"\nOutput: "hannaH"\n```\n\n## Constraints\n- `1 <= s.length <= 10^5`\n- `s[i]` is a printable ASCII character.\n\n## Input Format\nA single string on one line.\n\n## Output Format\nThe reversed string.',
1, ARRAY['strings','two-pointers'], 'dsa', true, 15,
'[
  {"stdin": "hello",      "expected_stdout": "olleh"},
  {"stdin": "Hannah",     "expected_stdout": "hannaH"},
  {"stdin": "a",          "expected_stdout": "a"},
  {"stdin": "ab",         "expected_stdout": "ba"},
  {"stdin": "racecar",    "expected_stdout": "racecar"}
]'::jsonb, 0, 1000),

('fizzbuzz',
'FizzBuzz',
E'## Problem\n\nGiven an integer `n`, return a string array `answer` (1-indexed) where:\n- `answer[i] == "FizzBuzz"` if `i` is divisible by 3 and 5.\n- `answer[i] == "Fizz"` if `i` is divisible by 3.\n- `answer[i] == "Buzz"` if `i` is divisible by 5.\n- `answer[i] == i` (as a string) otherwise.\n\n## Examples\n\n**Example 1:**\n```\nInput:  n = 5\nOutput: 1 2 Fizz 4 Buzz\n```\n**Example 2:**\n```\nInput:  n = 15\nOutput: 1 2 Fizz 4 Buzz Fizz 7 8 Fizz Buzz 11 Fizz 13 14 FizzBuzz\n```\n\n## Input Format\nA single integer `n`.\n\n## Output Format\nSpace-separated values on one line.',
1, ARRAY['math','strings'], 'dsa', true, 15,
'[
  {"stdin": "5",  "expected_stdout": "1 2 Fizz 4 Buzz"},
  {"stdin": "3",  "expected_stdout": "1 2 Fizz"},
  {"stdin": "15", "expected_stdout": "1 2 Fizz 4 Buzz Fizz 7 8 Fizz Buzz 11 Fizz 13 14 FizzBuzz"},
  {"stdin": "1",  "expected_stdout": "1"},
  {"stdin": "10", "expected_stdout": "1 2 Fizz 4 Buzz Fizz 7 8 Fizz Buzz"}
]'::jsonb, 0, 900),

('contains-duplicate',
'Contains Duplicate',
E'## Problem\n\nGiven an integer array `nums`, return `true` if any value appears **at least twice** in the array, and return `false` if every element is distinct.\n\n## Examples\n\n**Example 1:**\n```\nInput:  nums = [1,2,3,1]\nOutput: true\n```\n**Example 2:**\n```\nInput:  nums = [1,2,3,4]\nOutput: false\n```\n**Example 3:**\n```\nInput:  nums = [1,1,1,3,3,4,3,2,4,2]\nOutput: true\n```\n\n## Constraints\n- `1 <= nums.length <= 10^5`\n- `-10^9 <= nums[i] <= 10^9`\n\n## Input Format\nSpace-separated integers on one line.\n\n## Output Format\n`true` or `false`',
1, ARRAY['arrays','hashing'], 'dsa', true, 15,
'[
  {"stdin": "1 2 3 1",          "expected_stdout": "true"},
  {"stdin": "1 2 3 4",          "expected_stdout": "false"},
  {"stdin": "1 1 1 3 3 4",      "expected_stdout": "true"},
  {"stdin": "5",                 "expected_stdout": "false"},
  {"stdin": "0 0",               "expected_stdout": "true"}
]'::jsonb, 0, 900),

('palindrome-check',
'Valid Palindrome',
E'## Problem\n\nA phrase is a **palindrome** if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.\n\nGiven a string `s`, return `true` if it is a palindrome, or `false` otherwise.\n\n## Examples\n\n**Example 1:**\n```\nInput:  s = "A man, a plan, a canal: Panama"\nOutput: true\n```\n**Example 2:**\n```\nInput:  s = "race a car"\nOutput: false\n```\n**Example 3:**\n```\nInput:  s = " "\nOutput: true\n```\n\n## Input Format\nA single string (may include spaces and punctuation).\n\n## Output Format\n`true` or `false`',
1, ARRAY['strings','two-pointers'], 'dsa', true, 15,
'[
  {"stdin": "A man, a plan, a canal: Panama", "expected_stdout": "true"},
  {"stdin": "race a car",                      "expected_stdout": "false"},
  {"stdin": " ",                               "expected_stdout": "true"},
  {"stdin": "Was it a car or a cat I saw?",    "expected_stdout": "true"},
  {"stdin": "hello",                            "expected_stdout": "false"}
]'::jsonb, 0, 900),

('missing-number',
'Missing Number',
E'## Problem\n\nGiven an array `nums` containing `n` distinct numbers in the range `[0, n]`, return the only number in the range that is missing from the array.\n\n## Examples\n\n**Example 1:**\n```\nInput:  nums = [3,0,1]\nOutput: 2\n```\n**Example 2:**\n```\nInput:  nums = [0,1]\nOutput: 2\n```\n**Example 3:**\n```\nInput:  nums = [9,6,4,2,3,5,7,0,1]\nOutput: 8\n```\n\n## Input Format\nSpace-separated integers on one line.\n\n## Output Format\nA single integer.',
1, ARRAY['arrays','math'], 'dsa', true, 15,
'[
  {"stdin": "3 0 1",          "expected_stdout": "2"},
  {"stdin": "0 1",            "expected_stdout": "2"},
  {"stdin": "9 6 4 2 3 5 7 0 1", "expected_stdout": "8"},
  {"stdin": "0",              "expected_stdout": "1"},
  {"stdin": "1",              "expected_stdout": "0"}
]'::jsonb, 0, 900),

-- Medium (difficulty 2)
('best-time-buy-sell',
'Best Time to Buy and Sell Stock',
E'## Problem\n\nYou are given an array `prices` where `prices[i]` is the price of a given stock on the `i`th day.\n\nYou want to maximize your profit by choosing a **single day** to buy one stock and choosing a **different day in the future** to sell that stock.\n\nReturn the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return `0`.\n\n## Examples\n\n**Example 1:**\n```\nInput:  prices = [7,1,5,3,6,4]\nOutput: 5\nExplanation: Buy on day 2 (price=1), sell on day 5 (price=6)\n```\n**Example 2:**\n```\nInput:  prices = [7,6,4,3,1]\nOutput: 0\nExplanation: No profit possible.\n```\n\n## Input Format\nSpace-separated integers on one line.\n\n## Output Format\nA single integer.',
2, ARRAY['arrays','dynamic-programming'], 'dsa', true, 20,
'[
  {"stdin": "7 1 5 3 6 4", "expected_stdout": "5"},
  {"stdin": "7 6 4 3 1",   "expected_stdout": "0"},
  {"stdin": "1 2",         "expected_stdout": "1"},
  {"stdin": "2 4 1",       "expected_stdout": "2"},
  {"stdin": "3 3 3 3",     "expected_stdout": "0"}
]'::jsonb, 800, 1200),

('majority-element',
'Majority Element',
E'## Problem\n\nGiven an array `nums` of size `n`, return the majority element.\n\nThe majority element is the element that appears more than `⌊n/2⌋` times. You may assume that the majority element always exists in the array.\n\n## Examples\n\n**Example 1:**\n```\nInput:  nums = [3,2,3]\nOutput: 3\n```\n**Example 2:**\n```\nInput:  nums = [2,2,1,1,1,2,2]\nOutput: 2\n```\n\n## Constraints\n- `n == nums.length`\n- `1 <= n <= 5 * 10^4`\n\n## Input Format\nSpace-separated integers.\n\n## Output Format\nA single integer.',
2, ARRAY['arrays','hashing'], 'dsa', true, 20,
'[
  {"stdin": "3 2 3",         "expected_stdout": "3"},
  {"stdin": "2 2 1 1 1 2 2", "expected_stdout": "2"},
  {"stdin": "1",             "expected_stdout": "1"},
  {"stdin": "6 5 5",         "expected_stdout": "5"},
  {"stdin": "1 1 2 1 2 1 2", "expected_stdout": "1"}
]'::jsonb, 800, 1200),

('move-zeroes',
'Move Zeroes',
E'## Problem\n\nGiven an integer array `nums`, move all `0`s to the end of it while maintaining the relative order of the non-zero elements.\n\n**Note:** You must do this in-place without making a copy of the array.\n\n## Examples\n\n**Example 1:**\n```\nInput:  nums = [0,1,0,3,12]\nOutput: 1 3 12 0 0\n```\n**Example 2:**\n```\nInput:  nums = [0]\nOutput: 0\n```\n\n## Input Format\nSpace-separated integers on one line.\n\n## Output Format\nSpace-separated integers on one line.',
2, ARRAY['arrays','two-pointers'], 'dsa', true, 20,
'[
  {"stdin": "0 1 0 3 12", "expected_stdout": "1 3 12 0 0"},
  {"stdin": "0",          "expected_stdout": "0"},
  {"stdin": "1",          "expected_stdout": "1"},
  {"stdin": "0 0 1",      "expected_stdout": "1 0 0"},
  {"stdin": "4 2 4 0 0 3 0 5 1 0", "expected_stdout": "4 2 4 3 5 1 0 0 0 0"}
]'::jsonb, 800, 1200),

('product-except-self',
'Product of Array Except Self',
E'## Problem\n\nGiven an integer array `nums`, return an array `answer` such that `answer[i]` is equal to the product of all the elements of `nums` except `nums[i]`.\n\nThe product of any prefix or suffix of `nums` is guaranteed to fit in a 32-bit integer.\n\nYou must write an algorithm that runs in O(n) time and without using the division operation.\n\n## Examples\n\n**Example 1:**\n```\nInput:  nums = [1,2,3,4]\nOutput: 24 12 8 6\n```\n**Example 2:**\n```\nInput:  nums = [-1,1,0,-3,3]\nOutput: 0 0 9 0 0\n```\n\n## Input Format\nSpace-separated integers.\n\n## Output Format\nSpace-separated integers.',
2, ARRAY['arrays','prefix-sum'], 'dsa', true, 25,
'[
  {"stdin": "1 2 3 4",       "expected_stdout": "24 12 8 6"},
  {"stdin": "-1 1 0 -3 3",   "expected_stdout": "0 0 9 0 0"},
  {"stdin": "2 3",           "expected_stdout": "3 2"},
  {"stdin": "1 1 1 1",       "expected_stdout": "1 1 1 1"},
  {"stdin": "0 0",           "expected_stdout": "0 0"}
]'::jsonb, 900, 1300),

('valid-anagram',
'Valid Anagram',
E'## Problem\n\nGiven two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise.\n\nAn **anagram** is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.\n\n## Examples\n\n**Example 1:**\n```\nInput:  s = "anagram", t = "nagaram"\nOutput: true\n```\n**Example 2:**\n```\nInput:  s = "rat", t = "car"\nOutput: false\n```\n\n## Input Format\nLine 1: string s\nLine 2: string t\n\n## Output Format\n`true` or `false`',
2, ARRAY['strings','hashing'], 'dsa', true, 20,
'[
  {"stdin": "anagram\nnagaram", "expected_stdout": "true"},
  {"stdin": "rat\ncar",         "expected_stdout": "false"},
  {"stdin": "a\na",             "expected_stdout": "true"},
  {"stdin": "ab\nba",           "expected_stdout": "true"},
  {"stdin": "aacc\nccac",       "expected_stdout": "false"}
]'::jsonb, 800, 1200),

('linked-list-cycle',
'Linked List Cycle',
E'## Problem\n\nYou are given a sequence of integers representing a linked list. Determine if the list has a cycle.\n\nFor this problem, we simulate a cycle using a repeated value marker: the last integer in the input is a 0-based index indicating where the tail connects back to (or -1 for no cycle).\n\n## Examples\n\n**Example 1:**\n```\nInput:\n3 2 0 -4\n1\nOutput: true\n(tail connects to index 1)\n```\n**Example 2:**\n```\nInput:\n1 2\n0\nOutput: true\n```\n**Example 3:**\n```\nInput:\n1\n-1\nOutput: false\n```\n\n## Input Format\nLine 1: space-separated integers (linked list values)\nLine 2: tail connects to index (-1 means no cycle)\n\n## Output Format\n`true` or `false`',
2, ARRAY['linked-lists','two-pointers'], 'dsa', true, 20,
'[
  {"stdin": "3 2 0 -4\n1", "expected_stdout": "true"},
  {"stdin": "1 2\n0",      "expected_stdout": "true"},
  {"stdin": "1\n-1",       "expected_stdout": "false"},
  {"stdin": "1 2 3 4\n-1", "expected_stdout": "false"},
  {"stdin": "1 2 3\n0",    "expected_stdout": "true"}
]'::jsonb, 900, 1300),

-- Medium-Hard (difficulty 3)
('three-sum',
'3Sum',
E'## Problem\n\nGiven an integer array `nums`, return all the triplets `[nums[i], nums[j], nums[k]]` such that `i != j`, `i != k`, `j != k`, and `nums[i] + nums[j] + nums[k] == 0`.\n\nThe solution set must not contain duplicate triplets. Output each triplet sorted in ascending order, one triplet per line.\n\n## Examples\n\n**Example 1:**\n```\nInput:  -1 0 1 2 -1 -4\nOutput:\n-1 -1 2\n-1 0 1\n```\n**Example 2:**\n```\nInput:  0 1 1\nOutput: (empty)\n```\n**Example 3:**\n```\nInput:  0 0 0\nOutput: 0 0 0\n```\n\n## Input Format\nSpace-separated integers on one line.\n\n## Output Format\nEach triplet on its own line, sorted ascending. If no triplets, output nothing.',
3, ARRAY['arrays','two-pointers','sorting'], 'dsa', true, 30,
'[
  {"stdin": "-1 0 1 2 -1 -4", "expected_stdout": "-1 -1 2\n-1 0 1"},
  {"stdin": "0 1 1",           "expected_stdout": ""},
  {"stdin": "0 0 0",           "expected_stdout": "0 0 0"},
  {"stdin": "-2 0 1 1 2",      "expected_stdout": "-2 0 2\n-2 1 1"},
  {"stdin": "1 2 -2 -1",       "expected_stdout": "-2 1 1\n-2 -1 ... "}
]'::jsonb, 1000, 1400),

('longest-substring-no-repeat',
'Longest Substring Without Repeating Characters',
E'## Problem\n\nGiven a string `s`, find the length of the longest substring without repeating characters.\n\n## Examples\n\n**Example 1:**\n```\nInput:  s = "abcabcbb"\nOutput: 3\nExplanation: "abc" has length 3.\n```\n**Example 2:**\n```\nInput:  s = "bbbbb"\nOutput: 1\nExplanation: "b" has length 1.\n```\n**Example 3:**\n```\nInput:  s = "pwwkew"\nOutput: 3\nExplanation: "wke" has length 3.\n```\n\n## Input Format\nA single string.\n\n## Output Format\nA single integer.',
3, ARRAY['strings','sliding-window','hashing'], 'dsa', true, 25,
'[
  {"stdin": "abcabcbb", "expected_stdout": "3"},
  {"stdin": "bbbbb",    "expected_stdout": "1"},
  {"stdin": "pwwkew",   "expected_stdout": "3"},
  {"stdin": " ",        "expected_stdout": "1"},
  {"stdin": "dvdf",     "expected_stdout": "3"}
]'::jsonb, 1000, 1400),

('max-subarray',
'Maximum Subarray',
E'## Problem\n\nGiven an integer array `nums`, find the subarray with the largest sum, and return its sum.\n\n## Examples\n\n**Example 1:**\n```\nInput:  nums = [-2,1,-3,4,-1,2,1,-5,4]\nOutput: 6\nExplanation: [4,-1,2,1] has the largest sum = 6.\n```\n**Example 2:**\n```\nInput:  nums = [1]\nOutput: 1\n```\n**Example 3:**\n```\nInput:  nums = [5,4,-1,7,8]\nOutput: 23\n```\n\n## Input Format\nSpace-separated integers.\n\n## Output Format\nA single integer.',
3, ARRAY['arrays','dynamic-programming'], 'dsa', true, 25,
'[
  {"stdin": "-2 1 -3 4 -1 2 1 -5 4", "expected_stdout": "6"},
  {"stdin": "1",                       "expected_stdout": "1"},
  {"stdin": "5 4 -1 7 8",             "expected_stdout": "23"},
  {"stdin": "-1",                      "expected_stdout": "-1"},
  {"stdin": "-2 -1",                   "expected_stdout": "-1"}
]'::jsonb, 1000, 1400),

('group-anagrams',
'Group Anagrams',
E'## Problem\n\nGiven an array of strings `strs`, group the anagrams together. You can return the answer in **any order**.\n\n## Examples\n\n**Example 1:**\n```\nInput:  eat tea tan ate nat bat\nOutput:\neat tea ate\ntan nat\nbat\n```\n(groups can appear in any order, words within a group sorted alphabetically)\n\n## Input Format\nSpace-separated strings on one line.\n\n## Output Format\nEach group on its own line. Words in each group sorted alphabetically. Groups sorted by their first word alphabetically.',
3, ARRAY['strings','hashing'], 'dsa', true, 25,
'[
  {"stdin": "eat tea tan ate nat bat", "expected_stdout": "ate eat tea\nbat\nant nat tan"},
  {"stdin": "a",                        "expected_stdout": "a"},
  {"stdin": "a b",                      "expected_stdout": "a\nb"},
  {"stdin": "abc bca cab",              "expected_stdout": "abc bca cab"},
  {"stdin": "dog god",                  "expected_stdout": "dog god"}
]'::jsonb, 1000, 1400),

('top-k-frequent',
'Top K Frequent Elements',
E'## Problem\n\nGiven an integer array `nums` and an integer `k`, return the `k` most frequent elements. You may return the answer in any order.\n\n## Examples\n\n**Example 1:**\n```\nInput:\nnums = 1 1 1 2 2 3\nk = 2\nOutput: 1 2\n```\n**Example 2:**\n```\nInput:\nnums = 1\nk = 1\nOutput: 1\n```\n\n## Input Format\nLine 1: space-separated integers\nLine 2: integer k\n\n## Output Format\nSpace-separated integers (sorted ascending).',
3, ARRAY['arrays','hashing','sorting'], 'dsa', true, 25,
'[
  {"stdin": "1 1 1 2 2 3\n2", "expected_stdout": "1 2"},
  {"stdin": "1\n1",           "expected_stdout": "1"},
  {"stdin": "4 1 -1 2 -1 2 3\n2", "expected_stdout": "-1 2"},
  {"stdin": "1 2\n2",         "expected_stdout": "1 2"},
  {"stdin": "5 5 5 5\n1",     "expected_stdout": "5"}
]'::jsonb, 1000, 1400),

('binary-search',
'Binary Search',
E'## Problem\n\nGiven an array of integers `nums` which is sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, return its index. Otherwise, return `-1`.\n\nYou must write an algorithm with `O(log n)` runtime complexity.\n\n## Examples\n\n**Example 1:**\n```\nInput:\nnums = -1 0 3 5 9 12\ntarget = 9\nOutput: 4\n```\n**Example 2:**\n```\nInput:\nnums = -1 0 3 5 9 12\ntarget = 2\nOutput: -1\n```\n\n## Input Format\nLine 1: space-separated sorted integers\nLine 2: target integer\n\n## Output Format\nA single integer (index or -1).',
2, ARRAY['arrays','binary-search'], 'dsa', true, 20,
'[
  {"stdin": "-1 0 3 5 9 12\n9",  "expected_stdout": "4"},
  {"stdin": "-1 0 3 5 9 12\n2",  "expected_stdout": "-1"},
  {"stdin": "5\n5",              "expected_stdout": "0"},
  {"stdin": "5\n-5",             "expected_stdout": "-1"},
  {"stdin": "1 3 5 7 9\n7",      "expected_stdout": "3"}
]'::jsonb, 800, 1200),

-- Hard (difficulty 4-5)
('lru-cache',
'LRU Cache',
E'## Problem\n\nDesign a data structure that follows the constraints of a **Least Recently Used (LRU) cache**.\n\nImplement the `LRUCache` class:\n- `LRUCache(int capacity)` Initialize the LRU cache with **positive size** capacity.\n- `int get(int key)` Return the value of the key if it exists, otherwise return `-1`.\n- `void put(int key, int value)` Update the value if the key exists. Otherwise, add the key-value pair. If the number of keys exceeds capacity, evict the LRU key.\n\n**Operations must run in O(1) average time.**\n\n## Input Format\nLine 1: capacity\nFollowing lines: `GET key` or `PUT key value`\n\n## Output Format\nFor each GET, print the result on its own line. PUT prints nothing.\n\n## Example\n```\nInput:\n2\nPUT 1 1\nPUT 2 2\nGET 1\nPUT 3 3\nGET 2\nPUT 4 4\nGET 1\nGET 3\nGET 4\n\nOutput:\n1\n-1\n-1\n3\n4\n```',
4, ARRAY['design','linked-lists','hashing'], 'dsa', true, 40,
'[
  {"stdin": "2\nPUT 1 1\nPUT 2 2\nGET 1\nPUT 3 3\nGET 2\nPUT 4 4\nGET 1\nGET 3\nGET 4", "expected_stdout": "1\n-1\n-1\n3\n4"},
  {"stdin": "1\nPUT 2 1\nGET 2\nPUT 3 2\nGET 2\nGET 3", "expected_stdout": "1\n-1\n2"},
  {"stdin": "2\nPUT 1 10\nPUT 2 20\nGET 1\nGET 2", "expected_stdout": "10\n20"},
  {"stdin": "3\nPUT 1 1\nPUT 2 2\nPUT 3 3\nGET 1\nPUT 4 4\nGET 2\nGET 3\nGET 4", "expected_stdout": "1\n-1\n3\n4"},
  {"stdin": "1\nPUT 1 1\nPUT 1 2\nGET 1", "expected_stdout": "2"}
]'::jsonb, 1300, 1700),

('number-of-islands',
'Number of Islands',
E'## Problem\n\nGiven an `m x n` 2D binary grid `grid` which represents a map of `1`s (land) and `0`s (water), return the number of islands.\n\nAn **island** is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.\n\n## Examples\n\n**Example 1:**\n```\nInput:\n4 4\n1 1 1 1 0\n1 1 0 1 0\n1 1 0 0 0\n0 0 0 0 0\nOutput: 1\n```\n**Example 2:**\n```\nInput:\n4 5\n1 1 0 0 0\n1 1 0 0 0\n0 0 1 0 0\n0 0 0 1 1\nOutput: 3\n```\n\n## Input Format\nLine 1: m n (rows cols)\nNext m lines: n space-separated values (0 or 1)\n\n## Output Format\nA single integer.',
4, ARRAY['graphs','dfs','bfs','matrices'], 'dsa', true, 35,
'[
  {"stdin": "4 5\n1 1 1 1 0\n1 1 0 1 0\n1 1 0 0 0\n0 0 0 0 0", "expected_stdout": "1"},
  {"stdin": "4 5\n1 1 0 0 0\n1 1 0 0 0\n0 0 1 0 0\n0 0 0 1 1", "expected_stdout": "3"},
  {"stdin": "1 1\n1",                                             "expected_stdout": "1"},
  {"stdin": "1 1\n0",                                             "expected_stdout": "0"},
  {"stdin": "2 2\n1 0\n0 1",                                      "expected_stdout": "2"}
]'::jsonb, 1200, 1600),

('coin-change',
'Coin Change',
E'## Problem\n\nYou are given an integer array `coins` representing coins of different denominations and an integer `amount` representing a total amount of money.\n\nReturn the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return `-1`.\n\nYou may assume that you have an infinite number of each kind of coin.\n\n## Examples\n\n**Example 1:**\n```\nInput:\ncoins = 1 5 11\namount = 15\nOutput: 3\n```\n**Example 2:**\n```\nInput:\ncoins = 2\namount = 3\nOutput: -1\n```\n**Example 3:**\n```\nInput:\ncoins = 1\namount = 0\nOutput: 0\n```\n\n## Input Format\nLine 1: space-separated coin denominations\nLine 2: target amount\n\n## Output Format\nA single integer.',
4, ARRAY['dynamic-programming'], 'dsa', true, 35,
'[
  {"stdin": "1 5 11\n15", "expected_stdout": "3"},
  {"stdin": "2\n3",       "expected_stdout": "-1"},
  {"stdin": "1\n0",       "expected_stdout": "0"},
  {"stdin": "1 2 5\n11",  "expected_stdout": "3"},
  {"stdin": "186 419 83 408\n6249", "expected_stdout": "20"}
]'::jsonb, 1200, 1600),

('word-search',
'Word Search',
E'## Problem\n\nGiven an `m x n` grid of characters `board` and a string `word`, return `true` if `word` exists in the grid.\n\nThe word can be constructed from letters of sequentially adjacent cells, where adjacent cells are horizontally or vertically neighboring. The same letter cell may not be used more than once.\n\n## Examples\n\n**Example 1:**\n```\nInput:\n3 4\nA B C E\nS F C S\nA D E E\nword = ABCCED\nOutput: true\n```\n**Example 2:**\n```\nInput:\n3 4\nA B C E\nS F C S\nA D E E\nword = SEE\nOutput: true\n```\n\n## Input Format\nLine 1: m n\nNext m lines: n space-separated characters\nLast line: the word\n\n## Output Format\n`true` or `false`',
4, ARRAY['graphs','dfs','backtracking','matrices'], 'dsa', true, 40,
'[
  {"stdin": "3 4\nA B C E\nS F C S\nA D E E\nABCCED",  "expected_stdout": "true"},
  {"stdin": "3 4\nA B C E\nS F C S\nA D E E\nSEE",     "expected_stdout": "true"},
  {"stdin": "3 4\nA B C E\nS F C S\nA D E E\nABCB",    "expected_stdout": "false"},
  {"stdin": "1 1\nA\nA",                                "expected_stdout": "true"},
  {"stdin": "2 2\nA B\nC D\nAC",                        "expected_stdout": "true"}
]'::jsonb, 1300, 1700),

('merge-intervals',
'Merge Intervals',
E'## Problem\n\nGiven an array of `intervals` where `intervals[i] = [starti, endi]`, merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.\n\n## Examples\n\n**Example 1:**\n```\nInput:  1 3, 2 6, 8 10, 15 18\nOutput:\n1 6\n8 10\n15 18\n```\n**Example 2:**\n```\nInput:  1 4, 4 5\nOutput: 1 5\n```\n\n## Input Format\nEach line is a pair: `start end`\n\n## Output Format\nEach merged interval on its own line: `start end`',
3, ARRAY['arrays','sorting','intervals'], 'dsa', true, 30,
'[
  {"stdin": "1 3\n2 6\n8 10\n15 18", "expected_stdout": "1 6\n8 10\n15 18"},
  {"stdin": "1 4\n4 5",              "expected_stdout": "1 5"},
  {"stdin": "1 4\n0 4",              "expected_stdout": "0 4"},
  {"stdin": "1 4\n0 0",              "expected_stdout": "0 0\n1 4"},
  {"stdin": "1 4\n2 3",              "expected_stdout": "1 4"}
]'::jsonb, 1000, 1400),

('trap-rain-water',
'Trapping Rain Water',
E'## Problem\n\nGiven `n` non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.\n\n## Examples\n\n**Example 1:**\n```\nInput:  0 1 0 2 1 0 1 3 2 1 2 1\nOutput: 6\n```\n**Example 2:**\n```\nInput:  4 2 0 3 2 5\nOutput: 9\n```\n\n## Input Format\nSpace-separated non-negative integers on one line.\n\n## Output Format\nA single integer.',
5, ARRAY['arrays','two-pointers','dynamic-programming'], 'dsa', true, 45,
'[
  {"stdin": "0 1 0 2 1 0 1 3 2 1 2 1", "expected_stdout": "6"},
  {"stdin": "4 2 0 3 2 5",             "expected_stdout": "9"},
  {"stdin": "1",                        "expected_stdout": "0"},
  {"stdin": "1 2",                      "expected_stdout": "0"},
  {"stdin": "3 0 2 0 4",               "expected_stdout": "7"}
]'::jsonb, 1500, 2000),

('median-two-sorted',
'Median of Two Sorted Arrays',
E'## Problem\n\nGiven two sorted arrays `nums1` and `nums2` of size `m` and `n` respectively, return the median of the two sorted arrays.\n\nThe overall run time complexity should be `O(log(m+n))`.\n\n## Examples\n\n**Example 1:**\n```\nInput:\nnums1 = 1 3\nnums2 = 2\nOutput: 2.00000\n```\n**Example 2:**\n```\nInput:\nnums1 = 1 2\nnums2 = 3 4\nOutput: 2.50000\n```\n\n## Input Format\nLine 1: space-separated integers (nums1, or "empty" if empty)\nLine 2: space-separated integers (nums2, or "empty" if empty)\n\n## Output Format\nA decimal with 5 decimal places.',
5, ARRAY['arrays','binary-search'], 'dsa', true, 45,
'[
  {"stdin": "1 3\n2",     "expected_stdout": "2.00000"},
  {"stdin": "1 2\n3 4",   "expected_stdout": "2.50000"},
  {"stdin": "empty\n1",   "expected_stdout": "1.00000"},
  {"stdin": "2\nempty",   "expected_stdout": "2.00000"},
  {"stdin": "1 3\n2 4",   "expected_stdout": "2.50000"}
]'::jsonb, 1600, 2000);