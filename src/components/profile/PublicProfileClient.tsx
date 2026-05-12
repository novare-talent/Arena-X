"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Trophy, Swords, Minus, TrendingUp, ArrowLeft } from "lucide-react";
import { Kabuto, Crest, TierRing, dbTierToKabuto, TIER_LABELS } from "@/components/ui-samurai/primitives";

const TRACK_LABELS: Record<string, string> = {
  dsa:      "DSA",
  backend:  "Backend",
  ml:       "ML / Data Science",
  frontend: "Frontend",
  ai_llm:   "AI / LLM",
  security: "Cybersecurity",
};

interface Rating {
  track: string; elo: number; tier: string;
  wins: number; losses: number; draws: number; matches_played: number;
}

interface Match {
  id: string; track: string; result: "win" | "loss" | "draw";
  eloDelta: number | null; endReason: string | null;
  endedAt: string | null; problemTitle: string | null;
  opponentName: string; opponentUsername: string | null;
}

interface Profile {
  id: string; username: string; display_name: string;
  bio: string | null; college: string | null; country: string | null;
  avatar_url: string | null; created_at: string;
}

export default function PublicProfileClient({
  profile, ratings, recentMatches,
}: {
  profile: Profile;
  ratings: Rating[];
  recentMatches: Match[];
}) {
  const dsaRating    = ratings.find(r => r.track === "dsa");
  const tier         = dsaRating?.tier ?? "unrated";
  const elo          = dsaRating?.elo ?? 800;
  const kabutoTier   = dbTierToKabuto(tier);
  const tierInfo     = TIER_LABELS[tier] ?? TIER_LABELS.unrated;
  const totalMatches = ratings.reduce((s, r) => s + r.matches_played, 0);
  const totalWins    = ratings.reduce((s, r) => s + r.wins, 0);
  const totalLosses  = ratings.reduce((s, r) => s + r.losses, 0);
  const winRate      = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;
  const joinYear     = new Date(profile.created_at).getFullYear();

  return (
    <div className="min-h-screen" style={{ background: "var(--ink-1)", position: "relative", overflow: "hidden" }}>
      <div className="ax-aura pointer-events-none"
        style={{ width: 500, height: 350, background: "var(--violet-700)", top: 56, right: -80, opacity: 0.13 }} />

      <div className="max-w-3xl mx-auto px-4 pt-20 pb-12 space-y-4">

        {/* Back */}
        <Link href="/leaderboard"
          className="inline-flex items-center gap-1.5 font-cond text-[10px] mb-2 transition-colors"
          style={{ color: "var(--smoke)", letterSpacing: "0.2em" }}>
          <ArrowLeft className="w-3.5 h-3.5" /> BACK TO LEADERBOARD
        </Link>

        {/* Header card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="ax-card ax-ticks relative overflow-hidden" style={{ padding: 0 }}>
          <div className="ax-dotgrid" style={{ position: "absolute", inset: 0, opacity: 0.18 }} />
          <div className="relative p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">

              {/* Kabuto */}
              <div className="shrink-0">
                <TierRing tier={kabutoTier} size={80}>
                  <Kabuto size={64} tier={kabutoTier} glow={true} />
                </TierRing>
              </div>

              {/* Name block */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-cond text-[10px]"
                    style={{ color: "var(--violet-300)", letterSpacing: "0.3em" }}>WARRIOR · 武士</span>
                  <Crest size={12} color="var(--violet-400)" />
                </div>
                <h1 className="font-display" style={{ fontSize: 32, color: "var(--bone)", lineHeight: 1 }}>
                  {profile.display_name.toUpperCase()}
                </h1>
                <p className="font-mono text-xs mt-0.5" style={{ color: "var(--smoke)" }}>@{profile.username}</p>
                {profile.bio && (
                  <p className="text-sm mt-2" style={{ color: "var(--ash)", lineHeight: 1.5 }}>{profile.bio}</p>
                )}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {profile.college && (
                    <span className="font-cond text-[9px]" style={{ color: "var(--smoke)", letterSpacing: "0.15em" }}>
                      {profile.college.toUpperCase()}
                    </span>
                  )}
                  {profile.country && (
                    <span className="font-cond text-[9px]" style={{ color: "var(--smoke)", letterSpacing: "0.15em" }}>
                      {profile.country.toUpperCase()}
                    </span>
                  )}
                  <span className="font-cond text-[9px]" style={{ color: "var(--void)", letterSpacing: "0.12em" }}>
                    SINCE {joinYear}
                  </span>
                </div>
              </div>

              {/* Tier badge */}
              <div className="ax-card-glass ax-ticks flex flex-col items-center gap-1 px-5 py-3 shrink-0"
                style={{ borderColor: `${tierInfo.color}40` }}>
                <div className="font-jp text-2xl" style={{ color: tierInfo.color }}>{tierInfo.jp}</div>
                <div className="font-display text-sm" style={{ color: tierInfo.color }}>{tierInfo.label.toUpperCase()}</div>
                <div className="font-mono text-xl font-bold mt-1" style={{ color: "var(--violet-200)" }}>{elo}</div>
                <div className="font-cond text-[8px]" style={{ color: "var(--smoke)", letterSpacing: "0.2em" }}>ELO · 力</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "DUELS · 試合", value: String(totalMatches), accent: "var(--violet-200)", icon: Swords },
            { label: "W / L",        value: "",                   accent: "var(--bone)",        icon: Trophy,     wl: true },
            { label: "WIN RATE",     value: `${winRate}%`,        accent: "var(--win)",         icon: TrendingUp },
          ].map((s) => (
            <div key={s.label} className="ax-card p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-cond text-[9px]" style={{ color: "var(--ash)", letterSpacing: "0.22em" }}>{s.label}</span>
                <s.icon className="w-3 h-3" style={{ color: s.accent, opacity: 0.7 }} />
              </div>
              {s.wl ? (
                <div className="font-display text-3xl mt-1" style={{ lineHeight: 1 }}>
                  <span style={{ color: "var(--win)" }}>{totalWins}</span>
                  <span style={{ color: "var(--ash)", fontSize: "0.7em", margin: "0 4px" }}>–</span>
                  <span style={{ color: "var(--loss)" }}>{totalLosses}</span>
                </div>
              ) : (
                <div className="font-display text-3xl mt-1" style={{ color: s.accent, lineHeight: 1 }}>{s.value}</div>
              )}
            </div>
          ))}
          <div className="ax-card p-4 flex flex-col gap-1">
            <span className="font-cond text-[9px]" style={{ color: "var(--ash)", letterSpacing: "0.22em" }}>MATCHES</span>
            <div className="font-display text-3xl mt-1" style={{ color: "var(--bone)", lineHeight: 1 }}>{totalMatches}</div>
          </div>
        </motion.div>

        {/* Track ratings */}
        {ratings.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="font-cond text-[10px] mb-3" style={{ color: "var(--ash)", letterSpacing: "0.3em" }}>
              TRACK RATINGS · 部門
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {ratings.map(r => {
                const tInfo = TIER_LABELS[r.tier] ?? TIER_LABELS.unrated;
                const kt    = dbTierToKabuto(r.tier);
                return (
                  <div key={r.track} className="ax-card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-cond text-[10px]" style={{ color: "var(--ash)", letterSpacing: "0.18em" }}>
                        {(TRACK_LABELS[r.track] ?? r.track).toUpperCase()}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Kabuto size={18} tier={kt} glow={false} />
                        <span className="font-cond text-[9px] px-2 py-0.5 rounded"
                          style={{ background: `${tInfo.color}15`, color: tInfo.color, border: `1px solid ${tInfo.color}30`, letterSpacing: "0.1em" }}>
                          {tInfo.label.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <p className="font-display text-2xl" style={{ color: "var(--bone)" }}>{r.elo}</p>
                    <p className="font-cond text-[9px] mt-0.5" style={{ letterSpacing: "0.12em" }}>
                      <span style={{ color: "var(--win)" }}>{r.wins}W</span>{" "}
                      <span style={{ color: "var(--loss)" }}>{r.losses}L</span>{" "}
                      <span style={{ color: "var(--smoke)" }}>· {r.matches_played} MATCHES</span>
                    </p>
                    <div className="mt-3" style={{ height: 2, background: "var(--ink-4)", borderRadius: 1, overflow: "hidden" }}>
                      <div style={{
                        width: `${Math.min(100, ((r.elo - 600) / (2400 - 600)) * 100)}%`,
                        height: "100%",
                        background: `linear-gradient(90deg, var(--violet-500), ${tInfo.color})`,
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Recent matches */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="ax-card" style={{ padding: 0 }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--ink-4)" }}>
              <span className="font-cond text-[10px]" style={{ color: "var(--ash)", letterSpacing: "0.25em" }}>
                RECENT MATCHES · 直近
              </span>
            </div>
            {recentMatches.length === 0 ? (
              <p className="font-cond text-center py-8" style={{ color: "var(--void)", letterSpacing: "0.2em", fontSize: 11 }}>
                NO MATCHES YET · 未戦
              </p>
            ) : (
              <div className="p-4 space-y-2">
                {recentMatches.map(m => {
                  const delta = m.eloDelta;
                  const ResultIcon  = m.result === "win" ? Trophy : m.result === "loss" ? Swords : Minus;
                  const resultColor = m.result === "win" ? "var(--win)" : m.result === "loss" ? "var(--loss)" : "#f5c451";
                  const date = m.endedAt
                    ? new Date(m.endedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                    : "";
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                      style={{ background: "var(--ink-3)", border: "1px solid var(--ink-4)" }}>
                      <ResultIcon className="w-3.5 h-3.5 shrink-0" style={{ color: resultColor }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: "var(--bone)" }}>
                          {m.problemTitle ?? "—"}
                        </p>
                        <p className="font-cond text-[9px] mt-0.5" style={{ color: "var(--smoke)", letterSpacing: "0.1em" }}>
                          vs{" "}
                          {m.opponentUsername
                            ? <Link href={`/profile/${m.opponentUsername}`} className="hover:text-white transition-colors">@{m.opponentUsername}</Link>
                            : m.opponentName}
                          {" · "}{date}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {delta !== null ? (
                          <span className="font-mono text-xs font-bold" style={{ color: delta >= 0 ? "var(--win)" : "var(--loss)" }}>
                            {delta > 0 ? `+${delta}` : delta}
                          </span>
                        ) : (
                          <span className="font-mono text-xs" style={{ color: "var(--void)" }}>—</span>
                        )}
                        <p className="font-cond text-[9px] uppercase mt-0.5" style={{ color: "var(--void)" }}>
                          {TRACK_LABELS[m.track] ?? m.track}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
