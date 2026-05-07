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

  // Verify user is still in queue and waiting (not already matched)
  const { data: queueEntry } = await service
    .from("matchmaking_queue")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("status", "waiting")
    .maybeSingle();

  if (!queueEntry) {
    return NextResponse.json({ error: "Not in queue" }, { status: 409 });
  }

  // Pick a random bot profile
  const { data: bots } = await service
    .from("profiles")
    .select("id")
    .eq("is_bot", true);

  if (!bots || bots.length === 0) {
    return NextResponse.json({ error: "No bots available" }, { status: 503 });
  }

  const bot = bots[Math.floor(Math.random() * bots.length)];

  // Pick a random problem for the track
  const { data: problems } = await service
    .from("problems")
    .select("id")
    .eq("track", track);

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

  // Create the match
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
    return NextResponse.json({ error: "Failed to create match" }, { status: 500 });
  }

  // Update user's queue entry to matched
  await service
    .from("matchmaking_queue")
    .update({ status: "matched", match_id: match.id })
    .eq("id", queueEntry.id);

  return NextResponse.json({ status: "matched", match_id: match.id });
}