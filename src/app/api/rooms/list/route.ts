import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ROOM_SELECT = `id, code, title, mode, status, visibility, max_players, settings, created_at, host_id,
  host:profiles!rooms_host_id_fkey(display_name, username)`;

async function withCounts(supabase: Awaited<ReturnType<typeof createClient>>, rooms: { id: string }[]) {
  return Promise.all(rooms.map(async (room) => {
    const { count } = await supabase
      .from("room_participants")
      .select("*", { count: "exact", head: true })
      .eq("room_id", room.id)
      .neq("status", "left");
    return { ...room, participant_count: count ?? 0 };
  }));
}

// GET /api/rooms/list?tab=public|mine
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tab = new URL(req.url).searchParams.get("tab") ?? "public";

  if (tab === "mine") {
    const { data: myParticipations } = await supabase
      .from("room_participants")
      .select("room_id")
      .eq("user_id", user.id);

    const myRoomIds = (myParticipations ?? []).map(p => p.room_id);
    if (!myRoomIds.length) return NextResponse.json({ rooms: [] });

    const { data: rooms } = await supabase
      .from("rooms")
      .select(ROOM_SELECT)
      .in("id", myRoomIds)
      .order("created_at", { ascending: false });

    return NextResponse.json({ rooms: await withCounts(supabase, rooms ?? []) });
  }

  // Public lobby rooms
  const { data: rooms } = await supabase
    .from("rooms")
    .select(ROOM_SELECT)
    .eq("visibility", "public")
    .eq("status", "lobby")
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ rooms: await withCounts(supabase, rooms ?? []) });
}