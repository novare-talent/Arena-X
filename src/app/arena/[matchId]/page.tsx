import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MatchArena from "@/components/arena/MatchArena";
import { PROBLEM_PUBLIC_COLUMNS } from "@/lib/problemColumns";

export default async function MatchPage({ params }: { params: { matchId: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: match } = await supabase
    .from("matches")
    .select(`*, problems(${PROBLEM_PUBLIC_COLUMNS})`)
    .eq("id", params.matchId)
    .single();

  if (!match || (match.player_one_id !== user.id && match.player_two_id !== user.id)) {
    redirect("/arena");
  }

  if (match.status === "completed") {
    redirect(`/arena/${params.matchId}/result`);
  }

  const opponentId = match.player_one_id === user.id ? match.player_two_id : match.player_one_id;

  const [
    { data: myProfile },
    { data: oppProfile },
    { data: myRating },
    { data: oppRating },
  ] = await Promise.all([
    supabase.from("profiles").select("avatar_url").eq("id", user.id).single(),
    supabase.from("profiles").select("username, display_name, avatar_url, is_bot").eq("id", opponentId).single(),
    supabase.from("user_ratings").select("elo, tier, current_streak").eq("user_id", user.id).eq("track", match.track).single(),
    supabase.from("user_ratings").select("elo, tier, current_streak").eq("user_id", opponentId).eq("track", match.track).single(),
  ]);

  return (
    <MatchArena
      matchId={params.matchId}
      problem={match.problems}
      startedAt={match.started_at}
      myElo={myRating?.elo ?? 800}
      myTier={myRating?.tier ?? "unrated"}
      myStreak={myRating?.current_streak ?? 0}
      myAvatarId={myProfile?.avatar_url ?? null}
      opponentUsername={oppProfile?.username ?? "Opponent"}
      opponentElo={oppRating?.elo ?? 800}
      opponentTier={oppRating?.tier ?? "unrated"}
      opponentStreak={oppRating?.current_streak ?? 0}
      opponentAvatarId={oppProfile?.avatar_url ?? null}
      opponentIsBot={oppProfile?.is_bot ?? false}
      isPlayerOne={match.player_one_id === user.id}
    />
  );
}