import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import RoomResultsClient from "@/components/rooms/RoomResultsClient";

export default async function RoomResultsPage({ params }: { params: { code: string } }) {
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

  const { data: participants } = await supabase
    .from("room_participants")
    .select(`user_id, score, rank, status, finished_at,
      profile:profiles!room_participants_user_id_fkey(display_name, username)`)
    .eq("room_id", room.id)
    .neq("status", "left")
    .order("score", { ascending: false });

  const { data: problems } = await supabase
    .from("room_problems")
    .select(`order_index, problem:problems(id, title, difficulty)`)
    .eq("room_id", room.id)
    .order("order_index");

  const { data: submissions } = await supabase
    .from("room_submissions")
    .select("user_id, problem_id, verdict, score, solve_time_ms, submitted_at")
    .eq("room_id", room.id)
    .eq("verdict", "accepted");

  type RawParticipant = { user_id: string; score: number; rank: number | null; status: string; finished_at: string | null; profile: { display_name: string; username: string } | { display_name: string; username: string }[] };
  const normalizedParticipants = ((participants ?? []) as unknown as RawParticipant[]).map(p => ({
    ...p,
    profile: Array.isArray(p.profile) ? p.profile[0] : p.profile,
  }));

  return (
    <RoomResultsClient
      room={room}
      userId={user.id}
      participants={normalizedParticipants as Parameters<typeof RoomResultsClient>[0]["participants"]}
      problems={(problems ?? []).map(p => ({ ...p.problem as object, order_index: p.order_index })) as Parameters<typeof RoomResultsClient>[0]["problems"]}
      submissions={submissions ?? []}
    />
  );
}