import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/challenges/send  { challenged_id, track, mode }
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { challenged_id, track = "dsa", mode = "casual" } = await req.json();
  if (!challenged_id) return NextResponse.json({ error: "challenged_id required" }, { status: 400 });
  if (!["ranked", "casual"].includes(mode)) return NextResponse.json({ error: "Invalid mode" }, { status: 400 });

  // Must be friends
  const { data: friendship } = await supabase
    .from("friendships")
    .select("id")
    .eq("status", "accepted")
    .or(`and(requester_id.eq.${user.id},addressee_id.eq.${challenged_id}),and(requester_id.eq.${challenged_id},addressee_id.eq.${user.id})`)
    .maybeSingle();

  if (!friendship) return NextResponse.json({ error: "You can only challenge friends" }, { status: 403 });

  // Cancel any existing pending challenge between these two
  await supabase
    .from("challenges")
    .update({ status: "expired" })
    .eq("challenger_id", user.id)
    .eq("challenged_id", challenged_id)
    .eq("status", "pending");

  const { data: challenge, error } = await supabase
    .from("challenges")
    .insert({
      challenger_id: user.id,
      challenged_id,
      track,
      mode,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ challenge_id: challenge.id });
}