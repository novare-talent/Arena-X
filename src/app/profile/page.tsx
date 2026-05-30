import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfileClient from "@/components/profile/ProfileClient";
import { isScoutRank } from "@/lib/scout";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // All independent queries run in parallel
  const [
    { data: profile },
    { data: ratings },
    { data: matchRows },
    { data: refRows },
    { data: grantRows },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("user_ratings").select("*").eq("user_id", user.id),
    supabase
      .from("matches")
      .select("id, track, winner_id, end_reason, ended_at, player_one_id, player_two_id, player_one_elo_before, player_one_elo_after, player_two_elo_before, player_two_elo_after, problems(title)")
      .or(`player_one_id.eq.${user.id},player_two_id.eq.${user.id}`)
      .eq("status", "completed")
      .order("ended_at", { ascending: false })
      .limit(10),
    supabase
      .from("referrals")
      .select("referred_id, created_at, verified_at, qualified_at, reward_granted")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("referral_grants")
      .select("tier_threshold, amount_usd, openai_api_key, key_label, fulfilled_at")
      .eq("status", "delivered")
      .order("fulfilled_at", { ascending: false }),
  ]);

  if (!profile) redirect("/login");

  const uniqueOpponentIds = Array.from(new Set(
    (matchRows ?? [])
      .map(m => m.player_one_id === user.id ? m.player_two_id : m.player_one_id)
      .filter(Boolean) as string[]
  ));
  const referredIds = (refRows ?? []).map(r => r.referred_id);
  const dsaRating   = (ratings ?? []).find(r => r.track === "dsa");

  // Second wave — all dependent queries run in parallel
  const [{ data: opponentProfiles }, { data: refProfiles }, scoutCounts] = await Promise.all([
    uniqueOpponentIds.length > 0
      ? supabase.from("profiles").select("id, username, display_name").in("id", uniqueOpponentIds)
      : Promise.resolve({ data: [] as { id: string; username: string; display_name: string }[] }),
    referredIds.length > 0
      ? supabase.from("profiles").select("id, username, display_name").in("id", referredIds)
      : Promise.resolve({ data: [] as { id: string; username: string; display_name: string }[] }),
    dsaRating
      ? Promise.all([
          supabase.from("user_ratings").select("*", { count: "exact", head: true }).eq("track", "dsa"),
          supabase.from("user_ratings").select("*", { count: "exact", head: true }).eq("track", "dsa").gt("elo", dsaRating.elo),
        ])
      : Promise.resolve(null),
  ]);

  const opponentMap = Object.fromEntries((opponentProfiles ?? []).map(p => [p.id, p]));

  const recentMatches = (matchRows ?? []).map(m => {
    const isP1      = m.player_one_id === user.id;
    const oppId     = isP1 ? m.player_two_id : m.player_one_id;
    const eloBefore = isP1 ? m.player_one_elo_before : m.player_two_elo_before;
    const eloAfter  = isP1 ? m.player_one_elo_after  : m.player_two_elo_after;
    const result: "win" | "loss" | "draw" =
      m.winner_id === null ? "draw"
      : m.winner_id === user.id ? "win"
      : "loss";
    return {
      id:                m.id,
      track:             m.track,
      result,
      eloDelta:          eloAfter !== null && eloBefore !== null ? eloAfter - eloBefore : null,
      endReason:         m.end_reason,
      endedAt:           m.ended_at,
      problemTitle:      (m.problems as unknown as { title: string } | null)?.title ?? null,
      opponentName:      opponentMap[oppId ?? ""]?.display_name ?? "Unknown",
      opponentUsername:  opponentMap[oppId ?? ""]?.username ?? null,
    };
  });

  // ── Scout Badge ──
  let isScout = false;
  if (dsaRating && scoutCounts) {
    const [{ count: totalRanked }, { count: aboveCount }] = scoutCounts;
    isScout = isScoutRank((aboveCount ?? 0) + 1, totalRanked ?? 0);
  }

  // ── Referrals ──
  const refProfMap = Object.fromEntries((refProfiles ?? []).map(p => [p.id, p]));
  const referrals = (refRows ?? []).map(r => ({
    username:       refProfMap[r.referred_id]?.username ?? null,
    display_name:   refProfMap[r.referred_id]?.display_name ?? null,
    joined_at:      r.created_at as string,
    verified:       !!r.verified_at,
    qualified:      !!r.qualified_at,
    reward_granted: !!r.reward_granted,
  }));

  // Delivered OpenAI keys (RLS only returns this user's delivered grants)
  const referralGrants = (grantRows ?? []).map(g => ({
    tier:         g.tier_threshold as number,
    amount_usd:   g.amount_usd as number,
    api_key:      (g.openai_api_key as string | null) ?? "",
    label:        (g.key_label as string | null) ?? "",
    fulfilled_at: g.fulfilled_at as string,
  }));

  return (
    <ProfileClient
      profile={profile}
      email={user.email ?? ""}
      ratings={ratings ?? []}
      recentMatches={recentMatches}
      isScout={isScout}
      referrals={referrals}
      referralGrants={referralGrants}
    />
  );
}