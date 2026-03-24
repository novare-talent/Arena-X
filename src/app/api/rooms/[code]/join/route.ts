import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/rooms/[code]/join
export async function POST(_req: Request, { params }: { params: { code: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const code = params.code.toUpperCase();

  const { data: room } = await supabase
    .from("rooms")
    .select("id, code, status, max_players")
    .eq("code", code)
    .maybeSingle();

  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (room.status !== "lobby") return NextResponse.json({ error: "Room already started or completed" }, { status: 409 });

  // Check capacity
  const { count } = await supabase
    .from("room_participants")
    .select("*", { count: "exact", head: true })
    .eq("room_id", room.id)
    .neq("status", "left");

  if ((count ?? 0) >= room.max_players) {
    return NextResponse.json({ error: "Room is full" }, { status: 409 });
  }

  // Upsert (re-join if they left before)
  const { error } = await supabase
    .from("room_participants")
    .upsert({ room_id: room.id, user_id: user.id, status: "active" }, { onConflict: "room_id,user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ room_id: room.id, code: room.code });
}