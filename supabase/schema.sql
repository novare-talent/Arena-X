-- ================================================================
-- ArenaX Complete Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ================================================================

-- ── Extensions ──────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ── Custom Types ─────────────────────────────────────────────────
create type track_enum as enum ('dsa', 'backend', 'ml', 'frontend', 'ai_llm', 'security');
create type tier_enum  as enum ('unrated', 'bronze', 'silver', 'gold', 'platinum', 'diamond');
create type match_status_enum   as enum ('waiting', 'in_progress', 'completed', 'abandoned');
create type verdict_enum        as enum ('AC', 'WA', 'TLE', 'MLE', 'RE', 'CE', 'PENDING');
create type contest_status_enum as enum ('upcoming', 'active', 'finished');

-- ================================================================
-- TABLE: profiles
-- Extends auth.users. Created automatically via trigger on signup.
-- ================================================================
create table public.profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  username             text unique not null,
  display_name         text not null,
  avatar_url           text,
  bio                  text,
  college              text,
  country              text default 'India',
  github_username      text,
  experience_level     text check (experience_level in ('student', '0-1yr', '1-3yr', '3+yr')),
  is_pro               boolean default false,
  pro_expires_at       timestamptz,
  referral_code        text unique default upper(substring(gen_random_uuid()::text, 1, 8)),
  referred_by          uuid references public.profiles(id),
  onboarding_completed boolean default false,
  intake_completed     boolean default false,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- ================================================================
-- TRIGGER: auto-create profile on user signup
-- ================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_username text;
  final_username text;
  suffix int := 0;
begin
  -- Derive username from metadata or email
  base_username := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );
  -- Sanitize: keep only alphanumeric + underscore, max 20 chars
  base_username := lower(regexp_replace(base_username, '[^a-zA-Z0-9_]', '', 'g'));
  base_username := substring(base_username, 1, 20);
  if length(base_username) < 3 then base_username := 'user'; end if;

  final_username := base_username;

  -- Ensure uniqueness
  while exists (select 1 from public.profiles where username = final_username) loop
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  end loop;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    final_username,
    coalesce(new.raw_user_meta_data->>'display_name', final_username),
    new.raw_user_meta_data->>'avatar_url'
  );

  -- Seed DSA rating for every new user
  insert into public.user_ratings (user_id, track, elo, tier)
  values (new.id, 'dsa', 800, 'unrated');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ================================================================
-- TABLE: user_ratings
-- One row per (user, track) pair.
-- ================================================================
create table public.user_ratings (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  track           track_enum not null default 'dsa',
  elo             integer not null default 800,
  tier            tier_enum not null default 'unrated',
  peak_elo        integer not null default 800,
  matches_played  integer not null default 0,
  wins            integer not null default 0,
  losses          integer not null default 0,
  draws           integer not null default 0,
  current_streak  integer not null default 0,
  best_streak     integer not null default 0,
  updated_at      timestamptz default now(),
  unique (user_id, track)
);

create index idx_user_ratings_elo    on public.user_ratings(elo desc);
create index idx_user_ratings_user   on public.user_ratings(user_id);
create index idx_user_ratings_track  on public.user_ratings(track);

alter table public.user_ratings enable row level security;

create policy "Ratings are public" on public.user_ratings for select using (true);
create policy "Service role can update ratings" on public.user_ratings
  for all using (auth.role() = 'service_role');

-- ================================================================
-- TABLE: problems
-- ================================================================
create table public.problems (
  id               uuid primary key default uuid_generate_v4(),
  slug             text unique not null,
  title            text not null,
  description      text not null,
  difficulty       integer not null check (difficulty between 1 and 5),
  topics           text[] not null default '{}',
  time_limit_ms    integer not null default 2000,
  memory_limit_kb  integer not null default 262144, -- 256 MB
  elo_floor        integer not null default 600,
  elo_ceiling      integer not null default 2400,
  track            track_enum not null default 'dsa',
  is_active        boolean not null default true,
  is_ai_generated  boolean not null default false,
  created_by       uuid references public.profiles(id),
  editorial        text,
  accepted_count   integer not null default 0,
  submission_count integer not null default 0,
  created_at       timestamptz default now()
);

create index idx_problems_track      on public.problems(track);
create index idx_problems_difficulty on public.problems(difficulty);
create index idx_problems_active     on public.problems(is_active);
create index idx_problems_elo        on public.problems(elo_floor, elo_ceiling);

alter table public.problems enable row level security;
create policy "Active problems are public" on public.problems
  for select using (is_active = true);

-- ================================================================
-- TABLE: matches
-- ================================================================
create table public.matches (
  id                        uuid primary key default uuid_generate_v4(),
  player_one_id             uuid not null references public.profiles(id),
  player_two_id             uuid not null references public.profiles(id),
  problem_id                uuid not null references public.problems(id),
  track                     track_enum not null default 'dsa',
  started_at                timestamptz not null default now(),
  ended_at                  timestamptz,
  winner_id                 uuid references public.profiles(id),
  player_one_elo_before     integer not null,
  player_two_elo_before     integer not null,
  player_one_elo_after      integer,
  player_two_elo_after      integer,
  player_one_solve_time_ms  bigint,
  player_two_solve_time_ms  bigint,
  status                    match_status_enum not null default 'waiting',
  check (player_one_id != player_two_id)
);

create index idx_matches_player_one on public.matches(player_one_id, started_at desc);
create index idx_matches_player_two on public.matches(player_two_id, started_at desc);
create index idx_matches_status     on public.matches(status);
create index idx_matches_started_at on public.matches(started_at desc);

alter table public.matches enable row level security;

create policy "Players can view own matches"
  on public.matches for select
  using (auth.uid() = player_one_id or auth.uid() = player_two_id);

-- ================================================================
-- TABLE: submissions
-- ================================================================
create table public.submissions (
  id                 uuid primary key default uuid_generate_v4(),
  match_id           uuid references public.matches(id) on delete set null,
  user_id            uuid not null references public.profiles(id) on delete cascade,
  problem_id         uuid not null references public.problems(id),
  language           text not null,
  source_code        text not null,
  verdict            verdict_enum not null default 'PENDING',
  runtime_ms         integer,
  memory_kb          integer,
  test_cases_passed  integer not null default 0,
  total_test_cases   integer not null default 0,
  created_at         timestamptz default now()
);

create index idx_submissions_user    on public.submissions(user_id, created_at desc);
create index idx_submissions_match   on public.submissions(match_id);
create index idx_submissions_problem on public.submissions(problem_id);

alter table public.submissions enable row level security;

create policy "Users can view own submissions"
  on public.submissions for select
  using (auth.uid() = user_id);

create policy "Users can insert own submissions"
  on public.submissions for insert
  with check (auth.uid() = user_id);

-- ================================================================
-- TABLE: contests
-- ================================================================
create table public.contests (
  id                uuid primary key default uuid_generate_v4(),
  title             text not null,
  starts_at         timestamptz not null,
  ends_at           timestamptz not null,
  duration_minutes  integer not null default 90,
  problem_ids       uuid[] not null default '{}',
  status            contest_status_enum not null default 'upcoming',
  elo_rated         boolean not null default true,
  season_id         uuid,
  created_at        timestamptz default now(),
  check (ends_at > starts_at)
);

create index idx_contests_status    on public.contests(status);
create index idx_contests_starts_at on public.contests(starts_at);

alter table public.contests enable row level security;
create policy "Contests are public" on public.contests for select using (true);

-- ================================================================
-- TABLE: contest_registrations
-- ================================================================
create table public.contest_registrations (
  id            uuid primary key default uuid_generate_v4(),
  contest_id    uuid not null references public.contests(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  registered_at timestamptz default now(),
  final_score   integer,
  final_rank    integer,
  elo_change    integer,
  unique (contest_id, user_id)
);

create index idx_contest_reg_contest on public.contest_registrations(contest_id);
create index idx_contest_reg_user    on public.contest_registrations(user_id);

alter table public.contest_registrations enable row level security;

create policy "Users can view contest registrations"
  on public.contest_registrations for select using (true);

create policy "Users can register themselves"
  on public.contest_registrations for insert
  with check (auth.uid() = user_id);

-- ================================================================
-- TABLE: roadmap_progress
-- ================================================================
create table public.roadmap_progress (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  topic             text not null,
  track             track_enum not null default 'dsa',
  problems_solved   integer not null default 0,
  problems_required integer not null default 7,
  unlocked_at       timestamptz default now(),
  completed_at      timestamptz,
  unique (user_id, topic, track)
);

create index idx_roadmap_user on public.roadmap_progress(user_id);

alter table public.roadmap_progress enable row level security;

create policy "Users can view own roadmap"
  on public.roadmap_progress for select using (auth.uid() = user_id);

create policy "Users can update own roadmap"
  on public.roadmap_progress for all using (auth.uid() = user_id);

-- ================================================================
-- TABLE: daily_challenges
-- ================================================================
create table public.daily_challenges (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  problem_id    uuid not null references public.problems(id),
  date          date not null,
  solved        boolean not null default false,
  solved_at     timestamptz,
  streak_count  integer not null default 0,
  unique (user_id, date)
);

create index idx_daily_user on public.daily_challenges(user_id, date desc);

alter table public.daily_challenges enable row level security;

create policy "Users can view own daily challenges"
  on public.daily_challenges for select using (auth.uid() = user_id);

create policy "Users can update own daily challenges"
  on public.daily_challenges for all using (auth.uid() = user_id);

-- ================================================================
-- TABLE: referrals
-- ================================================================
create table public.referrals (
  id             uuid primary key default uuid_generate_v4(),
  referrer_id    uuid not null references public.profiles(id) on delete cascade,
  referred_id    uuid not null references public.profiles(id) on delete cascade,
  created_at     timestamptz default now(),
  reward_granted boolean not null default false,
  unique (referred_id) -- one person can only be referred once
);

alter table public.referrals enable row level security;

create policy "Users can view own referrals"
  on public.referrals for select using (auth.uid() = referrer_id);

-- ================================================================
-- FUNCTION: update ELO and tier after match
-- Call this from server-side after match completion.
-- ================================================================
create or replace function public.update_elo_after_match(
  p_winner_id   uuid,
  p_loser_id    uuid,
  p_track       track_enum,
  p_elo_change  integer
)
returns void
language plpgsql
security definer
as $$
declare
  new_tier tier_enum;
  new_elo  integer;
begin
  -- Update winner
  update public.user_ratings
  set
    elo            = greatest(600, elo + p_elo_change),
    peak_elo       = greatest(peak_elo, elo + p_elo_change),
    wins           = wins + 1,
    matches_played = matches_played + 1,
    current_streak = current_streak + 1,
    best_streak    = greatest(best_streak, current_streak + 1),
    updated_at     = now()
  where user_id = p_winner_id and track = p_track;

  -- Calculate new tier for winner
  select elo into new_elo from public.user_ratings where user_id = p_winner_id and track = p_track;
  new_tier := case
    when new_elo >= 1700 then 'diamond'
    when new_elo >= 1500 then 'platinum'
    when new_elo >= 1300 then 'gold'
    when new_elo >= 1100 then 'silver'
    when new_elo >= 900  then 'bronze'
    else 'unrated'
  end::tier_enum;
  update public.user_ratings set tier = new_tier where user_id = p_winner_id and track = p_track;

  -- Update loser
  update public.user_ratings
  set
    elo            = greatest(600, elo - p_elo_change),
    losses         = losses + 1,
    matches_played = matches_played + 1,
    current_streak = 0,
    updated_at     = now()
  where user_id = p_loser_id and track = p_track;

  select elo into new_elo from public.user_ratings where user_id = p_loser_id and track = p_track;
  new_tier := case
    when new_elo >= 1700 then 'diamond'
    when new_elo >= 1500 then 'platinum'
    when new_elo >= 1300 then 'gold'
    when new_elo >= 1100 then 'silver'
    when new_elo >= 900  then 'bronze'
    else 'unrated'
  end::tier_enum;
  update public.user_ratings set tier = new_tier where user_id = p_loser_id and track = p_track;
end;
$$;

-- ================================================================
-- FUNCTION: leaderboard view (top 100 DSA by ELO)
-- ================================================================
create or replace view public.leaderboard_dsa as
select
  p.id,
  p.username,
  p.display_name,
  p.avatar_url,
  p.college,
  p.country,
  r.elo,
  r.tier,
  r.peak_elo,
  r.matches_played,
  r.wins,
  r.losses,
  round((r.wins::numeric / nullif(r.matches_played, 0)) * 100, 1) as win_rate,
  rank() over (order by r.elo desc) as rank
from public.profiles p
join public.user_ratings r on r.user_id = p.id and r.track = 'dsa'
where r.matches_played >= 5
order by r.elo desc;

-- ================================================================
-- Seed: daily challenge problem (a fixed problem goes out each day)
-- This is managed by a cron job in production.
-- ================================================================

-- Done! Schema is complete.
-- Next steps:
-- 1. Configure Supabase Auth → Custom SMTP (Hostinger details)
-- 2. Set Site URL and Redirect URLs in Auth → URL Configuration
-- 3. Run this file in SQL Editor