import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Throttle queue churn (fail-open).
  if (!(await rateLimit(`mm_join:${user.id}`, 20, 60))) {
    return NextResponse.json({ error: "Too many requests — slow down a moment." }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const track = body.track ?? "dsa";

  // Hard-delete any previous queue row for this user so there's a clean slate.
  // The DB function will re-insert as 'waiting' via ON CONFLICT (user_id) DO UPDATE.
  await supabase
    .from("matchmaking_queue")
    .delete()
    .eq("user_id", user.id);

  // Call atomic matchmaking function
  const { data: matchId, error } = await supabase.rpc("try_match_players", {
    p_user_id: user.id,
    p_track:   track,
  });

  if (error) {
    console.error("Matchmaking error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (matchId) {
    return NextResponse.json({ status: "matched", match_id: matchId });
  }

  return NextResponse.json({ status: "waiting" });
}