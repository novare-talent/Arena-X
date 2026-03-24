import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import RoomLobbyClient from "@/components/rooms/RoomLobbyClient";

export default async function RoomLobbyPage({ params }: { params: { code: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const code = params.code.toUpperCase();

  // Fetch room info
  const { data: room } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (!room) redirect("/rooms");

  // If room is active/completed, redirect to arena/results
  if (room.status === "active") redirect(`/rooms/${code}/arena`);
  if (room.status === "completed") redirect(`/rooms/${code}/results`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", user.id)
    .single();

  // Fetch friends for invite
  const { data: friendships } = await supabase
    .from("friendships")
    .select(`
      requester_id, addressee_id,
      requester:profiles!friendships_requester_id_fkey(id, display_name, username),
      addressee:profiles!friendships_addressee_id_fkey(id, display_name, username)
    `)
    .eq("status", "accepted")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  type ProfileRow = { id: string; display_name: string; username: string };
  const friends = (friendships ?? []).map(f => {
    return (f.requester_id === user.id ? f.addressee : f.requester) as unknown as ProfileRow;
  });

  return (
    <RoomLobbyClient
      room={room}
      userId={user.id}
      displayName={profile?.display_name ?? profile?.username ?? "Challenger"}
      friends={friends}
    />
  );
}