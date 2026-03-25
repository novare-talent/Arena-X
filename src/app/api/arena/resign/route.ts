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

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[resign] SUPABASE_SERVICE_ROLE_KEY is not set");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const service = getServiceClient();

  const { data: match } = await service
    .from("matches")
    .select("*")
    .eq("id", match_id)
    .single();

  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (match.status !== "in_progress") {
    return NextResponse.json({ error: "Match already ended" }, { status: 400 });
  }

  const isP1   = match.player_one_id === user.id;
  const isP2   = match.player_two_id === user.id;
  if (!isP1 && !isP2) {
    return NextResponse.json({ error: "Not a player in this match" }, { status: 403 });
  }

  const winnerId = isP1 ? match.player_two_id : match.player_one_id;
  const p1Elo   = match.player_one_elo_before as number;
  const p2Elo   = match.player_two_elo_before as number;
  // winner is whichever player did NOT resign
  const wElo    = isP1 ? p2Elo : p1Elo;
  const lElo    = isP1 ? p1Elo : p2Elo;
  const { winnerDelta, loserDelta } = calcEloDelta(wElo, lElo, "win");

  // p1 is the resigner when isP1=true, winner when isP1=false
  const p1EloAfter = isP1
    ? Math.max(600, p1Elo + loserDelta)   // p1 resigned → loses ELO
    : p1Elo + winnerDelta;                // p1 won
  const p2EloAfter = isP2
    ? Math.max(600, p2Elo + loserDelta)   // p2 resigned → loses ELO
    : p2Elo + winnerDelta;                // p2 won

  const eloChange = Math.abs(winnerDelta);

  const { error: matchErr } = await service.from("matches").update({
    status:               "completed",
    ended_at:             new Date().toISOString(),
    winner_id:            winnerId,
    resigned_by:          user.id,
    end_reason:           "resign",
    player_one_elo_after: p1EloAfter,
    player_two_elo_after: p2EloAfter,
  }).eq("id", match_id);
  if (matchErr) console.error("[resign] match update error:", matchErr);

  const { error: rpcErr } = await service.rpc("update_elo_after_match", {
    p_winner_id:  winnerId,
    p_loser_id:   user.id,
    p_track:      match.track,
    p_elo_change: eloChange,
  });
  if (rpcErr) console.error("[resign] update_elo_after_match error:", rpcErr);

  return NextResponse.json({ winner_id: winnerId });
}