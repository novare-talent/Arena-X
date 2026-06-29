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

  const body = await request.json().catch(() => ({}));
  const track = body.track ?? "dsa";

  const service = getServiceClient();

  // ── Reads first (no mutation) — pick a bot, problem, and ELOs ──────
  const { data: bots } = await service
    .from("profiles")
    .select("id")
    .eq("is_bot", true)
    .limit(20);

  if (!bots || bots.length === 0) {
    return NextResponse.json({ error: "No bots available" }, { status: 503 });
  }

  const bot = bots[Math.floor(Math.random() * bots.length)];

  // Pick a random problem for the track
  const { data: problems } = await service
    .from("problems")
    .select("id")
    .eq("track", track)
    .eq("is_active", true)
    .limit(50);

  if (!problems || problems.length === 0) {
    return NextResponse.json({ error: "No problems available" }, { status: 503 });
  }

  const problem = problems[Math.floor(Math.random() * problems.length)];

  // Get ELOs for both players
  const [{ data: userRating }, { data: botRating }] = await Promise.all([
    service.from("user_ratings").select("elo").eq("user_id", user.id).eq("track", track).single(),
    service.from("user_ratings").select("elo").eq("user_id", bot.id).eq("track", track).single(),
  ]);

  const userElo = userRating?.elo ?? 1000;
  const botElo  = botRating?.elo  ?? 1000;

  // ── Atomically CLAIM the user's waiting queue row (review #22) ─────
  // Server matchmaking (try_match_players) and this bot fallback both flip
  // the SAME row from 'waiting' → 'matched'. By making the claim a conditional
  // update, exactly one of them can win — so the client's 7s timer can no
  // longer race the server into two simultaneous matches.
  const { data: claimed } = await service
    .from("matchmaking_queue")
    .update({ status: "matched" })
    .eq("user_id", user.id)
    .eq("status", "waiting")
    .select("id")
    .maybeSingle();

  if (!claimed) {
    // The server already paired this user (or they left the queue).
    return NextResponse.json({ error: "Already matched" }, { status: 409 });
  }

  // Create the bot match
  const { data: match, error: matchErr } = await service
    .from("matches")
    .insert({
      player_one_id:         user.id,
      player_two_id:         bot.id,
      problem_id:            problem.id,
      track,
      status:                "in_progress",
      started_at:            new Date().toISOString(),
      player_one_elo_before: userElo,
      player_two_elo_before: botElo,
    })
    .select("id")
    .single();

  if (matchErr || !match) {
    console.error("[bot-match] create match error:", matchErr);
    // Release the claim so the user can keep searching.
    await service
      .from("matchmaking_queue")
      .update({ status: "waiting", match_id: null })
      .eq("id", claimed.id);
    return NextResponse.json({ error: "Failed to create match" }, { status: 500 });
  }

  // Attach the match id to the claimed row (the client waits for match_id).
  await service
    .from("matchmaking_queue")
    .update({ match_id: match.id })
    .eq("id", claimed.id);

  return NextResponse.json({ status: "matched", match_id: match.id });
}