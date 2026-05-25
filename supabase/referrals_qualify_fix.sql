-- ════════════════════════════════════════════════════════════════════
-- Referral qualification — bug fix + backfill
--
-- Bug: handle_email_confirmed() only stamped verified_at and did NOT
-- re-run check_referral_qualification(). So if a referred user played
-- their match BEFORE clicking the email-confirm link, the verification
-- arrived too late — there was no future event to qualify them.
--
-- This file:
--   (1) Patches handle_email_confirmed() to also call qualification.
--   (2) Backfills any referrals whose referred user is now verified
--       AND has a completed match — qualifies them retroactively and
--       creates any pending referral_grants tiers that just got crossed.
--   (3) Bottom: optional diagnostic SELECT — uncomment to inspect.
--
-- Safe to re-run.
-- ════════════════════════════════════════════════════════════════════

-- (1) Patched trigger: stamp verified_at AND re-check qualification
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

    -- If they already played a ranked match before verifying, qualify now.
    perform public.check_referral_qualification(new.id);
  end if;
  return new;
end;
$$;

-- (2) One-shot backfill for any referrals stuck in (verified, played, but not qualified)
do $$
declare
  rec record;
begin
  -- First sweep: any auth.users with email_confirmed_at but referrals.verified_at NULL
  update public.referrals r
    set verified_at = u.email_confirmed_at
    from auth.users u
    where r.referred_id = u.id
      and r.verified_at is null
      and u.email_confirmed_at is not null;

  -- Now run qualification for every referred user who is verified + has played
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

-- ════════════════════════════════════════════════════════════════════
-- (3) Diagnostic — run this manually in the Supabase SQL editor to see
--     why a particular referrer's count is still off. Replace the
--     username 'sanatisback' with the one you want to inspect.
-- ════════════════════════════════════════════════════════════════════
-- select
--   p_red.username     as referred,
--   r.created_at       as joined,
--   r.verified_at,
--   r.qualified_at,
--   u.email_confirmed_at,
--   (select count(*) from public.matches m
--      where m.status = 'completed'
--        and (m.player_one_id = r.referred_id or m.player_two_id = r.referred_id)
--   ) as completed_matches
-- from public.referrals r
-- join public.profiles p_ref on p_ref.id = r.referrer_id
-- join public.profiles p_red on p_red.id = r.referred_id
-- join auth.users      u     on u.id     = r.referred_id
-- where p_ref.username = 'sanatisback'
-- order by r.created_at desc;