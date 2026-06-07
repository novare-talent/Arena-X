"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image, { type StaticImageData } from "next/image";
import { Lock } from "lucide-react";
import { PRO_FEATURES_FREE } from "@/lib/featureFlags";
import soloTrainImg from "../../../public/images/banners/solo-train.png";
import kotodamaImg  from "../../../public/images/banners/kotodama.png";
import privateDojo  from "../../../public/images/banners/private-dojo.png";

const CP   = "'Copperplate Gothic 32 BC','Copperplate Gothic Bold','Copperplate',var(--font-cinzel,Cinzel),serif";
const BODY = "'DM Sans',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";

interface Track {
  href: string; img: StaticImageData; imgAlt: string;
  eyebrow: string; title: string; desc: string;
  features: string[]; color: string; free: boolean;
  badge?: { text: string; color: string; bg: string };
  btnText: string;
}

const TRACKS: Track[] = [
  {
    href: "/learn/dsa", img: soloTrainImg, imgAlt: "DSA Track",
    eyebrow: "Data Structures & Algorithms",
    title: "DSA TRACK",
    desc: "Follow curated playlists from Striver, NeetCode, and Aditya Verma. Track your progress lesson by lesson.",
    features: ["3 curated playlists", "Progress tracking", "Practice after each lesson"],
    color: "#a78bfa", free: true,
    badge: { text: "FREE", color: "#34d399", bg: "rgba(52,211,153,0.08)" },
    btnText: "Start Learning →",
  },
  {
    href: "/learn/prompt", img: kotodamaImg, imgAlt: "Prompting Track",
    eyebrow: "Prompt Engineering",
    title: "AI PROMPTING",
    desc: "Master prompt engineering through structured modules. Module 1 is free. Pro unlocks all 4 modules with AI judge feedback.",
    features: ["4 skill modules", "AI judge scoring", "Pro revision mode"],
    color: "#f59e0b", free: false,
    badge: { text: "PRO", color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
    btnText: "Start Learning →",
  },
  {
    href: "/learn/agent", img: privateDojo, imgAlt: "Agentic Track",
    eyebrow: "Agentic Learning",
    title: "AGENTIC TRACK",
    desc: "4 seasons · 75 cards. Build mental models of LLMs, operate them like a pro, delegate with judgment, and engineer agents.",
    features: ["4 seasons of content", "MCQ + open-ended cards", "Self-paced with rubrics"],
    color: "#06b6d4", free: true,
    badge: { text: "FREE", color: "#34d399", bg: "rgba(52,211,153,0.08)" },
    btnText: "Start Learning →",
  },
];

function TrackCard({ track, isPro }: { track: Track; isPro: boolean }) {
  const [hov, setHov] = useState(false);
  const proLocked = !track.free && !isPro && !PRO_FEATURES_FREE;

  return (
    <Link
      href={track.href}
      style={{ display: "block", borderRadius: 12, overflow: "hidden", background: "#1a1a1a", border: `1px solid ${hov ? track.color + "60" : "#2a2a2a"}`, textDecoration: "none", transition: "border-color .2s, transform .15s", transform: hov ? "translateY(-2px)" : "translateY(0)" }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
    >
      {/* Image */}
      <div style={{ position: "relative", overflow: "hidden", aspectRatio: "16/9" }}>
        <Image src={track.img} alt={track.imgAlt} fill
          style={{ objectFit: "cover", objectPosition: "top center", pointerEvents: "none", userSelect: "none", transform: hov ? "scale(1.08)" : "scale(1.04)", transition: "transform .3s ease" }}
          draggable={false} placeholder="blur" sizes="(max-width: 768px) 100vw, 360px"
        />
        {/* Pro lock overlay */}
        {proLocked && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, background: "rgba(0,0,0,0.8)", border: "1px solid #2a2a2a", fontFamily: BODY, fontSize: 10, color: "#f59e0b", letterSpacing: "0.14em" }}>
              <Lock style={{ width: 12, height: 12 }} />
              PRO REQUIRED
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "16px 18px" }}>
        {/* Top */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
          <div>
            <div style={{ fontFamily: BODY, fontSize: 9, letterSpacing: "0.2em", color: track.color, textTransform: "uppercase", marginBottom: 4 }}>
              {track.eyebrow}
            </div>
            <div style={{ fontFamily: CP, fontSize: 20, color: "#fff", letterSpacing: "0.04em", textTransform: "uppercase", lineHeight: 1 }}>
              {track.title}
            </div>
          </div>
          {track.badge && (
            <span style={{ fontFamily: BODY, fontSize: 8, letterSpacing: "0.18em", padding: "3px 8px", borderRadius: 10, textTransform: "uppercase", border: `1px solid ${track.badge.color}50`, color: track.badge.color, background: track.badge.bg, whiteSpace: "nowrap", marginLeft: 8, flexShrink: 0 }}>
              {track.badge.text}
            </span>
          )}
        </div>

        {/* Description */}
        <div style={{ fontFamily: BODY, fontSize: 11, color: "#777", lineHeight: 1.55, marginBottom: 12 }}>
          {track.desc}
        </div>

        {/* Features */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 14 }}>
          {track.features.map(f => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: track.color, flexShrink: 0 }} />
              <span style={{ fontFamily: BODY, fontSize: 10, color: "#999", letterSpacing: "0.04em" }}>{f}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{
            fontFamily: BODY, fontSize: 11, fontWeight: 500, padding: "7px 16px", borderRadius: 6,
            background: proLocked ? "transparent" : "#fff",
            color: proLocked ? track.color : "#111",
            border: proLocked ? `1px solid ${track.color}50` : "none",
            cursor: "pointer",
          }}>
            {proLocked ? "Upgrade to Pro →" : track.btnText}
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            {track.features.map((_, i) => (
              <span key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: i === 0 ? track.color : "#2a2a2a" }} />
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function LearnHub({ isPro }: { isPro: boolean }) {
  return (
    <div style={{ background: "#111111", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "70px 32px 60px" }}>

        {/* ── Page header ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
          style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: BODY, fontSize: 10, letterSpacing: "0.2em", color: "#777", textTransform: "uppercase", marginBottom: 6 }}>
            Study Hall · 学
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: CP, fontSize: 48, fontWeight: 700, color: "#fff", lineHeight: 1, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                LEARN
              </div>
              <div style={{ fontFamily: BODY, fontSize: 12, color: "#777", marginTop: 6 }}>
                Three structured tracks · Zero to interview-ready.
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: MONO, fontSize: 10, color: "#555" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#34d399" }} />
              {TRACKS.filter(t => t.free).length} free tracks
            </div>
          </div>
        </motion.div>

        {/* ── Track cards grid ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.08 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {TRACKS.map(track => (
              <TrackCard key={track.href} track={track} isPro={isPro} />
            ))}
          </div>
        </motion.div>

        {/* ── Pro upsell (only if not pro and PRO_FEATURES_FREE is off) ── */}
        {!isPro && !PRO_FEATURES_FREE && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.16 }}>
            <div style={{ marginTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "14px 20px", background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12 }}>
              <div>
                <div style={{ fontFamily: BODY, fontSize: 11, fontWeight: 600, color: "#f59e0b", letterSpacing: "0.12em", marginBottom: 3 }}>
                  UNLOCK PRO
                </div>
                <div style={{ fontFamily: BODY, fontSize: 11, color: "#555" }}>
                  Get all 4 AI prompting modules, AI judge feedback, and revision mode. All other tracks are free.
                </div>
              </div>
              <Link href="/profile"
                style={{ flexShrink: 0, padding: "8px 20px", borderRadius: 8, background: "#f59e0b", color: "#111", fontFamily: BODY, fontSize: 11, fontWeight: 600, textDecoration: "none", letterSpacing: "0.08em" }}>
                Upgrade
              </Link>
            </div>
          </motion.div>
        )}

        {/* ── Info strip ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.22 }}>
          <div style={{ marginTop: 12, padding: "12px 16px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: BODY, fontSize: 11, color: "#555" }}>
              Complete tracks to unlock higher tiers faster
            </span>
            <Link href="/battle" style={{ fontFamily: BODY, fontSize: 11, color: "#bbb", textDecoration: "none", letterSpacing: "0.04em" }}>
              Go battle →
            </Link>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
