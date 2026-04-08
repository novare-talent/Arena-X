import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get("match_id");
  if (!matchId) return NextResponse.json({ error: "match_id required" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: match } = await supabase
    .from("matches")
    .select("player_one_id, player_two_id, track")
    .eq("id", matchId)
    .single();

  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const opponentId = match.player_one_id === user.id ? match.player_two_id : match.player_one_id;
  const track = match.track ?? "dsa";

  const [
    { data: myProfile },
    { data: oppProfile },
    { data: myRating },
    { data: oppRating },
    { data: myMatches },
    { data: oppMatches },
    { data: myAllCompleted },
  ] = await Promise.all([
    supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).single(),
    supabase.from("profiles").select("username, display_name, avatar_url").eq("id", opponentId).single(),
    supabase.from("user_ratings").select("elo, tier, current_streak").eq("user_id", user.id).eq("track", track).single(),
    supabase.from("user_ratings").select("elo, tier, current_streak").eq("user_id", opponentId).eq("track", track).single(),
    supabase.from("matches").select("id, winner_id, player_one_id, problems(title)").or(`player_one_id.eq.${user.id},player_two_id.eq.${user.id}`).eq("status", "completed").order("ended_at", { ascending: false }).limit(3),
    supabase.from("matches").select("id, winner_id, player_one_id, problems(title)").or(`player_one_id.eq.${opponentId},player_two_id.eq.${opponentId}`).eq("status", "completed").order("ended_at", { ascending: false }).limit(3),
    supabase.from("matches").select("winner_id, player_one_id, player_two_id").or(`player_one_id.eq.${user.id},player_two_id.eq.${user.id}`).eq("status", "completed").limit(200),
  ]);

  // H2H: filter my completed matches that also involve the opponent
  const h2hFull = (myAllCompleted ?? []).filter(
    (m) => m.player_one_id === opponentId || m.player_two_id === opponentId
  );
  const h2hMyWins    = h2hFull.filter((m) => m.winner_id === user.id).length;
  const h2hTheirWins = h2hFull.filter((m) => m.winner_id === opponentId).length;

  const fmt = (matches: typeof myMatches, playerId: string) =>
    (matches ?? []).map((m) => ({
      result: m.winner_id === playerId ? "win" : m.winner_id === null ? "draw" : "loss",
      problemTitle: (m.problems as unknown as { title: string } | null)?.title ?? null,
    }));

  return NextResponse.json({
    me: {
      displayName: myProfile?.display_name ?? "You",
      avatarUrl:   myProfile?.avatar_url ?? null,
      elo:         myRating?.elo ?? 800,
      tier:        myRating?.tier ?? "unrated",
      streak:      myRating?.current_streak ?? 0,
      last3:       fmt(myMatches, user.id),
    },
    opponent: {
      username:    oppProfile?.username ?? "Opponent",
      displayName: oppProfile?.display_name ?? "Opponent",
      avatarUrl:   oppProfile?.avatar_url ?? null,
      elo:         oppRating?.elo ?? 800,
      tier:        oppRating?.tier ?? "unrated",
      streak:      oppRating?.current_streak ?? 0,
      last3:       fmt(oppMatches, opponentId),
    },
    h2h: { myWins: h2hMyWins, theirWins: h2hTheirWins, total: h2hFull.length },
  });
}