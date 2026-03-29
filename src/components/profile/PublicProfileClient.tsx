"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Trophy, Swords, Minus, TrendingUp, Calendar, ArrowLeft } from "lucide-react";

const TIER_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  unrated:  { label: "Unrated",  color: "#6b7280", icon: "◌" },
  bronze:   { label: "Bronze",   color: "#cd7f32", icon: "⬡" },
  silver:   { label: "Silver",   color: "#c0c0c0", icon: "⬡" },
  gold:     { label: "Gold",     color: "#ffd700", icon: "★" },
  platinum: { label: "Platinum", color: "#00d4ff", icon: "◆" },
  diamond:  { label: "Diamond",  color: "#b9f2ff", icon: "◈" },
};

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
  const tierCfg      = TIER_CONFIG[tier] ?? TIER_CONFIG.unrated;
  const totalMatches = ratings.reduce((s, r) => s + r.matches_played, 0);
  const totalWins    = ratings.reduce((s, r) => s + r.wins, 0);
  const totalLosses  = ratings.reduce((s, r) => s + r.losses, 0);
  const winRate      = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;
  const joinYear     = new Date(profile.created_at).getFullYear();

  return (
    <div className="min-h-screen bg-[#08080f] pt-20 pb-12 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Back */}
        <Link href="/leaderboard" className="inline-flex items-center gap-1.5 text-sm text-[#5a5a7a] hover:text-white transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        {/* Header card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0d0d15] border border-[#1e1e2e] rounded-2xl p-6 mb-4"
        >
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0"
              style={{ background: `${tierCfg.color}20`, border: `2px solid ${tierCfg.color}40`, color: tierCfg.color }}
            >
              {profile.display_name?.[0]?.toUpperCase() ?? "?"}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-white">{profile.display_name}</h1>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${tierCfg.color}15`, color: tierCfg.color }}
                >
                  {tierCfg.icon} {tierCfg.label}
                </span>
              </div>
              <p className="text-sm text-[#5a5a7a] mt-0.5">@{profile.username}</p>
              {profile.bio && <p className="text-sm text-[#a1a1b5] mt-2">{profile.bio}</p>}
              <div className="flex items-center gap-3 mt-2 text-xs text-[#5a5a7a] flex-wrap">
                {profile.college && <span>{profile.college}</span>}
                {profile.country && <span>{profile.country}</span>}
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Joined {joinYear}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Match stats */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-4 gap-3 mb-4"
        >
          {[
            { label: "Matches", value: totalMatches, color: "#818cf8" },
            { label: "Wins",    value: totalWins,    color: "#22c55e" },
            { label: "Losses",  value: totalLosses,  color: "#ef4444" },
            { label: "Win Rate", value: `${winRate}%`, color: "#f59e0b" },
          ].map(s => (
            <div key={s.label} className="bg-[#0d0d15] border border-[#1e1e2e] rounded-xl p-4 text-center">
              <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-[#5a5a7a] mt-0.5">{s.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Track ratings */}
        {ratings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#0d0d15] border border-[#1e1e2e] rounded-2xl p-5 mb-4"
          >
            <h2 className="text-xs font-semibold text-[#5a5a7a] uppercase tracking-widest mb-4">Track Ratings</h2>
            <div className="space-y-3">
              {ratings.map(r => {
                const t = TIER_CONFIG[r.tier] ?? TIER_CONFIG.unrated;
                return (
                  <div key={r.track} className="flex items-center gap-3">
                    <div className="w-8 text-center text-sm font-bold" style={{ color: t.color }}>{t.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[#a1a1b5]">{TRACK_LABELS[r.track] ?? r.track}</span>
                        <span className="text-xs font-bold text-white">{r.elo} ELO</span>
                      </div>
                      <div className="h-1.5 bg-[#1a1a2a] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, ((r.elo - 600) / (2400 - 600)) * 100)}%`,
                            background: `linear-gradient(90deg, ${t.color}80, ${t.color})`,
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-[#5a5a7a] mt-0.5">{r.wins}W · {r.losses}L · {r.draws}D</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Recent matches */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-[#0d0d15] border border-[#1e1e2e] rounded-2xl p-5"
        >
          <h2 className="text-xs font-semibold text-[#5a5a7a] uppercase tracking-widest mb-4">Recent Matches</h2>
          {recentMatches.length === 0 ? (
            <p className="text-sm text-[#3a3a5a] text-center py-6">No matches yet</p>
          ) : (
            <div className="space-y-2">
              {recentMatches.map(m => {
                const delta = m.eloDelta;
                const ResultIcon = m.result === "win" ? Trophy : m.result === "loss" ? Swords : Minus;
                const resultColor = m.result === "win" ? "#22c55e" : m.result === "loss" ? "#ef4444" : "#f59e0b";
                const date = m.endedAt ? new Date(m.endedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "";
                return (
                  <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#111118] border border-[#1e1e2e]">
                    <ResultIcon className="w-4 h-4 shrink-0" style={{ color: resultColor }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">
                        {m.problemTitle ?? "—"}
                      </p>
                      <p className="text-[11px] text-[#5a5a7a]">
                        vs {m.opponentUsername
                          ? <Link href={`/profile/${m.opponentUsername}`} className="hover:text-white transition-colors">@{m.opponentUsername}</Link>
                          : m.opponentName
                        } · {date}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {delta !== null ? (
                        <span className="text-xs font-bold" style={{ color: delta >= 0 ? "#22c55e" : "#ef4444" }}>
                          {delta > 0 ? `+${delta}` : delta}
                        </span>
                      ) : (
                        <span className="text-xs text-[#3a3a5a]">—</span>
                      )}
                      <div className="flex items-center gap-0.5 justify-end mt-0.5">
                        <TrendingUp className="w-2.5 h-2.5 text-[#3a3a5a]" />
                        <span className="text-[10px] text-[#3a3a5a] uppercase">{TRACK_LABELS[m.track] ?? m.track}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}