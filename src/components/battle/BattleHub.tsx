"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image, { type StaticImageData } from "next/image";
import { TIER_LABELS } from "@/components/ui-samurai/primitives";

import iaidoDuel   from "../../../public/images/banners/iaido-duel.png";
import privateDojo from "../../../public/images/banners/private-dojo.png";
import kotodama    from "../../../public/images/banners/kotodama.png";
import soloTrain   from "../../../public/images/banners/solo-train.png";
import shinyuImg   from "../../../public/images/chars/shinyu.png";
import roninImg    from "../../../public/images/chars/ronin.png";
import ashigaruImg from "../../../public/images/chars/ashigaru.png";
import samuraiImg  from "../../../public/images/chars/samurai.png";
import daimyoImg   from "../../../public/images/chars/daimyo.png";
import shoganImg   from "../../../public/images/chars/shogan.png";

const CP   = "'Copperplate Gothic 32 BC','Copperplate Gothic Bold','Copperplate',var(--font-cinzel,Cinzel),serif";
const BODY = "'DM Sans',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";

const CHAR_MAP: Record<string, StaticImageData> = {
  unrated: roninImg, bronze: ashigaruImg, silver: samuraiImg,
  gold: daimyoImg, platinum: shoganImg, diamond: shoganImg,
};

interface Stat { v: string; l: string; }
interface PrimaryMode {
  href: string; img: StaticImageData; title: string;
  badge: { text: string; color: string; bg: string };
  desc: string; stats: Stat[]; btnText: string; btnStyle: "white" | "outline" | "purple";
  featured?: boolean;
}
interface SecondaryMode {
  href: string; img: StaticImageData; title: string;
  badge: { text: string; color: string; bg: string };
  desc: string; stats: Stat[]; btnText: string;
}

const PRIMARY: PrimaryMode[] = [
  {
    href: "/arena", img: iaidoDuel, title: "IAIDŌ DUEL", featured: true,
    badge: { text: "● LIVE", color: "#34d399", bg: "rgba(52,211,153,0.08)" },
    desc: "Two coders. One DSA problem. First clean solution wins. Ranked — ELO changes apply.",
    stats: [{ v: "1v1", l: "Format" }, { v: "30 min", l: "Time limit" }, { v: "±16", l: "ELO stake" }],
    btnText: "Enter Duel →", btnStyle: "white",
  },
  {
    href: "/rooms", img: privateDojo, title: "PRIVATE DŌJŌ",
    badge: { text: "● LIVE", color: "#34d399", bg: "rgba(52,211,153,0.08)" },
    desc: "Create a private room and challenge a specific opponent. Custom settings. Unranked.",
    stats: [{ v: "1v1", l: "Format" }, { v: "Custom", l: "Time limit" }, { v: "±0", l: "ELO stake" }],
    btnText: "Create Room →", btnStyle: "outline",
  },
];

const SECONDARY: SecondaryMode[] = [
  {
    href: "/battle/prompt", img: kotodama, title: "KOTODAMA",
    badge: { text: "NEW", color: "#f5c451", bg: "rgba(245,196,81,0.08)" },
    desc: "Battle with AI prompts. Craft the sharpest instruction to win the round.",
    stats: [{ v: "1v1", l: "Format" }, { v: "20 min", l: "Time" }],
    btnText: "Enter →",
  },
  {
    href: "/arena/solo", img: soloTrain, title: "SOLO TRAIN",
    badge: { text: "UNRANKED", color: "#777", bg: "transparent" },
    desc: "Practice DSA problems at your own pace. No ELO on the line.",
    stats: [{ v: "Solo", l: "Format" }, { v: "Open", l: "Time" }],
    btnText: "Train →",
  },
  {
    href: "/friends", img: shinyuImg, title: "SHIN'YU",
    badge: { text: "NEW", color: "#f5c451", bg: "rgba(245,196,81,0.08)" },
    desc: "Challenge a friend directly. Send an invite link and duel head-to-head.",
    stats: [{ v: "1v1", l: "Format" }, { v: "±0", l: "ELO" }],
    btnText: "Invite →",
  },
];

function Badge({ text, color, bg }: { text: string; color: string; bg: string }) {
  return (
    <span style={{
      fontFamily: BODY, fontSize: 9, letterSpacing: "0.18em", padding: "4px 10px",
      borderRadius: 20, textTransform: "uppercase" as const, whiteSpace: "nowrap" as const,
      border: `1px solid ${color}50`, color, background: bg,
    }}>{text}</span>
  );
}

function PrimaryCard({ mode }: { mode: PrimaryMode }) {
  const [hov, setHov] = useState(false);
  const borderColor = mode.featured
    ? (hov ? "rgba(108,43,217,0.7)" : "rgba(108,43,217,0.4)")
    : (hov ? "#444" : "#2a2a2a");

  return (
    <Link href={mode.href}
      style={{ display: "block", borderRadius: 12, overflow: "hidden", background: "#1a1a1a", border: `1px solid ${borderColor}`, textDecoration: "none", transition: "border-color .2s, transform .15s", transform: hov ? "translateY(-2px)" : "translateY(0)" }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div style={{ position: "relative", overflow: "hidden", aspectRatio: "16/9" }}>
        <Image src={mode.img} alt={mode.title} fill
          style={{ objectFit: "cover", objectPosition: "top center", pointerEvents: "none", userSelect: "none", transform: hov ? "scale(1.08)" : "scale(1.04)", transition: "transform .3s ease" }}
          draggable={false} placeholder="blur" sizes="(max-width: 768px) 100vw, 550px" priority
        />
      </div>
      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontFamily: CP, fontSize: 22, color: "#fff", letterSpacing: "0.04em", textTransform: "uppercase", lineHeight: 1 }}>
            {mode.title}
          </div>
          <Badge {...mode.badge} />
        </div>
        <div style={{ fontFamily: BODY, fontSize: 11, color: "#777", lineHeight: 1.55, marginBottom: 12 }}>
          {mode.desc}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 14 }}>
            {mode.stats.map(s => (
              <div key={s.l} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <span style={{ fontFamily: MONO, fontSize: 12, color: "#bbb" }}>{s.v}</span>
                <span style={{ fontFamily: BODY, fontSize: 8, letterSpacing: "0.14em", color: "#777", textTransform: "uppercase" }}>{s.l}</span>
              </div>
            ))}
          </div>
          <span style={{
            fontFamily: BODY, fontSize: 11, fontWeight: 500,
            padding: "7px 16px", borderRadius: 6, cursor: "pointer",
            background: mode.btnStyle === "white" ? "#fff" : "transparent",
            color: mode.btnStyle === "white" ? "#111" : "#bbb",
            border: mode.btnStyle === "outline" ? "1px solid #2a2a2a" : "none",
          }}>{mode.btnText}</span>
        </div>
      </div>
    </Link>
  );
}

function SecondaryCard({ mode }: { mode: SecondaryMode }) {
  const [hov, setHov] = useState(false);
  return (
    <Link href={mode.href}
      style={{ display: "block", borderRadius: 12, overflow: "hidden", background: "#1a1a1a", border: `1px solid ${hov ? "#444" : "#2a2a2a"}`, textDecoration: "none", transition: "border-color .2s, transform .15s", transform: hov ? "translateY(-2px)" : "translateY(0)" }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div style={{ position: "relative", overflow: "hidden", aspectRatio: "16/9" }}>
        <Image src={mode.img} alt={mode.title} fill
          style={{ objectFit: "cover", objectPosition: "top center", pointerEvents: "none", userSelect: "none", transform: hov ? "scale(1.08)" : "scale(1.04)", transition: "transform .3s ease" }}
          draggable={false} placeholder="blur" sizes="(max-width: 768px) 100vw, 360px"
        />
      </div>
      <div style={{ padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ fontFamily: CP, fontSize: 16, color: "#fff", letterSpacing: "0.04em", textTransform: "uppercase", lineHeight: 1 }}>
            {mode.title}
          </div>
          <Badge {...mode.badge} />
        </div>
        <div style={{ fontFamily: BODY, fontSize: 10, color: "#777", lineHeight: 1.5, marginBottom: 10 }}>
          {mode.desc}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 10 }}>
            {mode.stats.map(s => (
              <div key={s.l} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <span style={{ fontFamily: MONO, fontSize: 11, color: "#bbb" }}>{s.v}</span>
                <span style={{ fontFamily: BODY, fontSize: 8, letterSpacing: "0.14em", color: "#777", textTransform: "uppercase" }}>{s.l}</span>
              </div>
            ))}
          </div>
          <span style={{ fontFamily: BODY, fontSize: 10, fontWeight: 500, padding: "6px 12px", borderRadius: 6, cursor: "pointer", background: "#fff", color: "#111" }}>
            {mode.btnText}
          </span>
        </div>
      </div>
    </Link>
  );
}

type Props = {
  profile: { display_name: string | null; avatar_url: string | null } | null;
  rating: { elo: number; tier: string; wins: number; losses: number } | null;
};

export default function BattleHub({ profile, rating }: Props) {
  const elo      = rating?.elo ?? 1000;
  const tier     = rating?.tier ?? "unrated";
  const tierInfo = TIER_LABELS[tier] ?? TIER_LABELS.unrated;
  const charImg  = CHAR_MAP[tier] ?? roninImg;
  const eloLow   = Math.max(600, elo - 100);
  const eloHigh  = elo + 100;

  void profile;

  return (
    <div style={{ background: "#111111", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "70px 32px 60px" }}>

        {/* ── Page header row ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
          style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <div style={{ fontFamily: BODY, fontSize: 10, letterSpacing: "0.2em", color: "#777", textTransform: "uppercase", marginBottom: 6 }}>
              Choose your path
            </div>
            <div style={{ fontFamily: CP, fontSize: 48, fontWeight: 700, color: "#fff", lineHeight: 1, textTransform: "uppercase", letterSpacing: "0.03em" }}>
              BATTLE
            </div>
            <div style={{ fontFamily: BODY, fontSize: 12, color: "#777", marginTop: 6, lineHeight: 1.5 }}>
              Select a mode and enter the arena. Warriors at your rank are waiting.
            </div>
          </div>

          {/* ELO pill */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: "10px 14px", flexShrink: 0 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#111", overflow: "hidden", flexShrink: 0 }}>
              <Image src={charImg} alt="" width={36} height={36}
                style={{ objectFit: "cover", pointerEvents: "none", userSelect: "none" }}
                draggable={false} placeholder="blur"
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontFamily: CP, fontSize: 12, color: "#fff", letterSpacing: "0.06em" }}>
                {tierInfo.label.toUpperCase()}
              </span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: "#f5c451" }}>{elo} ELO</span>
            </div>
          </div>
        </motion.div>

        {/* ── Queue status bar ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.06 }}>
          <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
            <motion.div
              animate={{ opacity: [1, 0.4, 1], scale: [1, 1.25, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              style={{ width: 8, height: 8, borderRadius: "50%", background: "#34d399", flexShrink: 0 }}
            />
            <div style={{ fontFamily: BODY, fontSize: 12, color: "#bbb" }}>
              <span style={{ color: "#34d399", fontWeight: 600 }}>Matchmaking active</span> — warriors at your ELO range are online right now
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ fontFamily: MONO, fontSize: 11, color: "#777" }}>
              Range: {eloLow}–{eloHigh} ELO
            </div>
          </div>
        </motion.div>

        {/* ── Core Modes ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          <div style={{ fontFamily: BODY, fontSize: 12, color: "#bbb", marginBottom: 12, display: "flex", alignItems: "center", gap: 4 }}>
            Core Modes <span style={{ color: "#777" }}>→</span>
          </div>

          {/* Primary row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            {PRIMARY.map(m => <PrimaryCard key={m.href} mode={m} />)}
          </div>

          {/* Secondary row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {SECONDARY.map(m => <SecondaryCard key={m.href} mode={m} />)}
          </div>
        </motion.div>

        {/* ── Daily Kata ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.18 }}>
          <Link href="/daily" style={{ textDecoration: "none", display: "block" }}>
            <div style={{ marginTop: 32, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(245,196,81,0.1)", border: "1px solid rgba(245,196,81,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#f5c451" strokeWidth="1.5" style={{ width: 22, height: 22 }}>
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: BODY, fontSize: 9, letterSpacing: "0.2em", color: "#f5c451", textTransform: "uppercase", marginBottom: 3 }}>
                  Daily Kata · 今日の問題
                </div>
                <div style={{ fontFamily: CP, fontSize: 18, color: "#fff", letterSpacing: "0.04em" }}>
                  Solve Today&apos;s Challenge
                </div>
                <div style={{ fontFamily: BODY, fontSize: 11, color: "#777", marginTop: 2 }}>
                  One problem per day · Bonus XP · Resets at midnight
                </div>
              </div>
              <button style={{ fontFamily: BODY, fontSize: 11, fontWeight: 500, padding: "8px 18px", borderRadius: 6, background: "#f5c451", color: "#111", cursor: "pointer", border: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
                Solve Today&apos;s Kata →
              </button>
            </div>
          </Link>
        </motion.div>

      </div>
    </div>
  );
}
