"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Lock, ArrowRight } from "lucide-react";
import { Kabuto, Crest, dbTierToKabuto, TIER_LABELS } from "@/components/ui-samurai/primitives";

const BATTLE_MODES = [
  {
    no: "01",
    href: "/arena",
    jp: "刀",
    name: "IAIDŌ DUEL",
    en: "THE CLEAN BLADE · DSA · LIVE 1V1",
    sub: "MAIN PATH",
    accent: "#a78bfa",
    chip: { text: "LIVE PVP", pulse: true },
    stats: [
      { label: "AVG MATCH", value: "6m" },
      { label: "ELO RANGE", value: "±22" },
    ],
    primary: true,
    available: true,
  },
  {
    no: "02",
    href: "/battle/prompt",
    jp: "言",
    name: "KOTODAMA",
    en: "THE WORD-SPIRIT · AI PROMPT BATTLE",
    sub: "PROMPT FORM",
    accent: "#f5c451",
    chip: { text: "NEW · BETA", pulse: false },
    stats: [{ label: "TASKS PER SESSION", value: "3" }],
    primary: false,
    available: true,
  },
  {
    no: "03",
    href: "/rooms",
    jp: "鍵",
    name: "PRIVATE DŌJŌ",
    en: "CUSTOM ROOM · CHALLENGE FRIENDS",
    sub: "UNRANKED FORM",
    accent: "#a855f7",
    chip: { text: "UNRANKED", pulse: false },
    stats: [{ label: "MODE", value: "Custom" }],
    primary: false,
    available: true,
  },
  {
    no: "04",
    href: "/contests",
    jp: "戦",
    name: "SHŌGUN WARS",
    en: "BRACKETED TOURNAMENT · COMING SOON",
    sub: "SEASONAL",
    accent: "#c026d3",
    chip: { text: "SEASON II", pulse: false },
    stats: [{ label: "STATUS", value: "Soon" }],
    primary: false,
    available: false,
  },
];

type Props = {
  profile: { display_name: string | null; avatar_url: string | null } | null;
  rating: { elo: number; tier: string; wins: number; losses: number } | null;
};

export default function BattleHub({ profile, rating }: Props) {
  const displayName = profile?.display_name ?? "Warrior";
  const elo   = rating?.elo ?? 1000;
  const wins  = rating?.wins ?? 0;
  const losses = rating?.losses ?? 0;
  const tier  = rating ? dbTierToKabuto(rating.tier ?? "unrated") : "ronin";
  const tierInfo = TIER_LABELS[rating?.tier ?? "unrated"] ?? TIER_LABELS.unrated;

  return (
    <div className="min-h-screen" style={{ background: "var(--ink-1)", position: "relative", overflow: "hidden" }}>
      {/* Atmosphere */}
      <div className="ax-aura pointer-events-none" style={{ width: 800, height: 400, background: "var(--violet-700)", top: 56, left: "30%", opacity: 0.20 }} />

      <div className="max-w-6xl mx-auto px-4 pt-20 pb-12">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-4 overflow-hidden rounded-xl px-5 py-4"
          style={{ background: "var(--ink-2)", border: "1px solid var(--ink-4)" }}
        >
          <div className="ax-dotgrid" style={{ position: "absolute", inset: 0, opacity: 0.25 }} />
          <div className="relative flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-cond text-[10px]" style={{ color: "var(--violet-300)", letterSpacing: "0.3em" }}>BATTLE HUB · 道場</span>
                <Crest size={13} color="var(--violet-400)" />
              </div>
              <h1 className="font-display" style={{ fontSize: 44, color: "var(--bone)", lineHeight: 0.9 }}>
                CHOOSE YOUR <span style={{ background: "linear-gradient(180deg, var(--violet-200), var(--violet-500))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>FORM</span>.
              </h1>
            </div>

            {/* Player card */}
            <div className="ax-card-glass ax-ticks flex items-center gap-3 px-4 py-3 shrink-0">
              <Kabuto size={44} tier={tier} glow={true} />
              <div>
                <div className="font-cond text-[9px]" style={{ color: "var(--violet-300)", letterSpacing: "0.25em" }}>WARRIOR</div>
                <div className="font-display text-base" style={{ color: "var(--bone)" }}>{displayName.toUpperCase()}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-display text-sm" style={{ color: tierInfo.color }}>{tierInfo.label.toUpperCase()}</span>
                  <span className="font-mono text-xs" style={{ color: "var(--violet-200)" }}>{elo}</span>
                  <span className="font-cond text-[9px]" style={{ color: "var(--smoke)" }}>
                    <span style={{ color: "var(--win)" }}>{wins}W</span>{" "}
                    <span style={{ color: "var(--loss)" }}>{losses}L</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Mode cards grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {BATTLE_MODES.map((mode, i) => {
            const cardContent = (
              <motion.div
                key={mode.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="ax-card ax-ticks group relative overflow-hidden transition-all duration-150"
                style={{
                  gridColumn: mode.primary ? "span 2" : "span 1",
                  minHeight: mode.primary ? 280 : 140,
                  padding: 0,
                  background: mode.primary
                    ? "radial-gradient(80% 100% at 0% 0%, rgba(124,58,237,0.22), rgba(13,10,22,1) 60%), var(--ink-2)"
                    : undefined,
                  borderColor: mode.primary ? "rgba(167,139,250,0.35)" : undefined,
                  cursor: mode.available ? "pointer" : "not-allowed",
                  opacity: mode.available ? 1 : 0.55,
                }}
              >
                {/* Kanji watermark */}
                <div className="font-jp pointer-events-none select-none" style={{
                  position: "absolute",
                  top: mode.primary ? -20 : -10,
                  right: mode.primary ? -20 : -10,
                  fontSize: mode.primary ? 260 : 160,
                  lineHeight: 1,
                  color: mode.accent,
                  opacity: 0.09,
                  fontWeight: 700,
                }}>{mode.jp}</div>

                {/* Diagonal hairline */}
                <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.4 }} preserveAspectRatio="none">
                  <line x1="0" y1="100%" x2="100%" y2="40%" stroke={mode.accent} strokeOpacity="0.2" strokeWidth="0.6" />
                </svg>

                {/* Lock overlay */}
                {!mode.available && (
                  <div className="absolute inset-0 rounded-xl flex items-center justify-center z-10" style={{ background: "rgba(0,0,0,0.25)" }}>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded font-cond text-[10px]"
                      style={{ border: "1px solid var(--ink-4)", color: "var(--smoke)", letterSpacing: "0.2em", background: "var(--ink-3)" }}>
                      <Lock className="w-3 h-3" />
                      LOCKED · SEASON II
                    </div>
                  </div>
                )}

                <div style={{ padding: mode.primary ? 24 : 18, position: "relative", height: "100%", display: "flex", flexDirection: "column" }}>
                  {/* Top row */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px]" style={{ color: "var(--smoke)", letterSpacing: "0.3em" }}>{mode.no}</span>
                      <span style={{ width: 10, height: 1, background: mode.accent, opacity: 0.6, display: "inline-block" }} />
                      <span className="font-cond text-[9px]" style={{ color: mode.accent, letterSpacing: "0.22em" }}>{mode.sub}</span>
                    </div>
                    {mode.chip && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full font-cond text-[8px]"
                        style={{
                          background: mode.chip.pulse ? "rgba(244,63,94,0.12)" : "rgba(124,58,237,0.12)",
                          border: `1px solid ${mode.chip.pulse ? "rgba(244,63,94,0.3)" : "rgba(124,58,237,0.28)"}`,
                          color: mode.chip.pulse ? "#fda4af" : "var(--violet-200)",
                          letterSpacing: "0.12em",
                        }}>
                        {mode.chip.pulse && <span className="ax-pulse" style={{ width: 5, height: 5 }} />}
                        {mode.chip.text}
                      </span>
                    )}
                  </div>

                  {/* Title block */}
                  <div>
                    <div className="font-jp" style={{
                      fontSize: mode.primary ? 40 : 28,
                      color: mode.accent,
                      lineHeight: 1,
                      marginBottom: 4,
                      textShadow: `0 0 16px ${mode.accent}44`,
                    }}>{mode.jp}</div>
                    <h2 className="font-display" style={{
                      fontSize: mode.primary ? 52 : 36,
                      color: "var(--bone)",
                      lineHeight: 0.92,
                    }}>{mode.name}</h2>
                    <div className="font-cond text-[10px] mt-1" style={{ color: "var(--ash)", letterSpacing: "0.14em" }}>{mode.en}</div>
                  </div>

                  <div className="flex-1" />

                  {/* Footer */}
                  <div className="flex items-end justify-between mt-3">
                    <div className="flex gap-4">
                      {mode.stats.map(s => (
                        <div key={s.label}>
                          <div className="font-mono text-[8px]" style={{ color: "var(--smoke)", letterSpacing: "0.18em" }}>{s.label}</div>
                          <div className="font-display text-lg mt-0.5" style={{ color: "var(--bone)" }}>{s.value}</div>
                        </div>
                      ))}
                    </div>
                    {mode.available && (
                      <div className="flex items-center gap-1.5 font-cond text-[10px] transition-all group-hover:gap-2.5"
                        style={{ color: mode.accent, letterSpacing: "0.18em" }}>
                        STEP IN <ArrowRight className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );

            return mode.available ? (
              <Link key={mode.name} href={mode.href} style={{ gridColumn: mode.primary ? "span 2" : "span 1", display: "contents" }}>
                {cardContent}
              </Link>
            ) : (
              <div key={mode.name} style={{ gridColumn: mode.primary ? "span 2" : "span 1", display: "contents" }}>
                {cardContent}
              </div>
            );
          })}
        </div>

        {/* ── Info strip ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-5 flex items-center gap-2 px-4 py-3 rounded font-cond text-[10px]"
          style={{ background: "var(--ink-2)", border: "1px solid var(--ink-4)", color: "var(--smoke)", letterSpacing: "0.16em" }}
        >
          <Crest size={14} color="var(--violet-400)" />
          DSA 1V1 AND KOTODAMA BOTH AWARD ELO · PRIVATE DŌJŌ IS UNRANKED
        </motion.div>
      </div>
    </div>
  );
}
