-- ================================================================
-- v6: Forge Weekly Challenge
-- Adds a separate async build-it-at-home surface with its own Elo
-- track ('forge'), per-week submissions, LLM-judged rubric scoring,
-- and weekly leaderboard snapshots. No PvP semantics — Elo is
-- recomputed once a week from the ranking of submitters.
-- ================================================================

-- --------------------------------------------------------------
-- 1. Master list of challenges (40 total, week 1..40)
-- --------------------------------------------------------------
create table if not exists public.forge_challenges (
  id                     uuid primary key default gen_random_uuid(),
  week_number            int unique not null,
  track                  text not null check (track in ('mental_models','daily_driver','operator_4d','agentic_eng')),
  title                  text not null,
  brief                  text not null,
  skill_forced           text not null,
  rubric                 jsonb not null,
  submission_formats     text[] not null,
  max_file_mb            int not null default 50,
  difficulty             text not null check (difficulty in ('foundation','build','advanced','capstone')),
  is_pro_only            boolean not null default false,
  reference_solution_url text,
  starts_at              timestamptz,
  closes_at              timestamptz,
  status                 text not null default 'scheduled'
    check (status in ('scheduled','active','judging','closed')),
  created_at             timestamptz default now()
);

create index if not exists forge_challenges_status_week_idx
  on public.forge_challenges (status, week_number);

alter table public.forge_challenges enable row level security;

-- Everyone authenticated can read challenge metadata (UI lists all 40).
-- We hide the `reference_solution_url` until they submit, enforced in API.
create policy "challenges readable to authenticated"
  on public.forge_challenges for select
  using (auth.role() = 'authenticated');

-- --------------------------------------------------------------
-- 2. Submissions (one per user per challenge)
-- --------------------------------------------------------------
create table if not exists public.forge_submissions (
  id                  uuid primary key default gen_random_uuid(),
  challenge_id        uuid not null references public.forge_challenges(id) on delete cascade,
  -- FK to profiles (mirrors auth.users id) so PostgREST embedding works.
  user_id             uuid not null references public.profiles(id) on delete cascade,
  artifact_url        text,
  artifact_format     text not null check (artifact_format in ('zip','pdf','md','code','link')),
  artifact_size_bytes bigint,
  external_link       text,
  notes               text,
  judge_status        text not null default 'pending'
    check (judge_status in ('pending','judging','scored','failed')),
  judge_model         text,
  rubric_scores       jsonb,
  overall_score       numeric,
  judge_feedback      text,
  judge_error         text,
  elo_delta           int,
  rank_in_week        int,
  submitted_at        timestamptz default now(),
  judged_at           timestamptz,
  unique (challenge_id, user_id)
);

create index if not exists forge_submissions_challenge_score_idx
  on public.forge_submissions (challenge_id, overall_score desc nulls last);

create index if not exists forge_submissions_user_idx
  on public.forge_submissions (user_id, submitted_at desc);

alter table public.forge_submissions enable row level security;

create policy "users read own submissions"
  on public.forge_submissions for select
  using (auth.uid() = user_id);

create policy "users insert own submissions"
  on public.forge_submissions for insert
  with check (auth.uid() = user_id);

-- Updates handled by service role only (cron + admin rejudge).

-- --------------------------------------------------------------
-- 3. Frozen weekly leaderboard snapshots
-- --------------------------------------------------------------
create table if not exists public.forge_leaderboard_snapshots (
  challenge_id   uuid references public.forge_challenges(id) on delete cascade,
  user_id        uuid references public.profiles(id) on delete cascade,
  rank           int not null,
  overall_score  numeric,
  elo_before     int,
  elo_after      int,
  elo_delta      int,
  snapshot_at    timestamptz default now(),
  primary key (challenge_id, user_id)
);

create index if not exists forge_snapshots_challenge_rank_idx
  on public.forge_leaderboard_snapshots (challenge_id, rank);

alter table public.forge_leaderboard_snapshots enable row level security;

create policy "snapshots readable to authenticated"
  on public.forge_leaderboard_snapshots for select
  using (auth.role() = 'authenticated');

-- --------------------------------------------------------------
-- 4. RPC: apply a weekly Elo delta to user_ratings(track='forge')
--    Creates the row if it doesn't exist. No win/loss semantics.
-- --------------------------------------------------------------
create or replace function public.apply_forge_weekly_delta(
  p_user_id     uuid,
  p_elo_change  integer
)
returns void
language plpgsql
security definer
as $$
declare
  new_elo  integer;
  new_tier tier_enum;
begin
  -- Insert a forge row at base elo 1000 if missing
  insert into public.user_ratings (user_id, track, elo, peak_elo, tier, matches_played, wins, losses, draws, current_streak, best_streak)
  values (p_user_id, 'forge', 1000, 1000, 'unrated', 0, 0, 0, 0, 0, 0)
  on conflict (user_id, track) do nothing;

  update public.user_ratings
  set
    elo            = greatest(600, elo + p_elo_change),
    peak_elo       = greatest(peak_elo, elo + p_elo_change),
    matches_played = matches_played + 1,
    updated_at     = now()
  where user_id = p_user_id and track = 'forge';

  select elo into new_elo
  from public.user_ratings
  where user_id = p_user_id and track = 'forge';

  new_tier := case
    when new_elo >= 1700 then 'diamond'
    when new_elo >= 1500 then 'platinum'
    when new_elo >= 1300 then 'gold'
    when new_elo >= 1100 then 'silver'
    when new_elo >= 900  then 'bronze'
    else 'unrated'
  end::tier_enum;

  update public.user_ratings
  set tier = new_tier
  where user_id = p_user_id and track = 'forge';
end;
$$;

-- Make sure the 'forge' value is accepted by track_enum.
-- (If track_enum doesn't include 'forge' yet, add it.)
do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'forge'
      and enumtypid = (select oid from pg_type where typname = 'track_enum')
  ) then
    alter type track_enum add value 'forge';
  end if;
exception when others then
  -- If track is text instead of enum (older schemas), this is a no-op.
  null;
end$$;

-- --------------------------------------------------------------
-- 5. Storage bucket for submission artifacts
-- --------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('forge-submissions', 'forge-submissions', false)
on conflict (id) do nothing;

-- Each user can upload to their own folder: forge-submissions/<uid>/<...>
create policy "forge upload own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'forge-submissions'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "forge read own folder"
  on storage.objects for select
  using (
    bucket_id = 'forge-submissions'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
