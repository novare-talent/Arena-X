"use client";

import { useState, useEffect, useCallback } from "react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import card1Img from "../../../public/images/welcome/card1.png";
import card2Img from "../../../public/images/welcome/card2.png";
import card3Img from "../../../public/images/welcome/card3.png";
import card4Img from "../../../public/images/welcome/card4.png";
import card5Img from "../../../public/images/welcome/card5.png";
import logoImg   from "../../../public/images/logo.png";

const MONO = "'JetBrains Mono',monospace";
const CP   = "'Copperplate Gothic 32 BC','Copperplate Gothic Bold','Copperplate',Cinzel,serif";

const STAGE_W = 1456;
const STAGE_H = 816;
const TOTAL   = 5;

const SLIDES: { img: StaticImageData; alt: string }[] = [
  { img: card1Img, alt: "Chapter 1 — Entering the Arena" },
  { img: card2Img, alt: "Rank Path" },
  { img: card3Img, alt: "Four Forms of Combat" },
  { img: card4Img, alt: "Sharpen the Weapon" },
  { img: card5Img, alt: "The Leaderboard" },
];

export default function WelcomeCarousel({
  onDismiss, totalUsers = 0, totalMatches = 0,
}: { onDismiss: () => void; totalUsers?: number; totalMatches?: number }) {
  const [step,  setStep]  = useState(0);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const fit = () => setScale(Math.min((window.innerWidth - 80) / STAGE_W, (window.innerHeight - 80) / STAGE_H));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const next = useCallback(() => setStep(s => Math.min(TOTAL - 1, s + 1)), []);
  const prev = useCallback(() => setStep(s => Math.max(0, s - 1)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape")       onDismiss();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft")  prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onDismiss]);

  const isFirst = step === 0;
  const isLast  = step === TOTAL - 1;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      background: "#0d1117",
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden",
    }}>
      {/* scaled stage */}
      <div style={{
        width: STAGE_W, height: STAGE_H,
        transform: `scale(${scale})`, transformOrigin: "center",
        position: "relative", flexShrink: 0,
        borderRadius: 16, overflow: "hidden",
        boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
      }}>

        {/* ── Slides ── */}
        {SLIDES.map((s, i) => (
          <div key={i} style={{
            position: "absolute", inset: 0,
            opacity: i === step ? 1 : 0,
            transition: "opacity 0.4s ease",
            pointerEvents: i === step ? "all" : "none",
          }}>
            <Image
              src={s.img} alt={s.alt} fill
              style={{ objectFit: "contain", objectPosition: "center", pointerEvents: "none", userSelect: "none" }}
              draggable={false} placeholder="blur"
              priority={i === 0}
              sizes="100vw"
            />
          </div>
        ))}

        {/* ── Stats strip — slide 1 only ── */}
        {isFirst && (
          <div style={{
            position: "absolute", bottom: 80, right: 72, zIndex: 10,
            display: "flex", borderRadius: 6, overflow: "hidden",
            boxShadow: "0 2px 16px rgba(0,0,0,0.5)",
          }}>
            {[
              { v: totalUsers.toLocaleString(),               l: "WARRIORS" },
              { v: (totalMatches + 100).toLocaleString(),     l: "DUELS FOUGHT" },
              { v: "15s",                                     l: "AVG QUEUE" },
            ].map((item, i) => (
              <div key={item.l} style={{
                background: "rgba(10,10,10,0.92)",
                padding: "8px 18px",
                borderLeft: i ? "1px solid #2a2438" : "none",
              }}>
                <div style={{ fontFamily: CP, fontSize: 22, color: "#c4b5fd", lineHeight: 1 }}>{item.v}</div>
                <div style={{ fontFamily: MONO, fontSize: 8, color: "#6a607a", letterSpacing: "0.2em", marginTop: 3 }}>{item.l}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Chrome top ── */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, zIndex: 20,
          height: 52, display: "flex", alignItems: "center",
          padding: "0 32px", justifyContent: "space-between",
          background: "linear-gradient(to bottom, rgba(13,17,23,0.85), transparent)",
        }}>
          {/* logo */}
          <Image src={logoImg} alt="ArenaX" height={20} width={56}
            style={{ display: "block", pointerEvents: "none", userSelect: "none" }}
            draggable={false} placeholder="blur"
          />

          {/* dots + counter */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, pointerEvents: "none" }}>
            <div style={{ display: "flex", gap: 6 }}>
              {Array.from({ length: TOTAL }, (_, i) => (
                <div key={i} style={{
                  height: 3, borderRadius: 2,
                  background: i === step ? "#fff" : "rgba(255,255,255,0.2)",
                  width: i === step ? 28 : 8,
                  transition: "width 0.3s, background 0.3s",
                }} />
              ))}
            </div>
            <span style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: "0.3em" }}>
              STEP {step + 1} / {TOTAL}
            </span>
          </div>

          {/* skip */}
          <button onClick={onDismiss} style={{
            fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,0.45)",
            letterSpacing: "0.22em", background: "none", border: "none", cursor: "pointer",
            transition: "color 0.15s",
          }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
          >
            SKIP THE BRIEF →
          </button>
        </div>

        {/* ── Live warriors (bottom left, all slides) ── */}
        <div style={{
          position: "absolute", bottom: 26, left: 32, zIndex: 20,
          display: "flex", alignItems: "center", gap: 10,
          pointerEvents: "none",
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "#a78bfa", display: "inline-block",
            boxShadow: "0 0 0 0 rgba(167,139,250,0.4)",
            animation: "ax-pulse-dot 2s infinite",
          }} />
          <span style={{ fontFamily: MONO, fontSize: 11, color: "rgba(255,255,255,0.45)", letterSpacing: "0.22em" }}>
            {totalUsers.toLocaleString()} WARRIORS WAIT INSIDE
          </span>
        </div>

        {/* ── Nav buttons (bottom right) ── */}
        <div style={{
          position: "absolute", bottom: 24, right: 32, zIndex: 20,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          {!isFirst && (
            <button onClick={prev} style={{
              fontFamily: CP, fontSize: 11, letterSpacing: "0.18em",
              padding: "0 20px", height: 42, borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.25)",
              background: "rgba(13,17,23,0.7)",
              color: "rgba(255,255,255,0.7)", cursor: "pointer",
              backdropFilter: "blur(8px)", transition: "0.15s",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(13,17,23,0.7)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
            >
              ← Back
            </button>
          )}
          {isLast ? (
            <Link href="/dashboard" onClick={onDismiss} style={{
              fontFamily: CP, fontSize: 11, letterSpacing: "0.18em",
              padding: "0 28px", height: 42, borderRadius: 8,
              border: "none", background: "#f5c451", color: "#111",
              cursor: "pointer", fontWeight: 600, textDecoration: "none",
              display: "flex", alignItems: "center", transition: "0.15s",
            }}
              onMouseEnter={e => (e.currentTarget.style.background = "#e6b23a")}
              onMouseLeave={e => (e.currentTarget.style.background = "#f5c451")}
            >
              ENTER THE ARENA →
            </Link>
          ) : (
            <button onClick={next} style={{
              fontFamily: CP, fontSize: 11, letterSpacing: "0.18em",
              padding: "0 28px", height: 42, borderRadius: 8,
              border: "none", background: "#fff", color: "#111",
              cursor: "pointer", fontWeight: 600, transition: "0.15s",
            }}
              onMouseEnter={e => (e.currentTarget.style.background = "#e8e8e8")}
              onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
            >
              Next →
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
