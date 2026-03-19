"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Trophy, Swords, Flame, Crown, Medal, Search } from "lucide-react";

const TIER_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  unrated:  { color: "#5a5a7a", bg: "rgba(90,90,122,0.12)",   label: "Unrated"  },
  bronze:   { color: "#cd7f32", bg: "rgba(205,127,50,0.12)",  label: "Bronze"   },
  silver:   { color: "#c0c0c0", bg: "rgba(192,192,192,0.12)", label: "Silver"   },
  gold:     { color: "#ffd700", bg: "rgba(255,215,0,0.12)",   label: "Gold"     },
  platinum: { color: "#22d3ee", bg: "rgba(34,211,238,0.12)",  label: "Platinum" },
  diamond:  { color: "#a855f7", bg: "rgba(168,85,247,0.12)",  label: "Diamond"  },
};

// Always derive tier from ELO — stored tier can be stale if ELO was manually changed
function tierFromElo(elo: number): string {
  if (elo >= 1700) return "diamond";
  if (elo >= 1500) return "platinum";
  if (elo >= 1300) return "gold";
  if (elo >= 1100) return "silver";
  if (elo >= 900)  return "bronze";
  return "unrated";
}

const RANK_COLORS = ["#ffd700", "#c0c0c0", "#cd7f32"];

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

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown  className="w-4 h-4" style={{ color: RANK_COLORS[0] }} />;
  if (rank === 2) return <Medal  className="w-4 h-4" style={{ color: RANK_COLORS[1] }} />;
  if (rank === 3) return <Medal  className="w-4 h-4" style={{ color: RANK_COLORS[2] }} />;
  return <span className="text-xs font-bold text-[#5a5a7a] w-4 text-center">{rank}</span>;
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

  return (
    <div className="min-h-screen grid-bg px-4 py-10">
      <div className="orb orb-purple w-96 h-96 top-0 right-0 opacity-10" />
      <div className="orb orb-cyan w-72 h-72 bottom-0 left-0 opacity-8" />

      <div className="max-w-4xl mx-auto relative z-10">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">Leaderboard</h1>
          <p className="text-[#5a5a7a]">Top DSA players ranked by ELO rating</p>
        </motion.div>

        {/* Podium — top 3 */}
        {top3.length >= 1 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-3 mb-8"
          >
            {[top3[1], top3[0], top3[2]].map((e, podiumIdx) => {
              if (!e) return <div key={podiumIdx} />;
              const podiumRank = podiumIdx === 1 ? 1 : podiumIdx === 0 ? 2 : 3;
              const heights    = ["h-24", "h-32", "h-20"];
              const cfg        = TIER_CONFIG[tierFromElo(e.elo)] ?? TIER_CONFIG.unrated;
              const isMe       = e.id === currentUserId;
              return (
                <div key={e.id} className={`flex flex-col items-center ${podiumIdx === 1 ? "order-2" : podiumIdx === 0 ? "order-1" : "order-3"}`}>
                  {/* Avatar */}
                  <div className="relative mb-2">
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-lg ${podiumIdx === 1 ? "ring-2" : ""}`}
                      style={{
                        background: `linear-gradient(135deg, ${cfg.color}60, ${cfg.color}30)`,
                        border: `2px solid ${cfg.color}50`,
                      }}
                    >
                      {e.display_name[0]?.toUpperCase()}
                    </div>
                    {podiumIdx === 1 && (
                      <Crown className="w-5 h-5 absolute -top-2 left-1/2 -translate-x-1/2" style={{ color: RANK_COLORS[0] }} />
                    )}
                  </div>
                  <div className="text-center mb-2">
                    <div className="text-sm font-semibold text-white truncate max-w-[100px]">
                      {e.display_name}{isMe && " (you)"}
                    </div>
                    <div className="text-xs font-bold" style={{ color: cfg.color }}>{e.elo} ELO</div>
                  </div>
                  {/* Podium bar */}
                  <div
                    className={`w-full ${heights[podiumIdx]} rounded-t-xl flex items-center justify-center`}
                    style={{ background: `${RANK_COLORS[podiumRank - 1]}18`, border: `1px solid ${RANK_COLORS[podiumRank - 1]}30` }}
                  >
                    <span className="text-2xl font-black" style={{ color: RANK_COLORS[podiumRank - 1] }}>
                      #{podiumRank}
                    </span>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* My rank card (if outside top 100) */}
        {myEntry && !entries.find((e) => e.id === currentUserId) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-4 p-4 rounded-2xl border-2 border-[#6366f1]/40 bg-[#6366f1]/10"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-[#5a5a7a]">Your rank</span>
                <span className="text-xl font-black text-[#818cf8]">#{myEntry.rank}</span>
                <span className="text-sm text-white font-medium">{myEntry.display_name}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-white">{myEntry.elo} ELO</div>
                <div className="text-xs text-[#5a5a7a]">{myEntry.matches_played} matches</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative mb-4"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a7a]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or college…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#111118] border border-[#2a2a3a] text-white placeholder-[#5a5a7a] text-sm focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-all"
          />
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-[#111118] border border-[#2a2a3a] rounded-2xl overflow-hidden"
        >
          {/* Table header — cols must sum to 12 */}
          <div className="grid grid-cols-12 px-5 py-3 border-b border-[#1a1a2a] text-xs font-medium text-[#5a5a7a] uppercase tracking-wider">
            <div className="col-span-1">#</div>
            <div className="col-span-5">Player</div>
            <div className="col-span-2 text-right">ELO</div>
            <div className="col-span-1 text-right hidden sm:block">Peak</div>
            <div className="col-span-1 text-right hidden md:flex items-center justify-end gap-1">
              <Swords className="w-3 h-3" /> M
            </div>
            <div className="col-span-1 text-right hidden md:flex items-center justify-end gap-1">
              <Trophy className="w-3 h-3" /> W%
            </div>
            <div className="col-span-1 text-right hidden lg:flex items-center justify-end gap-1">
              <Flame className="w-3 h-3" /> Str
            </div>
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-[#5a5a7a] text-sm">No players found</div>
          ) : (
            filtered.map((e, i) => {
              const cfg  = TIER_CONFIG[tierFromElo(e.elo)] ?? TIER_CONFIG.unrated;
              const isMe = e.id === currentUserId;
              return (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.4) }}
                  className={`grid grid-cols-12 items-center px-5 py-4 border-b border-[#1a1a2a] last:border-0 transition-colors hover:bg-[#1a1a24] ${isMe ? "bg-[#6366f1]/8" : ""}`}
                >
                  {/* Rank */}
                  <div className="col-span-1 flex items-center">
                    <RankIcon rank={e.rank} />
                  </div>

                  {/* Player — name + tier pill on line 1, @username on line 2 */}
                  <div className="col-span-5 flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-sm font-bold text-white"
                      style={{ background: `linear-gradient(135deg, ${cfg.color}50, ${cfg.color}20)`, border: `1px solid ${cfg.color}40` }}
                    >
                      {e.display_name[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-semibold ${isMe ? "text-[#818cf8]" : "text-white"}`}>
                          {e.display_name}
                        </span>
                        {isMe && <span className="text-xs text-[#6366f1] font-medium">(you)</span>}
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium capitalize shrink-0"
                          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}
                        >
                          {cfg.label}
                        </span>
                      </div>
                      <div className="text-xs text-[#5a5a7a] truncate mt-0.5">
                        @{e.username}{e.college ? ` · ${e.college}` : ""}
                      </div>
                    </div>
                  </div>

                  {/* ELO */}
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-bold text-white">{e.elo}</span>
                  </div>

                  {/* Peak ELO */}
                  <div className="col-span-1 text-right hidden sm:block">
                    <span className="text-xs text-[#5a5a7a]">{e.peak_elo}</span>
                  </div>

                  {/* Matches */}
                  <div className="col-span-1 text-right hidden md:block">
                    <span className="text-xs text-[#a1a1b5]">{e.matches_played}</span>
                  </div>

                  {/* Win rate */}
                  <div className="col-span-1 text-right hidden md:block">
                    <span className={`text-xs font-medium ${e.win_rate >= 60 ? "text-[#22c55e]" : e.win_rate >= 40 ? "text-[#a1a1b5]" : "text-red-400"}`}>
                      {e.win_rate}%
                    </span>
                  </div>

                  {/* Best streak */}
                  <div className="col-span-1 text-right hidden lg:block">
                    <span className="text-xs text-[#f97316]">{e.best_streak}</span>
                  </div>
                </motion.div>
              );
            })
          )}
        </motion.div>

        {/* Footer CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <p className="text-[#5a5a7a] text-sm mb-4">
            Play more matches to climb the ranks
          </p>
          <Link
            href="/arena"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-white btn-glow"
            style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
          >
            <Swords className="w-4 h-4" />
            Find a Match
          </Link>
        </motion.div>
      </div>
    </div>
  );
}