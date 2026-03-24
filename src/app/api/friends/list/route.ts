import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/friends/list
// Returns: { friends, incoming, outgoing }
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uid = user.id;

  // Single query — fetch all friendship rows with both profiles joined
  const { data: rows } = await supabase
    .from("friendships")
    .select(`
      id, status, requester_id, addressee_id, created_at,
      requester:profiles!friendships_requester_id_fkey(id, username, display_name, college),
      addressee:profiles!friendships_addressee_id_fkey(id, username, display_name, college)
    `)
    .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`)
    .neq("status", "declined");

  type ProfileRow = { id: string; username: string; display_name: string; college: string | null };

  // Collect all other-user IDs in one pass, then fetch all their ELOs in ONE query
  const otherUsers: ProfileRow[] = [];
  for (const row of rows ?? []) {
    const iAmRequester = row.requester_id === uid;
    const other = (iAmRequester ? row.addressee : row.requester) as unknown as ProfileRow;
    if (other?.id) otherUsers.push(other);
  }

  // Single batch ELO query instead of N sequential queries
  const otherIds = Array.from(new Set(otherUsers.map(u => u.id)));
  const { data: ratings } = otherIds.length
    ? await supabase
        .from("user_ratings")
        .select("user_id, elo, tier")
        .in("user_id", otherIds)
        .eq("track", "dsa")
    : { data: [] };

  const ratingMap = new Map((ratings ?? []).map(r => [r.user_id, r]));

  const friends: object[]  = [];
  const incoming: object[] = [];
  const outgoing: object[] = [];

  for (const row of rows ?? []) {
    const iAmRequester = row.requester_id === uid;
    const other = (iAmRequester ? row.addressee : row.requester) as unknown as ProfileRow;
    if (!other?.id) continue;

    const rating = ratingMap.get(other.id);
    const entry = { friendship_id: row.id, ...other, elo: rating?.elo ?? 800, tier: rating?.tier ?? "unrated" };

    if (row.status === "accepted") friends.push(entry);
    else if (row.status === "pending") {
      if (iAmRequester) outgoing.push(entry);
      else incoming.push(entry);
    }
  }

  return NextResponse.json({ friends, incoming, outgoing });
}