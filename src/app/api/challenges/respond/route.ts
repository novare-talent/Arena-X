import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/challenges/respond  { challenge_id, action: "accept" | "decline" }
// Uses SECURITY DEFINER RPC for match creation — no service role key needed.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { challenge_id, action } = await req.json();
  if (!challenge_id || !["accept", "decline"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (action === "decline") {
    // Verify ownership then decline
    const { data: challenge } = await supabase
      .from("challenges")
      .select("challenged_id, status")
      .eq("id", challenge_id)
      .maybeSingle();

    if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (challenge.challenged_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (challenge.status !== "pending") return NextResponse.json({ error: "Already resolved" }, { status: 409 });

    await supabase
      .from("challenges")
      .update({ status: "declined" })
      .eq("id", challenge_id);

    return NextResponse.json({ status: "declined" });
  }

  // Accept — delegate all match creation logic to SECURITY DEFINER RPC
  const { data: result, error: rpcError } = await supabase.rpc("accept_challenge", {
    p_challenge_id: challenge_id,
  });

  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  const res = result as { error?: string; match_id?: string };

  if (res.error) {
    const statusMap: Record<string, number> = {
      "Forbidden": 403,
      "Challenge not found": 404,
      "Challenge already resolved": 409,
      "Challenge expired": 410,
    };
    return NextResponse.json({ error: res.error }, { status: statusMap[res.error] ?? 400 });
  }

  return NextResponse.json({ status: "accepted", match_id: res.match_id });
}