-- ════════════════════════════════════════════════════════════════════
-- Referral Program v2 — Phase 1 foundation
--
-- Adds:
--   • referrals.verified_at + qualified_at + review_required
--   • referral_grants (audit + key storage, admin-fulfilled)
--   • signup_throttle (per-IP/day, for anti-abuse later)
--   • referral_clicks (funnel)
--   • handle_new_user() — extended to read raw_user_meta_data.referral_code
--     and write referred_by + referrals row atomically (kills the 1.5s race)
--   • handle_email_confirmed() trigger → sets referrals.verified_at
--   • check_referral_qualification() — called on first completed match for the
--     referred user (sets qualified_at), then runs check_tier_crossing() to
--     create pending referral_grants rows when the referrer crosses a tier.
--
-- Tiers (cumulative, delta granted on tier-up; lifetime cap $200):
--   20 → $10, 75 → $25, 100 → $50, 300 → $100, 500 → $200
--
-- Safe to re-run.
-- ════════════════════════════════════════════════════════════════════

-- ── Columns on existing referrals table ────────────────────────────
alter table public.referrals
  add column if not exists verified_at     timestamptz,
  add column if not exists qualified_at    timestamptz,
  add column if not exists review_required boolean not null default false;

create index if not exists idx_referrals_referrer_qualified
  on public.referrals (referrer_id) where qualified_at is not null;

-- ── referral_grants (audit + key storage, admin-fulfilled) ─────────
create table if not exists public.referral_grants (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  tier_threshold  int  not null,                 -- 20 / 75 / 100 / 300 / 500
  amount_usd      int  not null,                 -- delta: 10 / 15 / 25 / 50 / 100
  status          text not null default 'pending'
                  check (status in ('pending','delivered','revoked')),
  openai_api_key  text,                          -- pasted by admin when fulfilling
  key_label       text,
  granted_at      timestamptz default now(),
  fulfilled_at    timestamptz,
  fulfilled_by    uuid references public.profiles(id),
  revoked_at      timestamptz,
  revoke_reason   text,
  unique (user_id, tier_threshold)               -- idempotent: no double-grant per tier
);

create index if not exists idx_grants_status on public.referral_grants(status);

alter table public.referral_grants enable row level security;

-- Referrer can read only their own delivered grants (so they see their keys)
drop policy if exists "Referrer can view delivered grants" on public.referral_grants;
create policy "Referrer can view delivered grants"
  on public.referral_grants for select
  using (auth.uid() = user_id and status = 'delivered');

-- ── signup_throttle (anti-abuse — server-side writes only) ─────────
create table if not exists public.signup_throttle (
  ip_hash text not null,
  day     date not null default current_date,
  count   int  not null default 0,
  primary key (ip_hash, day)
);

alter table public.signup_throttle enable row level security;
-- no policies → only service role can touch it

-- ── referral_clicks (funnel — server-side writes only) ─────────────
create table if not exists public.referral_clicks (
  code  text not null,
  day   date not null default current_date,
  count int  not null default 0,
  primary key (code, day)
);

alter table public.referral_clicks enable row level security;
-- no policies → only service role can read/write it

-- ════════════════════════════════════════════════════════════════════
-- TRIGGER: extend handle_new_user to capture referral atomically
-- (replaces the 1.5s setTimeout race in signUp server action)
-- ════════════════════════════════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_username  text;
  final_username text;
  suffix         int := 0;
  ref_code       text;
  ref_id         uuid;
begin
  -- ── Derive a unique username (unchanged) ──
  base_username := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );
  base_username := lower(regexp_replace(base_username, '[^a-zA-Z0-9_]', '', 'g'));
  base_username := substring(base_username, 1, 20);
  if length(base_username) < 3 then base_username := 'user'; end if;

  final_username := base_username;
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

  -- Seed DSA rating
  insert into public.user_ratings (user_id, track, elo, tier)
  values (new.id, 'dsa', 800, 'unrated');

  -- ── Referral linkage (email signup path; OAuth handled in /auth/callback) ──
  ref_code := upper(coalesce(new.raw_user_meta_data->>'referral_code', ''));
  if length(ref_code) > 0 then
    select id into ref_id from public.profiles where referral_code = ref_code;
    if ref_id is not null and ref_id <> new.id then
      update public.profiles set referred_by = ref_id where id = new.id;
      insert into public.referrals (referrer_id, referred_id)
        values (ref_id, new.id)
        on conflict (referred_id) do nothing;
    end if;
  end if;

  return new;
end;
$$;

-- ════════════════════════════════════════════════════════════════════
-- TRIGGER: stamp referrals.verified_at when email is confirmed
-- ════════════════════════════════════════════════════════════════════
create or replace function public.handle_email_confirmed()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (old.email_confirmed_at is null) and (new.email_confirmed_at is not null) then
    update public.referrals
      set verified_at = now()
      where referred_id = new.id and verified_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_confirmed on auth.users;
create trigger on_auth_user_email_confirmed
  after update on auth.users
  for each row
  when (old.email_confirmed_at is distinct from new.email_confirmed_at)
  execute function public.handle_email_confirmed();

-- ════════════════════════════════════════════════════════════════════
-- FUNCTION: tier-cross check — creates pending referral_grants rows
-- (idempotent via unique(user_id, tier_threshold))
-- ════════════════════════════════════════════════════════════════════
create or replace function public.check_tier_crossing(p_referrer uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  qualified_count int;
  i int;
  tiers       int[] := array[ 20,  75, 100, 300, 500];
  deltas_usd  int[] := array[ 10,  15,  25,  50, 100];
begin
  select count(*) into qualified_count
  from public.referrals
  where referrer_id = p_referrer and qualified_at is not null;

  for i in 1..array_length(tiers, 1) loop
    if qualified_count >= tiers[i] then
      insert into public.referral_grants (user_id, tier_threshold, amount_usd)
        values (p_referrer, tiers[i], deltas_usd[i])
        on conflict (user_id, tier_threshold) do nothing;
    end if;
  end loop;
end;
$$;

-- ════════════════════════════════════════════════════════════════════
-- FUNCTION: qualify a referral when a referred user finishes a match
-- (requires verified email + at least one completed match)
-- ════════════════════════════════════════════════════════════════════
create or replace function public.check_referral_qualification(p_user uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  ref_referrer uuid;
begin
  -- Pull referrer if any, and qualify only if verified + not yet qualified
  update public.referrals
    set qualified_at = now()
    where referred_id = p_user
      and qualified_at is null
      and verified_at is not null
    returning referrer_id into ref_referrer;

  if ref_referrer is not null then
    perform public.check_tier_crossing(ref_referrer);
  end if;
end;
$$;

-- ════════════════════════════════════════════════════════════════════
-- TRIGGER: when a match completes, qualify both players' referrals
-- (the function short-circuits when a player has no referrer)
-- ════════════════════════════════════════════════════════════════════
create or replace function public.on_match_completed()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'completed' and (old.status is distinct from 'completed'::match_status_enum) then
    perform public.check_referral_qualification(new.player_one_id);
    perform public.check_referral_qualification(new.player_two_id);
  end if;
  return new;
end;
$$;

drop trigger if exists on_matches_status_completed on public.matches;
create trigger on_matches_status_completed
  after update of status on public.matches
  for each row
  execute function public.on_match_completed();

-- ════════════════════════════════════════════════════════════════════
-- BACKFILL (one-time): mark verified_at for already-confirmed users
-- and qualify referrals whose referred user already played a match.
-- Tier-cross check fires for each affected referrer.
-- ════════════════════════════════════════════════════════════════════
update public.referrals r
  set verified_at = u.email_confirmed_at
  from auth.users u
  where r.referred_id = u.id
    and r.verified_at is null
    and u.email_confirmed_at is not null;

do $$
declare
  rec record;
begin
  for rec in
    select distinct r.referred_id
    from public.referrals r
    where r.qualified_at is null
      and r.verified_at is not null
      and exists (
        select 1 from public.matches m
        where m.status = 'completed'
          and (m.player_one_id = r.referred_id or m.player_two_id = r.referred_id)
      )
  loop
    perform public.check_referral_qualification(rec.referred_id);
  end loop;
end $$;