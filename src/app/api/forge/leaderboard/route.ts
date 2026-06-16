import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: top }, { data: me }] = await Promise.all([
    supabase
      .from("user_ratings")
      .select("user_id, elo, tier, peak_elo, matches_played, profiles(username, display_name, college, country)")
      .eq("track", "forge")
      .order("elo", { ascending: false })
      .limit(100),
    supabase
      .from("user_ratings")
      .select("user_id, elo, tier, peak_elo, matches_played")
      .eq("user_id", user.id)
      .eq("track", "forge")
      .maybeSingle(),
  ]);

  // Active week + current-week leader for the "this week" strip
  const { data: activeChallenge } = await supabase
    .from("forge_challenges")
    .select("id, week_number, title")
    .eq("status", "active")
    .maybeSingle();

  let thisWeek: { week_number: number; title: string; leaders: unknown[] } | null = null;
  if (activeChallenge) {
    const { data: leaders } = await supabase
      .from("forge_submissions")
      .select("user_id, overall_score, rank_in_week, judge_status, profiles(username, display_name)")
      .eq("challenge_id", activeChallenge.id)
      .eq("judge_status", "scored")
      .order("overall_score", { ascending: false })
      .limit(10);
    thisWeek = { week_number: activeChallenge.week_number, title: activeChallenge.title, leaders: leaders ?? [] };
  }

  let myRank: number | null = null;
  if (me) {
    const { count } = await supabase
      .from("user_ratings")
      .select("user_id", { count: "exact", head: true })
      .eq("track", "forge")
      .gt("elo", me.elo);
    myRank = (count ?? 0) + 1;
  }

  const entries = (top ?? []).map((r, i) => {
    const p = r.profiles as unknown as { username: string; display_name: string; college: string | null; country: string | null } | null;
    return {
      rank: i + 1,
      user_id: r.user_id,
      username: p?.username ?? "—",
      display_name: p?.display_name ?? "—",
      college: p?.college ?? null,
      country: p?.country ?? null,
      elo: r.elo,
      tier: r.tier,
      peak_elo: r.peak_elo,
      weeks_played: r.matches_played,
    };
  });

  return NextResponse.json({
    entries,
    myEntry: me ? { ...me, rank: myRank } : null,
    thisWeek,
  });
}
