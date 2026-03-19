import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LeaderboardClient from "@/components/leaderboard/LeaderboardClient";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch top 100 by ELO — include all players (no match minimum so early users appear)
  const { data: rows } = await supabase
    .from("user_ratings")
    .select("elo, tier, peak_elo, matches_played, wins, losses, current_streak, best_streak, profiles(id, username, display_name, college, country)")
    .eq("track", "dsa")
    .order("elo", { ascending: false })
    .limit(100);

  // Shape into flat leaderboard entries with rank
  const entries = (rows ?? []).map((r, i) => {
    const profile = r.profiles as unknown as {
      id: string; username: string; display_name: string; college: string | null; country: string | null;
    } | null;
    const winRate = r.matches_played > 0 ? Math.round((r.wins / r.matches_played) * 100) : 0;
    return {
      rank:           i + 1,
      id:             profile?.id ?? "",
      username:       profile?.username ?? "—",
      display_name:   profile?.display_name ?? "—",
      college:        profile?.college ?? null,
      country:        profile?.country ?? null,
      elo:            r.elo,
      tier:           r.tier,
      peak_elo:       r.peak_elo,
      matches_played: r.matches_played,
      wins:           r.wins,
      losses:         r.losses,
      win_rate:       winRate,
      best_streak:    r.best_streak,
    };
  });

  // Find current user's position (may be outside top 100)
  const { data: myRating } = await supabase
    .from("user_ratings")
    .select("elo, tier, matches_played, wins, losses")
    .eq("user_id", user.id)
    .eq("track", "dsa")
    .single();

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .single();

  // Count how many players have higher ELO to get actual rank
  const { count: aboveCount } = await supabase
    .from("user_ratings")
    .select("*", { count: "exact", head: true })
    .eq("track", "dsa")
    .gt("elo", myRating?.elo ?? 0);

  const myEntry = myRating ? {
    rank:         (aboveCount ?? 0) + 1,
    username:     myProfile?.username ?? "You",
    display_name: myProfile?.display_name ?? "You",
    elo:          myRating.elo,
    tier:         myRating.tier,
    matches_played: myRating.matches_played,
    wins:         myRating.wins,
    losses:       myRating.losses,
    win_rate:     myRating.matches_played > 0 ? Math.round((myRating.wins / myRating.matches_played) * 100) : 0,
  } : null;

  return <LeaderboardClient entries={entries} currentUserId={user.id} myEntry={myEntry} />;
}