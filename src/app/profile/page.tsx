import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfileClient from "@/components/profile/ProfileClient";
import { isScoutRank } from "@/lib/scout";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const { data: ratings } = await supabase
    .from("user_ratings")
    .select("*")
    .eq("user_id", user.id);

  const { data: matchRows } = await supabase
    .from("matches")
    .select("id, track, winner_id, end_reason, ended_at, player_one_id, player_two_id, player_one_elo_before, player_one_elo_after, player_two_elo_before, player_two_elo_after, problems(title)")
    .or(`player_one_id.eq.${user.id},player_two_id.eq.${user.id}`)
    .eq("status", "completed")
    .order("ended_at", { ascending: false })
    .limit(10);

  const opponentIds = (matchRows ?? [])
    .map(m => m.player_one_id === user.id ? m.player_two_id : m.player_one_id)
    .filter(Boolean) as string[];
  const uniqueOpponentIds = opponentIds.filter((id, i, arr) => arr.indexOf(id) === i);

  const { data: opponentProfiles } = uniqueOpponentIds.length > 0
    ? await supabase.from("profiles").select("id, username, display_name").in("id", uniqueOpponentIds)
    : { data: [] };

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

  // ── Scout Badge: top warriors by ELO (same ranking as the leaderboard) ──
  const dsaRating = (ratings ?? []).find(r => r.track === "dsa");
  let isScout = false;
  if (dsaRating) {
    const [{ count: totalRanked }, { count: aboveCount }] = await Promise.all([
      supabase.from("user_ratings").select("*", { count: "exact", head: true })
        .eq("track", "dsa"),
      supabase.from("user_ratings").select("*", { count: "exact", head: true })
        .eq("track", "dsa").gt("elo", dsaRating.elo),
    ]);
    const myRank = (aboveCount ?? 0) + 1;
    isScout = isScoutRank(myRank, totalRanked ?? 0);
  }

  // ── Referrals (people who signed up via this user's code) ──
  const { data: refRows } = await supabase
    .from("referrals")
    .select("referred_id, created_at, verified_at, qualified_at, reward_granted")
    .eq("referrer_id", user.id)
    .order("created_at", { ascending: false });

  const referredIds = (refRows ?? []).map(r => r.referred_id);
  const { data: refProfiles } = referredIds.length
    ? await supabase.from("profiles").select("id, username, display_name").in("id", referredIds)
    : { data: [] };
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
  const { data: grantRows } = await supabase
    .from("referral_grants")
    .select("tier_threshold, amount_usd, openai_api_key, key_label, fulfilled_at")
    .eq("status", "delivered")
    .order("fulfilled_at", { ascending: false });

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