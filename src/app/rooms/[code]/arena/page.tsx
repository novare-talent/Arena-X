import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import RoomArenaClient from "@/components/rooms/RoomArenaClient";

export default async function RoomArenaPage({ params }: { params: { code: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const code = params.code.toUpperCase();

  const { data: room } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (!room) redirect("/rooms");
  if (room.status === "lobby") redirect(`/rooms/${code}`);
  if (room.status === "completed") redirect(`/rooms/${code}/results`);

  const { data: problems } = await supabase
    .from("room_problems")
    .select(`order_index, problem:problems(id, title, description, difficulty, topics, test_cases, match_duration_minutes)`)
    .eq("room_id", room.id)
    .order("order_index");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", user.id)
    .single();

  return (
    <RoomArenaClient
      room={room}
      userId={user.id}
      displayName={profile?.display_name ?? profile?.username ?? "Challenger"}
      problems={(problems ?? []).map(p => ({ ...p.problem as object, order_index: p.order_index })) as Parameters<typeof RoomArenaClient>[0]["problems"]}
    />
  );
}