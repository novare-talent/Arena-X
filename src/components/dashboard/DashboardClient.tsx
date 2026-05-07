"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Swords, Trophy, TrendingUp, BookOpen,
  Flame, ArrowRight, Star, Users, LayoutGrid, Timer,
} from "lucide-react";
import type { Database } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Rating = Database["public"]["Tables"]["user_ratings"]["Row"];

const TIER_CONFIG = {
  unrated:  { label: "Unrated",  color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
  bronze:   { label: "Bronze",   color: "#cd7f32", bg: "rgba(205,127,50,0.1)"  },
  silver:   { label: "Silver",   color: "#c0c0c0", bg: "rgba(192,192,192,0.1)" },
  gold:     { label: "Gold",     color: "#ffd700", bg: "rgba(255,215,0,0.1)"   },
  platinum: { label: "Platinum", color: "#00d4ff", bg: "rgba(0,212,255,0.1)"   },
  diamond:  { label: "Diamond",  color: "#b9f2ff", bg: "rgba(185,242,255,0.1)" },
};

const QUICK_ACTIONS = [
  {
    href: "/battle",
    icon: Swords,
    label: "Battle Hub",
    desc: "DSA 1v1, Prompt Battle & more",
    color: "#6366f1",
    bg: "rgba(99,102,241,0.12)",
    border: "rgba(99,102,241,0.25)",
    primary: true,
  },
  {
    href: "/arena/solo",
    icon: Timer,
    label: "Solo Mode",
    desc: "Solve against the clock",
    color: "#22d3ee",
    bg: "rgba(34,211,238,0.08)",
    border: "rgba(34,211,238,0.2)",
    primary: false,
  },
  {
    href: "/learn",
    icon: BookOpen,
    label: "Learn",
    desc: "DSA & AI Prompting tracks",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.08)",
    border: "rgba(34,197,94,0.2)",
    primary: false,
  },
  {
    href: "/friends",
    icon: Users,
    label: "Challenge a Friend",
    desc: "1v1 ranked or casual",
    color: "#a855f7",
    bg: "rgba(168,85,247,0.08)",
    border: "rgba(168,85,247,0.2)",
    primary: false,
  },
  {
    href: "/hackathons",
    icon: Trophy,
    label: "Hackathons",
    desc: "Build, ship & win prizes",
    color: "#ffd700",
    bg: "rgba(255,215,0,0.08)",
    border: "rgba(255,215,0,0.2)",
    primary: false,
  },
  {
    href: "/daily",
    icon: Flame,
    label: "Daily Challenge",
    desc: "Keep your streak alive",
    color: "#f97316",
    bg: "rgba(249,115,22,0.08)",
    border: "rgba(249,115,22,0.2)",
    primary: false,
  },
  {
    href: "/rooms",
    icon: LayoutGrid,
    label: "Custom Room",
    desc: "Create or join a room",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.2)",
    primary: false,
  },
  {
    href: "/leaderboard",
    icon: Trophy,
    label: "Leaderboard",
    desc: "See global rankings",
    color: "#ffd700",
    bg: "rgba(255,215,0,0.08)",
    border: "rgba(255,215,0,0.2)",
    primary: false,
  },
];

function container(delay = 0) {
  return {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, delay } },
  };
}

export default function DashboardClient({
  profile,
  rating,
}: {
  profile: Profile;
  rating: Rating | null;
}) {
  const tier = rating?.tier ?? "unrated";
  const elo = rating?.elo ?? 800;
  const tierCfg = TIER_CONFIG[tier];
  const winRate = rating && rating.matches_played > 0
    ? Math.round((rating.wins / rating.matches_played) * 100)
    : 0;

  return (
    <div className="min-h-screen grid-bg relative">
      <div className="orb orb-purple w-96 h-96 top-0 right-0 opacity-20 pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div variants={container(0)} initial="hidden" animate="show" className="mb-8">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Welcome back, <span className="text-[#818cf8]">{profile.display_name}</span> 👋
              </h1>
              <p className="text-[#5a5a7a] text-sm mt-1">Ready to climb the ranks?</p>
            </div>

            {/* Tier badge */}
            <div
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl border"
              style={{ background: tierCfg.bg, borderColor: tierCfg.color + "40" }}
            >
              <Star className="w-5 h-5" style={{ color: tierCfg.color }} />
              <div>
                <p className="text-xs text-[#5a5a7a]">Current Tier</p>
                <p className="text-sm font-bold" style={{ color: tierCfg.color }}>
                  {tierCfg.label}
                </p>
              </div>
              <div className="border-l border-[#2a2a3a] pl-3">
                <p className="text-xs text-[#5a5a7a]">ELO</p>
                <p className="text-sm font-bold text-white">{elo}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div
          variants={container(0.1)}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8"
        >
          {[
            { label: "Matches", value: rating?.matches_played ?? 0, icon: Swords, color: "#6366f1" },
            { label: "Wins", value: rating?.wins ?? 0, icon: Trophy, color: "#22c55e" },
            { label: "Win Rate", value: `${winRate}%`, icon: TrendingUp, color: "#22d3ee" },
            { label: "Best Streak", value: rating?.best_streak ?? 0, icon: Flame, color: "#f59e0b" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-[#111118] border border-[#2a2a3a] rounded-xl p-4 hover:border-[#6366f1]/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#5a5a7a] font-medium">{stat.label}</span>
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </motion.div>

        {/* Quick actions */}
        <motion.div variants={container(0.15)} initial="hidden" animate="show" className="mb-8">
          <h2 className="text-sm font-semibold text-[#5a5a7a] uppercase tracking-widest mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {QUICK_ACTIONS.map(({ href, icon: Icon, label, desc, color, bg, border, primary }) => (
              <Link
                key={href}
                href={href}
                className="group relative flex flex-col gap-3 p-4 rounded-xl border transition-all hover:scale-[1.02]"
                style={{
                  background: primary ? `linear-gradient(135deg, ${bg}, rgba(0,0,0,0))` : bg,
                  borderColor: border,
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${color}18`, border: `1px solid ${color}30` }}
                >
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white group-hover:text-[#818cf8] transition-colors">
                    {label}
                  </p>
                  <p className="text-xs text-[#5a5a7a] mt-0.5">{desc}</p>
                </div>
                <ArrowRight
                  className="absolute top-4 right-4 w-4 h-4 text-[#5a5a7a] group-hover:text-white group-hover:translate-x-0.5 transition-all"
                />
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Skill assessment hidden for now */}
      </div>
    </div>
  );
}