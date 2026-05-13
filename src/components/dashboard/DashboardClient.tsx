"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Swords, Trophy, Flame, LayoutGrid, TrendingUp, ArrowRight, Share2,
} from "lucide-react";
import type { Database } from "@/types/database";
import { Kabuto, Crest, dbTierToKabuto, TIER_LABELS } from "@/components/ui-samurai/primitives";
import WelcomeCarousel from "@/components/welcome/WelcomeCarousel";
import ShareSheet from "@/components/share/ShareSheet";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Rating  = Database["public"]["Tables"]["user_ratings"]["Row"];

const QUICK_ACTIONS = [
  {
    href: "/battle",
    jp: "刀",
    sub: "DSA · 1V1 · LIVE",
    label: "IAIDŌ DUEL",
    desc: "Two coders. One algorithm. First clean blade wins.",
    accent: "#8b5cf6",
    chip: { text: "LIVE PVP", pulse: true },
    primary: true,
  },
  {
    href: "/battle/prompt",
    jp: "言",
    sub: "PROMPT",
    label: "KOTODAMA",
    desc: "Wield words. GPT judges your sharpness.",
    accent: "#f5c451",
    chip: { text: "NEW", pulse: false },
    primary: false,
  },
  {
    href: "/daily",
    jp: "型",
    sub: "DAILY",
    label: "TODAY'S KATA",
    accent: "#34d399",
    chip: { text: "+25 XP", pulse: false },
    primary: false,
  },
  {
    href: "/arena/solo",
    jp: "独",
    sub: "SOLO",
    label: "SOLO TRAIN",
    accent: "#a78bfa",
    primary: false,
  },
  {
    href: "/friends",
    jp: "友",
    sub: "FRIENDS",
    label: "CHALLENGE",
    accent: "#a855f7",
    chip: { text: "FRIENDS", pulse: false },
    primary: false,
  },
  {
    href: "/hackathons",
    jp: "戦",
    sub: "TOURNAMENT",
    label: "SHŌGUN WARS",
    accent: "#c026d3",
    chip: { text: "OPEN", pulse: false },
    primary: false,
  },
  {
    href: "/rooms",
    jp: "鍵",
    sub: "ROOM",
    label: "PRIVATE DŌJŌ",
    accent: "#8b5cf6",
    primary: false,
  },
  {
    href: "/leaderboard",
    jp: "位",
    sub: "RANKS",
    label: "LEADERBOARD",
    accent: "#f5c451",
    primary: false,
  },
];

function fade(delay = 0) {
  return { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.38, delay } } };
}

export default function DashboardClient({ profile, rating, totalUsers = 0, totalMatches = 0 }: { profile: Profile; rating: Rating | null; totalUsers?: number; totalMatches?: number }) {
  const tier      = rating?.tier ?? "unrated";
  const elo       = rating?.elo ?? 800;
  const wins      = rating?.wins ?? 0;
  const losses    = rating?.losses ?? 0;
  const streak    = rating?.best_streak ?? 0;
  const matches   = rating?.matches_played ?? 0;
  const winRate   = matches > 0 ? Math.round((wins / matches) * 100) : 0;

  const kabutoTier = dbTierToKabuto(tier);
  const tierInfo   = TIER_LABELS[tier] ?? TIER_LABELS.unrated;

  const [showWelcome, setShowWelcome] = useState(false);
  const [showShare, setShowShare]     = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("arenax_welcome_seen")) {
      setShowWelcome(true);
    }
    const openWelcome = () => setShowWelcome(true);
    window.addEventListener("arenax:welcome", openWelcome);
    return () => window.removeEventListener("arenax:welcome", openWelcome);
  }, []);

  function dismissWelcome() {
    localStorage.setItem("arenax_welcome_seen", Date.now().toString());
    setShowWelcome(false);
  }

  const shareProps = {
    displayName: profile.display_name ?? "WARRIOR",
    username:    profile.username ?? "warrior",
    tier:        kabutoTier,
    tierLabel:   tierInfo.label,
    tierJp:      tierInfo.jp,
    tierColor:   tierInfo.color,
    elo, wins, losses, streak,
    recentForm:  [] as ("W" | "L")[],
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--ink-1)", position: "relative", overflow: "hidden" }}>
      {/* Overlays */}
      {showWelcome && <WelcomeCarousel onDismiss={dismissWelcome} totalUsers={totalUsers} totalMatches={totalMatches} />}
      <ShareSheet open={showShare} onClose={() => setShowShare(false)} {...shareProps} />

      {/* Aura backdrop */}
      <div className="ax-aura pointer-events-none" style={{ width: 600, height: 400, background: "var(--violet-700)", top: 56, right: -100, opacity: 0.18 }} />

      <div className="max-w-6xl mx-auto px-4 pt-10 pb-12">

        {/* ── Hero strip ── */}
        <motion.div variants={fade(0)} initial="hidden" animate="show"
          className="relative rounded-xl overflow-hidden mb-6 p-6"
          style={{ background: "var(--ink-2)", border: "1px solid var(--ink-4)" }}>
          <div className="ax-dotgrid" style={{ position: "absolute", inset: 0, opacity: 0.3 }} />
          <div className="relative flex items-end justify-between gap-4 flex-wrap">
            {/* Greeting */}
            <div>
              {streak > 0 && (
                <div className="mb-2">
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full font-cond text-[10px] inline-flex"
                    style={{ background: "rgba(244,63,94,0.12)", border: "1px solid rgba(244,63,94,0.3)", color: "#fda4af", letterSpacing: "0.15em" }}>
                    <span className="ax-pulse" />ON A {streak}-WIN STREAK
                  </span>
                </div>
              )}
              <h1 className="font-display" style={{ fontSize: 56, color: "var(--bone)", lineHeight: 0.9 }}>
                WELCOME BACK, <span style={{ color: "var(--violet-400)" }}>{(profile.display_name ?? "WARRIOR").toUpperCase()}.</span>
              </h1>
              <p className="text-sm mt-3" style={{ color: "var(--ash)", maxWidth: 420, lineHeight: 1.6 }}>
                Warriors at your rank are queueing right now. Jump in.
              </p>
            </div>

            {/* ELO card */}
            <div className="ax-card-glass ax-ticks flex items-center gap-4 p-4 shrink-0" style={{ minWidth: 240, position: "relative" }}>
              <button onClick={() => setShowShare(true)} title="Share your rank"
                className="flex items-center gap-1 font-cond"
                style={{ position: "absolute", top: 8, right: 8, background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.28)", borderRadius: 6, cursor: "pointer", color: "var(--violet-300)", padding: "4px 8px", fontSize: 9, letterSpacing: "0.15em" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.22)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.12)"; }}>
                <Share2 size={11} /> SHARE
              </button>
              <Kabuto size={72} tier={kabutoTier} glow={true} />
              <div>
                <div className="font-cond text-[9px] mb-1" style={{ color: "var(--violet-300)", letterSpacing: "0.3em" }}>RANK · 位</div>
                <div className="font-display text-2xl" style={{ color: "var(--bone)" }}>{tierInfo.label.toUpperCase()}</div>
                <div className="font-jp text-sm mt-0.5" style={{ color: tierInfo.color }}>{tierInfo.jp}</div>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="font-mono text-xl font-bold" style={{ color: "var(--violet-200)" }}>{elo}</span>
                  <span className="font-cond text-[10px]" style={{ color: "var(--win)", letterSpacing: "0.1em" }}>ELO</span>
                </div>
                {/* Progress bar to next tier */}
                <div className="mt-2" style={{ width: 160, height: 3, background: "var(--ink-3)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, ((elo % 300) / 300) * 100)}%`, height: "100%", background: "linear-gradient(90deg, var(--violet-500), var(--orchid))" }} />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Stats row ── */}
        <motion.div variants={fade(0.08)} initial="hidden" animate="show"
          className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: "ELO · 力",      value: String(elo),       accent: "var(--violet-200)", icon: TrendingUp, wl: false },
            { label: "W / L · 戦績",  value: "",                accent: "var(--bone)",       icon: Swords,     wl: true  },
            { label: "WIN RATE",       value: `${winRate}%`,     accent: "var(--win)",        icon: Trophy,     wl: false },
            { label: "STREAK · 連",   value: `${streak}W`,      accent: "#f5c451",           icon: Flame,      wl: false },
            { label: "DUELS · 試合",  value: String(matches),   accent: "var(--bone)",       icon: LayoutGrid, wl: false },
          ].map((s) => (
            <div key={s.label} className="ax-card p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-dm text-[11px] font-bold" style={{ color: "var(--ash)", letterSpacing: "0.06em" }}>{s.label}</span>
                <s.icon className="w-3 h-3" style={{ color: s.accent, opacity: 0.7 }} />
              </div>
              {s.wl ? (
                <div className="font-display text-3xl mt-1" style={{ lineHeight: 1 }}>
                  <span style={{ color: "var(--win)" }}>{wins}</span>
                  <span style={{ color: "var(--ash)", fontSize: "0.7em", margin: "0 4px" }}>–</span>
                  <span style={{ color: "var(--loss)" }}>{losses}</span>
                </div>
              ) : (
                <div className="font-display text-3xl mt-1" style={{ color: s.accent, lineHeight: 1 }}>{s.value}</div>
              )}
            </div>
          ))}
        </motion.div>

        {/* ── Quick Actions ── */}
        <motion.div variants={fade(0.14)} initial="hidden" animate="show" className="mb-2">
          <div className="flex items-center justify-between mb-4">
            <div className="font-cond text-xs" style={{ color: "var(--ash)", letterSpacing: "0.28em" }}>QUICK ACTIONS · 即</div>
            <Link href="/battle" className="font-cond text-[10px]" style={{ color: "var(--violet-300)", letterSpacing: "0.22em" }}>
              ALL FORMS ⟶
            </Link>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gridAutoRows: "120px", gap: 12 }}>
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="ax-card ax-ticks group relative overflow-hidden transition-all duration-150"
                style={{
                  gridColumn: action.primary ? "span 2" : "span 1",
                  gridRow: action.primary ? "span 2" : "span 1",
                  minHeight: action.primary ? 252 : 120,
                  background: action.primary
                    ? `radial-gradient(120% 80% at 0% 0%, rgba(124,58,237,0.22), rgba(13,10,22,1) 60%), var(--ink-2)`
                    : undefined,
                  borderColor: action.primary ? "rgba(167,139,250,0.35)" : undefined,
                  padding: action.primary ? 24 : 18,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = action.accent + "55"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = action.primary ? "rgba(167,139,250,0.35)" : "var(--ink-4)"; }}
              >
                {/* Kanji watermark */}
                <div className="font-jp pointer-events-none select-none" style={{
                  position: "absolute",
                  top: action.primary ? -20 : -10,
                  right: action.primary ? -20 : -10,
                  fontSize: action.primary ? 220 : 120,
                  lineHeight: 1,
                  color: action.accent,
                  opacity: 0.08,
                  fontWeight: 700,
                }}>{action.jp}</div>

                <div className="relative flex flex-col h-full">
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-dm text-[12px] font-bold" style={{ color: action.accent, letterSpacing: "0.08em" }}>{action.sub}</span>
                    {action.chip && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full font-dm text-[10px] font-medium"
                        style={{
                          background: "rgba(124,58,237,0.12)",
                          border: "1px solid rgba(124,58,237,0.28)",
                          color: "var(--violet-200)",
                          letterSpacing: "0.15em",
                        }}>
                        {action.chip.pulse && <span className="ax-pulse" style={{ width: 5, height: 5 }} />}
                        {action.chip.text}
                      </span>
                    )}
                  </div>

                  <div className="font-display" style={{
                    fontSize: action.primary ? 48 : 28,
                    color: "var(--bone)",
                    lineHeight: 0.95,
                    marginTop: 4,
                  }}>{action.label}</div>

                  {action.desc && action.primary && (
                    <p className="text-xs mt-2" style={{ color: "var(--ash)", lineHeight: 1.5, maxWidth: 280 }}>{action.desc}</p>
                  )}

                  <div className="flex-1" />

                  <div className="flex items-center gap-1.5 font-cond text-[10px] mt-3 transition-all group-hover:gap-2.5"
                    style={{ color: action.accent, letterSpacing: "0.2em" }}>
                    STEP IN <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* ── Bottom info strip ── */}
        <motion.div variants={fade(0.22)} initial="hidden" animate="show"
          className="mt-6 flex items-center gap-2 px-4 py-3 rounded"
          style={{ background: "var(--ink-2)", border: "1px solid var(--ink-4)" }}>
          <Crest size={16} color="var(--violet-400)" />
          <span className="font-cond text-[10px]" style={{ color: "var(--smoke)", letterSpacing: "0.18em" }}>
            DSA 1V1 AND KOTODAMA AWARD ELO · PRIVATE DŌJŌ IS UNRANKED
          </span>
        </motion.div>
      </div>
    </div>
  );
}
