-- ================================================================
-- ArenaX Schema v6 — Security hardening (additive, idempotent)
-- Run in Supabase SQL Editor.
--
-- Review finding #15 (ladder integrity / CRITICAL):
--   The "Active problems are public" RLS policy exposes EVERY column of
--   public.problems to logged-in users — including `test_cases` (hidden
--   inputs + expected outputs). A user can read them from the browser with
--   the anon key and hardcode answers.
--
-- RLS is row-level and cannot hide a column, so we use a COLUMN privilege:
-- revoke SELECT on just `test_cases` from the client roles. Judging code
-- already reads it with the service-role key, which bypasses grants.
--
-- ⚠️ DEPLOY ORDER: ship the app changes first (the 4 judging routes now read
-- test_cases via the service-role client, and client pages no longer select
-- `*`). THEN run this. Running it before deploy would break those reads.
-- ================================================================

revoke select (test_cases) on public.problems from anon, authenticated;

-- Note: service_role keeps full access (it is not subject to column grants),
-- so server-side judging (arena/solo/practice/rooms/daily submit) is unaffected.

-- ================================================================
-- Done. Verify from a browser/anon session that:
--   select test_cases from problems  -> permission denied
--   select id, title from problems   -> still works
-- ================================================================
