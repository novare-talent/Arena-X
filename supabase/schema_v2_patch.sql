-- ================================================================
-- Matchmaking queue fix — run this in Supabase SQL Editor
-- Root cause: unique(user_id, status) caused constraint violations
-- when a user plays a second match (old 'matched' row + new 'matched' row)
-- Fix: one row per user at all times — unique(user_id)
-- ================================================================

-- 1. Drop the old constraint
ALTER TABLE public.matchmaking_queue
  DROP CONSTRAINT IF EXISTS matchmaking_queue_user_id_status_key;

-- 2. Clear old stale rows so the new constraint can be applied cleanly
DELETE FROM public.matchmaking_queue
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM public.matchmaking_queue
  ORDER BY user_id, joined_at DESC
);

-- 3. Add new constraint: one row per user
ALTER TABLE public.matchmaking_queue
  ADD CONSTRAINT matchmaking_queue_user_id_key UNIQUE (user_id);

-- 4. Replace try_match_players with fixed version
CREATE OR REPLACE FUNCTION public.try_match_players(
  p_user_id  uuid,
  p_track    track_enum DEFAULT 'dsa'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  opponent_id   uuid;
  opponent_qid  uuid;
  new_match_id  uuid;
  problem_row   record;
  p1_elo        integer;
  p2_elo        integer;
BEGIN
  -- Cancel stale waiting entries older than 10 min (not the caller)
  UPDATE public.matchmaking_queue
    SET status = 'cancelled'
    WHERE status = 'waiting'
      AND user_id != p_user_id
      AND joined_at < now() - interval '10 minutes';

  -- Find a waiting opponent (FIFO, skip locked to avoid race conditions)
  SELECT id, user_id INTO opponent_qid, opponent_id
  FROM public.matchmaking_queue
  WHERE status  = 'waiting'
    AND track   = p_track
    AND user_id != p_user_id
  ORDER BY joined_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- No opponent yet — upsert caller's entry as 'waiting'
  IF opponent_id IS NULL THEN
    INSERT INTO public.matchmaking_queue (user_id, track, status, joined_at, match_id)
    VALUES (p_user_id, p_track, 'waiting', now(), null)
    ON CONFLICT (user_id) DO UPDATE
      SET status    = 'waiting',
          track     = EXCLUDED.track,
          joined_at = now(),
          match_id  = null;
    RETURN null;
  END IF;

  -- Pick a random active problem for the track
  SELECT * INTO problem_row
  FROM public.problems
  WHERE track = p_track AND is_active = true
  ORDER BY random()
  LIMIT 1;

  IF problem_row.id IS NULL THEN
    RAISE EXCEPTION 'No active problems available for track %', p_track;
  END IF;

  -- Get ELO for both players
  SELECT elo INTO p1_elo FROM public.user_ratings
    WHERE user_id = p_user_id  AND track = p_track;
  SELECT elo INTO p2_elo FROM public.user_ratings
    WHERE user_id = opponent_id AND track = p_track;

  -- Create the match
  INSERT INTO public.matches (
    player_one_id, player_two_id, problem_id, track,
    player_one_elo_before, player_two_elo_before, status
  ) VALUES (
    p_user_id, opponent_id, problem_row.id, p_track,
    COALESCE(p1_elo, 800), COALESCE(p2_elo, 800), 'in_progress'
  ) RETURNING id INTO new_match_id;

  -- Mark opponent's row as matched (UPDATE in place — same row, unique by user_id)
  UPDATE public.matchmaking_queue
    SET status   = 'matched',
        match_id = new_match_id
    WHERE id = opponent_qid;

  -- Upsert caller's row as matched
  INSERT INTO public.matchmaking_queue (user_id, track, status, joined_at, match_id)
  VALUES (p_user_id, p_track, 'matched', now(), new_match_id)
  ON CONFLICT (user_id) DO UPDATE
    SET status   = 'matched',
        match_id = new_match_id;

  RETURN new_match_id;
END;
$$;