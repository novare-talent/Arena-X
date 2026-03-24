import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/rooms/[code]/start  (host only)
export async function POST(_req: Request, { params }: { params: { code: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const code = params.code.toUpperCase();

  const { data: room } = await supabase
    .from("rooms")
    .select("id, host_id, status, settings")
    .eq("code", code)
    .maybeSingle();

  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (room.host_id !== user.id) return NextResponse.json({ error: "Only the host can start" }, { status: 403 });
  if (room.status !== "lobby") return NextResponse.json({ error: "Room already started" }, { status: 409 });

  const timeLimitMs = (room.settings?.time_limit_minutes ?? 30) * 60 * 1000;
  const startedAt = new Date();
  const endsAt = new Date(startedAt.getTime() + timeLimitMs);

  const { error } = await supabase
    .from("rooms")
    .update({ status: "active", started_at: startedAt.toISOString(), ends_at: endsAt.toISOString() })
    .eq("id", room.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ started: true, ends_at: endsAt.toISOString() });
}