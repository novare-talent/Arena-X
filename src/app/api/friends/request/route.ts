import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/friends/request  { username }
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { username } = await req.json();
  if (!username) return NextResponse.json({ error: "Username required" }, { status: 400 });

  // Resolve username → id
  const { data: target } = await supabase
    .from("profiles")
    .select("id, display_name, username")
    .eq("username", username.toLowerCase())
    .maybeSingle();

  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.id === user.id) return NextResponse.json({ error: "You can't add yourself" }, { status: 400 });

  // Check if a relationship already exists in either direction
  const { data: existing } = await supabase
    .from("friendships")
    .select("id, status, requester_id")
    .or(`and(requester_id.eq.${user.id},addressee_id.eq.${target.id}),and(requester_id.eq.${target.id},addressee_id.eq.${user.id})`)
    .maybeSingle();

  if (existing) {
    if (existing.status === "accepted") return NextResponse.json({ error: "Already friends" }, { status: 409 });
    if (existing.status === "pending") {
      // They sent us a request — auto-accept
      if (existing.requester_id === target.id) {
        await supabase.from("friendships").update({ status: "accepted" }).eq("id", existing.id);
        return NextResponse.json({ status: "accepted" });
      }
      return NextResponse.json({ error: "Request already sent" }, { status: 409 });
    }
    // Declined — allow re-request by updating the row
    await supabase.from("friendships").update({ status: "pending" }).eq("id", existing.id);
    return NextResponse.json({ status: "pending" });
  }

  const { error } = await supabase.from("friendships").insert({
    requester_id: user.id,
    addressee_id: target.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ status: "pending" });
}