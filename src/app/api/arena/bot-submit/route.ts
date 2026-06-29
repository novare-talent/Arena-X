import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { calcEloDelta } from "@/lib/judge0";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { match_id } = await request.json();
  if (!match_id) return NextResponse.json({ error: "Missing match_id" }, { status: 400 });

  const service = getServiceClient();

  const { data: match } = await service
    .from("matches")
    .select("*")
    .eq("id", match_id)
    .single();

  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (match.status !== "in_progress") return NextResponse.json({ error: "Match already ended" }, { status: 400 });

  // Determine which player is the bot
  const isP1Real = match.player_one_id === user.id;
  const botId    = isP1Real ? match.player_two_id : match.player_one_id;

  // Verify the opponent is actually a bot
  const { data: botProfile } = await service
    .from("profiles")
    .select("is_bot")
    .eq("id", botId)
    .single();

  if (!botProfile?.is_bot) {
    return NextResponse.json({ error: "Opponent is not a bot" }, { status: 403 });
  }

  // Set bot's score high (simulates a near-perfect AC submission)
  const botScoreField = isP1Real ? "player_two_score" : "player_one_score";
  const p1Elo = match.player_one_elo_before as number;
  const p2Elo = match.player_two_elo_before as number;

  // Bot matches are RATED and now SYMMETRIC (review #10): beating a bot already
  // applied real ELO via /arena/submit, so a bot *win* must apply a real loss —
  // otherwise players farm rating by gaining on wins and never losing.
  const userElo = isP1Real ? p1Elo : p2Elo;
  const botElo  = isP1Real ? p2Elo : p1Elo;
  const { winnerDelta, loserDelta } = calcEloDelta(botElo, userElo, "win");
  const eloChange  = Math.abs(winnerDelta);
  const userEloAfter = Math.max(600, userElo + loserDelta);
  const botEloAfter  = botElo + winnerDelta;
  const p1EloAfter = isP1Real ? userEloAfter : botEloAfter;
  const p2EloAfter = isP1Real ? botEloAfter  : userEloAfter;

  // Atomically finalize, guarded on status (review #13) so a bot-finalize racing
  // a real user submission can't double-apply ELO.
  const { data: flipped, error: updateErr } = await service.from("matches").update({
    [botScoreField]:      95,
    status:               "completed",
    ended_at:             new Date().toISOString(),
    winner_id:            botId,
    end_reason:           "ac",
    player_one_elo_after: p1EloAfter,
    player_two_elo_after: p2EloAfter,
  }).eq("id", match_id).eq("status", "in_progress").select("id");

  if (updateErr) {
    console.error("[bot-submit] match update error:", updateErr);
    return NextResponse.json({ error: "Failed to finalize match" }, { status: 500 });
  }
  if (!flipped || flipped.length === 0) {
    // The user's own submission already finalized this match — nothing to do.
    return NextResponse.json({ match_ended: true, already_finalized: true });
  }

  // Apply the real ELO change (bot wins, user loses).
  try {
    await service.rpc("update_elo_after_match", {
      p_winner_id:  botId,
      p_loser_id:   user.id,
      p_track:      match.track,
      p_elo_change: eloChange,
    });
  } catch { /* non-critical */ }

  return NextResponse.json({ match_ended: true, winner_id: botId });
}