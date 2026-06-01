-- ================================================================
-- ArenaX Schema v5 — Optimization primitives (additive, idempotent)
-- Run in Supabase SQL Editor AFTER the earlier schema files.
--
-- Adds:
--   1. rate_limits + check_rate_limit()  — Postgres-backed limiter
--      (no Redis/Upstash needed; free-tier friendly)
--   2. prompt_judge_cache                — dedup cache for the LLM judge
--      so identical prompt resubmissions skip BOTH OpenAI calls
--
-- All app code that uses these FAILS OPEN: if you deploy the code
-- before running this file, requests still work (just unthrottled /
-- uncached). So order of deploy vs. migrate does not matter.
-- ================================================================

-- ── 1. Rate limiting ──────────────────────────────────────────────
-- Fixed-window counter. One row per (bucket, window). Cheap upsert.
create table if not exists public.rate_limits (
  bucket       text        not null,   -- e.g. 'pb_submit:<user_id>'
  window_start timestamptz not null,   -- truncated to the window
  count        integer     not null default 0,
  primary key (bucket, window_start)
);

-- Atomically bump the current window's counter and report if allowed.
-- Returns true if the request is within the limit, false to reject (429).
create or replace function public.check_rate_limit(
  p_bucket         text,
  p_limit          integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  w timestamptz;
  c integer;
begin
  -- Snap now() down to the start of the current fixed window.
  w := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.rate_limits (bucket, window_start, count)
  values (p_bucket, w, 1)
  on conflict (bucket, window_start)
    do update set count = public.rate_limits.count + 1
  returning count into c;

  -- Opportunistic GC: ~1% of calls sweep windows older than 1 hour.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 hour';
  end if;

  return c <= p_limit;
end;
$$;

-- Limiter is written only via service role (server-side). Lock it down.
alter table public.rate_limits enable row level security;
-- (no policies → only service role / SECURITY DEFINER fn can touch it)

-- ── 2. Prompt judge dedup cache ───────────────────────────────────
-- Key: (task_id, sha256 of normalized prompt). On a hit we return the
-- stored scores + model_output and skip both the run and judge calls.
create table if not exists public.prompt_judge_cache (
  task_id          uuid not null,
  prompt_hash      text not null,           -- sha256(normalized prompt)
  score_goal       integer not null,
  score_context    integer not null,
  score_constraint integer not null,
  score_robustness integer not null,
  score_efficiency integer not null,
  composite_score  integer not null,
  tier             text    not null,
  feedback         text    not null,
  model_output     text,
  hits             integer not null default 0,
  created_at       timestamptz default now(),
  primary key (task_id, prompt_hash)
);

alter table public.prompt_judge_cache enable row level security;
-- (server-side only via service role)

-- ================================================================
-- Done. Nothing here alters existing tables, so it is safe to run
-- on a live database at any time.
-- ================================================================
