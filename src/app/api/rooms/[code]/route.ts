import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/rooms/[code]
export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const code = params.code.toUpperCase();

  const { data: room } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  // Fetch participants and problems in parallel
  const [{ data: participants }, { data: problems }] = await Promise.all([
    supabase
      .from("room_participants")
      .select(`user_id, status, score, rank, joined_at,
        profile:profiles!room_participants_user_id_fkey(display_name, username)`)
      .eq("room_id", room.id)
      .neq("status", "left"),
    supabase
      .from("room_problems")
      .select(`order_index, problem:problems(id, title, difficulty, topics, match_duration_minutes)`)
      .eq("room_id", room.id)
      .order("order_index"),
  ]);

  return NextResponse.json({ room, participants: participants ?? [], problems: problems ?? [] });
}