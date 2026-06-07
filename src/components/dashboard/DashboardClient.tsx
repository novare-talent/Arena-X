"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image, { type StaticImageData } from "next/image";
import { motion } from "framer-motion";
import { Share2 } from "lucide-react";
import type { Database } from "@/types/database";
import { TIER_LABELS } from "@/components/ui-samurai/primitives";
import WelcomeCarousel from "@/components/welcome/WelcomeCarousel";
import ShareSheet from "@/components/share/ShareSheet";

/* ── Static image imports (optimised + auto blur at build time) ── */
import bannerBg    from "../../../public/images/banners/banner-bg.png";
import iaidoDuel   from "../../../public/images/banners/iaido-duel.png";
import privateDojo from "../../../public/images/banners/private-dojo.png";
import soloTrain   from "../../../public/images/banners/solo-train.png";
import hackathon   from "../../../public/images/banners/hackathon.png";
import kotodama    from "../../../public/images/banners/kotodama.png";
import roninImg    from "../../../public/images/chars/ronin.png";
import ashigaruImg from "../../../public/images/chars/ashigaru.png";
import samuraiImg  from "../../../public/images/chars/samurai.png";
import daimyoImg   from "../../../public/images/chars/daimyo.png";
import shoganImg   from "../../../public/images/chars/shogan.png";
import shinyuImg   from "../../../public/images/chars/shinyu.png";
import logoImg     from "../../../public/images/logo.png";
import novareImg   from "../../../public/images/novare-logo.png";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Rating  = Database["public"]["Tables"]["user_ratings"]["Row"];

const CP   = "'Copperplate Gothic 32 BC','Copperplate Gothic Bold','Copperplate',var(--font-cinzel,Cinzel),serif";
const BODY = "'DM Sans',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";

const CHAR_MAP: Record<string, StaticImageData> = {
  unrated:  roninImg,
  bronze:   ashigaruImg,
  silver:   samuraiImg,
  gold:     daimyoImg,
  platinum: shoganImg,
  diamond:  shoganImg,
};

const ROW1: { href: string; img: StaticImageData; alt: string; desc: string }[] = [
  { href: "/battle",     img: iaidoDuel,   alt: "Iaido Duel",   desc: "Two coders. One algorithm. First clean blade wins." },
  { href: "/rooms",      img: privateDojo, alt: "Private Dojo", desc: "Custom rooms. Challenge Friends." },
  { href: "/arena/solo", img: soloTrain,   alt: "Solo Train",   desc: "Practice here" },
];

const ROW2: { label: string; href: string; img: StaticImageData; alt: string; desc: string }[] = [
  { label: "Tournament",     href: "/hackathons",    img: hackathon, alt: "Tournament",  desc: "Build projects. Build yourself" },
  { label: "Prompting",      href: "/battle/prompt", img: kotodama,  alt: "Kotodama",    desc: "Enhance your prompting skills" },
  { label: "Invite Friends", href: "/friends",       img: shinyuImg, alt: "Challenge",   desc: "Compete with your friends" },
];

function ActionCard({ href, img, alt, desc, priority = false }: {
  href: string; img: StaticImageData; alt: string; desc: string; priority?: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Link
        href={href}
        className="ax-img-action"
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
      >
        <div
          className="ax-img-action-inner"
          style={{ transform: hov ? "scale(1.08)" : "scale(1.04)" }}
        >
          <Image
            src={img} alt={alt} fill
            style={{ objectFit: "cover", objectPosition: "top center", pointerEvents: "none", userSelect: "none" }}
            draggable={false}
            placeholder="blur"
            sizes="(max-width: 768px) 100vw, 360px"
            priority={priority}
          />
        </div>
      </Link>
      <div style={{ fontFamily: BODY, fontSize: 11, color: "#777", letterSpacing: "0.02em", lineHeight: 1.3 }}>
        {desc}
      </div>
    </div>
  );
}

export default function DashboardClient({
  profile, rating, totalUsers = 0, totalMatches = 0,
}: {
  profile: Profile;
  rating: Rating | null;
  totalUsers?: number;
  totalMatches?: number;
}) {
  const tier          = rating?.tier ?? "unrated";
  const elo           = rating?.elo ?? 800;
  const wins          = rating?.wins ?? 0;
  const losses        = rating?.losses ?? 0;
  const streak        = rating?.best_streak ?? 0;
  const currentStreak = rating?.current_streak ?? 0;
  const matches       = rating?.matches_played ?? 0;
  const winRate       = matches > 0 ? Math.round((wins / matches) * 100) : 0;

  const tierInfo   = TIER_LABELS[tier] ?? TIER_LABELS.unrated;
  const charImage  = CHAR_MAP[tier] ?? roninImg;

  const [showWelcome, setShowWelcome] = useState(false);
  const [showShare,   setShowShare]   = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("arenax_welcome_seen")) setShowWelcome(true);
    const open = () => setShowWelcome(true);
    window.addEventListener("arenax:welcome", open);
    return () => window.removeEventListener("arenax:welcome", open);
  }, []);

  function dismissWelcome() {
    localStorage.setItem("arenax_welcome_seen", Date.now().toString());
    setShowWelcome(false);
  }

  const shareProps = {
    displayName: profile.display_name ?? "WARRIOR",
    username:    profile.username ?? "warrior",
    tier:        tier,
    tierLabel:   tierInfo.label,
    tierJp:      tierInfo.jp,
    tierColor:   tierInfo.color,
    elo, wins, losses, streak,
    recentForm: [] as ("W" | "L")[],
  };

  const displayName = (profile.display_name ?? "WARRIOR").toUpperCase();

  const heroStats = [
    { v: String(elo),           l: "ELO"      },
    { v: `${wins}–${losses}`,   l: "W/L"      },
    { v: `${winRate}%`,         l: "Win rate" },
    { v: `${streak}W`,          l: "Streak"   },
    { v: String(matches),       l: "Duels"    },
  ];

  void currentStreak;

  return (
    <div style={{ background: "#111111", minHeight: "100vh" }}>
      {showWelcome && (
        <WelcomeCarousel onDismiss={dismissWelcome} totalUsers={totalUsers} totalMatches={totalMatches} />
      )}
      <ShareSheet open={showShare} onClose={() => setShowShare(false)} {...shareProps} />

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "62px 32px 48px" }}>

        {/* ── HERO ROW ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 10, marginBottom: 18 }}>

            {/* White hero card */}
            <div style={{
              borderRadius: 12, overflow: "hidden", position: "relative",
              background: "#f6f3ee", minHeight: 210,
              display: "flex", flexDirection: "column", justifyContent: "space-between",
              padding: "18px 20px 14px",
            }}>
              <Image
                src={bannerBg} alt="" fill
                style={{ objectFit: "cover", objectPosition: "center", pointerEvents: "none", userSelect: "none" }}
                draggable={false} placeholder="blur" priority
                sizes="(max-width: 768px) 100vw, 900px"
              />
              <div style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                background: "linear-gradient(90deg,rgba(246,243,238,0.82) 0%,rgba(246,243,238,0.65) 38%,rgba(246,243,238,0.0) 72%)",
              }} />
              <div style={{ position: "relative", zIndex: 2, marginTop: 32 }}>
                <div style={{ fontFamily: BODY, fontSize: 10, letterSpacing: "0.18em", color: "#555", textTransform: "uppercase", marginBottom: 4 }}>
                  Welcome back
                </div>
                <div style={{ fontFamily: CP, fontSize: 64, fontWeight: 700, color: "#111", lineHeight: 0.9, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  {displayName}
                </div>
              </div>
              <div style={{ position: "relative", zIndex: 2, display: "flex", gap: 16 }}>
                {heroStats.map(s => (
                  <div key={s.l} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: "#111" }}>{s.v}</span>
                    <span style={{ fontFamily: BODY, fontSize: 8, fontWeight: 600, letterSpacing: "0.14em", color: "#555", textTransform: "uppercase" }}>{s.l}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gold ELO card */}
            <div style={{
              borderRadius: 12, background: "#f5c451", padding: 12,
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "space-between", gap: 6,
            }}>
              <div style={{ width: "100%", display: "flex", justifyContent: "space-between", fontFamily: BODY, fontSize: 8, letterSpacing: "0.18em", color: "rgba(0,0,0,0.4)", textTransform: "uppercase" }}>
                <span>RANK</span><span>ELO</span>
              </div>
              <div style={{ width: 96, height: 96, borderRadius: "50%", background: "#111", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Image
                  src={charImage} alt="" width={96} height={96}
                  style={{ objectFit: "cover", pointerEvents: "none", userSelect: "none" }}
                  draggable={false} placeholder="blur" priority
                />
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, justifyContent: "center", width: "100%" }}>
                <span style={{ fontFamily: CP, fontSize: 20, fontWeight: 700, color: "#111", letterSpacing: "0.03em" }}>
                  {tierInfo.label.toUpperCase()}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 600, color: "#111" }}>{elo}</span>
              </div>
              <button
                onClick={() => setShowShare(true)}
                style={{
                  width: "100%", padding: "6px 0", borderRadius: 6,
                  border: "1.5px solid rgba(0,0,0,0.22)", background: "transparent",
                  cursor: "pointer", fontFamily: BODY, fontSize: 10, color: "#111",
                  letterSpacing: "0.12em", display: "flex", alignItems: "center",
                  justifyContent: "center", gap: 5,
                }}
              >
                <Share2 size={11} />
                SHARE
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── QUICK ACTIONS ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
        >
          <div style={{ fontFamily: BODY, fontSize: 12, color: "#bbb", marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
            Quick Actions <span style={{ color: "#777" }}>→</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 6 }}>
            {ROW1.map(a => <ActionCard key={a.href} {...a} priority />)}
          </div>
        </motion.div>

        {/* ── ROW 2 ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.14 }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 32, marginBottom: 8 }}>
            {ROW2.map(a => (
              <div key={a.href} style={{ fontFamily: BODY, fontSize: 12, color: "#bbb", display: "flex", alignItems: "center", gap: 4 }}>
                {a.label} <span style={{ color: "#777" }}>→</span>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {ROW2.map(a => <ActionCard key={a.href} {...a} priority />)}
          </div>
        </motion.div>

        {/* ── FOOTER ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
        >
          <div style={{
            marginTop: 32, background: "#1a1a1a", border: "1px solid #2a2a2a",
            borderRadius: 12, padding: "22px 28px",
            display: "grid", gridTemplateColumns: "auto 1fr auto",
            alignItems: "center", gap: 16,
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Image src={logoImg} alt="ArenaX" height={32} width={89}
                style={{ display: "block", pointerEvents: "none", userSelect: "none" }}
                draggable={false} placeholder="blur"
              />
              <div style={{ display: "flex", gap: 8 }}>
                <a href="https://instagram.com/novaretalent" target="_blank" rel="noopener noreferrer"
                  style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", color: "#777", textDecoration: "none" }}>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
                  </svg>
                </a>
                <a href="https://linkedin.com/company/novaretalent" target="_blank" rel="noopener noreferrer"
                  style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", color: "#777", textDecoration: "none" }}>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" />
                  </svg>
                </a>
              </div>
            </div>
            <div style={{ fontFamily: BODY, fontSize: 9, color: "#777", letterSpacing: "0.08em", textAlign: "center", lineHeight: 1.6 }}>
              © 2026 Novare Talent Private Limited.<br />All rights reserved.
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
              <span style={{ fontFamily: BODY, fontSize: 9, color: "#777", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                A product by Novare Talent Private Limited
              </span>
              <div style={{ display: "flex", alignItems: "center", background: "#111", border: "1px solid #2a2a2a", borderRadius: 6, padding: "5px 10px" }}>
                <Image src={novareImg} alt="Novare Talent" height={28} width={50}
                  style={{ display: "block", pointerEvents: "none", userSelect: "none" }}
                  draggable={false} placeholder="blur"
                />
              </div>
            </div>
          </div>
        </motion.div>

      </main>
    </div>
  );
}
