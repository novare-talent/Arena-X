import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ResultClient from "@/components/arena/ResultClient";
import { PROBLEM_PUBLIC_COLUMNS } from "@/lib/problemColumns";

export default async function ResultPage({ params }: { params: { matchId: string } }) {
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

  const isP1       = match.player_one_id === user.id;
  const opponentId = isP1 ? match.player_two_id : match.player_one_id;

  const { data: opponent } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", opponentId)
    .single();

  const { data: myRating }  = await supabase.from("user_ratings").select("elo, tier").eq("user_id", user.id).eq("track", match.track).single();
  const { data: oppRating } = await supabase.from("user_ratings").select("elo, tier").eq("user_id", opponentId).eq("track", match.track).single();

  const myEloBefore  = isP1 ? match.player_one_elo_before  : match.player_two_elo_before;
  const myEloAfter   = isP1 ? match.player_one_elo_after   : match.player_two_elo_after;
  const myScore      = isP1 ? match.player_one_score       : match.player_two_score;
  const oppScore     = isP1 ? match.player_two_score       : match.player_one_score;
  const mySolveMs    = isP1 ? match.player_one_solve_time_ms : match.player_two_solve_time_ms;
  const oppSolveMs   = isP1 ? match.player_two_solve_time_ms : match.player_one_solve_time_ms;

  const outcome: "win" | "loss" | "draw" =
    match.winner_id === null    ? "draw"
    : match.winner_id === user.id ? "win"
    : "loss";

  // Fetch opponent's last accepted submission for this match (only shown on loss)
  let oppSolution: { code: string; language: string } | null = null;
  if (outcome === "loss" && match.winner_id) {
    const { data: sub } = await supabase
      .from("submissions")
      .select("source_code, language")
      .eq("match_id", params.matchId)
      .eq("user_id", match.winner_id)
      .eq("all_ac", true)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .single();
    if (sub) oppSolution = { code: sub.source_code, language: sub.language };
  }

  return (
    <ResultClient
      matchId={params.matchId}
      outcome={outcome}
      endReason={match.end_reason}
      problem={match.problems}
      myUsername="You"
      myEloBefore={myEloBefore ?? 800}
      myEloAfter={myEloAfter ?? myEloBefore ?? 800}
      myCurrentElo={myRating?.elo ?? 800}
      myCurrentTier={myRating?.tier ?? "unrated"}
      myScore={myScore}
      mySolveMs={mySolveMs}
      opponentUsername={opponent?.display_name ?? "Opponent"}
      opponentProfileUsername={opponent?.username ?? null}
      oppEloBefore={isP1 ? match.player_two_elo_before : match.player_one_elo_before}
      oppEloAfter={isP1 ? match.player_two_elo_after : match.player_one_elo_after}
      oppCurrentElo={oppRating?.elo ?? 800}
      oppCurrentTier={oppRating?.tier ?? "unrated"}
      oppScore={oppScore}
      oppSolveMs={oppSolveMs}
      resigned={match.end_reason === "resign"}
      resignedBy={match.resigned_by}
      userId={user.id}
      oppSolution={oppSolution}
    />
  );
}