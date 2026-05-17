-- ════════════════════════════════════════════════════════════════════
-- One-time backfill: recompute every user's tier from their ELO.
--
-- Tiers were going stale because update_elo_after_match() only rewrites
-- the tier of the two players in a finished match — rows seeded or
-- mutated outside that path kept whatever tier they had (e.g. ELO 816
-- still showing 'platinum'/Shōgun, ELO 1200 still showing 'unrated').
--
-- This applies the SAME thresholds as update_elo_after_match() to ALL
-- user_ratings rows, across every track. Safe to re-run (idempotent).
--
-- Display mapping (TIER_LABELS / dbTierToKabuto):
--   unrated  → Rōnin   (< 900)
--   bronze   → Ashigaru (900–1099)
--   silver   → Samurai  (1100–1299)
--   gold     → Daimyō   (1300–1499)
--   platinum → Shōgun   (1500–1699)
--   diamond  → Shōgun   (1700+)
-- ════════════════════════════════════════════════════════════════════

update public.user_ratings
set tier = (
  case
    when elo >= 1700 then 'diamond'
    when elo >= 1500 then 'platinum'
    when elo >= 1300 then 'gold'
    when elo >= 1100 then 'silver'
    when elo >= 900  then 'bronze'
    else 'unrated'
  end
)::tier_enum
where tier is distinct from (
  case
    when elo >= 1700 then 'diamond'
    when elo >= 1500 then 'platinum'
    when elo >= 1300 then 'gold'
    when elo >= 1100 then 'silver'
    when elo >= 900  then 'bronze'
    else 'unrated'
  end
)::tier_enum;

-- Verify (optional): rows where tier no longer matches elo — expect 0.
-- select user_id, track, elo, tier from public.user_ratings
-- where tier is distinct from (case
--   when elo >= 1700 then 'diamond' when elo >= 1500 then 'platinum'
--   when elo >= 1300 then 'gold'    when elo >= 1100 then 'silver'
--   when elo >= 900  then 'bronze'  else 'unrated' end)::tier_enum;