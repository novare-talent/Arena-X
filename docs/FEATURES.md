# ArenaX — Feature-by-Feature Technical Architecture

> Companion to [`ARCHITECTURE.md`](./ARCHITECTURE.md) (infra/system diagram), [`JUDGING_HARNESS.md`](./JUDGING_HARNESS.md) (harness deep-dive) and [`REFERRALS.md`](./REFERRALS.md) (referral deep-dive). This document goes feature-by-feature through every user-facing surface in the app: purpose, key files, exact data flow, DB tables/columns, real-time/sync mechanism, and third-party integrations.
>
> **Ground rules for this document:** every claim below is grounded in the code as of this write-up (branch `worktree-tingly-soaring-ripple`). Where the underlying schema, generation logic, or wiring could not be located in the repository, it is called out explicitly under **⚠️ Gap / Unverified** rather than assumed. Do not treat those callouts as bugs by default — some may simply be configured outside this repo (Supabase dashboard, external cron, etc.).
>
> Stack recap: Next.js 14.2.35 (App Router), React 18, Supabase (Postgres + Auth + Realtime + Storage), self-hosted Judge0 CE (code execution), OpenAI SDK v6 (`gpt-4o` / `gpt-4o-mini`), Monaco Editor, Cashfree (payments).

---

## Table of contents

1. [Authentication](#1-authentication)
2. [Onboarding](#2-onboarding)
3. [Profile (own + public)](#3-profile-own--public)
4. [Roadmap](#4-roadmap)
5. [Matchmaking](#5-matchmaking)
6. [Arena — 1v1 Match Lifecycle](#6-arena--1v1-match-lifecycle)
7. [Solo Mode](#7-solo-mode)
8. [Practice Mode](#8-practice-mode)
9. [Judge0 Integration (shared execution engine)](#9-judge0-integration-shared-execution-engine)
10. [ELO / Rating System](#10-elo--rating-system)
11. [Rooms — Private Custom Lobbies](#11-rooms--private-custom-lobbies)
12. [Forge — Weekly Challenge System](#12-forge--weekly-challenge-system)
13. [Admin Panels](#13-admin-panels)
14. [Learn Platform (DSA / Prompt / Agent)](#14-learn-platform-dsa--prompt--agent)
15. [Daily Challenge](#15-daily-challenge)
16. [Prompt Battle](#16-prompt-battle)
17. [Function-Mode Harness](#17-function-mode-harness)
18. [Friends](#18-friends)
19. [Direct Challenges](#19-direct-challenges)
20. [Leaderboards](#20-leaderboards)
21. [Hackathons](#21-hackathons)
22. [Contests](#22-contests)
23. [Payments (Cashfree + Pro)](#23-payments-cashfree--pro)
24. [Referrals & Invites](#24-referrals--invites)
25. [Cross-cutting utilities](#25-cross-cutting-utilities)
26. [Master list of open gaps / ambiguities](#26-master-list-of-open-gaps--ambiguities)

---

## 1. Authentication

**Purpose:** Email/password + OAuth (Google, GitHub) auth via Supabase Auth. No magic-link flow exists in the UI.

**Key files:**
- `src/lib/supabase/client.ts` — browser client (`createBrowserClient`, anon key). Used in all `"use client"` auth components.
- `src/lib/supabase/server.ts` — request-scoped server client (`createServerClient`), reads/writes cookies via `next/headers`. Used in Server Components, Server Actions, Route Handlers that need to act *as* the signed-in user.
- `src/lib/supabase/admin.ts` — service-role client (bypasses RLS). **Duplicated inline** in `src/app/auth/actions.ts`, `src/app/auth/callback/route.ts`, and `src/app/api/onboarding/complete/route.ts` instead of importing the shared helper — a consistency nit, not a bug.
- `src/middleware.ts` — route protection + referral-cookie capture.
- `src/app/login/page.tsx`, `src/app/signup/page.tsx`, `src/app/auth/actions.ts`, `src/app/auth/callback/route.ts`, `src/app/auth/forgot-password/page.tsx`, `src/app/auth/verify-email/page.tsx`.

**Signup flow** (`auth/actions.ts` server action `signUp`):
1. Validate username `^[a-zA-Z0-9_]{3,20}$`.
2. Uniqueness check against `profiles.username` (lowercased) via the request-scoped client.
3. If a `referralCode` was submitted: self-referral email check (normalized, strips `+tag`) + IP-hash signup throttle (max 5 referred signups/IP/day via RPC `bump_signup_throttle`) — see [§24](#24-referrals--invites). A blocked/self-referral code is silently dropped, never blocks signup itself.
4. `supabase.auth.signUp({ email, password, options: { emailRedirectTo: <origin>/auth/callback, data: { username, display_name, referral_code? } } })`. The `data` becomes `raw_user_meta_data`, consumed by the `handle_new_user()` DB trigger.
5. Redirect to `/auth/verify-email?email=...` — Supabase requires email confirmation before the session is usable (inferred from the `"email not confirmed"` error branch in `login/page.tsx`).

**Login flow:** `login/page.tsx` calls `supabase.auth.signInWithPassword` **directly from the client**, bypassing the `signIn` server action that also exists in `actions.ts` (that action appears unused — flagged in §26).

**OAuth (Google/GitHub):** `supabase.auth.signInWithOAuth({ provider, options: { redirectTo: origin + "/auth/callback" } })`. Provider app credentials live in the Supabase dashboard, not the repo — cannot verify from code which providers are actually enabled server-side.

**OAuth/email-confirmation callback** (`auth/callback/route.ts`):
1. `supabase.auth.exchangeCodeForSession(code)` — PKCE exchange, sets session cookies.
2. `consumeReferralCookie(user.id, user.email, ipHash)` — reads the HttpOnly `arenax_ref` cookie set by middleware, re-runs the same self-referral + IP-throttle checks as signup, then idempotently sets `profiles.referred_by` and upserts a `referrals` row. This is the OAuth-safe referral path since OAuth signups never carry `raw_user_meta_data.referral_code`.
3. Redirects to `/onboarding` if `profiles.onboarding_completed` is false, else to `?next=` (default `/dashboard`).
4. On exchange error, redirects to `/auth/error` — **this page does not exist in the repo** (§26).

**Forgot password:** `supabase.auth.resetPasswordForEmail(email, { redirectTo: <APP_URL>/auth/reset-password })` — **`/auth/reset-password` also does not exist in the repo** (§26). This flow is currently incomplete as wired.

**Session/cookies:** Standard `@supabase/ssr` cookie-based session (`sb-<project>-auth-token`), synced via matching `getAll`/`setAll` adapters across `client.ts` / `server.ts` / `middleware.ts`. A separate custom cookie `arenax_ref` (HttpOnly, 30 min TTL, `sameSite:lax`, `secure` in prod) carries a referral code across the OAuth redirect round-trip.

**Middleware route protection** (`src/middleware.ts`):
- Matcher excludes `/api/*` and static assets — API routes each do their own `auth.getUser()` check (avoids duplicate auth round-trips).
- `supabase.auth.getUser()` is called for every matched request (triggers token refresh as needed).
- Regex-captures `/invite/<CODE>` or `?ref=` and sets the `arenax_ref` cookie.
- `publicPaths = ["/login", "/signup", "/auth/", "/invite/"]` (prefix match). No user + non-public path → redirect `/login`. User exists + on `/login`/`/signup` → redirect `/dashboard`.
- Everything else (including `/onboarding`, `/profile`, etc.) is implicitly protected by "deny unless public or authenticated" — there's no explicit protected-route allowlist. Onboarding-completion gating happens **per-page**, not centrally in middleware.

**Client tiers at a glance:**

| Client | Key | RLS? | Where |
|---|---|---|---|
| Browser | anon | Yes (as signed-in user) | client components |
| Server (request-scoped) | anon + server cookies | Yes (as signed-in user) | Server Components, Server Actions, Route Handlers |
| Admin/service-role | `SUPABASE_SERVICE_ROLE_KEY` | **No** | privileged writes only (referral linking, onboarding fallback, judging, admin actions) |

**⚠️ Gap / Unverified:** `/auth/error` and `/auth/reset-password` pages referenced by the code do not exist under `src/app/auth/`.

---

## 2. Onboarding

**Purpose:** Post-signup, pre-dashboard step collecting/confirming username, display name, college, country, experience level, and setting `profiles.onboarding_completed = true`.

**Key files:** `src/app/onboarding/page.tsx` (gate), `src/components/onboarding/OnboardingClient.tsx` (form), `src/app/api/onboarding/complete/route.ts` (service-role fallback), `src/app/api/auth/check-username/route.ts` (used by signup, not onboarding).

**Flow:**
1. `onboarding/page.tsx` requires auth; if `profiles.onboarding_completed` is already true, redirects to `/dashboard`; otherwise passes existing profile values into the client form.
2. Username: debounced (500ms) uniqueness check via a **direct client-side Supabase query** against `profiles` (relies on the public SELECT RLS policy) — this is a separately-implemented check from the signup page's API-route-based check.
3. Country dropdown (hardcoded 9 options, default India); experience dropdown (`student | 0-1yr | 1-3yr | 3+yr`, default `student`).
4. **Save** first attempts a direct client-side `profiles.update(...).eq("id", userId)`. If that returns zero rows (RLS silently blocked it, e.g. stale session), it falls back to `POST /api/onboarding/complete`, which uses the **service-role client** to force the write. The API route independently re-validates `body.userId === user.id` (403 otherwise) and a weaker length-only username check (no regex).
5. On success: `router.push("/dashboard")`.

**DB:** `public.profiles` — `username, display_name, college, country, experience_level` (CHECK-constrained), `onboarding_completed`. Note: `profiles.intake_completed` exists in the schema but isn't referenced by any onboarding code found.

**RLS:** `profiles` UPDATE requires `auth.uid() = id` (why the client-side path normally succeeds); SELECT is public (enables the availability checks).

---

## 3. Profile (own + public)

**Purpose:** Two surfaces — `/profile` (own, editable, includes private data) and `/profile/[username]` (public, read-only).

**Key files:** `src/app/profile/page.tsx`, `src/app/profile/layout.tsx`, `src/app/profile/actions.ts` (`updateProfile`, `updateAvatar`), `src/app/profile/[username]/page.tsx` (ISR, `revalidate=300`), `src/components/profile/ProfileClient.tsx`, `src/components/profile/PublicProfileClient.tsx`, `src/lib/scout.ts`.

**Own profile data flow** (`profile/page.tsx`): parallel fetch of `profiles.*`, all `user_ratings` rows, last 10 completed `matches` (joined `problems(title)`), `referrals` (own), and `referral_grants` where `status='delivered'` (relies entirely on RLS `auth.uid()=user_id AND status='delivered'` — no explicit `.eq("user_id", ...)` filter in the query, so this is defense-in-depth-dependent, see §26). A second wave resolves opponent/referred-user display names and computes DSA leaderboard rank (for the Scout badge, `src/lib/scout.ts`).

**Own profile UI:** header stats (ELO, W/L, win rate, best streak, total duels), a static "✓ VERIFIED" email badge (not actually checked against `email_confirmed_at` — just a label), a "Refer & Earn OpenAI Credits" panel whose tier thresholds (`20/75/100/300/500 → $10/25/50/100/200`) are **hardcoded client-side** and must be kept in sync manually with the SQL-side `check_tier_crossing()` tiers (see [§24](#24-referrals--invites)), a tier ladder, per-track rating cards, and an editable details form (username, display name, bio ≤200 chars, college, country, GitHub username, experience level) that submits via `updateProfile`.

**`updateProfile`** (`profile/actions.ts`): re-validates username format, uniqueness (`.neq("id", user.id).single()` — note: `.single()` rather than `.maybeSingle()`, inconsistent with other uniqueness checks in the codebase, though functionally fine given how the result is used), updates `profiles`, `revalidatePath("/profile")`.

**`updateAvatar`** exists but appears to have no caller in `ProfileClient.tsx` — avatars are rendered from a static tier-based character image map, not `profile.avatar_url`. Possibly vestigial.

**Public profile data flow** (`profile/[username]/page.tsx`, ISR 300s): looks up by lowercased username, selects only public-safe columns (`id, username, display_name, bio, college, country, avatar_url, created_at` — explicitly **no email, no referral data**), fetches `user_ratings` and last 10 completed `matches`, resolves opponent names. `notFound()` if no match.

**Public profile UI** (`PublicProfileClient.tsx`): header card, stats grid, per-track ratings, recent matches (read-only), and a client-computed "current streak" (consecutive wins from most recent match) that is a *display-only* derivation distinct from the DB's `best_streak`/`current_streak` columns shown on the own-profile page.

**Own vs public comparison:**

| Aspect | Own | Public |
|---|---|---|
| Auth | required | not required |
| Email | shown | never fetched |
| Referrals/grants | shown | never fetched |
| Edit | full form | none |
| Caching | none (fresh SSR) | ISR 300s |

**⚠️ Gap / Unverified:** `matches` RLS (per `schema.sql`) restricts SELECT to the two players (`auth.uid() = player_one_id OR player_two_id`). The public profile page queries match history as the (usually neither-player) viewer using the RLS-bound server client — under the base policy this query should return empty for third-party viewers. A later patch file may supersede this policy; not exhaustively verified across every `schema_v*_patch.sql`. Also: `matches.end_reason` is selected by both profile pages but wasn't found in the base `schema.sql` table definition — likely added by a later migration not fully audited.

---

## 4. Roadmap

**Purpose:** Gamified DSA topic-mastery tracker — 5 sequential tiers, each with 3–4 topics, each topic needing N accepted submissions tagged with that topic.

**Key files:** `src/app/roadmap/page.tsx`, `src/app/roadmap/layout.tsx`, `src/components/roadmap/RoadmapClient.tsx`.

**Flow:** the page fetches `roadmap_progress` (per-user, `track='dsa'`) **and** all `AC`-verdict `submissions` joined to `problems(topics)`. It builds `topicSolvedMap` by counting accepted submissions per topic tag — **this live computation from `submissions` is the actual source of truth for the UI**, not the `roadmap_progress` table. `roadmap_progress` is fetched and passed down as a `progressMap` prop but is **never read** inside `RoadmapClient` — effectively dead plumbing (§26).

**Tier model** (hardcoded in `RoadmapClient.tsx`):

| Tier | Label | Topics (required solves) |
|---|---|---|
| 1 | Foundation | arrays(5), strings(5), recursion(5) |
| 2 | Core Techniques | two pointers(5), sliding window(5), hashing(5), sorting(5) |
| 3 | Data Structures | binary search(7), stacks(7), linked lists(7), trees(7) |
| 4 | Advanced | graphs(7), dynamic programming(7), heaps(7) |
| 5 | Expert | advanced dp(10), tries(10), greedy(10) |

Unlock rule: tier 1 always unlocked; tier N unlocks only once the **total** solves across tier N-1's topics reach ≥5 (a flat threshold, independent of each topic's own `required` value). Topic completion is `topicSolvedMap[key] >= required`. Topic `key` strings must exactly match `problems.topics` array entries — a fragile string contract not independently verified against problem-seeding data.

**DB:** `roadmap_progress` (`user_id, topic, track, problems_solved, problems_required, unlocked_at, completed_at` — currently unused for rendering), `submissions` (`problem_id, verdict, user_id`), `problems.topics` (text[]).

**⚠️ Edge case:** `problems` SELECT RLS is `is_active=true`-gated — if a problem is later deactivated, its topic tags disappear from the join, silently reducing a user's `topicSolvedMap` count for problems they already solved.

---

## 5. Matchmaking

**Purpose:** Pair two humans (or fall back to a bot after a timeout) into a rated 1v1 duel.

**Key files:** `src/app/arena/page.tsx` (client state machine), `src/app/api/matchmaking/join/route.ts`, `leave/route.ts`, `bot-match/route.ts`, `src/app/api/arena/prematch/route.ts`, `supabase/schema_v2.sql` + `schema_v2_patch.sql` (`matchmaking_queue` table + `try_match_players()`).

**Mechanism — hybrid Realtime + polling, not either alone:**
1. `joinQueue()` in `arena/page.tsx`: subscribes to a Supabase Realtime channel `queue-${uid}` on `postgres_changes` UPDATE for the caller's own `matchmaking_queue` row; **also** starts a 2s polling interval on the same row as a fallback; POSTs to `/api/matchmaking/join`; starts a 7s client-side bot-fallback timer.
2. `POST /api/matchmaking/join`: auth check, rate-limited 20/60s per user, deletes stale queue rows, calls Postgres RPC `try_match_players(p_user_id, p_track)`.
3. **`try_match_players`** (SQL, `SECURITY DEFINER`): cancels stale `waiting` rows >10 min old; `SELECT ... FOR UPDATE SKIP LOCKED` for the oldest other `waiting` user on the same track (**pure FIFO by queue join time — no ELO-band pairing**); if found, picks a **random active problem** for the track, reads both players' ELO (default 800) to stamp `player_one_elo_before`/`player_two_elo_before`, inserts a new `matches` row (`status='in_progress'`), flips both queue rows to `matched`. If not found, upserts the caller's own row to `waiting`.
4. The `matchmaking_queue` table enforces `unique(user_id)` (patched from an earlier `unique(user_id, status)` that caused violations on repeat play) — exactly one queue row per user at all times.
5. Realtime propagation of the match to the *other* (waiting) player depends on Supabase Realtime replication being enabled on `matches`/`matchmaking_queue` in the dashboard (cannot be done via SQL — per an explicit schema comment) — the 2s poll exists specifically as a fallback for when this isn't configured or a push is missed.

**Bot fallback (`bot-match/route.ts`):** triggered by the client's 7s timer if still `waiting`. Uses the **service-role client**; selects a random bot profile (`profiles.is_bot=true`) and random active problem; **atomically claims** the queue row via `UPDATE ... WHERE status='waiting'` before creating the match — this exists specifically to prevent a race between the client's 7s timer and real matchmaking creating two simultaneous matches for the same user (`409` if the claim fails). Bot's ELO defaults to 1000 here vs. 800 in `try_match_players` — a minor inconsistency. The resulting match is a real, rated `matches` row against a real bot profile with its own `user_ratings` row.

**Leave:** sets the caller's `waiting` row to `status='cancelled'`.

**Queue count display:** a simple `count`-only query against `matchmaking_queue` where `status='waiting'`, refreshed only on track change/mount — not live.

---

## 6. Arena — 1v1 Match Lifecycle

**Purpose:** The live head-to-head duel screen: countdown, shared timer, Monaco editor, judged submissions, win/loss/draw resolution, real-time opponent status.

**Key files:** `src/app/arena/[matchId]/page.tsx` (server gate), `src/components/arena/MatchArena.tsx` (~700 lines, all live-match logic), `src/app/api/arena/prematch/route.ts`, `src/app/api/arena/submit/route.ts` (258 lines), `src/app/api/arena/resign/route.ts`, `src/app/api/arena/bot-submit/route.ts`, `src/app/arena/[matchId]/result/page.tsx` + `ResultClient.tsx`, `src/lib/judge0.ts`, `src/lib/harness.ts`.

**Pre-match countdown:** handled in `arena/page.tsx` (not `MatchArena`) — a 5s client-side countdown while `/api/arena/prematch` fetches opponent intel (avatar, tier, ELO, streak, last-3 results, head-to-head record computed by filtering up to 200 of the caller's completed matches in JS, not a SQL join). At `0`, routes to `/arena/${matchId}`.

**Live sync — same hybrid pattern as matchmaking:**
- One Realtime channel `match-${matchId}`: `postgres_changes` UPDATE on `matches` (filtered by id) drives score/momentum updates and — on `status==='completed'` — an immediate route to the result page; plus two ephemeral **broadcast** events (`typing`, `emote`) that are never persisted to the DB.
- A parallel 2s polling interval re-fetches `status, player_one_score, player_two_score` as a fallback, feeding the same handler.
- Typing broadcasts are throttled to at most once per 500ms. If the opponent is a bot, a fake typing indicator is simulated locally on a random 15–45s schedule (no real broadcast).

**Timer:** match duration comes from `problem.match_duration_minutes` (20–90 min by difficulty). `timeLeft` is derived purely from `matches.started_at` vs `Date.now()`, recomputed every second client-side — **there is no server-side enforcement** that a submission arrives before the time budget expires; `submit/route.ts` only checks `status==='in_progress'`. At `timeLeft=0` the client auto-submits whatever's in the editor. If the opponent is a bot, a fixed threshold (`timeLeft <= 180`) triggers `/api/arena/bot-submit` — the bot "solves" with exactly 3 minutes left, not randomized.

**Editor:** Monaco (`@monaco-editor/react`, dynamically imported, `ssr:false`), theme `vs-dark`. Language mapped across 5 supported keys (python/javascript/java/cpp/c). Starter code comes from `buildStarter()` (function-mode, typed stub) or `DEFAULT_STARTERS` (stdio-mode, raw template). Match code is also written to the same `localStorage` keys the standalone Practice mode reads, so a match's code seeds a post-match practice retry.

**Submission pipeline (`/api/arena/submit/route.ts`):**
1. Auth + rate-limit (30/60s per user — comment notes this protects "the single shared Judge0 VM" from flooding).
2. Fetch `matches` joined `problems(*)` via the **service-role client**; validate `status==='in_progress'` and caller membership.
3. `buildSubmission()` (harness) wraps user code with a per-language driver for function-mode problems (all languages except C — see [§17](#17-function-mode-harness)).
4. `runAllTestCases()` (Judge0) executes against every test case.
5. Insert a `submissions` row (`match_id, user_id, problem_id, language, source_code, verdict, test_cases_passed, total_test_cases`).
6. **Score:** `score = (passed/total)*100 - (elapsedMs/totalMs)*10`, floored at 0 — accuracy minus up to a 10-point time penalty.
7. **Winner determination:** all-AC → immediate win (`end_reason:'ac'`), race-to-first-full-AC. Partial pass: if the opponent has *already* submitted a score, the match ends by score comparison (equal → draw); otherwise the match stays `in_progress` and the submitter can retry.
8. **`finalizeMatch()`** — atomic close via `UPDATE matches SET status='completed' ... WHERE id=matchId AND status='in_progress'`; a 0-row result (already finalized concurrently, e.g. by a simultaneous resign) bails without double-applying ELO. Calls RPC `update_elo_after_match` for decisive results, or increments `matches_played`/`draws` directly for a draw.
9. **Diagnostic redaction:** only the first 2 sample test cases ever return `expected_output`/`actual_output`/`stderr`/`compile_output` — hidden cases return pass/fail + timing only, explicitly to prevent answer-leaking via the panel.

**Resign** (`resign/route.ts`): opponent auto-wins; same ELO math and `end_reason:'resign'`. Note: unlike `submit`/`bot-submit`, this route's own `matches` UPDATE is **not** guarded by an atomic `.eq("status","in_progress")` clause at write time (only checked earlier in the same request) — a narrower concurrency window than the other two finalize paths.

**Bot-submit** (`bot-submit/route.ts`): simulates a bot win via a hardcoded `~95` score injection (no real Judge0 execution for the bot). Verifies the opponent really `is_bot` (403 otherwise). Deliberately made **rated and symmetric** — beating a bot gains ELO, losing to one costs ELO — specifically to prevent rating-farming via easy bot wins.

**Result page:** reads the final `matches` row + both `user_ratings`; on a loss, fetches the winner's `submissions` row filtered `.eq("all_ac", true)` — **⚠️ the `submissions` table's base schema has no `all_ac` column** (only a `verdict` enum was found); this likely lives in an unread later migration, or is dead/broken code (§26).

---

## 7. Solo Mode

**Purpose:** Single-player, timed, no-opponent, no-ELO practice.

**Key files:** `src/app/arena/solo/page.tsx`, `src/components/arena/SoloArena.tsx`, `src/app/api/arena/solo/submit/route.ts`.

**Differences from 1v1 Arena:**
- **No `matches` row is ever created** — solo isn't tracked in `matches` at all.
- No Realtime, no polling — purely local component, no opponent.
- Fixed **15-minute** timer (`SOLO_DURATION_SECONDS`), vs. Arena's per-problem 20–90 min, computed from client-side `Date.now()` at mount (not a server timestamp).
- Problem selection: one **random DSA problem** per visit, no difficulty/ELO filtering.
- **No `submissions` row is ever written** — confirmed by reading the full route, there's no `.insert()` call — solo attempts leave no DB trace.
- **No ELO impact** — explicit UI copy: "No ELO change in solo mode."
- Full (unredacted) test-case diagnostics are returned, since there's no competitive opponent who could exploit them.

---

## 8. Practice Mode

**Purpose:** Post-match, untimed retry of the *same* problem from a specific past match — a "learn from this problem" loop reached from the Result screen.

**Key files:** `src/app/arena/[matchId]/practice/page.tsx`, `src/components/arena/PracticeArena.tsx`, `src/app/api/practice/submit/route.ts`.

**Differences:**
- Tied to a specific `matchId`'s problem (not random like Solo). The gate requires the caller to be one of that match's two players but does **not** check `match.status` — reachable mid-match or long after completion.
- **No timer at all** (untimed, unlike both Solo and Arena).
- **Does persist submissions** — `submissions` insert with `match_id` omitted, using the regular RLS-scoped client (not service-role) — the opposite persistence behavior from Solo.
- Code/language state is synced via `localStorage` keys shared with `MatchArena`, so in-match code auto-populates the practice editor.
- Full unredacted diagnostics returned by the API (a client-side type omission of `stderr`/`compile_output` in the UI is cosmetic, not an actual API-level redaction).

---

## 9. Judge0 Integration (shared execution engine)

**What it is:** A self-hosted, open-source code execution sandbox (Judge0 CE), expected at `JUDGE0_API_URL` (default `http://localhost:2358`), optionally authenticated via `JUDGE0_API_KEY` sent as `X-Auth-Token`. This is a self-hosted instance, not a call to a third-party SaaS.

**Languages (5):** Python 3.8 (id 71), Node.js 12 / JavaScript (id 63), Java 13 (id 62), C++17 (id 54), C (id 50) — Judge0's own numeric language IDs, must match whatever language table the target instance ships.

**Flow — polling, not webhook:**
- Single submission: `POST /submissions?wait=false` → `token`; poll `GET /submissions/{token}` for the result.
- **Preferred batch path:** `POST /submissions/batch` submits *all* test cases for one attempt in a single round trip; `GET /submissions/batch?tokens=...` fetches all results together. Falls back to per-case parallel `Promise.all` if the batch endpoint isn't available on a given Judge0 instance.
- `pollToCompletion`: starts polling after a 120ms delay (fast programs finish <300ms), backs off ×1.4 up to a 600ms cap between polls, hard 16-second total budget before giving up. "Complete" = every result has `status.id > 2` (no longer queued/processing).
- **Verdict mapping:** Judge0 status IDs 1–14 collapsed via `friendlyVerdict()` — all runtime-error subtypes (SIGSEGV etc.) are collapsed into a plain "Runtime Error" label, hiding raw signal names from the UI.
- **Pass/fail:** a case passes if Judge0's own `status.id===ACCEPTED` **or** ArenaX's own trimmed-string comparison of `stdout` vs `expected_stdout` matches — a defensive double-check on top of Judge0's own AC determination.
- **Timeout handling:** if the poll budget expires while a result is still queued/processing, it's mapped to `verdict:"Timeout"` client-side — distinct from Judge0's own internal `cpu_time_limit` TLE status.

**Consumers:** Arena (submit/solo/resign-adjacent), Practice, Rooms submit, Daily Challenge, Learn's free-run playground (`/api/learn/run`, no test-case checking, just arbitrary stdin execution).

**No AI/LLM calls anywhere in the Judge0/harness/matchmaking/arena code paths** — this pipeline is 100% deterministic code execution.

---

## 10. ELO / Rating System

Two independent ELO implementations coexist, both K-factor based but structurally different:

**Arena/Rooms/Daily (pairwise chess-Elo)** — `src/lib/judge0.ts`, `calcEloDelta(winnerElo, loserElo, result, kFactor?)`:
- Standard logistic expected score: `expected = 1 / (1 + 10^((otherElo-myElo)/400))`.
- **Dynamic K-factor:** 32 if ELO<900, 24 if ELO<1300, 16 otherwise (faster-moving ratings for lower-rated/newer players).
- **±1 minimum clamp** for decisive results — even a heavily lopsided match always moves rating by at least 1 point.
- Applied identically by Arena's `finalizeMatch()`, `resign`, and `bot-submit`, all funneling into the shared RPC `update_elo_after_match`.

**`update_elo_after_match`** (Postgres, `SECURITY DEFINER`): updates `user_ratings` — winner `elo += change`, `peak_elo=max(...)`, `wins+=1`, `matches_played+=1`, `current_streak+=1`, `best_streak=max(...)`; loser `elo -= change` (floored at **600**), `losses+=1`, `current_streak` reset to 0. Recomputes `tier` from fixed thresholds: `diamond≥1700, platinum≥1500, gold≥1300, silver≥1100, bronze≥900, else unrated`. Draws skip this RPC entirely — both players get `matches_played`/`draws` incremented directly, no ELO change.

**Forge (N-way tournament-ranking Elo)** — `src/lib/forge/elo.ts`, `K_FACTOR=24`, separate from the pairwise formula above:
- Ranks all of a week's judged submitters by `overall_score` desc (tiebreak: lower current elo first).
- `eAvg` = mean elo of the field.
- `expected = 1/(1+10^((eAvg-elo)/400))` (vs. the field average, not a single opponent).
- `actual = (n-rank)/(n-1)` — 1.0 for 1st place, 0.0 for last, linear between.
- `delta = round(K * (actual - expected))`, `elo_after = max(600, elo_before+delta)`.
- N=1 special case: no comparative signal possible, `delta=0`.
- Base elo for the `forge` track is **1000** (vs. 800 for `dsa`), set explicitly in the `apply_forge_weekly_delta` RPC.

Both systems share the same `600` floor and the same tier-threshold table, applied against the same `user_ratings` table keyed by `(user_id, track)`.

---

## 11. Rooms — Private Custom Lobbies

**Purpose:** Host-created, code-joined multiplayer DSA lobbies with configurable modes — an independent competitive surface from matchmade Arena duels (does **not** use the arena matchmaking or `/api/arena/*` endpoints at all).

**Pages:** `src/app/rooms/page.tsx` (list), `[code]/page.tsx` (lobby — redirects to `/arena` sub-route if `active`, `/results` if `completed`), `[code]/arena/page.tsx` (battle screen — redirects back to lobby if still `lobby`), `[code]/results/page.tsx` (**unconditional render, no `status` gate**).

**API routes** (`src/app/api/rooms/**`):
- `create` (POST): builds the problem set by querying `problems` (`track="dsa", is_active=true`), OR-filtered by topic tags (Postgres `@>` containment), difficulty-band mapped, falling back to the unfiltered active pool if the topic filter yields nothing; shuffles and slices to `num_questions`; inserts `rooms` + `room_problems` (`order_index`) + auto-joins the host into `room_participants`.
- `list` (`?tab=public|mine`): `mine` joins via `room_participants.user_id`; default lists `visibility="public" AND status="lobby"` (limit 50), with participant counts batched (not N+1).
- `[code]` (GET): room + participants + ordered problems.
- `[code]/join` (POST): capacity-checked against `max_players`; **upserts** on `(room_id, user_id)` — allows re-joining after leaving.
- `[code]/leave` (POST): soft-leave, sets participant `status="left"`.
- `[code]/start` (POST, **host-only**): computes `ends_at = now + settings.time_limit_minutes*60000` (default 30 min); flips `status: lobby → active`. **This is the only status transition after creation found anywhere in the codebase.**
- `[code]/submit` (POST, 60s max duration): requires `status==="active"` and an `active` participant; fetches `test_cases` via the **service-role client** (column-level RLS blocks `test_cases` from anon/authenticated); harness-builds and Judge0-runs (Python/JS only — throws for anything else); verdict is `accepted`/`tle`/`wrong_answer`. **Score:** `difficultyWeight = [0,100,200,300,400,500][difficulty]`; all-accepted → full weight, partial → `floor((passed/total) * weight * 0.5)`. Every attempt is logged to `room_submissions`; on acceptance the participant's total `score` is recomputed as the sum of the **best score per distinct problem** across accepted submissions. Mode-specific branching: `blitz` unlocks the next unsolved problem and marks `finished` once all are solved; `sudden_death` eliminates on any wrong answer (`status="eliminated"`).
- `[code]/invite` (POST `{friend_id}`): requires an `accepted` friendship; inserts a generic `notifications` row (`type:"room_invite"`) rather than a dedicated invites table.

**Real-time sync:** Supabase Realtime on `rooms`, `room_participants`, `room_submissions` (explicitly enabled via `alter publication supabase_realtime add table ...`). Lobby subscribes to room-status UPDATE (routes to arena on `active`) and participant `*` events (triggers a refetch, not direct payload consumption). Arena screen subscribes similarly plus runs its own client-side countdown from `room.ends_at`; at 0, it waits 2s then **client-navigates to `/results` regardless of server state**.

**⚠️ Gap:** No API route, RPC, or cron anywhere in the codebase ever sets `rooms.status = "completed"`. The only transition after creation is `lobby → active`. The results page renders unconditionally, and the arena screen's move to `/results` is a pure client-side timer navigation — the room row itself appears to stay `status="active"` indefinitely unless something outside this repo updates it. RLS also only permits the **host** to UPDATE a room, reinforcing that nothing else in the app *can* flip it to `completed` short of a service-role write, and none exists.

**Room code:** generated by a **Postgres column default** (`upper(substring(replace(gen_random_uuid()::text,'-',''),1,6))`) — a random 6-char uppercase hex-ish slug — not application code.

**DB (`schema_v4_rooms.sql`):** `rooms(id, code, host_id, title, mode[standard|blitz|sudden_death|speed_run|marathon], status[lobby|active|completed], visibility[private|public], max_players[2-8], settings jsonb, started_at, ends_at)`; `room_participants(room_id, user_id, status[active|eliminated|finished|left], score, rank [never set anywhere in code], finished_at)`, unique `(room_id,user_id)`; `room_problems(room_id, problem_id, order_index)`; `room_submissions(room_id, user_id, problem_id, language, code, verdict, score, passed_cases, total_cases, solve_time_ms)`.

---

## 12. Forge — Weekly Challenge System

**Purpose:** An async, submission-based track (40 weekly challenges across 4 rotating tracks) — distinct from PvP DSA ELO, judged by GPT-4o against a per-challenge rubric, feeding its own `track='forge'` ELO ladder.

**Schedule** (`src/lib/forge/schedule.ts`): `IST_OFFSET_MIN=330`; `FORGE_ANCHOR_DATE` env var (default `2026-06-21T18:30:00.000Z` = Mon 2026-06-22 00:00 IST = week 1 start). `weekStart(n) = anchor + (n-1)*7d`; `weekClose(n) = start + 6d21h30m` (Sunday 21:30 IST). `currentActiveWeek(now)` clamps to `[1,40]`.

**Cron endpoints:** `api/forge/cron/open-week` and `.../close-week`, both gated by `Authorization: Bearer ${CRON_SECRET}` (401 if unset/mismatched). Open computes the current calendar week and calls `openWeek()`; close calls `closeAndJudgeWeek()` on whatever week is currently `active`.

**⚠️ Gap:** `vercel.json` has no `crons` key; no `.github/workflows` exist. **No scheduler config for these endpoints was found anywhere in this repo** — they must be triggered externally (Vercel dashboard-configured cron, or an outside scheduler hitting the URL with the bearer secret). Do not assume Vercel native cron without separately confirming it in the deployment dashboard.

**Judging pipeline** (`src/lib/forge/extract.ts` + `judge.ts`):
1. `extractArtifactText()`: converts the submitted artifact to judge-readable text, capped at 50,000 chars (pdf/zip/md/code) or 20,000 (external links). PDF via dynamically-imported `pdf-parse`; ZIP via dynamically-imported `unzipper`, walking entries through a curated source/doc/config allowlist (no binaries). Link submissions can't be fetched — the judge is instructed to penalize unverifiable links. Learner notes (≤4000 chars) appended.
2. `judgeSubmission()`: OpenAI SDK, `model = process.env.FORGE_JUDGE_MODEL || "gpt-4o"`, `temperature:0.1`, JSON-mode response. System prompt embeds the challenge's weighted rubric dimensions and calibration guidance (median submission ≈ 50% of max per dimension, use the full range). The model returns `rubric_scores` + `feedback`; the **server re-clamps each score and recomputes `overall_score` itself** (`Σ(clamped/max*weight*100)/Σweight`) rather than trusting the model's self-reported total.

**Lifecycle** (`src/lib/forge/admin-helpers.ts`), shared by cron and admin API:
- `openWeek(week, {startNow, forceCloseInMinutes})`: idempotent (no-op if already active/judging/closed). Cron mode uses calendar dates; admin mode (`startNow=true`) starts immediately and closes 7 days later (or a custom test window).
- `lockWeek(week, {force})`: reverses a week back to `scheduled`. Must be locked in **reverse chronological order** (all later weeks must already be `scheduled`). Refuses (without `force`) if `forge_leaderboard_snapshots` rows already exist (i.e. ELO was applied) for that week. On lock: deletes submission files from Storage, deletes snapshot + submission rows, resets the challenge row. **`user_ratings.elo` is never automatically reversed** — explicitly a manual admin task.
- `closeAndJudgeWeek(week?)`: sets `status="judging"`, judges every `pending`/`failed` submission, skips ELO+snapshot entirely if snapshots already exist for the week (re-run safety), else computes `computeWeeklyEloDeltas()` over all `scored` submissions, calls `apply_forge_weekly_delta` per user, writes `elo_delta`/`rank_in_week` back onto each submission, upserts `forge_leaderboard_snapshots`, sets `status="closed"`.

**Admin routes** (`api/forge/admin/**`, each independently re-checks `profiles.is_admin` — no shared middleware): `open-week`, `close-week` (300s max duration), `lock-week`, `rejudge` (re-runs the extract+judge pipeline for a single submission, bypassing the batch "already snapshotted" skip — useful for fixing one bad judge call).

**Learner routes:** `weeks` (list + caller's own submission summary + Pro flag), `weeks/[week]` (full detail — `reference_solution_url` only returned once `mySubmission` exists, an **API-layer** gate, not RLS), `submit` (multipart, rate-limited 10/60s, validates format against the challenge's `submission_formats` allowlist and `is_pro_only` gating, duplicate-submission check backed by a DB unique constraint on `(challenge_id,user_id)`, uploads to Storage bucket `forge-submissions` at `{user_id}/{week}/{timestamp}-{uuid}.{ext}` — **judging is not triggered synchronously by submit**, only by week-close or rejudge), `submissions/me`, `leaderboard` (top-100 `user_ratings` where `track="forge"`, plus the active week's top-10 scored submissions strip).

**Content** (`src/lib/forge/challenges.ts`): 40 hardcoded challenges, 4 tracks × 10 each — `mental_models`(S0)/`daily_driver`(S1)/`operator_4d`(S2)/`agentic_eng`(S3), rotating `trackIdx=(week-1)%4`. Difficulty bands: weeks 1–4 `foundation`, 5–20 `build`, 21–36 `advanced`, 37–40 `capstone`. Weeks 1–4 free, 5–40 Pro-only. `src/lib/forge/track-meta.ts` is pure UI metadata (labels, colors, deep links into `/learn/agent`).

**DB (`schema_v6_forge.sql`):** `forge_challenges(week_number unique, track, rubric jsonb, submission_formats text[], max_file_mb default 50, is_pro_only, reference_solution_url, status[scheduled|active|judging|closed])`; `forge_submissions(challenge_id, user_id, artifact_url, artifact_format, judge_status[pending|judging|scored|failed], rubric_scores jsonb, overall_score, elo_delta, rank_in_week)`, unique `(challenge_id,user_id)`, updates restricted to service-role only; `forge_leaderboard_snapshots(challenge_id, user_id, rank, elo_before, elo_after, elo_delta)`. Storage bucket `forge-submissions` is private, path-scoped RLS (`{user_id}/...`) — the upload path convention is security-load-bearing, not just organizational.

---

## 13. Admin Panels

**Auth enforcement — two separate patterns:**
1. **Pages** under `src/app/admin/**` are gated once, centrally, by `src/app/admin/layout.tsx` — `auth.getUser()` → redirect `/login`; `profiles.is_admin` → redirect `/dashboard` if false. Wraps every admin page.
2. **API routes** under `src/app/api/admin/**` and `src/app/api/forge/admin/**` are **not** covered by that layout (Next.js layouts don't wrap Route Handlers) — each route independently re-implements the identical `profiles.is_admin` check (401 unauthenticated / 403 non-admin). Repeated verbatim across ~6 files; no shared middleware exists for this.

**Capabilities:**
- **Hackathons admin** (`/admin`, `/admin/hackathons/new`, `/admin/hackathons/[slug]/{edit,submissions}`): list with registration/submission counts; create/edit via service-role client (`slug, title, tagline, description, banner_url, status, registration_deadline, starts_at, ends_at, prizes, tags, max_team_size, allow_solo, allow_teams, problem_statement`); a per-hackathon submissions viewer resolving submitter emails via `auth.users`.
- **Forge admin** (`/admin/forge`): all 40 weeks with status + submission counts (total/scored/pending/failed); **Open**, **Close+Judge** (explicit UI warning: invokes gpt-4o on every submission and applies ELO, "cannot be cleanly undone"), **Lock** (warns it wipes submissions/files; `force=true` variant explicitly notes ELO is not reversed). Lock buttons are UI-disabled when any later week isn't `scheduled`, mirroring the server-side ordering rule.
- **Referrals admin** (`/admin/referrals`): funnel dashboard (referrals, verified/qualified counts, pending/delivered grants, click counts, dollars delivered), pending-grants fulfillment queue, top-50 referrers. See [§24](#24-referrals--invites) for the fulfill/revoke mechanics.

---

## 14. Learn Platform (DSA / Prompt / Agent)

**Hub** (`src/app/learn/page.tsx` + `LearnHub.tsx`): three hardcoded tracks (DSA, AI Prompting, Agentic Track). `proLocked = !track.free && !isPro && !PRO_FEATURES_FREE`. All three currently have `free:true` at the top level — Pro gating happens *inside* each track (per-module/season), not at the hub.

### 14.1 DSA Track
`src/app/learn/dsa/page.tsx` + `DSALearnClient.tsx`. Content is **DB-driven**: `learn_playlists` joined `learn_lessons` (`track='dsa', is_active=true`, ordered `sort_order`), progress from `learn_progress` (`lesson_id, completed`). Completion posts to `/api/learn/progress` (upsert on `(user_id,lesson_id)`). Code practice reuses the shared `/api/learn/run` playground endpoint (Judge0, arbitrary stdin, no test-case checking).

**⚠️ Gap:** `learn_playlists`, `learn_lessons`, `learn_progress` have no `CREATE TABLE` anywhere in `supabase/*.sql` and no typed entry in `src/types/database.ts` — created outside this repo's tracked migrations. Columns above are inferred from query shapes, not an authoritative DDL.

### 14.2 Prompt Engineering Track
`src/app/learn/prompt/page.tsx` + `PromptLearnClient.tsx`. Content: `prompt_modules` → `prompt_exercises` → `prompt_tasks` (3-level join, `sort_order`). Progress: `prompt_exercise_progress` (`exercise_id, best_score, completed`).

**Grading reuses Prompt Battle's judge** — exercise attempts are submitted to `/api/prompt-battle/submit` (not a Learn-specific route) with `session_id:"learn-"+exercise.id`, `model:"gpt-4o-mini"`. A `composite_score >= 60` marks it complete, then progress is separately persisted via `/api/learn/exercise-progress` (upsert on `(user_id,exercise_id)`).

**⚠️ Gap:** `prompt_modules`, `prompt_exercises`, `prompt_exercise_progress` share the same "no tracked DDL" gap as the DSA tables above.

### 14.3 Agentic Track
`src/app/learn/agent/page.tsx` + `AgentLearnClient.tsx`. Content is **not DB-driven at all** — fully hardcoded in `src/lib/agentSeasons.ts` (~2000 lines, `AGENT_SEASONS`: S0 "Mental Models" 15 cards, S1 "The Daily Driver" 20 cards, S2 "The 4D Operator" 20 cards, S3 continuing). Card formats include `glitch_diagnosis`, `prediction` (MCQ), `mental_model`, `repair`, `output_match`, `delegation_sim`, and `spec_to_agent` (open-ended, self-graded against a `rubric`).

**Grading is entirely client-side and self-graded** — `src/lib/agentModelAnswers.ts` provides a hardcoded "gold" answer per card ID, shown alongside the rubric for the learner to self-assess. **No OpenAI call, no server route** is involved.

**Progress is localStorage-only** (`STORAGE_KEY="arenax-agent-v1"`) — not persisted server-side at all, a materially different model from the DSA/Prompt tracks. `FREE_SEASONS = {"S0"}`; S1–S3 require Pro.

### 14.4 `/api/learn/run` (free-run playground)
Auth-gated; POSTs directly to `${JUDGE0_API_URL}/submissions?wait=true` with a 12s hard timeout and `cpu_time_limit:10, memory_limit:262144`. `maxDuration=60`. On network failure returns HTTP 200 with a synthetic `status_id:0` and a friendly diagnostic message (deliberately 200 so the frontend renders it rather than treating it as a fetch failure). No test-case checking — pure arbitrary-stdin execution, distinct from the harness-driven judged routes.

---

## 15. Daily Challenge

**Purpose:** One challenge per user per day with streak tracking.

**Key files:** `src/app/daily/page.tsx`, `DailyClient.tsx`, `src/app/api/daily/solve/route.ts`.

**Page:** fetches today's row from `daily_challenges` (joined `problems`) filtered to the current user + today's UTC date; last-90-day history for a heatmap; `currentStreak` = today's `streak_count` if solved today, else falls back to the most recent prior solved day's count.

**⚠️ Gap — no generation path found:** there is **no code anywhere in `src/` that inserts a row into `daily_challenges`** (confirmed by grepping the whole tree). Unlike Forge, there's no cron/admin route for daily-challenge generation. The table (`user_id, problem_id, date, solved, solved_at, streak_count`, unique `(user_id,date)`) supports select/update via RLS but nothing in this repo *creates* today's row or assigns a `problem_id`. Selection must happen via a process outside this repository (Supabase Edge Function, external scheduler, manual seeding) — do not assume any particular algorithm.

**Submission** (`api/daily/solve/route.ts`, `maxDuration=60`): loads today's challenge via the **service-role client** (needed because the `problems(*)` join includes non-client-readable `test_cases`), 400s if `daily.solved` already. Builds via `buildSubmission()` (harness), runs via `runAllTestCases()` (Judge0). Always inserts a `submissions` row regardless of pass/fail. On full pass: looks up **yesterday's** row for streak continuity — `newStreak = (yesterday.solved ? yesterday.streak_count : 0) + 1`. **A missed day resets the streak to 1**, not a gap-tolerant chain. No OpenAI usage anywhere in this flow.

---

## 16. Prompt Battle

**Purpose:** AI-prompt-engineering competitive mode — write a prompt, have it executed against a model, get judged by an LLM on 5 rubric criteria.

**Key files:** `src/app/battle/prompt/page.tsx`, `src/components/battle/PromptBattle.tsx`, `src/app/api/prompt-battle/start/route.ts`, `src/app/api/prompt-battle/submit/route.ts`.

**UI flow:** 3-phase state machine — `setup → battle → results`. Setup lets the user pick an execution model from a hardcoded list: `gpt-4o-mini`, `gpt-4o`, and `gemini-pro` (labeled "Gemini 1.5 Flash"). **`gemini-pro` is a UI-only placeholder** — server-side it's silently mapped to `gpt-4o-mini` (`// placeholder until Gemini SDK added`); no Gemini/Google SDK is installed or called anywhere in the codebase.

**`start`:** fetches an optional daily task (`prompt_tasks` where `is_daily=true, daily_date=today`) plus the active non-daily pool (errors if <3 exist). Task selection shuffles then greedily picks 3 with preference for domain uniqueness, backfilling if needed. Creates a `prompt_sessions` row — **note:** this row's `model` column is always hardcoded to `"gpt-4o-mini"` regardless of what the user later selects per-attempt; the actually-used model is passed fresh on each `submit` call and never written back to the session.

**`submit` — the core AI judge, two OpenAI calls per cold submission:**
1. **`runPromptOnModel`**: executes the user's prompt against the selected model (`gpt-4o-mini`/`gpt-4o`/mapped-`gemini-pro`) via `openai.chat.completions.create` (`max_tokens:800, temperature:0.7`).
2. **`judgePrompt`**: **always** uses `gpt-4o-mini` as the judge (independent of the execution model), `temperature:0.1`, JSON-mode response. Scores 5 criteria 0–4 each — Goal Specificity, Context Provisioning, Constraint Precision, Robustness, Efficiency — per an explicit rubric with calibration rules ("use the full 0-100 scale," "missing goal/format/audience caps at 60," "under 20 words = 0-25," penalize generic openers, "never award all 4s — 100 is reserved for publishable examples"). Feedback is one sentence tied to the lowest-scoring criterion.

**Cost-control resolution ladder:**
- **Junk short-circuit:** prompts under 15 chars get a canned all-zero score — no OpenAI call spent.
- **Dedup cache:** `promptHash = sha256(taskId + normalizedPrompt)` looked up in `prompt_judge_cache` (tracked table, `schema_v5_optimizations.sql`) via the admin client — a cache hit reuses stored scores and **skips both OpenAI calls**, explicitly closing "the resubmit score-gaming hole."
- **Cold path:** both calls run; on model-execution failure, falls back to judging the prompt structurally with a placeholder output note.
- Prompts are truncated to 4000 chars before being sent ("token-bomb protection").

**Scoring:** `composite = (sum of 5 criteria, 0-20) * 5` → 0-100. Tiers: `≥91 Master, ≥76 Expert, ≥61 Practitioner, ≥41 Apprentice, else Novice`.

**Pro gate:** Pro users get a "revise prompt" second attempt per task (`attempt_number:2, is_pro_revision:true`) after seeing feedback; non-Pro see a locked chip.

**Rate limit:** `pb_submit:${user.id}`, 20/60s, fail-open.

**⚠️ Gap:** `prompt_tasks`, `prompt_sessions`, `prompt_attempts` share the same "no tracked DDL" gap as the Learn tables — only `prompt_judge_cache` is version-controlled in `supabase/*.sql`.

`src/lib/scout.ts` (the "Scout" top-1%-by-ELO DSA leaderboard badge) is unrelated to Prompt Battle despite superficial proximity in the codebase — do not conflate.

---

## 17. Function-Mode Harness

**Purpose:** Bridges "write a whole stdin/stdout program" (legacy `io_mode='stdio'`) and "write just a function" (`io_mode='function'`, LeetCode-style) problem authoring. See [`JUDGING_HARNESS.md`](./JUDGING_HARNESS.md) for the full deep-dive — summarized here for completeness.

**Type system:** `int | long | double | bool | string | int[] | string[] | int[][] | string[][]`.

**Supported languages:** `python, javascript, cpp, java`. **C is explicitly excluded** ("C's array-by-pointer+size convention doesn't fit the uniform param model") — function-mode C submissions throw `HarnessUnsupportedError`, surfaced as an HTTP 400 (the error message in several callers is stale, saying "Python and JavaScript only" even though C++/Java are also supported).

**`buildSubmission()`** is the single entry point: stdio problems pass through unchanged; function-mode problems get the user's code plus a generated driver appended (Python/JS use a generic runtime parser; C++/Java use codegen'd typed parse statements per parameter, since they're statically typed — Java specifically requires the user's class be named `Solution`, wrapped in a generated `Main` class for Judge0). Both C++ and JS drivers canonically sort nested `string[][]` results (inner arrays, then the outer array) so order-independent answers (e.g. Group Anagrams) compare correctly regardless of output order.

**`buildStarter()`/`signatureLine()`** generate the editor's pre-filled function stub and the compact signature line shown above it — explicitly documented as safe to expose to the client (signature only, never the answer), matching the `PROBLEM_PUBLIC_COLUMNS` whitelist in `src/lib/problemColumns.ts`.

**Consumers:** Arena submit/solo-submit, Practice submit, Daily solve, Rooms submit. **Not** used by `/api/learn/run` (free-form playground) or Prompt Battle (unrelated domain).

**DB:** `problems.io_mode/function_name/param_spec/return_spec` added by `schema_v8_harness.sql`, extended by `schema_v10_harness2.sql` (converts additional seeded problems, including reformatting stdin/expected-output for canonical comparison).

---

## 18. Friends

**Purpose:** Bidirectional friend graph feeding the Direct Challenges feature and room invites.

**Key files:** `src/app/friends/layout.tsx`, `page.tsx`, `src/components/friends/FriendsClient.tsx`, `src/app/api/friends/{list,request,respond,notifications}/route.ts`, `supabase/schema_v3_friends.sql`.

**DB:** `public.friendships(requester_id, addressee_id, status[pending|accepted|declined])`, unique `(requester_id,addressee_id)`, check `requester_id != addressee_id`. RLS: select for either party; insert only by requester; update only by addressee. Added to the Realtime publication (though the friends UI itself doesn't subscribe to it directly — see below).

**Request flow:** resolves target by username; rejects self-add; checks existing rows in either direction — `accepted` → 409; **mutual pending in the opposite direction auto-accepts** (mutual-add pattern); own already-pending → 409; `declined` → row is reused/reset to `pending` (re-request); otherwise inserts fresh.

**Respond flow:** verifies caller is `addressee_id` and status is `pending`, updates to `accepted`/`declined`.

**Notifications — polling, not realtime:** `Navbar.tsx` polls `GET /api/friends/notifications` every 30s, returning a combined badge count of pending friend requests **plus** pending challenges.

**Challenges (not friendships) use Realtime** inside `FriendsClient`: subscribes to `challenges` INSERT/UPDATE filtered to the caller as `challenged_id` (drives the live "X challenged you!" banner) and separately to `UPDATE` where the caller is `challenger_id` (auto-redirects the *sender* into the match the instant the friend accepts, reading `match_id` off the updated row).

**Search:** debounced 500ms direct client-side query against `profiles` (exact case-insensitive username match, strips leading `@`), then a separate `user_ratings` lookup for DSA ELO/tier display.

---

## 19. Direct Challenges

**Purpose:** Friend-to-friend match invites, bypassing open matchmaking entirely.

**DB:** `public.challenges(challenger_id, challenged_id, track default 'dsa', mode[ranked|casual] default 'casual', status[pending|accepted|declined|expired], match_id → matches, expires_at default now()+2min)`, check `challenger_id != challenged_id`. RLS: select for either party; insert only by challenger; **update permitted for anyone** (`using(true)`) — the decline path relies on this permissive policy plus its own manual ownership check in application code rather than RLS enforcement. Also adds `matches.mode[ranked|casual] default 'ranked'`.

**Send** (`api/challenges/send`): requires an `accepted` friendship between the two users; expires any pre-existing pending challenge from the same challenger→challenged pair before inserting the new one (prevents stacking).

**Respond** (`api/challenges/respond`):
- **Decline:** application-level ownership/status check, then a plain status update.
- **Accept:** delegates to RPC **`accept_challenge(p_challenge_id)`** (`SECURITY DEFINER`, avoids needing the service-role key client-side) — locks the row (`FOR UPDATE`), verifies caller is `challenged_id`, status is `pending`, and not expired (else marks `expired`), picks a **random problem** for the challenge's track, reads both players' ELO (default 800), **inserts directly into `public.matches`** (bypassing the matchmaking queue entirely — this is the only other code path besides matchmaking that creates a match), updates the challenge to `accepted` with the new `match_id`.

**Client wiring:** on accept, the accepter is routed to `/arena/${match_id}` directly from the API response; the challenger is routed there separately via the Realtime subscription described in [§18](#18-friends).

**⚠️ Gap:** challenge expiry (2 minutes) is enforced only **lazily**, when someone actually calls `accept_challenge` — no background job proactively flips stale `pending` challenges to `expired`.

---

## 20. Leaderboards

**Main leaderboard** (`src/app/leaderboard/page.tsx`, `revalidate=60`): top-100 `user_ratings` (`track='dsa'`) ordered by ELO desc, joined `profiles`; caller's own rating/rank fetched separately, with rank always computed as a global `count`-of-higher-ELO query (correct even if the caller is outside the top 100). Purely DSA-ELO ranked — no other track appears here.

**Top Referrers leaderboard** (`src/app/leaderboard/referrers/page.tsx`, `force-dynamic`, no caching): queries `referrals` where `qualified_at is not null` (only `referrer_id`, explicitly "no PII" per an inline comment), groups/counts **in application code** (not SQL), top 100. Ranks by qualified-referral count — an entirely separate dimension from the main leaderboard's skill ranking, sharing no query logic.

**`/api/stats`** (`revalidate=300`): landing-page vanity counters — `profiles` row count and `matches` where `status='completed'`, via `count:"estimated"` (not exact — deliberate cost/performance tradeoff on the shared Postgres tier) using the service-role client.

---

## 21. Hackathons

**Purpose:** Team-or-solo tournament system: registration, a live public submission gallery, admin CRUD.

**Key files:** `src/app/hackathons/page.tsx`, `[slug]/page.tsx`, `src/app/api/hackathons/[slug]/{register,submit}/route.ts`, `supabase/add_submission_drive_url.sql`.

**⚠️ Gap:** no `CREATE TABLE` for `hackathons`, `hackathon_registrations`, or `hackathon_submissions` exists anywhere in `supabase/*.sql` (only the drive-url migration touches `hackathon_submissions`). These tables were evidently created outside this repo's tracked migrations. Columns below are inferred from query code, not an authoritative DDL.

**Registration** (`register/route.ts`): service-role client (built inline, not via the shared admin helper); hackathon must be `upcoming`/`active` and before its registration deadline; if teams are allowed, validates team size and resolves teammate usernames to profile IDs; **upserts** on `(hackathon_id,user_id)` — re-registering just updates team info idempotently.

**Submission** (`submit/route.ts`): **link-based only, no file upload** — `title, description, project_url, demo_url, github_url, drive_url` are all individually optional but at least one must be non-empty (the `add_submission_drive_url.sql` migration explicitly dropped a `NOT NULL` on `title` to make this fully optional). Requires hackathon `status='active'` and before `ends_at`; requires an existing registration (403 otherwise); **upserts** on `(hackathon_id,user_id)`, so resubmitting edits the same row.

**Detail page:** loads the hackathon, the caller's own registration/submission, **all** submissions joined to `profiles` (a public gallery), and an exact `participantCount`.

---

## 22. Contests

`src/app/contests/page.tsx` is a **pure placeholder / "coming soon" page** — confirmed by reading the full file. Auth-gated, static marketing copy listing planned (locked) features: weekly rated contests, live leaderboard during contest, ELO boost for top finishers, cross-track problem sets. No data fetching beyond the auth check, and **no code-level relationship to Hackathons or Forge** despite conceptual overlap — it's a standalone stub with a "Back to Dashboard" link.

---

## 23. Payments (Cashfree + Pro)

**Provider: Cashfree Payment Links** (verified directly from the request URL in code — `https://api.cashfree.com/pg/links` — this is **not** Razorpay).

**`create-link`** (`src/app/api/payments/create-link/route.ts`):
1. Validates a 10-digit phone number; 400s if the caller is already `is_pro`.
2. Builds a unique `link_id = arenax_<last8ofUserId>_<compact ISO timestamp>`; `link_expiry_time` = now + 2h, manually formatted with a hardcoded `+05:30` (IST) offset suffix.
3. Origin derived from `x-forwarded-proto`/`host` headers (works on Vercel without an env var); **`notify_url`/`return_url` are only sent if the origin is HTTPS** (Cashfree rejects `http://`) — meaning on localhost, no webhook/return URL is ever registered, so the webhook cannot fire in local dev.
4. POSTs the Cashfree link-create payload: `link_amount:499` (INR, hardcoded), `link_notes:{profile_id, amount}` (this is how the webhook maps the payment back to a user — there's no separate pending-payment table), `link_partial_payments:false`, `link_auto_reminders:false`.
5. Returns `{payment_url}` for redirecting the browser to Cashfree's hosted checkout.

**`webhook`** (`src/app/api/payments/webhook/route.ts`):
- Every code path — including the catch block — returns HTTP 200 (comment: "Cashfree retries on non-200; always return 200 after parsing").
- **Signature verification:** `expected = base64(HMAC-SHA256(timestamp+rawBody, CASHFREE_CLIENT_SECRET))`, compared via `crypto.timingSafeEqual` against the `x-webhook-signature` header.
- **🔴 Security gap, verified in code:** on a signature mismatch, the handler only `console.warn`s **"signature mismatch — processing anyway"** and continues to process the payment regardless. If the `x-webhook-signature`/`x-webhook-timestamp` headers are absent entirely, verification is skipped outright (it's gated behind `if (signature && timestamp)`). In the current implementation, **anyone who can reach the webhook URL and guess/know a valid `profile_id` could grant themselves Pro status without a valid Cashfree signature**, since the mismatch is only logged, never enforced. This should be treated as a priority fix, not a documentation footnote.
- Supports two payload shapes (`data.link_notes` or `data.order.order_tags`) to extract `profile_id`. `isPaid = payment.payment_status==="SUCCESS" OR link_status==="PAID"` — no explicit handling of other Cashfree event types (failed/expired); anything else is silently treated as pending/ignored.
- On paid: sets `profiles.is_pro=true`, `pro_expires_at = now + 1 year`, via the service-role client.

**`apply-coupon`**: a single hardcoded coupon string `BITCOINBHARAT` (case-insensitive) — not a discount mechanism, it directly grants the same effect as a successful payment (`is_pro=true`, `pro_expires_at=+1yr`). No coupon table exists.

**`pro-status`** (`GET /api/user/pro-status`): `isPro = is_pro && (!pro_expires_at || pro_expires_at > now)` — Pro is **lazily expired at read time**; the `is_pro` boolean itself is never flipped back to `false` by any background job. Code elsewhere that reads `profiles.is_pro` directly (rather than through this endpoint) must separately replicate the expiry check, and several places do (Forge routes each independently recompute the same expiry condition) — this duplication is a minor DRY gap, not a correctness bug, since the logic is at least consistent everywhere it's replicated.

**What Pro unlocks** (all gated additionally by the global `PRO_FEATURES_FREE` kill-switch in `src/lib/featureFlags.ts`, which — when `true` — bypasses every Pro check below for all users without touching the underlying `is_pro` column):
- Learn Hub non-free tracks, Prompt Learn non-free modules, Prompt Battle's "revise prompt" second attempt, Forge weeks 5–40 (`is_pro_only` challenges), the Welcome carousel's Pro-labeled chips. The Profile page's Pro badge deliberately still reflects real payment status even when `PRO_FEATURES_FREE` unlocks features for everyone — a documented "separate concern."

---

## 24. Referrals & Invites

See [`REFERRALS.md`](./REFERRALS.md) for the full deep-dive; summarized here for completeness within this feature index.

**Invite landing page** (`src/app/invite/[code]/page.tsx`, public, no auth required): looks up `profiles` by `referral_code`, fire-and-forget increments a click counter via RPC `bump_referral_click`, renders the referrer's name and a CTA to `/signup?ref=<CODE>`.

**Code capture:** `?ref=` or `/invite/<CODE>` is captured by `src/middleware.ts` into the HttpOnly `arenax_ref` cookie (30 min TTL), consumed at signup or, for OAuth, at the `/auth/callback` step (`consumeReferralCookie`) — see [§1](#1-authentication).

**⚠️ Gap:** the code that actually *generates* `profiles.referral_code` per user was not located in the files reviewed for this document — likely a DB trigger/column default not covered by the `.sql` files inspected. Flag as unverified rather than asserting a generation algorithm.

**Qualification pipeline** (all Postgres `SECURITY DEFINER` functions):
1. `handle_new_user()` — on signup, if a referral code is present in `raw_user_meta_data`, atomically resolves it and writes `profiles.referred_by` + a `referrals` row inside the same trigger that creates the profile (replacing what a code comment says was a prior racy client-side `setTimeout`-based approach).
2. `handle_email_confirmed()` (trigger on `auth.users`, fires on `email_confirmed_at` transitioning null→set) — stamps `referrals.verified_at`, and (per a later patch, `referrals_qualify_fix.sql`) also immediately calls `check_referral_qualification()` to fix a bug where a user who completed a match *before* confirming email would never separately get qualified.
3. `check_referral_qualification(user)` — sets `qualified_at` only if unset and `verified_at` is already set, then calls `check_tier_crossing()`.
4. `on_match_completed()` (trigger on `matches`, fires on transition to `status='completed'`) — calls qualification for **both** players. **⚠️ Note:** this SQL trigger does not filter by `mode='ranked'`, despite the referrers-leaderboard UI copy saying "played a ranked match" — qualification actually fires on completing *any* match (ranked or casual), a discrepancy between UI copy and enforced logic.
5. `check_tier_crossing(referrer)` — for each threshold in `[20,75,100,300,500]` the referrer's qualified count now meets, inserts a `referral_grants` row (idempotent via `on conflict (user_id,tier_threshold) do nothing`).

**Reward tiers** (cumulative qualified-referral counts → OpenAI API credit grants, delivered as actual API keys, not cash): `20→$10, 75→$25(cumulative), 100→$50, 300→$100, 500→$200`, lifetime cap $200. These thresholds are duplicated in `ProfileClient.tsx` (client display) and must be kept in sync manually with the SQL-side tiers — see [§3](#3-profile-own--public).

**Anti-abuse** (`src/lib/referralAbuse.ts`):
- `normalizeEmail()`: lowercases and strips Gmail-style `+tag` aliases before comparison — defeats self-referral via alias emails. Mirrors an equivalent SQL function so client and server logic agree.
- `ipHashFromHeaders()`: SHA-256 hash of the client IP (`x-forwarded-for`/`x-real-ip`/`cf-connecting-ip`/`x-client-ip`, in that fallback order) — raw IPs are never stored.
- Both checks (self-referral, IP throttle) are applied identically at signup (`auth/actions.ts`) and OAuth callback (`auth/callback/route.ts`) — a blocked check silently drops the referral credit, **never blocks the signup itself**.
- `bump_signup_throttle(ip_hash, limit=5)` (SQL RPC): max 5 referred signups per IP-hash per day, fails open (`true`) if `ip_hash` is empty/null.
- `flag_suspicious_referrers()` (SQL, optionally scheduled via `pg_cron` daily at 02:00 UTC if the extension is available — wrapped to no-op if it isn't): flags any referrer with >50 qualified referrals in 24h (spike) or ≥20 within a 7-day window (velocity), setting `review_required=true` on **all** of that referrer's `referrals` rows for admin review.

**Admin fulfill/revoke** (`api/admin/referrals/{fulfill,revoke}`, both `is_admin`-gated, service-role client): **fulfill** validates the pasted key looks like `sk-...` (≥20 chars), sets `status='delivered'` guarded by `.eq("status","pending")` (can't double-fulfill); **revoke** sets `status='revoked'` with a reason, explicitly **does not** unwind the underlying `referrals`/qualification rows — that would be a separate manual step. There is no automated OpenAI key-provisioning integration; an admin manually generates a key out-of-band and pastes it in.

---

## 25. Cross-cutting utilities

**`src/lib/rateLimit.ts`** — `rateLimit(bucket, limit, windowSeconds)`, backed by Postgres RPC `check_rate_limit` (fixed-window limiter, no Redis/Upstash). **Fails open by design** — an RPC error (e.g. a missing migration) returns `true` (allowed), since "a missing migration must never break a core flow." Used by: Forge submit (10/60s), Prompt Battle submit (20/60s), Matchmaking join (20/60s), Arena submit (30/60s). **Not used** anywhere in Friends/Challenges/Hackathons/Payments/Referrals routes.

**`src/lib/featureFlags.ts`** — two hand-edited booleans, no admin UI or DB-backed toggle:
- `PRO_FEATURES_FREE` (default `false`) — global override unlocking every Pro gate for everyone without touching `profiles.is_pro`.
- `FORGE_ENABLED` (default `true`) — hides the `/forge` nav link when `false`. **⚠️ Note:** grep confirms this flag only gates nav *visibility* — the underlying `/forge` pages and `/api/forge/**` routes do not independently check `FORGE_ENABLED`, so they remain reachable by direct URL even with the flag off. If full feature-disable is the intent, this is a gap between intent and enforcement.

**`src/lib/scout.ts`** — computes the "Scout" badge (top ~1% by DSA ELO, `SCOUT_PERCENTILE=0.01`, `SCOUT_MIN=3`), dynamically at read-time (no DB column). Used only on the Profile page; unrelated to Prompt Battle's "judge" despite naming proximity in some file listings.

**`src/lib/harness.ts`, `src/lib/judge0.ts`** — see [§9](#9-judge0-integration-shared-execution-engine) and [§17](#17-function-mode-harness).

---

## 26. Master list of open gaps / ambiguities

These are called out inline above; collected here for a single scan:

| # | Area | Gap |
|---|---|---|
| 1 | Auth | `/auth/error` (referenced by `callback/route.ts`) does not exist under `src/app/auth/`. |
| 2 | Auth | `/auth/reset-password` (referenced by `forgot-password/page.tsx`) does not exist — the reset-password flow is incomplete as wired. |
| 3 | Auth | `signIn` server action in `auth/actions.ts` appears unused — `login/page.tsx` calls `supabase.auth.signInWithPassword` directly instead. |
| 4 | Profile | `referral_grants` query on the own-profile page has no explicit `.eq("user_id", ...)` filter — correctness currently depends entirely on the RLS policy. |
| 5 | Profile | Public profile page's match-history query may be blocked by the base `matches` RLS policy (player-only SELECT) for third-party/anonymous viewers, unless superseded by a later, not-fully-audited patch file. |
| 6 | Profile | `matches.end_reason` is queried but not present in the base `schema.sql` table definition — likely added by an unaudited migration. |
| 7 | Profile | `updateAvatar` server action appears to have no caller — avatars render from a static tier-based map instead. |
| 8 | Roadmap | `roadmap_progress` is fetched but never consumed by `RoadmapClient` — the UI is driven entirely by a live `submissions` computation. |
| 9 | Arena | `ResultClient`/`result/page.tsx` queries `submissions.all_ac`, a column not found in the base `submissions` schema. |
| 10 | Rooms | No code path anywhere ever sets `rooms.status = "completed"` — the results page renders unconditionally and the arena screen's transition is a client-only timer navigation. |
| 11 | Forge | No scheduler (`vercel.json` crons, GitHub Actions, etc.) was found wiring the `cron/open-week`/`cron/close-week` endpoints — they must be triggered externally. |
| 12 | Daily Challenge | No code anywhere creates today's `daily_challenges` row / assigns a problem — the generation mechanism is external to this repo or currently absent. |
| 13 | Direct Challenges | Expiry (2 min) is enforced only lazily on accept — no background job proactively expires stale pending challenges. |
| 14 | Learn / Prompt Battle | `learn_playlists`, `learn_lessons`, `learn_progress`, `prompt_modules`, `prompt_exercises`, `prompt_exercise_progress`, `prompt_tasks`, `prompt_sessions`, `prompt_attempts` all lack tracked `CREATE TABLE` statements in `supabase/*.sql` and typed entries in `src/types/database.ts` — schema for these was created outside this repo's committed migrations. |
| 15 | Hackathons | `hackathons`, `hackathon_registrations`, `hackathon_submissions` share the same untracked-DDL gap as #14. |
| 16 | Payments | **Webhook signature mismatch is only logged, not enforced** — the handler processes the payment and grants Pro status regardless of signature validity. Treat as a priority security fix. |
| 17 | Referrals | The code that generates `profiles.referral_code` per user was not located in the files reviewed. |
| 18 | Referrals | `on_match_completed()` qualifies on completing *any* match, not just `mode='ranked'` ones — a discrepancy with the referrers-leaderboard UI copy. |
| 19 | Feature flags | `FORGE_ENABLED=false` only hides the nav link — `/forge` pages and `/api/forge/**` routes remain reachable directly. |

