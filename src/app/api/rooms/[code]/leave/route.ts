import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/rooms/[code]/leave
export async function POST(_req: Request, { params }: { params: { code: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const code = params.code.toUpperCase();

  const { data: room } = await supabase
    .from("rooms")
    .select("id")
    .eq("code", code)
    .maybeSingle();

  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  await supabase
    .from("room_participants")
    .update({ status: "left" })
    .eq("room_id", room.id)
    .eq("user_id", user.id);

  return NextResponse.json({ left: true });
}