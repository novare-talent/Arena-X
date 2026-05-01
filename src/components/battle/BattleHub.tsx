"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Swords, Brain, LayoutGrid, Trophy, ArrowRight, Zap, Lock } from "lucide-react";

const BATTLE_MODES = [
  {
    href: "/arena",
    icon: Swords,
    label: "DSA 1v1",
    desc: "Real-time coding battle against a live opponent. Solve faster to win ELO.",
    color: "#6366f1",
    gradient: "from-[#6366f1]/20 to-[#4f46e5]/5",
    border: "border-[#6366f1]/30",
    badge: "Live PvP",
    badgeColor: "bg-[#6366f1]/20 text-[#818cf8]",
    available: true,
  },
  {
    href: "/battle/prompt",
    icon: Brain,
    label: "Prompt Battle",
    desc: "Write prompts against a curated task bank. Get scored on 5 criteria by an AI judge.",
    color: "#f59e0b",
    gradient: "from-[#f59e0b]/20 to-[#d97706]/5",
    border: "border-[#f59e0b]/30",
    badge: "New",
    badgeColor: "bg-[#f59e0b]/20 text-[#fbbf24]",
    available: true,
  },
  {
    href: "/rooms",
    icon: LayoutGrid,
    label: "Custom Room",
    desc: "Create a private room and invite friends. Set your own problem and time limit.",
    color: "#22c55e",
    gradient: "from-[#22c55e]/20 to-[#16a34a]/5",
    border: "border-[#22c55e]/30",
    badge: "Multiplayer",
    badgeColor: "bg-[#22c55e]/20 text-[#4ade80]",
    available: true,
  },
  {
    href: "/contests",
    icon: Trophy,
    label: "Contests",
    desc: "Scheduled competitive rounds with full leaderboards. Coming soon with prize pools.",
    color: "#e879f9",
    gradient: "from-[#e879f9]/20 to-[#a855f7]/5",
    border: "border-[#e879f9]/30",
    badge: "Coming Soon",
    badgeColor: "bg-[#e879f9]/20 text-[#e879f9]",
    available: false,
  },
];

type Props = {
  profile: { display_name: string | null; avatar_url: string | null } | null;
  rating: { elo: number; tier: string; wins: number; losses: number } | null;
};

export default function BattleHub({ profile, rating }: Props) {
  const displayName = profile?.display_name ?? "Challenger";
  const elo = rating?.elo ?? 1000;
  const wins = rating?.wins ?? 0;
  const losses = rating?.losses ?? 0;

  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-20 pb-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center gap-2 mb-2">
            <Swords className="w-5 h-5 text-[#6366f1]" />
            <span className="text-sm text-[#5a5a7a] font-medium uppercase tracking-wider">Battle Hub</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">Choose your arena</h1>
          <p className="text-[#5a5a7a]">
            {displayName} · DSA ELO {elo} · {wins}W {losses}L
          </p>
        </motion.div>

        {/* Mode cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {BATTLE_MODES.map((mode, i) => {
            const Icon = mode.icon;
            const card = (
              <motion.div
                key={mode.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`relative group rounded-2xl border ${mode.border} bg-gradient-to-br ${mode.gradient} p-6 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${!mode.available ? "opacity-60 pointer-events-none" : ""}`}
              >
                {/* Badge */}
                <span className={`absolute top-4 right-4 text-[11px] font-semibold px-2 py-0.5 rounded-full ${mode.badgeColor}`}>
                  {mode.badge}
                </span>

                {/* Lock overlay */}
                {!mode.available && (
                  <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-black/30">
                    <Lock className="w-6 h-6 text-[#5a5a7a]" />
                  </div>
                )}

                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${mode.color}22` }}
                >
                  <Icon className="w-6 h-6" style={{ color: mode.color }} />
                </div>

                <h3 className="text-lg font-bold text-white mb-1">{mode.label}</h3>
                <p className="text-sm text-[#6b6b8a] leading-relaxed mb-4">{mode.desc}</p>

                {mode.available && (
                  <div
                    className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors group-hover:gap-2.5"
                    style={{ color: mode.color }}
                  >
                    Enter <ArrowRight className="w-4 h-4 transition-all" />
                  </div>
                )}
              </motion.div>
            );

            return mode.available ? (
              <Link key={mode.label} href={mode.href}>{card}</Link>
            ) : (
              <div key={mode.label}>{card}</div>
            );
          })}
        </div>

        {/* Quick tip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 flex items-center gap-2 px-4 py-3 rounded-xl bg-[#111118] border border-[#2a2a3a] text-sm text-[#5a5a7a]"
        >
          <Zap className="w-4 h-4 text-[#6366f1] shrink-0" />
          DSA 1v1 and Prompt Battle both award ELO. Custom Rooms are unranked.
        </motion.div>
      </div>
    </div>
  );
}
