import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST /api/challenges/respond  { challenge_id, action: "accept" | "decline" }
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { challenge_id, action } = await req.json();
  if (!challenge_id || !["accept", "decline"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { data: challenge } = await supabase
    .from("challenges")
    .select("*")
    .eq("id", challenge_id)
    .maybeSingle();

  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (challenge.challenged_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (challenge.status !== "pending") return NextResponse.json({ error: "Challenge already resolved" }, { status: 409 });

  // Check expiry
  if (new Date(challenge.expires_at) < new Date()) {
    await supabase.from("challenges").update({ status: "expired" }).eq("id", challenge_id);
    return NextResponse.json({ error: "Challenge expired" }, { status: 410 });
  }

  if (action === "decline") {
    await supabase.from("challenges").update({ status: "declined" }).eq("id", challenge_id);
    return NextResponse.json({ status: "declined" });
  }

  // Accept — pick a random problem for the track, create a match
  const service = getServiceClient();

  const { data: problems } = await service
    .from("problems")
    .select("id")
    .eq("track", challenge.track)
    .order("difficulty")
    .limit(20);

  if (!problems?.length) return NextResponse.json({ error: "No problems available" }, { status: 500 });

  const problem = problems[Math.floor(Math.random() * problems.length)];

  const { data: match, error: matchError } = await service
    .from("matches")
    .insert({
      player_one_id: challenge.challenger_id,
      player_two_id: challenge.challenged_id,
      problem_id: problem.id,
      track: challenge.track,
      status: "active",
      mode: challenge.mode,            // 'ranked' or 'casual'
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (matchError) return NextResponse.json({ error: matchError.message }, { status: 500 });

  // Update challenge with match_id and accepted status
  await service
    .from("challenges")
    .update({ status: "accepted", match_id: match.id })
    .eq("id", challenge_id);

  return NextResponse.json({ status: "accepted", match_id: match.id });
}