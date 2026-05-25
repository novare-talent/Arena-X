import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Crown, ArrowLeft, Zap, Users } from "lucide-react";

export const metadata = { title: "Top Referrers — ArenaX" };
export const dynamic  = "force-dynamic";

const PODIUM_COLORS = ["#f5c451", "#a78bfa", "#8b5cf6"];

export default async function ReferrersLeaderboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch all qualified referrals (no PII), group in JS — small scale OK.
  const { data: qualifiedRows } = await supabase
    .from("referrals")
    .select("referrer_id")
    .not("qualified_at", "is", null);

  const byReferrer = new Map<string, number>();
  for (const r of (qualifiedRows ?? [])) {
    const k = r.referrer_id as string;
    byReferrer.set(k, (byReferrer.get(k) ?? 0) + 1);
  }

  const topIds = Array.from(byReferrer.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100)
    .map(([id]) => id);

  const { data: profiles } = topIds.length
    ? await supabase.from("profiles").select("id, username, display_name, college, country").in("id", topIds)
    : { data: [] };
  const profMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));

  const entries = topIds.map((id, i) => ({
    rank:         i + 1,
    id,
    username:     profMap[id]?.username ?? "—",
    display_name: profMap[id]?.display_name ?? "—",
    college:      profMap[id]?.college ?? null,
    country:      profMap[id]?.country ?? null,
    qualified:    byReferrer.get(id) ?? 0,
  }));

  const me = entries.find(e => e.id === user.id);

  return (
    <div className="min-h-screen pt-20 pb-16 px-4" style={{ background: "var(--ink-1)", position: "relative", overflow: "hidden" }}>
      <div className="ax-aura pointer-events-none" style={{ width: 600, height: 400, background: "var(--violet-700)", top: 56, right: -100, opacity: 0.13 }} />

      <div className="max-w-3xl mx-auto relative">
        <div className="flex items-center justify-between mb-6">
          <Link href="/leaderboard"
            className="inline-flex items-center gap-1.5 font-cond text-[10px] transition-colors"
            style={{ color: "var(--smoke)", letterSpacing: "0.2em" }}>
            <ArrowLeft className="w-3.5 h-3.5" /> DSA LADDER
          </Link>
          <Link href="/profile"
            className="font-cond text-[10px]"
            style={{ color: "var(--violet-300)", letterSpacing: "0.2em" }}>
            YOUR INVITE LINK ⟶
          </Link>
        </div>

        <div className="ax-card ax-ticks mb-5" style={{ padding: "24px 26px" }}>
          <div className="ax-dotgrid" style={{ position: "absolute", inset: 0, opacity: 0.16 }} />
          <div className="relative flex items-end justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-3.5 h-3.5" style={{ color: "var(--violet-400)" }} />
                <span className="font-cond text-[10px]" style={{ color: "var(--violet-300)", letterSpacing: "0.3em" }}>
                  TOP REFERRERS · 召
                </span>
              </div>
              <h1 className="font-display" style={{ fontSize: 38, color: "var(--bone)", lineHeight: 0.95 }}>
                BRING THE <span style={{ color: "var(--gold)" }}>BLADES.</span>
              </h1>
              <p className="font-cond text-xs mt-2" style={{ color: "var(--ash)", letterSpacing: "0.08em", lineHeight: 1.6 }}>
                Ranked by warriors you brought in who verified email + played a ranked match.
                Earn OpenAI API credits at 20 / 75 / 100 / 300 / 500.
              </p>
            </div>
            <div className="ax-card-glass px-4 py-3" style={{ borderColor: "rgba(245,196,81,0.3)" }}>
              <div className="font-cond text-[9px]" style={{ color: "var(--smoke)", letterSpacing: "0.22em" }}>YOUR RANK</div>
              <div className="font-display text-2xl mt-0.5" style={{ color: "var(--gold)" }}>
                {me ? `#${me.rank}` : "—"}
              </div>
              <div className="font-mono text-[10px]" style={{ color: "var(--ash)" }}>
                {me ? `${me.qualified} qualified` : "no qualified yet"}
              </div>
            </div>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="ax-card text-center py-16">
            <Users className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--void)" }} />
            <p className="font-cond text-xs" style={{ color: "var(--smoke)", letterSpacing: "0.22em" }}>
              NO REFERRERS YET — BE THE FIRST.
            </p>
            <Link href="/profile"
              className="inline-block mt-4 font-cond text-[11px] px-4 py-2 rounded"
              style={{ background: "rgba(124,58,237,0.14)", color: "var(--violet-200)", border: "1px solid var(--violet-500)", letterSpacing: "0.18em" }}>
              GET YOUR INVITE LINK
            </Link>
          </div>
        ) : (
          <div className="ax-card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="grid grid-cols-[44px_1fr_90px] px-5 py-3 font-cond text-[9px]"
              style={{ color: "var(--smoke)", letterSpacing: "0.22em", borderBottom: "1px solid var(--ink-4)" }}>
              <div>#</div><div>WARRIOR</div><div className="text-right">QUALIFIED</div>
            </div>
            {entries.map(e => {
              const isMe = e.id === user.id;
              const podiumColor = e.rank <= 3 ? PODIUM_COLORS[e.rank - 1] : null;
              return (
                <Link key={e.id} href={`/profile/${e.username}`}
                  className="grid grid-cols-[44px_1fr_90px] items-center px-5 py-3 transition-colors hover:bg-[var(--ink-3)]"
                  style={{ borderBottom: "1px solid var(--ink-4)", background: isMe ? "rgba(124,58,237,0.07)" : undefined }}>
                  <div className="flex items-center">
                    {e.rank === 1
                      ? <Crown className="w-4 h-4" style={{ color: PODIUM_COLORS[0] }} />
                      : <span className="font-mono text-xs" style={{ color: podiumColor ?? "var(--smoke)" }}>{e.rank}</span>}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display text-sm"
                        style={{ color: isMe ? "var(--violet-300)" : "var(--bone)" }}>
                        {e.display_name.toUpperCase()}
                      </span>
                      {isMe && (
                        <span className="font-cond text-[8px] px-1.5 py-0.5 rounded"
                          style={{ background: "rgba(124,58,237,0.2)", color: "var(--violet-300)", letterSpacing: "0.1em" }}>
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[10px] truncate mt-0.5" style={{ color: "var(--smoke)" }}>
                      @{e.username}{e.college ? ` · ${e.college}` : ""}{e.country ? ` · ${e.country}` : ""}
                    </div>
                  </div>
                  <div className="text-right font-display text-base"
                    style={{ color: podiumColor ?? "var(--bone)" }}>
                    {e.qualified}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}