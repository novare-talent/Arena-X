"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Zap, Users, CheckCircle2, Send, Trophy, Loader2 } from "lucide-react";

interface PendingGrant {
  id: string; user_id: string; username: string; display_name: string;
  tier: number; amount_usd: number; granted_at: string;
}
interface TopReferrer {
  rank: number; id: string; username: string; display_name: string;
  qualified: number; joined: number; earned_usd: number;
}
interface RecentGrant {
  id: string; user_id: string; username: string; display_name: string;
  tier: number; amount_usd: number;
  fulfilled_at: string | null; status: "delivered" | "revoked";
  revoked_at: string | null; revoke_reason: string | null;
}
interface Stats {
  totalReferrals: number; verifiedReferrals: number; qualifiedReferrals: number;
  pendingGrants: number; deliveredGrants: number;
  totalClicks: number; dollarsDelivered: number;
  _?: unknown;
}

export default function AdminReferralsClient({ stats, pending, topReferrers, recent }: {
  stats: Stats; pending: PendingGrant[]; topReferrers: TopReferrer[]; recent: RecentGrant[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError]   = useState<string | null>(null);
  const [forms, setForms]   = useState<Record<string, { key: string; label: string }>>({});

  function setField(id: string, k: "key" | "label", v: string) {
    setForms(f => ({ ...f, [id]: { ...(f[id] ?? { key: "", label: "" }), [k]: v } }));
  }

  async function fulfill(grant: PendingGrant) {
    const form = forms[grant.id] ?? { key: "", label: "" };
    if (!form.key.trim().startsWith("sk-")) {
      setError("Paste an OpenAI key starting with sk-…");
      return;
    }
    setError(null); setBusyId(grant.id);
    try {
      const res = await fetch("/api/admin/referrals/fulfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grant_id: grant.id, openai_api_key: form.key.trim(), key_label: form.label.trim() || `tier-${grant.tier}-${grant.username}` }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.error ?? "Fulfill failed"); return; }
      startTransition(() => router.refresh());
    } finally {
      setBusyId(null);
    }
  }

  async function revoke(grant: { id: string; tier: number; username: string }) {
    const reason = window.prompt(`Revoke tier ${grant.tier} grant for @${grant.username}? Reason (optional):`, "");
    if (reason === null) return;
    setBusyId(grant.id);
    try {
      const res = await fetch("/api/admin/referrals/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grant_id: grant.id, reason }),
      });
      if (!res.ok) { const d = await res.json(); setError(d?.error ?? "Revoke failed"); return; }
      startTransition(() => router.refresh());
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-20 pb-16 px-4">
      <div className="max-w-6xl mx-auto">

        <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs text-[#5a5a7a] hover:text-white mb-3 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Admin
        </Link>

        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-4 h-4 text-[#a78bfa]" />
          <span className="text-xs font-semibold text-[#5a5a7a] uppercase tracking-wider">Referral Program</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-8">Referrals</h1>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          <StatTile icon={Users}        label="JOINED"     value={stats.totalReferrals} />
          <StatTile icon={CheckCircle2} label="VERIFIED"   value={stats.verifiedReferrals} accent="#22c55e" />
          <StatTile icon={Trophy}       label="QUALIFIED"  value={stats.qualifiedReferrals} accent="#a78bfa" />
          <StatTile icon={Send}         label="$ DELIVERED" value={`$${stats.dollarsDelivered}`} accent="#f5c451" />
        </div>
        <div className="grid grid-cols-3 gap-3 mb-10 text-xs text-[#5a5a7a]">
          <Mini label="CLICKS"     value={stats.totalClicks} />
          <Mini label="PENDING GRANTS" value={stats.pendingGrants} highlight={stats.pendingGrants > 0 ? "#f59e0b" : undefined} />
          <Mini label="DELIVERED GRANTS" value={stats.deliveredGrants} />
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm text-red-300"
            style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.3)" }}>
            {error}
          </div>
        )}

        {/* Pending queue — the daily admin chore */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            Pending grants {pending.length > 0 && <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.14)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.35)" }}>{pending.length}</span>}
          </h2>
          {pending.length === 0 ? (
            <p className="text-sm text-[#5a5a7a]">No pending grants. 🎉</p>
          ) : (
            <div className="space-y-3">
              {pending.map(g => (
                <div key={g.id} className="bg-[#0d0d15] border border-[#2a2438] rounded-xl p-4">
                  <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
                    <div>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <Link href={`/profile/${g.username}`} target="_blank" className="text-white font-semibold hover:text-[#a78bfa]">
                          {g.display_name}
                        </Link>
                        <span className="text-xs text-[#5a5a7a]">@{g.username}</span>
                      </div>
                      <div className="text-xs text-[#5a5a7a] mt-1">
                        Crossed <span className="text-[#a78bfa] font-mono">Tier {g.tier}</span> · earned <span className="text-[#f5c451] font-mono">+${g.amount_usd}</span> · {new Date(g.granted_at).toLocaleString("en-IN")}
                      </div>
                    </div>
                    <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer"
                      className="text-xs text-[#a78bfa] underline hover:text-white">
                      Open OpenAI dashboard ↗
                    </a>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-2">
                    <input type="password" placeholder="Paste sk-…"
                      value={forms[g.id]?.key ?? ""}
                      onChange={(e) => setField(g.id, "key", e.target.value)}
                      className="px-3 py-2 rounded-lg bg-[#111118] border border-[#2a2a3a] text-white font-mono text-xs focus:outline-none focus:border-[#a78bfa]" />
                    <input type="text" placeholder={`tier-${g.tier}-${g.username}`}
                      value={forms[g.id]?.label ?? ""}
                      onChange={(e) => setField(g.id, "label", e.target.value)}
                      className="px-3 py-2 rounded-lg bg-[#111118] border border-[#2a2a3a] text-white text-xs focus:outline-none focus:border-[#a78bfa]" />
                    <button onClick={() => fulfill(g)} disabled={isPending || busyId === g.id}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-xs text-white disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}>
                      {busyId === g.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Deliver
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Top referrers */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-3">Top referrers</h2>
          {topReferrers.length === 0 ? (
            <p className="text-sm text-[#5a5a7a]">No qualified referrals yet.</p>
          ) : (
            <div className="bg-[#0d0d15] border border-[#1e1e2e] rounded-xl overflow-hidden">
              <div className="grid grid-cols-[40px_1fr_80px_80px_80px] px-4 py-2.5 text-[10px] font-semibold text-[#5a5a7a] uppercase tracking-wider border-b border-[#1e1e2e]">
                <div>#</div><div>User</div>
                <div className="text-right">Qualified</div><div className="text-right">Joined</div><div className="text-right">Earned</div>
              </div>
              {topReferrers.map(r => (
                <div key={r.id} className="grid grid-cols-[40px_1fr_80px_80px_80px] px-4 py-2.5 text-sm border-b border-[#1e1e2e] hover:bg-[#111118] transition-colors">
                  <div className="text-[#5a5a7a] font-mono">{r.rank}</div>
                  <div className="min-w-0">
                    <Link href={`/profile/${r.username}`} target="_blank" className="text-white hover:text-[#a78bfa] truncate block">
                      {r.display_name} <span className="text-[#5a5a7a]">@{r.username}</span>
                    </Link>
                  </div>
                  <div className="text-right text-[#22c55e] font-mono">{r.qualified}</div>
                  <div className="text-right text-[#a1a1b5] font-mono">{r.joined}</div>
                  <div className="text-right text-[#f5c451] font-mono">${r.earned_usd}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent grants */}
        <section>
          <h2 className="text-lg font-bold text-white mb-3">Recent grants</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-[#5a5a7a]">No grants yet.</p>
          ) : (
            <div className="bg-[#0d0d15] border border-[#1e1e2e] rounded-xl overflow-hidden">
              {recent.map(g => (
                <div key={g.id} className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[#1e1e2e] text-sm hover:bg-[#111118] transition-colors">
                  <div className="min-w-0 flex-1">
                    <Link href={`/profile/${g.username}`} target="_blank" className="text-white hover:text-[#a78bfa] truncate">
                      {g.display_name} <span className="text-[#5a5a7a]">@{g.username}</span>
                    </Link>
                    <div className="text-xs text-[#5a5a7a] mt-0.5">
                      Tier {g.tier} · ${g.amount_usd} ·{" "}
                      {g.status === "delivered"
                        ? <>delivered {g.fulfilled_at ? new Date(g.fulfilled_at).toLocaleDateString("en-IN") : ""}</>
                        : <span className="text-red-400">revoked {g.revoked_at ? new Date(g.revoked_at).toLocaleDateString("en-IN") : ""}{g.revoke_reason ? ` · ${g.revoke_reason}` : ""}</span>
                      }
                    </div>
                  </div>
                  {g.status === "delivered" && (
                    <button onClick={() => revoke({ id: g.id, tier: g.tier, username: g.username })}
                      disabled={busyId === g.id}
                      className="text-xs text-[#5a5a7a] hover:text-red-400 transition-colors disabled:opacity-50">
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, accent = "#a78bfa" }: {
  icon: React.ElementType; label: string; value: number | string; accent?: string;
}) {
  return (
    <div className="bg-[#0d0d15] border border-[#1e1e2e] rounded-xl p-4">
      <Icon className="w-4 h-4 mb-2" style={{ color: accent, opacity: 0.7 }} />
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-[10px] font-semibold text-[#5a5a7a] uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

function Mini({ label, value, highlight }: { label: string; value: number; highlight?: string }) {
  return (
    <div className="bg-[#0d0d15] border border-[#1e1e2e] rounded-lg px-3 py-2 flex items-center justify-between">
      <span className="font-semibold tracking-wider">{label}</span>
      <span className="font-mono text-sm" style={{ color: highlight ?? "#a1a1b5" }}>{value}</span>
    </div>
  );
}