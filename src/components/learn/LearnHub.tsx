"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Code2, Brain, ArrowRight, Lock, Star, BookOpen } from "lucide-react";

const TRACKS = [
  {
    href: "/learn/dsa",
    icon: Code2,
    label: "DSA Track",
    tagline: "Data Structures & Algorithms",
    desc: "Follow curated YouTube playlists from Striver, NeetCode, and Aditya Verma. Track your progress lesson by lesson.",
    color: "#6366f1",
    gradient: "from-[#6366f1]/20 to-[#4f46e5]/5",
    border: "border-[#6366f1]/30",
    features: ["3 curated playlists", "Progress tracking", "Practice after each lesson"],
    free: true,
  },
  {
    href: "/learn/prompt",
    icon: Brain,
    label: "AI Prompting Track",
    tagline: "Prompt Engineering",
    desc: "Learn the craft of prompt engineering through structured modules. Module 1 is free. Pro unlocks all 4 modules + AI judge feedback.",
    color: "#f59e0b",
    gradient: "from-[#f59e0b]/20 to-[#d97706]/5",
    border: "border-[#f59e0b]/30",
    features: ["4 skill modules", "AI judge scoring", "Pro revision mode"],
    free: false,
  },
];

export default function LearnHub({ isPro }: { isPro: boolean }) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-20 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-5 h-5 text-[#22d3ee]" />
            <span className="text-sm text-[#5a5a7a] font-medium uppercase tracking-wider">Learn</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">Upskill at your pace</h1>
          <p className="text-[#5a5a7a]">Two structured tracks to go from zero to interview-ready.</p>
        </motion.div>

        {/* Track cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {TRACKS.map((track, i) => {
            const Icon = track.icon;
            const proLocked = !track.free && !isPro;

            return (
              <motion.div
                key={track.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Link href={track.href} className="block group">
                  <div
                    className={`relative rounded-2xl border ${track.border} bg-gradient-to-br ${track.gradient} p-6 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg`}
                  >
                    {/* Pro badge */}
                    {!track.free && (
                      <span className="absolute top-4 right-4 flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#f59e0b]/20 text-[#fbbf24]">
                        <Star className="w-3 h-3" />
                        PRO
                      </span>
                    )}

                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                      style={{ background: `${track.color}22` }}
                    >
                      <Icon className="w-6 h-6" style={{ color: track.color }} />
                    </div>

                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: track.color }}>
                      {track.tagline}
                    </p>
                    <h3 className="text-xl font-bold text-white mb-2">{track.label}</h3>
                    <p className="text-sm text-[#6b6b8a] leading-relaxed mb-4">{track.desc}</p>

                    <ul className="space-y-1.5 mb-5">
                      {track.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm text-[#8888aa]">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: track.color }}
                          />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <div
                      className="inline-flex items-center gap-1.5 text-sm font-semibold group-hover:gap-2.5 transition-all"
                      style={{ color: track.color }}
                    >
                      {proLocked ? (
                        <>
                          <Lock className="w-4 h-4" /> Upgrade to Pro
                        </>
                      ) : (
                        <>
                          Start learning <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Pro upsell */}
        {!isPro && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 rounded-xl border border-[#f59e0b]/20 bg-[#f59e0b]/5 p-4 flex items-center justify-between gap-4"
          >
            <div>
              <p className="text-sm font-semibold text-[#fbbf24]">Unlock Pro</p>
              <p className="text-xs text-[#6b6b8a] mt-0.5">Get all 4 prompting modules, AI judge feedback, and revision mode.</p>
            </div>
            <Link
              href="/profile"
              className="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold text-[#0a0a0f] bg-[#f59e0b] hover:bg-[#d97706] transition-colors"
            >
              Upgrade
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
