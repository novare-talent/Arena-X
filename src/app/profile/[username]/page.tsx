import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import PublicProfileClient from "@/components/profile/PublicProfileClient";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: { username: string } }) {
  return { title: `@${params.username} — Arena X` };
}

export default async function PublicProfilePage({ params }: { params: { username: string } }) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, college, country, avatar_url, created_at")
    .eq("username", params.username.toLowerCase())
    .single();

  if (!profile) notFound();

  const { data: ratings } = await supabase
    .from("user_ratings")
    .select("track, elo, tier, wins, losses, draws, matches_played")
    .eq("user_id", profile.id);

  // Last 10 completed matches involving this user
  const { data: matchRows } = await supabase
    .from("matches")
    .select("id, track, winner_id, end_reason, ended_at, player_one_id, player_two_id, player_one_elo_before, player_one_elo_after, player_two_elo_before, player_two_elo_after, problems(title)")
    .or(`player_one_id.eq.${profile.id},player_two_id.eq.${profile.id}`)
    .eq("status", "completed")
    .order("ended_at", { ascending: false })
    .limit(10);

  // Fetch opponent display names for recent matches
  const opponentIds = (matchRows ?? []).map(m =>
    m.player_one_id === profile.id ? m.player_two_id : m.player_one_id
  ).filter(Boolean) as string[];

  const uniqueOpponentIds = opponentIds.filter((id, i, arr) => arr.indexOf(id) === i);
  const { data: opponentProfiles } = uniqueOpponentIds.length > 0
    ? await supabase.from("profiles").select("id, username, display_name").in("id", uniqueOpponentIds)
    : { data: [] };

  const opponentMap = Object.fromEntries((opponentProfiles ?? []).map(p => [p.id, p]));

  const recentMatches = (matchRows ?? []).map(m => {
    const isP1      = m.player_one_id === profile.id;
    const oppId     = isP1 ? m.player_two_id : m.player_one_id;
    const eloBefore = isP1 ? m.player_one_elo_before : m.player_two_elo_before;
    const eloAfter  = isP1 ? m.player_one_elo_after  : m.player_two_elo_after;
    const result: "win" | "loss" | "draw" =
      m.winner_id === null ? "draw"
      : m.winner_id === profile.id ? "win"
      : "loss";
    return {
      id:             m.id,
      track:          m.track,
      result,
      eloDelta:       eloAfter !== null && eloBefore !== null ? eloAfter - eloBefore : null,
      endReason:      m.end_reason,
      endedAt:        m.ended_at,
      problemTitle:   (m.problems as unknown as { title: string } | null)?.title ?? null,
      opponentName:   opponentMap[oppId ?? ""]?.display_name ?? "Unknown",
      opponentUsername: opponentMap[oppId ?? ""]?.username ?? null,
    };
  });

  return (
    <PublicProfileClient
      profile={profile}
      ratings={ratings ?? []}
      recentMatches={recentMatches}
    />
  );
}