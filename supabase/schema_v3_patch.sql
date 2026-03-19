-- ─────────────────────────────────────────────────────────────────────────────
-- Schema v3 patch — accept_challenge RPC
-- Run this in Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.accept_challenge(p_challenge_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_challenge    record;
  v_problem_id   uuid;
  v_match_id     uuid;
  v_p1_elo       integer;
  v_p2_elo       integer;
begin
  -- Fetch and lock the challenge row
  select * into v_challenge
  from public.challenges
  where id = p_challenge_id
  for update;

  if not found then
    return json_build_object('error', 'Challenge not found');
  end if;

  -- Caller must be the challenged user
  if v_challenge.challenged_id <> auth.uid() then
    return json_build_object('error', 'Forbidden');
  end if;

  if v_challenge.status <> 'pending' then
    return json_build_object('error', 'Challenge already resolved');
  end if;

  if v_challenge.expires_at < now() then
    update public.challenges set status = 'expired' where id = p_challenge_id;
    return json_build_object('error', 'Challenge expired');
  end if;

  -- Pick a random problem for the track
  select id into v_problem_id
  from public.problems
  where track = v_challenge.track::track_enum
  order by random()
  limit 1;

  if v_problem_id is null then
    return json_build_object('error', 'No problems available for this track');
  end if;

  -- Fetch current ELO for both players (default 800 if no rating row yet)
  select coalesce(elo, 800) into v_p1_elo
  from public.user_ratings
  where user_id = v_challenge.challenger_id
    and track = v_challenge.track::track_enum
  limit 1;

  select coalesce(elo, 800) into v_p2_elo
  from public.user_ratings
  where user_id = v_challenge.challenged_id
    and track = v_challenge.track::track_enum
  limit 1;

  -- Coalesce in case no rating row exists yet
  v_p1_elo := coalesce(v_p1_elo, 800);
  v_p2_elo := coalesce(v_p2_elo, 800);

  -- Create the match
  insert into public.matches (
    player_one_id,
    player_two_id,
    problem_id,
    track,
    mode,
    status,
    started_at,
    player_one_elo_before,
    player_two_elo_before
  ) values (
    v_challenge.challenger_id,
    v_challenge.challenged_id,
    v_problem_id,
    v_challenge.track::track_enum,
    v_challenge.mode,
    'in_progress',
    now(),
    v_p1_elo,
    v_p2_elo
  )
  returning id into v_match_id;

  -- Mark challenge accepted
  update public.challenges
  set status = 'accepted', match_id = v_match_id
  where id = p_challenge_id;

  return json_build_object('match_id', v_match_id);
end;
$$;

-- Allow authenticated users to call this function
grant execute on function public.accept_challenge(uuid) to authenticated;