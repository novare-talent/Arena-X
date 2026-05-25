import { createClient as createServiceClient } from "@supabase/supabase-js";
import AdminReferralsClient from "@/components/admin/AdminReferralsClient";

export const metadata = { title: "Admin · Referrals — ArenaX" };
export const dynamic  = "force-dynamic";

function service() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export default async function AdminReferralsPage() {
  // layout.tsx already gates on is_admin
  const admin = service();

  // ── Funnel stats ──
  const [
    { count: totalReferrals },
    { count: verifiedReferrals },
    { count: qualifiedReferrals },
    { count: pendingGrants },
    { count: deliveredGrants },
    { data: clickRows },
    { data: deliveredRows },
  ] = await Promise.all([
    admin.from("referrals").select("*", { count: "exact", head: true }),
    admin.from("referrals").select("*", { count: "exact", head: true }).not("verified_at", "is", null),
    admin.from("referrals").select("*", { count: "exact", head: true }).not("qualified_at", "is", null),
    admin.from("referral_grants").select("*", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("referral_grants").select("*", { count: "exact", head: true }).eq("status", "delivered"),
    admin.from("referral_clicks").select("count"),
    admin.from("referral_grants").select("amount_usd").eq("status", "delivered"),
  ]);

  const totalClickCount  = (clickRows     ?? []).reduce((s, r) => s + ((r.count       as number) ?? 0), 0);
  const dollarsDelivered = (deliveredRows ?? []).reduce((s, r) => s + ((r.amount_usd  as number) ?? 0), 0);

  // ── Pending grants queue ──
  const { data: pendingGrantRows } = await admin
    .from("referral_grants")
    .select("id, user_id, tier_threshold, amount_usd, granted_at")
    .eq("status", "pending")
    .order("granted_at", { ascending: true });

  const pendingUserIds = (pendingGrantRows ?? []).map(g => g.user_id);
  const { data: pendingProfiles } = pendingUserIds.length
    ? await admin.from("profiles").select("id, username, display_name").in("id", pendingUserIds)
    : { data: [] };
  const profMap = Object.fromEntries((pendingProfiles ?? []).map(p => [p.id, p]));
  const pending = (pendingGrantRows ?? []).map(g => ({
    id:           g.id as string,
    user_id:      g.user_id as string,
    username:     profMap[g.user_id]?.username ?? "—",
    display_name: profMap[g.user_id]?.display_name ?? "—",
    tier:         g.tier_threshold as number,
    amount_usd:   g.amount_usd as number,
    granted_at:   g.granted_at as string,
  }));

  // ── Top referrers (by qualified count) ──
  // Small scale: fetch all qualified referrals, group in JS
  const { data: allQualified } = await admin
    .from("referrals")
    .select("referrer_id, verified_at, qualified_at")
    .not("qualified_at", "is", null);

  const byReferrer = new Map<string, { qualified: number; verified: number }>();
  for (const r of (allQualified ?? [])) {
    const k = r.referrer_id as string;
    const cur = byReferrer.get(k) ?? { qualified: 0, verified: 0 };
    cur.qualified += 1;
    if (r.verified_at) cur.verified += 1;
    byReferrer.set(k, cur);
  }

  // also count unqualified-but-joined for context
  const { data: allReferrals } = await admin.from("referrals").select("referrer_id");
  const joinedByReferrer = new Map<string, number>();
  for (const r of (allReferrals ?? [])) {
    const k = r.referrer_id as string;
    joinedByReferrer.set(k, (joinedByReferrer.get(k) ?? 0) + 1);
  }

  const topIds = Array.from(byReferrer.entries()).sort((a, b) => b[1].qualified - a[1].qualified).slice(0, 50).map(([id]) => id);
  const { data: topProfiles } = topIds.length
    ? await admin.from("profiles").select("id, username, display_name").in("id", topIds)
    : { data: [] };
  const topProfMap = Object.fromEntries((topProfiles ?? []).map(p => [p.id, p]));

  // lifetime $ delivered per user
  const { data: deliveredByUser } = await admin
    .from("referral_grants")
    .select("user_id, amount_usd")
    .eq("status", "delivered")
    .in("user_id", topIds.length ? topIds : ["00000000-0000-0000-0000-000000000000"]);
  const dollarsByUser = new Map<string, number>();
  for (const g of (deliveredByUser ?? [])) {
    dollarsByUser.set(g.user_id as string, (dollarsByUser.get(g.user_id as string) ?? 0) + ((g.amount_usd as number) ?? 0));
  }

  const topReferrers = topIds.map((id, rank) => ({
    rank:         rank + 1,
    id,
    username:     topProfMap[id]?.username ?? "—",
    display_name: topProfMap[id]?.display_name ?? "—",
    qualified:    byReferrer.get(id)?.qualified ?? 0,
    joined:       joinedByReferrer.get(id) ?? 0,
    earned_usd:   dollarsByUser.get(id) ?? 0,
  }));

  // ── Recent delivered grants ──
  const { data: recentRows } = await admin
    .from("referral_grants")
    .select("id, user_id, tier_threshold, amount_usd, fulfilled_at, status, revoked_at, revoke_reason")
    .in("status", ["delivered", "revoked"])
    .order("fulfilled_at", { ascending: false, nullsFirst: false })
    .limit(40);

  const recentUserIds = (recentRows ?? []).map(r => r.user_id);
  const { data: recentProfiles } = recentUserIds.length
    ? await admin.from("profiles").select("id, username, display_name").in("id", recentUserIds)
    : { data: [] };
  const recentProfMap = Object.fromEntries((recentProfiles ?? []).map(p => [p.id, p]));
  const recent = (recentRows ?? []).map(r => ({
    id:           r.id as string,
    user_id:      r.user_id as string,
    username:     recentProfMap[r.user_id]?.username ?? "—",
    display_name: recentProfMap[r.user_id]?.display_name ?? "—",
    tier:         r.tier_threshold as number,
    amount_usd:   r.amount_usd as number,
    fulfilled_at: r.fulfilled_at as string | null,
    status:       r.status as "delivered" | "revoked",
    revoked_at:   r.revoked_at as string | null,
    revoke_reason:(r.revoke_reason as string | null) ?? null,
  }));

  return (
    <AdminReferralsClient
      stats={{
        totalReferrals:     totalReferrals ?? 0,
        verifiedReferrals:  verifiedReferrals ?? 0,
        qualifiedReferrals: qualifiedReferrals ?? 0,
        pendingGrants:      pendingGrants ?? 0,
        deliveredGrants:    deliveredGrants ?? 0,
        totalClicks:        totalClickCount,
        dollarsDelivered,
      }}
      pending={pending}
      topReferrers={topReferrers}
      recent={recent}
    />
  );
}