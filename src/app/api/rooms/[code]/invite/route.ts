import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/rooms/[code]/invite  { friend_id }
export async function POST(req: Request, { params }: { params: { code: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const code = params.code.toUpperCase();
  const { friend_id } = await req.json();
  if (!friend_id) return NextResponse.json({ error: "friend_id required" }, { status: 400 });

  const { data: room } = await supabase
    .from("rooms")
    .select("id, status, title, code")
    .eq("code", code)
    .maybeSingle();

  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (room.status !== "lobby") return NextResponse.json({ error: "Room already started" }, { status: 409 });

  // Verify they are friends
  const { data: friendship } = await supabase
    .from("friendships")
    .select("id")
    .eq("status", "accepted")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${friend_id}),and(requester_id.eq.${friend_id},addressee_id.eq.${user.id})`
    )
    .maybeSingle();

  if (!friendship) return NextResponse.json({ error: "Not friends with this user" }, { status: 403 });

  // Create a notification via the challenges/notifications table — reuse notifications
  // Insert a row into a generic notifications table, or just use a room_invites approach.
  // We'll insert a challenge-style notification with type "room_invite"
  const { error } = await supabase
    .from("notifications")
    .insert({
      user_id: friend_id,
      type: "room_invite",
      from_user_id: user.id,
      payload: { room_id: room.id, room_code: room.code, room_title: room.title },
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ sent: true });
}