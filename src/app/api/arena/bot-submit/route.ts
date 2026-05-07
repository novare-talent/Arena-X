import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

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

  // Finalize: bot wins, no ELO change for either player (hidden match)
  const { error: updateErr } = await service.from("matches").update({
    [botScoreField]:      95,
    status:               "completed",
    ended_at:             new Date().toISOString(),
    winner_id:            botId,
    end_reason:           "ac",
    player_one_elo_after: p1Elo,
    player_two_elo_after: p2Elo,
  }).eq("id", match_id);

  if (updateErr) {
    console.error("[bot-submit] match update error:", updateErr);
    return NextResponse.json({ error: "Failed to finalize match" }, { status: 500 });
  }

  // Record win/loss stats but with 0 ELO change (bot matches don't affect rating)
  try {
    await service.rpc("update_elo_after_match", {
      p_winner_id:  botId,
      p_loser_id:   user.id,
      p_track:      match.track,
      p_elo_change: 0,
    });
  } catch { /* non-critical */ }

  return NextResponse.json({ match_ended: true, winner_id: botId });
}