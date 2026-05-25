-- ════════════════════════════════════════════════════════════════════
-- Referral Program v2 — Phase 6 (anti-abuse helpers)
--
-- Adds:
--   • normalize_email(text)            — strip "+tag" and lowercase
--   • bump_referral_click(code)        — fire-and-forget click counter
--   • bump_signup_throttle(ip,limit)   — atomic per-IP-per-day cap (5/day)
--   • flag_suspicious_referrers()      — sets referrals.review_required on
--                                        spike (>50 qualified/24h) or
--                                        velocity (≥20 qualified in <7 days)
--
-- Safe to re-run. Schedule flag_suspicious_referrers() via pg_cron if
-- available on your plan; otherwise call manually or hit it from a
-- nightly cron job. See bottom for the cron snippet.
-- ════════════════════════════════════════════════════════════════════

-- ── normalize_email ────────────────────────────────────────────────
-- Lowercases and strips `+anything` before the @ (Gmail-style aliases).
create or replace function public.normalize_email(p_email text)
returns text
language sql immutable as $$
  select lower(regexp_replace(coalesce(p_email, ''), '\+[^@]*@', '@'));
$$;

-- ── bump_referral_click ────────────────────────────────────────────
create or replace function public.bump_referral_click(p_code text)
returns void
language sql security definer set search_path = public as $$
  insert into public.referral_clicks (code, day, count)
    values (upper(p_code), current_date, 1)
    on conflict (code, day)
    do update set count = referral_clicks.count + 1;
$$;

-- ── bump_signup_throttle ───────────────────────────────────────────
-- Atomic insert-or-increment per (ip_hash, today). Returns true if the
-- caller is STILL within the limit (i.e. the signup may proceed); false
-- if the count just exceeded the cap.
create or replace function public.bump_signup_throttle(p_ip_hash text, p_limit int default 5)
returns boolean
language plpgsql security definer set search_path = public as $$
declare new_count int;
begin
  if p_ip_hash is null or length(p_ip_hash) = 0 then
    return true; -- no IP info → fail-open
  end if;
  insert into public.signup_throttle (ip_hash, day, count)
    values (p_ip_hash, current_date, 1)
    on conflict (ip_hash, day)
    do update set count = signup_throttle.count + 1
    returning count into new_count;
  return new_count <= p_limit;
end;
$$;

-- ── flag_suspicious_referrers ──────────────────────────────────────
-- Two heuristics:
--   (a) Spike: >50 qualified referrals in the last 24h.
--   (b) Velocity: a referrer has ≥20 qualified referrals all within 7 days.
-- Both flag *all* of that referrer's referrals so admin can review the
-- cluster and revoke individual grants. Idempotent.
create or replace function public.flag_suspicious_referrers()
returns int
language plpgsql security definer set search_path = public as $$
declare
  flagged_count int := 0;
begin
  with spike_referrers as (
    select referrer_id
    from public.referrals
    where qualified_at > now() - interval '24 hours'
    group by referrer_id
    having count(*) > 50
  ),
  velocity_referrers as (
    select referrer_id
    from public.referrals
    where qualified_at is not null
    group by referrer_id
    having count(*) >= 20
       and (max(qualified_at) - min(qualified_at)) < interval '7 days'
  )
  update public.referrals
    set review_required = true
    where referrer_id in (table spike_referrers union all table velocity_referrers)
      and review_required = false;

  get diagnostics flagged_count = row_count;
  return flagged_count;
end;
$$;

-- ════════════════════════════════════════════════════════════════════
-- Optional cron (pg_cron must be enabled). Skipped silently if not.
-- ════════════════════════════════════════════════════════════════════
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- run daily at 02:00 UTC
    perform cron.schedule(
      'referral-flag-suspicious',
      '0 2 * * *',
      $cron$ select public.flag_suspicious_referrers(); $cron$
    );
  end if;
exception when others then null;  -- safe to skip if cron not present
end $$;