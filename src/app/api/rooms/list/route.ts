import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ROOM_SELECT = `id, code, title, mode, status, visibility, max_players, settings, created_at, host_id,
  host:profiles!rooms_host_id_fkey(display_name, username)`;

// Fetch participant counts for all rooms in ONE query instead of N queries
async function withCounts(supabase: Awaited<ReturnType<typeof createClient>>, rooms: { id: string }[]) {
  if (!rooms.length) return [];
  const roomIds = rooms.map(r => r.id);
  const { data: counts } = await supabase
    .from("room_participants")
    .select("room_id")
    .neq("status", "left")
    .in("room_id", roomIds);

  const countMap = new Map<string, number>();
  for (const c of counts ?? []) {
    countMap.set(c.room_id, (countMap.get(c.room_id) ?? 0) + 1);
  }
  return rooms.map(r => ({ ...r, participant_count: countMap.get(r.id) ?? 0 }));
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