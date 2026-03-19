import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/friends/respond  { friendship_id, action: "accept" | "decline" }
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { friendship_id, action } = await req.json();
  if (!friendship_id || !["accept", "decline"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Verify the current user is the addressee
  const { data: row } = await supabase
    .from("friendships")
    .select("id, status, addressee_id")
    .eq("id", friendship_id)
    .maybeSingle();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (row.addressee_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (row.status !== "pending") return NextResponse.json({ error: "Request already resolved" }, { status: 409 });

  const newStatus = action === "accept" ? "accepted" : "declined";
  const { error } = await supabase
    .from("friendships")
    .update({ status: newStatus })
    .eq("id", friendship_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ status: newStatus });
}