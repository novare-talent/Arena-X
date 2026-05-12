"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Code2, Brain, ArrowRight, Lock, Star } from "lucide-react";
import { Crest } from "@/components/ui-samurai/primitives";

const TRACKS = [
  {
    href: "/learn/dsa",
    icon: Code2,
    jp: "型",
    label: "DSA Track",
    tagline: "Data Structures & Algorithms",
    desc: "Follow curated YouTube playlists from Striver, NeetCode, and Aditya Verma. Track your progress lesson by lesson.",
    color: "#a78bfa",
    features: ["3 curated playlists", "Progress tracking", "Practice after each lesson"],
    free: true,
  },
  {
    href: "/learn/prompt",
    icon: Brain,
    jp: "言",
    label: "AI Prompting Track",
    tagline: "Prompt Engineering",
    desc: "Learn the craft of prompt engineering through structured modules. Module 1 is free. Pro unlocks all 4 modules + AI judge feedback.",
    color: "#f59e0b",
    features: ["4 skill modules", "AI judge scoring", "Pro revision mode"],
    free: false,
  },
];

export default function LearnHub({ isPro }: { isPro: boolean }) {
  return (
    <div className="min-h-screen" style={{ background: "var(--ink-1)", position: "relative", overflow: "hidden" }}>
      <div className="ax-aura pointer-events-none"
        style={{ width: 600, height: 350, background: "var(--violet-700)", top: 56, right: -80, opacity: 0.13 }} />

      <div className="max-w-4xl mx-auto px-4 pt-20 pb-12">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="relative mb-8 overflow-hidden rounded-xl px-5 py-4"
          style={{ background: "var(--ink-2)", border: "1px solid var(--ink-4)" }}>
          <div className="ax-dotgrid" style={{ position: "absolute", inset: 0, opacity: 0.25 }} />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-cond text-[10px]" style={{ color: "var(--violet-300)", letterSpacing: "0.3em" }}>
                STUDY HALL · 学
              </span>
              <Crest size={13} color="var(--violet-400)" />
            </div>
            <h1 className="font-display" style={{ fontSize: 44, color: "var(--bone)", lineHeight: 0.9 }}>
              UPSKILL YOUR <span style={{ background: "linear-gradient(180deg, var(--violet-200), var(--violet-500))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>BLADE</span>.
            </h1>
            <p className="font-cond text-[10px] mt-2" style={{ color: "var(--smoke)", letterSpacing: "0.18em" }}>
              TWO STRUCTURED TRACKS · ZERO TO INTERVIEW-READY
            </p>
          </div>
        </motion.div>

        {/* Track cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
                  <div className="ax-card ax-ticks relative overflow-hidden transition-all duration-200 hover:scale-[1.02] p-6"
                    style={{ borderColor: `${track.color}25` }}>
                    {/* Kanji watermark */}
                    <div className="font-jp pointer-events-none select-none" style={{
                      position: "absolute", top: -20, right: -10, fontSize: 160, lineHeight: 1,
                      color: track.color, opacity: 0.07, fontWeight: 700,
                    }}>{track.jp}</div>

                    {/* Pro badge */}
                    {!track.free && (
                      <span className="absolute top-4 right-4 flex items-center gap-1 font-cond text-[9px] px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.3)", letterSpacing: "0.15em" }}>
                        <Star className="w-3 h-3" /> PRO
                      </span>
                    )}

                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 relative"
                      style={{ background: `${track.color}15`, border: `1px solid ${track.color}25` }}>
                      <Icon className="w-6 h-6" style={{ color: track.color }} />
                    </div>

                    <p className="font-cond text-[9px] mb-1" style={{ color: track.color, letterSpacing: "0.25em" }}>
                      {track.tagline.toUpperCase()}
                    </p>
                    <h3 className="font-display text-xl mb-2" style={{ color: "var(--bone)" }}>{track.label.toUpperCase()}</h3>
                    <p className="text-sm mb-4" style={{ color: "var(--ash)", lineHeight: 1.6 }}>{track.desc}</p>

                    <ul className="space-y-1.5 mb-5">
                      {track.features.map((f) => (
                        <li key={f} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: track.color }} />
                          <span className="font-cond text-[9px]" style={{ color: "var(--smoke)", letterSpacing: "0.1em" }}>{f.toUpperCase()}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="flex items-center gap-1.5 font-cond text-[10px] transition-all group-hover:gap-2.5"
                      style={{ color: track.color, letterSpacing: "0.15em" }}>
                      {proLocked ? (
                        <><Lock className="w-3.5 h-3.5" /> UPGRADE TO PRO</>
                      ) : (
                        <>START LEARNING <ArrowRight className="w-3.5 h-3.5" /></>
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="mt-6 flex items-center justify-between gap-4 px-4 py-3 rounded"
            style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <div>
              <p className="font-cond text-[10px]" style={{ color: "#fbbf24", letterSpacing: "0.2em" }}>UNLOCK PRO</p>
              <p className="font-cond text-[9px] mt-0.5" style={{ color: "var(--smoke)", letterSpacing: "0.1em" }}>
                GET ALL 4 PROMPTING MODULES, AI JUDGE FEEDBACK, AND REVISION MODE
              </p>
            </div>
            <Link href="/profile"
              className="shrink-0 px-4 py-2 rounded-xl font-cond text-[10px] transition-colors"
              style={{ background: "#f59e0b", color: "#0a0a0f", letterSpacing: "0.15em" }}>
              UPGRADE
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
