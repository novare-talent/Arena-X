"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Trophy, Swords, Flame, Crown, Search, ArrowRight } from "lucide-react";
import { Kabuto, Crest, TierRing, dbTierToKabuto, TIER_LABELS } from "@/components/ui-samurai/primitives";

const PODIUM_COLORS = ["#f5c451", "#a78bfa", "#8b5cf6"];

interface Entry {
  rank: number;
  id: string;
  username: string;
  display_name: string;
  college: string | null;
  country: string | null;
  elo: number;
  tier: string;
  peak_elo: number;
  matches_played: number;
  wins: number;
  losses: number;
  win_rate: number;
  best_streak: number;
}

interface MyEntry {
  rank: number;
  username: string;
  display_name: string;
  elo: number;
  tier: string;
  matches_played: number;
  wins: number;
  losses: number;
  win_rate: number;
}

interface Props {
  entries:       Entry[];
  currentUserId: string;
  myEntry:       MyEntry | null;
}

export default function LeaderboardClient({ entries, currentUserId, myEntry }: Props) {
  const [search, setSearch] = useState("");

  const filtered = entries.filter((e) =>
    search === "" ||
    e.username.toLowerCase().includes(search.toLowerCase()) ||
    e.display_name.toLowerCase().includes(search.toLowerCase()) ||
    (e.college ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const top3 = entries.slice(0, 3);
  // Podium order: 2nd | 1st | 3rd
  const podiumOrder = [top3[1], top3[0], top3[2]];
  const podiumRanks = [2, 1, 3];
  const podiumSizes = [44, 56, 38];
  const podiumBarH  = ["h-20", "h-32", "h-14"];

  return (
    <div className="min-h-screen" style={{ background: "var(--ink-1)", position: "relative", overflow: "hidden" }}>
      <div className="ax-aura pointer-events-none"
        style={{ width: 700, height: 400, background: "var(--violet-700)", top: 56, right: -80, opacity: 0.15 }} />

      <div className="max-w-4xl mx-auto px-4 pt-20 pb-12">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="relative mb-6 overflow-hidden rounded-xl px-5 py-4"
          style={{ background: "var(--ink-2)", border: "1px solid var(--ink-4)" }}>
          <div className="ax-dotgrid" style={{ position: "absolute", inset: 0, opacity: 0.25 }} />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-cond text-[10px]" style={{ color: "var(--violet-300)", letterSpacing: "0.3em" }}>
                LEADERBOARD · 位
              </span>
              <Crest size={13} color="var(--violet-400)" />
            </div>
            <h1 className="font-display" style={{ fontSize: 44, color: "var(--bone)", lineHeight: 0.9 }}>
              TOP <span style={{ background: "linear-gradient(180deg, var(--violet-200), var(--violet-500))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>WARRIORS</span>.
            </h1>
            <p className="font-cond text-[10px] mt-2" style={{ color: "var(--smoke)", letterSpacing: "0.18em" }}>
              DSA TRACK · RANKED BY ELO
            </p>
          </div>
        </motion.div>

        {/* ── Podium ── */}
        {top3.length >= 1 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
            className="ax-card mb-5" style={{ padding: "20px 20px 0" }}>
            <div className="grid grid-cols-3 gap-2 items-end">
              {podiumOrder.map((e, idx) => {
                if (!e) return <div key={idx} />;
                const rank     = podiumRanks[idx];
                const kt       = dbTierToKabuto(e.tier);
                const tInfo    = TIER_LABELS[e.tier] ?? TIER_LABELS.unrated;
                const isMe     = e.id === currentUserId;
                const pColor   = PODIUM_COLORS[rank - 1];
                return (
                  <Link key={e.id} href={`/profile/${e.username}`}
                    className="flex flex-col items-center group">
                    {/* Kabuto + crown */}
                    <div className="relative mb-2">
                      {rank === 1 && (
                        <Crown className="w-4 h-4 absolute -top-5 left-1/2 -translate-x-1/2"
                          style={{ color: PODIUM_COLORS[0] }} />
                      )}
                      <TierRing tier={kt} size={podiumSizes[idx]}>
                        <Kabuto size={podiumSizes[idx] - 12} tier={kt} glow={true} />
                      </TierRing>
                    </div>
                    <div className="text-center mb-2">
                      <div className="font-display text-sm" style={{ color: isMe ? "var(--violet-300)" : "var(--bone)" }}>
                        {e.display_name.toUpperCase()}{isMe ? " ·YOU" : ""}
                      </div>
                      <div className="font-jp text-xs mt-0.5" style={{ color: tInfo.color }}>{tInfo.jp}</div>
                      <div className="font-mono text-xs font-bold mt-0.5" style={{ color: "var(--violet-200)" }}>
                        {e.elo} ELO
                      </div>
                    </div>
                    {/* Podium bar */}
                    <div className={`w-full ${podiumBarH[idx]} rounded-t-lg flex items-center justify-center transition-all group-hover:opacity-90`}
                      style={{ background: `${pColor}14`, border: `1px solid ${pColor}30`, borderBottom: "none" }}>
                      <span className="font-display text-2xl" style={{ color: pColor }}>#{rank}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── My rank (outside top 100) ── */}
        {myEntry && !entries.find((e) => e.id === currentUserId) && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
            className="ax-card mb-4 px-4 py-3"
            style={{ borderColor: "rgba(139,92,246,0.4)", background: "rgba(124,58,237,0.08)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-cond text-[9px]" style={{ color: "var(--smoke)", letterSpacing: "0.2em" }}>YOUR RANK</span>
                <span className="font-display text-2xl" style={{ color: "var(--violet-300)" }}>#{myEntry.rank}</span>
                <span className="font-display text-sm" style={{ color: "var(--bone)" }}>
                  {myEntry.display_name.toUpperCase()}
                </span>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm font-bold" style={{ color: "var(--violet-200)" }}>{myEntry.elo} ELO</div>
                <div className="font-cond text-[9px]" style={{ color: "var(--smoke)", letterSpacing: "0.12em" }}>
                  {myEntry.matches_played} MATCHES
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Search ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--smoke)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or college…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm focus:outline-none transition-all font-cond"
            style={{
              background: "var(--ink-2)", border: "1px solid var(--ink-4)",
              color: "var(--bone)", letterSpacing: "0.06em",
            }}
          />
        </motion.div>

        {/* ── Table ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="ax-card overflow-hidden" style={{ padding: 0 }}>

          {/* Header row */}
          <div className="grid grid-cols-12 px-5 py-3 font-cond text-[9px]"
            style={{ borderBottom: "1px solid var(--ink-4)", color: "var(--smoke)", letterSpacing: "0.22em" }}>
            <div className="col-span-1">#</div>
            <div className="col-span-5">PLAYER</div>
            <div className="col-span-2 text-right">ELO</div>
            <div className="col-span-1 text-right hidden sm:block">PEAK</div>
            <div className="col-span-1 text-right hidden md:flex items-center justify-end gap-1">
              <Swords className="w-3 h-3" /> M
            </div>
            <div className="col-span-1 text-right hidden md:flex items-center justify-end gap-1">
              <Trophy className="w-3 h-3" /> W%
            </div>
            <div className="col-span-1 text-right hidden lg:flex items-center justify-end gap-1">
              <Flame className="w-3 h-3" /> STR
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="font-cond text-center py-12" style={{ color: "var(--void)", letterSpacing: "0.2em", fontSize: 11 }}>
              NO WARRIORS FOUND
            </p>
          ) : (
            filtered.map((e, i) => {
              const kt    = dbTierToKabuto(e.tier);
              const tInfo = TIER_LABELS[e.tier] ?? TIER_LABELS.unrated;
              const isMe  = e.id === currentUserId;
              return (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.4) }}
                  onClick={() => window.location.href = `/profile/${e.username}`}
                  className="grid grid-cols-12 items-center px-5 py-3.5 transition-colors cursor-pointer"
                  style={{
                    borderBottom: "1px solid var(--ink-4)",
                    background: isMe ? "rgba(124,58,237,0.07)" : undefined,
                  }}
                  onMouseEnter={(el) => { if (!isMe) (el.currentTarget as HTMLElement).style.background = "var(--ink-3)"; }}
                  onMouseLeave={(el) => { (el.currentTarget as HTMLElement).style.background = isMe ? "rgba(124,58,237,0.07)" : ""; }}
                >
                  {/* Rank */}
                  <div className="col-span-1 flex items-center">
                    {e.rank === 1 ? (
                      <Crown className="w-4 h-4" style={{ color: PODIUM_COLORS[0] }} />
                    ) : e.rank === 2 ? (
                      <span className="font-display text-sm" style={{ color: PODIUM_COLORS[1] }}>2</span>
                    ) : e.rank === 3 ? (
                      <span className="font-display text-sm" style={{ color: PODIUM_COLORS[2] }}>3</span>
                    ) : (
                      <span className="font-mono text-xs" style={{ color: "var(--smoke)" }}>{e.rank}</span>
                    )}
                  </div>

                  {/* Player */}
                  <div className="col-span-5 flex items-center gap-2.5 min-w-0">
                    <div className="shrink-0">
                      <Kabuto size={28} tier={kt} glow={false} />
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
                        <span className="font-cond text-[8px] px-1.5 py-0.5 rounded shrink-0"
                          style={{ background: `${tInfo.color}14`, color: tInfo.color, border: `1px solid ${tInfo.color}28`, letterSpacing: "0.1em" }}>
                          {tInfo.label.toUpperCase()}
                        </span>
                      </div>
                      <div className="font-mono text-[10px] truncate mt-0.5" style={{ color: "var(--smoke)" }}>
                        @{e.username}{e.college ? ` · ${e.college}` : ""}
                      </div>
                    </div>
                  </div>

                  {/* ELO */}
                  <div className="col-span-2 text-right">
                    <span className="font-display text-base" style={{ color: "var(--bone)" }}>{e.elo}</span>
                  </div>

                  {/* Peak */}
                  <div className="col-span-1 text-right hidden sm:block">
                    <span className="font-mono text-[10px]" style={{ color: "var(--smoke)" }}>{e.peak_elo}</span>
                  </div>

                  {/* Matches */}
                  <div className="col-span-1 text-right hidden md:block">
                    <span className="font-mono text-[10px]" style={{ color: "var(--ash)" }}>{e.matches_played}</span>
                  </div>

                  {/* Win rate */}
                  <div className="col-span-1 text-right hidden md:block">
                    <span className="font-mono text-[10px]"
                      style={{ color: e.win_rate >= 60 ? "var(--win)" : e.win_rate >= 40 ? "var(--ash)" : "var(--loss)" }}>
                      {e.win_rate}%
                    </span>
                  </div>

                  {/* Streak */}
                  <div className="col-span-1 text-right hidden lg:block">
                    <span className="font-mono text-[10px]" style={{ color: "#f5c451" }}>{e.best_streak}</span>
                  </div>
                </motion.div>
              );
            })
          )}
        </motion.div>

        {/* ── Footer CTA ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="mt-5 flex items-center gap-2 px-4 py-3 rounded"
          style={{ background: "var(--ink-2)", border: "1px solid var(--ink-4)" }}>
          <Crest size={14} color="var(--violet-400)" />
          <span className="font-cond text-[10px] flex-1" style={{ color: "var(--smoke)", letterSpacing: "0.16em" }}>
            PLAY MORE MATCHES TO CLIMB THE RANKS
          </span>
          <Link href="/battle"
            className="flex items-center gap-1.5 font-cond text-[10px] transition-all hover:gap-2.5"
            style={{ color: "var(--violet-300)", letterSpacing: "0.15em" }}>
            FIND A MATCH <ArrowRight className="w-3 h-3" />
          </Link>
        </motion.div>

      </div>
    </div>
  );
}
