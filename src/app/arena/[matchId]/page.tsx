import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MatchArena from "@/components/arena/MatchArena";

export default async function MatchPage({ params }: { params: { matchId: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: match } = await supabase
    .from("matches")
    .select("*, problems(*)")
    .eq("id", params.matchId)
    .single();

  if (!match || (match.player_one_id !== user.id && match.player_two_id !== user.id)) {
    redirect("/arena");
  }

  // If match already completed, go to result
  if (match.status === "completed") {
    redirect(`/arena/${params.matchId}/result`);
  }

  // Fetch opponent profile
  const opponentId = match.player_one_id === user.id ? match.player_two_id : match.player_one_id;
  const { data: opponent } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", opponentId)
    .single();

  const { data: myRating }  = await supabase.from("user_ratings").select("elo, tier").eq("user_id", user.id).eq("track", match.track).single();
  const { data: oppRating } = await supabase.from("user_ratings").select("elo, tier").eq("user_id", opponentId).eq("track", match.track).single();

  return (
    <MatchArena
      matchId={params.matchId}

      problem={match.problems}
      startedAt={match.started_at}
      myElo={myRating?.elo ?? 800}
      myTier={myRating?.tier ?? "unrated"}
      opponentUsername={opponent?.username ?? "Opponent"}
      opponentElo={oppRating?.elo ?? 800}
      opponentTier={oppRating?.tier ?? "unrated"}
      isPlayerOne={match.player_one_id === user.id}
    />
  );
}