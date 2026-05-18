"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { Crown } from "lucide-react";
import {
  LogoKasa, Wordmark, Kabuto, Moon, Hooded, TierRing,
} from "@/components/ui-samurai/primitives";

/* ════════════════════════════════════════════════════════════════════
   ArenaX — Welcome · Manga (5 pages). Fixed 1280×800 stage, CSS-scaled.
   Art = inline SVG + samurai primitives (no photos).
════════════════════════════════════════════════════════════════════ */

const STAGE_W = 1280;
const STAGE_H = 800;
const TOTAL = 5;
const PAPER = "#f3ece0";
const INK = "#0a0a0a";
const FX = 40, FY = 76;

/* ── Screen-tone halftone ────────────────────────────────────────── */
function ScreenTone({ dark = false, opacity = 0.1 }: { dark?: boolean; opacity?: number }) {
  const id = `st-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity, pointerEvents: "none", zIndex: 2 }}>
      <defs>
        <pattern id={id} x="0" y="0" width="5" height="5" patternUnits="userSpaceOnUse">
          <circle cx="1.2" cy="1.2" r="1" fill={dark ? "#fff" : INK} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/* ── Manga panel ─────────────────────────────────────────────────── */
function Panel({
  x, y, w, h, dark, tone, children,
}: {
  x: number; y: number; w: number; h: number;
  dark?: boolean; tone?: boolean; children?: React.ReactNode;
}) {
  return (
    <div style={{
      position: "absolute", left: x, top: y, width: w, height: h,
      background: dark ? "#0b0710" : PAPER, border: "2.5px solid #0a0a0a",
      overflow: "hidden", boxShadow: "4px 4px 0 rgba(0,0,0,0.5)",
    }}>
      {children}
      {tone && <ScreenTone dark={dark} />}
      <svg width="14" height="14" viewBox="0 0 14 14" style={{ position: "absolute", top: 6, left: 6, zIndex: 4 }}>
        <path d="M1.25 10 V1.25 H10" stroke="var(--violet-400)" strokeWidth="2.5" strokeLinecap="square" fill="none" />
      </svg>
      <svg width="14" height="14" viewBox="0 0 14 14" style={{ position: "absolute", bottom: 6, right: 6, zIndex: 4 }}>
        <path d="M12.75 4 V12.75 H4" stroke="var(--violet-400)" strokeWidth="2.5" strokeLinecap="square" fill="none" />
      </svg>
    </div>
  );
}

function NarratorBox({ x, y, w, children }: { x: number; y: number; w: number; children: React.ReactNode }) {
  return (
    <div className="font-mono" style={{
      position: "absolute", left: x, top: y, width: w, zIndex: 5,
      background: "#fff", border: "1.8px solid #0a0a0a", padding: "11px 13px",
      fontSize: 11, color: INK, letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1.45,
    }}>{children}</div>
  );
}

function SpeechBubble({ x, y, w, jp, children }: { x: number; y: number; w: number; jp?: string; children: React.ReactNode }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, zIndex: 5 }}>
      <div className="font-mono" style={{
        position: "relative", background: "#fff", border: "2px solid #0a0a0a", borderRadius: 12,
        padding: "13px 15px", fontSize: 11, color: INK, letterSpacing: "0.04em", textTransform: "uppercase", lineHeight: 1.45,
      }}>
        {children}
        {jp && <div className="font-jp" style={{ fontSize: 13, color: "var(--violet-500)", marginTop: 6, textTransform: "none" }}>{jp}</div>}
        <svg viewBox="0 0 18 16" width={18} height={16} style={{ position: "absolute", bottom: -14, left: 18 }}>
          <polygon points="0,2 18,2 2,16" fill="#fff" />
          <polyline points="18,2 2,16 0,2" fill="none" stroke="#0a0a0a" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

function ShoutBubble({ x, y, w, jp, children }: { x: number; y: number; w: number; jp?: string; children: React.ReactNode }) {
  const pts: string[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (Math.PI * 2 * i) / 16 - Math.PI / 2;
    const r = i % 2 === 0 ? 49 : 36;
    pts.push(`${(50 + Math.cos(a) * r).toFixed(2)},${(50 + Math.sin(a) * r).toFixed(2)}`);
  }
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, zIndex: 6 }}>
      <div style={{ position: "relative", padding: "28px 26px 32px" }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <polygon points={pts.join(" ")} fill="#fff" stroke="#0a0a0a" strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="font-display" style={{
          position: "relative", fontSize: 22, color: INK, letterSpacing: "0.05em",
          textTransform: "uppercase", lineHeight: 1.05, textAlign: "center",
        }}>
          {children}
          {jp && <div className="font-jp" style={{ fontSize: 12, color: "var(--violet-500)", marginTop: 7, textTransform: "none" }}>{jp}</div>}
        </div>
      </div>
    </div>
  );
}

function CaptionTag({ jp, text, accent = "var(--violet-300)" }: { jp: string; text: string; accent?: string }) {
  return (
    <div style={{ position: "absolute", left: 14, top: 14, zIndex: 5, background: "#0a0a0a", padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span className="font-jp" style={{ fontSize: 14, color: accent, lineHeight: 1 }}>{jp}</span>
      <span style={{ color: "var(--smoke)" }}>·</span>
      <span className="font-mono" style={{ fontSize: 10, color: "var(--bone)", letterSpacing: "0.2em" }}>{text}</span>
    </div>
  );
}

function TitlePlate({ title, jp, pos }: { title: string; jp: string; pos: React.CSSProperties }) {
  return (
    <div style={{
      position: "absolute", zIndex: 5, background: PAPER, border: "1.8px solid #0a0a0a",
      padding: "7px 18px 5px", display: "flex", alignItems: "baseline", gap: 14,
      boxShadow: "3px 3px 0 #0a0a0a", ...pos,
    }}>
      <span className="font-display" style={{ fontSize: 38, color: INK, lineHeight: 1 }}>{title}</span>
      <span className="font-jp" style={{ fontSize: 42, color: "#5b21b6", lineHeight: 1, fontWeight: 700 }}>{jp}</span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   SVG scene art
════════════════════════════════════════════════════════════════════ */
function ToriiDawnArt() {
  return (
    <svg viewBox="0 0 1200 372" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1 }}>
      <defs>
        <radialGradient id="dawn" cx="50%" cy="82%" r="72%">
          <stop offset="0%" stopColor="#3a2b1a" /><stop offset="55%" stopColor="#1a1320" /><stop offset="100%" stopColor="#0b0710" />
        </radialGradient>
      </defs>
      <rect width="1200" height="372" fill="url(#dawn)" />
      <circle cx="600" cy="260" r="120" fill="#f5c451" opacity="0.18" />
      <circle cx="600" cy="260" r="74" fill="#f5c451" opacity="0.32" />
      <path d="M0 372 L180 215 L320 285 L470 185 L640 295 L820 205 L1010 290 L1200 220 L1200 372 Z" fill="#120d1c" />
      <path d="M0 372 L140 275 L340 325 L560 255 L780 325 L980 275 L1200 325 L1200 372 Z" fill="#0b0710" />
      <g stroke="#e8dcc8" strokeWidth="9" fill="none" strokeLinecap="round">
        <line x1="470" y1="125" x2="455" y2="350" />
        <line x1="730" y1="125" x2="745" y2="350" />
        <path d="M420 125 Q600 100 780 125" strokeWidth="14" />
        <line x1="445" y1="170" x2="755" y2="170" strokeWidth="10" />
      </g>
      <rect x="560" y="125" width="80" height="26" fill="#e8dcc8" />
      {[[140,70],[260,150],[930,90],[1050,180],[360,60],[820,210]].map(([cx, cy], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx="6" ry="3" fill="#e6b8c8" opacity="0.5" transform={`rotate(${i * 40} ${cx} ${cy})`} />
      ))}
    </svg>
  );
}

/* Clean diagonal katana, offered hilt-first */
function KatanaArt({ flip }: { flip?: boolean }) {
  return (
    <svg viewBox="0 0 388 264" preserveAspectRatio="xMidYMid slice"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1, transform: flip ? "scaleX(-1)" : undefined }}>
      <defs>
        <radialGradient id="kg" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#241a36" /><stop offset="100%" stopColor="#0b0710" />
        </radialGradient>
      </defs>
      <rect width="388" height="264" fill="url(#kg)" />
      <g opacity="0.12" stroke="#a78bfa" strokeWidth="1.4">
        {Array.from({ length: 8 }).map((_, i) => <line key={i} x1={-20 + i * 64} y1="264" x2={80 + i * 64} y2="0" />)}
      </g>
      <g transform="rotate(-28 194 132)">
        {/* blade */}
        <path d="M58 130 L286 124 L300 132 L286 140 L58 134 Z" fill="#e9eef5" stroke="#0a0a0a" strokeWidth="2" />
        <line x1="70" y1="132" x2="280" y2="129" stroke="#9aa6b8" strokeWidth="1.2" />
        {/* habaki */}
        <rect x="300" y="124" width="12" height="16" fill="#cfd6e0" stroke="#0a0a0a" strokeWidth="1.6" />
        {/* tsuba */}
        <ellipse cx="320" cy="132" rx="7" ry="20" fill="#1a1326" stroke="#0a0a0a" strokeWidth="2" />
        {/* tsuka */}
        <rect x="324" y="124" width="56" height="16" rx="3" fill="#2a1f44" stroke="#0a0a0a" strokeWidth="2" />
        {Array.from({ length: 5 }).map((_, i) => (
          <line key={i} x1={330 + i * 11} y1="123" x2={336 + i * 11} y2="141" stroke="#6a607a" strokeWidth="1.4" />
        ))}
        <rect x="380" y="123" width="6" height="18" rx="2" fill="#1a1326" stroke="#0a0a0a" strokeWidth="1.6" />
      </g>
    </svg>
  );
}

/* Sensei: moon + hooded figure, clean & centered */
function SenseiArt() {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "radial-gradient(circle at 50% 30%, #1c1430, #0b0710 70%)", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -40, left: "50%", transform: "translateX(-50%)", opacity: 0.6 }}>
        <Moon size={210} />
      </div>
      <div style={{ position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)" }}>
        <Hooded width={188} height={236} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 30, height: 1, background: "rgba(167,139,250,0.3)" }} />
    </div>
  );
}

/* Mountain climb path (markers overlaid by Page2) */
function PathArt() {
  return (
    <svg viewBox="0 0 372 648" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1 }}>
      <defs>
        <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1d1530" /><stop offset="100%" stopColor="#0b0710" />
        </linearGradient>
      </defs>
      <rect width="372" height="648" fill="url(#pg)" />
      <path d="M0 648 L70 250 L140 360 L210 180 L300 340 L372 240 L372 648 Z" fill="#160f24" />
      <path d="M0 648 L110 400 L230 470 L372 380 L372 648 Z" fill="#0d0916" />
      <path d="M150 640 Q210 510 175 400 Q140 300 200 210 Q250 140 210 60"
        stroke="#3a2f56" strokeWidth="40" fill="none" strokeLinecap="round" opacity="0.55" />
      <path d="M150 640 Q210 510 175 400 Q140 300 200 210 Q250 140 210 60"
        stroke="#a78bfa" strokeWidth="2" strokeDasharray="2 13" fill="none" opacity="0.5" />
    </svg>
  );
}


function ScoutBadgeArt() {
  return (
    <svg viewBox="0 0 120 120" width={104} height={104}>
      <defs>
        <radialGradient id="sb" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="rgba(245,196,81,0.28)" /><stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="58" r="56" fill="url(#sb)" />
      <polygon points="60,10 104,34 104,82 60,110 16,82 16,34" fill="#1a1326" stroke="#f5c451" strokeWidth="2.5" />
      <polygon points="60,22 92,40 92,76 60,98 28,76 28,40" fill="none" stroke="#f5c451" strokeWidth="1" opacity="0.5" />
      <path d="M60 38 l6.5 13.5 14.5 2 -10.5 10.5 2.5 14.5 -13-7 -13 7 2.5-14.5 -10.5-10.5 14.5-2 Z"
        fill="#f5c451" />
    </svg>
  );
}

/* ── Chrome ──────────────────────────────────────────────────────── */
function Chrome({ step, totalUsers, onSkip }: { step: number; totalUsers: number; onSkip: () => void }) {
  return (
    <>
      <div style={{ position: "absolute", top: 26, left: 32, right: 32, zIndex: 10, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}><LogoKasa size={26} /><Wordmark size={17} /></div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            {Array.from({ length: TOTAL }, (_, i) => i + 1).map(s => (
              <div key={s} style={{ width: s === step ? 32 : 8, height: 3, borderRadius: 2, background: s === step ? "var(--violet-400)" : "rgba(167,139,250,0.22)", transition: "width .3s" }} />
            ))}
          </div>
          <span className="font-mono" style={{ fontSize: 9, color: "var(--smoke)", letterSpacing: "0.3em", marginTop: 6 }}>STEP {step} / {TOTAL}</span>
        </div>
        <button onClick={onSkip} className="font-mono" style={{ fontSize: 10, color: "var(--smoke)", letterSpacing: "0.22em", background: "none", border: "none", cursor: "pointer" }}>SKIP THE BRIEF →</button>
      </div>
      <div style={{ position: "absolute", bottom: 26, left: 32, zIndex: 10, display: "flex", alignItems: "center", gap: 12 }}>
        <span className="ax-pulse" style={{ background: "var(--violet-500)" }} />
        <span className="font-mono" style={{ fontSize: 11, color: "var(--ash)", letterSpacing: "0.22em" }}>{totalUsers.toLocaleString()} WARRIORS WAIT INSIDE</span>
      </div>
    </>
  );
}

function PageCTA({ label, onClick, href }: { label: string; onClick?: () => void; href?: string }) {
  const style: React.CSSProperties = {
    position: "absolute", bottom: 22, right: 32, zIndex: 10, height: 48, padding: "0 30px",
    display: "flex", alignItems: "center", fontSize: 13, letterSpacing: "0.18em",
    background: "linear-gradient(180deg, var(--violet-500), var(--violet-700))",
    border: "1px solid rgba(196,181,253,0.3)", borderRadius: 10, color: "var(--bone)",
    cursor: "pointer", textDecoration: "none",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.16), 0 8px 24px -8px rgba(124,58,237,0.55)",
  };
  return href
    ? <Link href={href} onClick={onClick} className="font-cond" style={style}>{label}</Link>
    : <button onClick={onClick} className="font-cond" style={style}>{label}</button>;
}

const anim = {
  initial: { opacity: 0, x: 24 }, animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 }, transition: { duration: 0.28 },
};

/* ════════════════════════════════════════════════════════════════════
   PAGE 1 · First Light
════════════════════════════════════════════════════════════════════ */
function Page1({ totalUsers, totalMatches }: { totalUsers: number; totalMatches: number }) {
  return (
    <motion.div key="p1" {...anim} style={{ position: "absolute", inset: 0 }}>
      <Panel x={FX} y={FY} w={1200} h={372}>
        <ToriiDawnArt />
        <TitlePlate title="FIRST LIGHT" jp="始" pos={{ left: 28, bottom: 22 }} />
        <div className="font-mono" style={{ position: "absolute", right: 24, top: 20, zIndex: 5, background: PAPER, border: "1px solid #0a0a0a", padding: "5px 12px", fontSize: 10, color: INK, letterSpacing: "0.28em" }}>CHAPTER 01 · 第 一 章</div>
        <div style={{ position: "absolute", right: 24, bottom: 22, zIndex: 5, display: "flex" }}>
          {[
            { v: totalUsers.toLocaleString(), l: "WARRIORS" },
            { v: (totalMatches + 100).toLocaleString(), l: "DUELS FOUGHT" },
            { v: "15s", l: "AVG QUEUE" },
          ].map((s, i) => (
            <div key={s.l} style={{ background: "#0a0a0a", padding: "8px 18px", borderLeft: i ? "1px solid #2a2438" : "none" }}>
              <div className="font-display" style={{ fontSize: 22, color: "var(--violet-200)", lineHeight: 1 }}>{s.v}</div>
              <div className="font-mono" style={{ fontSize: 8, color: "var(--smoke)", letterSpacing: "0.2em", marginTop: 3 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </Panel>

      {/* 1.2 — arrival */}
      <Panel x={FX} y={FY + 384} w={388} h={264} tone>
        <div style={{ position: "absolute", left: "50%", bottom: -6, transform: "translateX(-50%)", zIndex: 1, opacity: 0.9 }}>
          <Hooded width={196} height={244} />
        </div>
        <NarratorBox x={16} y={16} w={252}>YOU ARRIVE MASTERLESS.<br />RANKLESS. RECORDLESS.</NarratorBox>
      </Panel>

      {/* 1.3 — sensei (redesigned: clean moon + figure) */}
      <Panel x={FX + 406} y={FY + 384} w={388} h={264} dark>
        <SenseiArt />
        <SpeechBubble x={22} y={22} w={236} jp="無 位 · 無 名">YOU ARRIVED WITHOUT RANK.<br />WITHOUT RECORD.</SpeechBubble>
      </Panel>

      {/* 1.4 — blade (redesigned: clean katana) */}
      <Panel x={FX + 812} y={FY + 384} w={388} h={264}>
        <KatanaArt />
        <ShoutBubble x={120} y={132} w={230} jp="刀 を 見 せ ろ。">SHOW ME<br />YOUR BLADE.</ShoutBubble>
      </Panel>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   PAGE 2 · The Path
════════════════════════════════════════════════════════════════════ */
const RANKS = [
  { tier: "ronin" as const,    name: "RŌNIN",    jp: "浪人", range: "< 900",      note: "You start here.",   accent: "var(--smoke)",      you: true },
  { tier: "ashigaru" as const, name: "ASHIGARU", jp: "足軽", range: "900 – 1099",  accent: "var(--violet-400)" },
  { tier: "samurai" as const,  name: "SAMURAI",  jp: "侍",   range: "1100 – 1299", accent: "var(--violet-300)" },
  { tier: "daimyo" as const,   name: "DAIMYŌ",   jp: "大名", range: "1300 – 1499", accent: "var(--orchid)" },
  { tier: "shogun" as const,   name: "SHŌGUN",   jp: "将軍", range: "1500+",       note: "Few stand here.",   accent: "var(--gold)" },
];

function Page2() {
  // marker vertical positions along the path (bottom → top)
  const markerTop = [560, 444, 330, 214, 96];
  return (
    <motion.div key="p2" {...anim} style={{ position: "absolute", inset: 0 }}>
      {/* Left — the climbing path with league markers */}
      <Panel x={FX} y={FY} w={372} h={648}>
        <PathArt />
        <TitlePlate title="THE PATH" jp="道" pos={{ left: 14, top: 14 }} />
        {RANKS.map((r, i) => (
          <div key={r.tier} style={{
            position: "absolute", left: r.you ? 150 : 96 + (i % 2 ? 70 : 0), top: markerTop[i], zIndex: 5,
            display: "flex", alignItems: "center", gap: 8,
            background: "rgba(11,7,16,0.82)", border: `1px solid ${r.you ? "var(--violet-500)" : "rgba(167,139,250,0.25)"}`,
            borderRadius: 8, padding: "4px 9px 4px 4px",
          }}>
            <Kabuto size={30} tier={r.tier} glow={r.you} />
            <div>
              <div className="font-display" style={{ fontSize: 12, color: r.you ? "var(--violet-200)" : "var(--bone)", lineHeight: 1 }}>{r.name}</div>
              <div className="font-mono" style={{ fontSize: 8, color: "var(--smoke)", letterSpacing: "0.1em" }}>{r.range}</div>
            </div>
          </div>
        ))}
        <NarratorBox x={14} y={596} w={300}>↑ 900 ELO TO ASHIGARU — THE CLIMB BEGINS.</NarratorBox>
      </Panel>

      {/* Right top — filled scene + speech */}
      <Panel x={FX + 388} y={FY} w={812} h={300} dark>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 70% 40%, #1d1530, #0b0710 75%)" }} />
        <div className="font-jp" style={{ position: "absolute", right: 30, top: 6, fontSize: 150, color: "#a78bfa", opacity: 0.1, fontWeight: 700, zIndex: 1, lineHeight: 1 }}>五段</div>
        <div style={{ position: "absolute", right: 70, bottom: -10, zIndex: 1, opacity: 0.85 }}><Hooded width={210} height={262} /></div>
        <div style={{ position: "absolute", right: 250, top: 30, zIndex: 1, opacity: 0.55 }}><Moon size={150} /></div>
        <SpeechBubble x={34} y={40} w={250}>FIVE RANKS.<br />ONE BLADE.<br />THE CLIMB IS THE POINT.</SpeechBubble>
        <CaptionTag jp="道" text="THE WARRIOR'S LADDER" />
      </Panel>

      {/* Right bottom — ranks legend */}
      <div className="ax-card" style={{ position: "absolute", left: FX + 388, top: FY + 312, width: 812, height: 336, padding: "18px 24px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 3 }}>
          <span className="font-display" style={{ fontSize: 23, color: "var(--bone)" }}>THE FIVE RANKS</span>
          <span className="font-jp" style={{ fontSize: 19, color: "var(--violet-300)" }}>五 段</span>
        </div>
        <div className="font-mono" style={{ fontSize: 10, color: "var(--smoke)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 12 }}>
          Win duels, climb ELO. Your kabuto evolves as you rise.
        </div>
        <div style={{ position: "absolute", left: 86, right: 86, top: 176, height: 1, background: "linear-gradient(90deg,#6a607a,#8b5cf6,#a78bfa,#c026d3,#f5c451)", opacity: 0.5 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, flex: 1, position: "relative", zIndex: 1 }}>
          {RANKS.map(r => (
            <div key={r.tier} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "10px 4px 6px", borderRadius: 8,
              background: r.you ? "rgba(124,58,237,0.10)" : "transparent",
              border: r.you ? "1.5px solid var(--violet-500)" : "1.5px solid transparent", position: "relative",
            }}>
              {r.you && <span className="font-cond" style={{ position: "absolute", top: -10, fontSize: 8, height: 16, padding: "0 8px", background: "var(--violet-500)", color: "var(--bone)", borderRadius: 8, letterSpacing: "0.16em", display: "flex", alignItems: "center" }}>YOU ARE HERE</span>}
              <Kabuto size={58} tier={r.tier} glow={false} />
              <span className="font-display" style={{ fontSize: 15, color: "var(--bone)", marginTop: 2 }}>{r.name}</span>
              <span className="font-jp" style={{ fontSize: 13, color: r.accent }}>{r.jp}</span>
              <span className="font-mono" style={{ fontSize: 10, color: "var(--ash)", letterSpacing: "0.12em" }}>{r.range}</span>
              {r.note && <span style={{ fontSize: 9, color: r.tier === "shogun" ? "var(--gold)" : "var(--ash)", fontStyle: "italic", opacity: 0.85, textAlign: "center", marginTop: 2 }}>&ldquo;{r.note}&rdquo;</span>}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   PAGE 3 · Four Forms — reverted to the clear card layout
════════════════════════════════════════════════════════════════════ */
const FORMS = [
  { jp: "刀", name: "IAIDŌ DUEL",       sub: "DSA · 1V1 · LIVE",  desc: "Real-time 1v1. One algorithm — first clean blade wins.", accent: "var(--violet-300)", chip: "LIVE PVP", pulse: true,  primary: true },
  { jp: "言", name: "KOTODAMA",         sub: "AI PROMPT BATTLE",  desc: "Wield words. GPT judges your sharpness.",                accent: "var(--gold)",       chip: "NEW",      pulse: false, primary: false },
  { jp: "鍵", name: "PRIVATE DŌJŌ",     sub: "CUSTOM ROOM",       desc: "Pick a problem, share a code. Duel anyone — unranked.",  accent: "var(--plum)",       chip: null,       pulse: false, primary: false },
  { jp: "友", name: "CHALLENGE FRIEND", sub: "DIRECT DUEL",       desc: "Send the gauntlet. They have 24h to draw the blade.",    accent: "var(--orchid)",     chip: null,       pulse: false, primary: false },
];

function Page3() {
  return (
    <motion.div key="p3" {...anim} style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", left: FX, top: FY, width: 1200 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <span className="font-display" style={{ fontSize: 44, color: "var(--bone)", lineHeight: 1 }}>
              FOUR FORMS OF <span style={{ color: "var(--violet-400)" }}>COMBAT.</span>
            </span>
            <span className="font-jp" style={{ fontSize: 30, color: "var(--violet-300)" }}>形</span>
          </div>
          <p className="font-cond" style={{ fontSize: 12, color: "var(--ash)", letterSpacing: "0.1em", maxWidth: 320, lineHeight: 1.5, textAlign: "right" }}>
            Only ranked duels move your ELO. Warm up in the dōjō, then draw.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr", gap: 14, height: 470 }}>
          {FORMS.map(f => (
            <div key={f.name} className="ax-card ax-ticks" style={{
              position: "relative", overflow: "hidden",
              padding: f.primary ? 30 : 22, display: "flex", flexDirection: "column",
              background: f.primary ? "radial-gradient(110% 80% at 0% 0%, rgba(124,58,237,0.22), rgba(13,10,22,1) 60%), var(--ink-2)" : undefined,
              borderColor: f.primary ? "rgba(167,139,250,0.35)" : undefined,
            }}>
              <div className="font-jp" style={{ position: "absolute", top: -24, right: -16, fontSize: f.primary ? 210 : 140, lineHeight: 1, color: f.accent, opacity: 0.09, fontWeight: 700, pointerEvents: "none" }}>{f.jp}</div>
              <div style={{ position: "relative", display: "flex", flexDirection: "column", height: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span className="font-cond" style={{ fontSize: 11, color: f.accent, letterSpacing: "0.22em" }}>{f.sub}</span>
                  {f.chip && (
                    <span className="font-cond" style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 10px", height: 20, borderRadius: 999, fontSize: 9, background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.28)", color: "var(--violet-200)", letterSpacing: "0.14em" }}>
                      {f.pulse && <span className="ax-pulse" style={{ width: 5, height: 5 }} />}{f.chip}
                    </span>
                  )}
                </div>
                <div className="font-display" style={{ fontSize: f.primary ? 44 : 26, color: "var(--bone)", lineHeight: 0.95, marginTop: 4 }}>{f.name}</div>
                <p className="font-cond" style={{ fontSize: f.primary ? 14 : 12, color: "var(--ash)", lineHeight: 1.5, marginTop: 10, maxWidth: 280 }}>{f.desc}</p>
                <div style={{ flex: 1 }} />
                <div className="font-cond" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: f.accent, letterSpacing: "0.2em", marginTop: 12 }}>
                  {f.primary ? "START HERE" : "STEP IN"} ⟶
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   PAGE 4 · The Training Ground
════════════════════════════════════════════════════════════════════ */
function TrackBullets({ items, dot }: { items: string[]; dot: string }) {
  return (
    <ul style={{ marginTop: 14, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 7 }}>
      {items.map(t => (
        <li key={t} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--ash)" }}>
          <span style={{ width: 4, height: 4, borderRadius: "50%", background: dot, flexShrink: 0 }} />{t}
        </li>
      ))}
    </ul>
  );
}

function Page4() {
  return (
    <motion.div key="p4" {...anim} style={{ position: "absolute", inset: 0 }}>
      <div className="ax-card ax-ticks" style={{ position: "absolute", left: FX, top: FY, width: 1200, height: 648, padding: "34px 40px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* eyebrow */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <span style={{ width: 28, height: 1, background: "var(--violet-400)" }} />
          <span className="font-cond" style={{ fontSize: 11, color: "var(--violet-300)", letterSpacing: "0.3em" }}>STUDY HALL · 学</span>
        </div>
        {/* headline */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 22 }}>
          <h2 className="font-display" style={{ fontSize: 58, color: "var(--bone)", margin: 0, lineHeight: 0.9 }}>
            SHARPEN<br />THE <span style={{ color: "var(--violet-400)" }}>BLADE.</span>
          </h2>
          <p className="font-cond" style={{ color: "var(--ash)", fontSize: 13, lineHeight: 1.6, margin: 0, maxWidth: 360, textAlign: "right", letterSpacing: "0.04em" }}>
            Two structured tracks take you from rōnin to interview-ready. Watch, code, ship — without leaving the dōjō.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, flex: 1 }}>
          {/* DSA TRACK */}
          <div className="ax-card ax-ticks" style={{ padding: 22, position: "relative", overflow: "hidden", background: "radial-gradient(80% 100% at 0% 0%, rgba(124,58,237,0.18), rgba(13,10,22,1) 70%), var(--ink-2)", borderColor: "rgba(167,139,250,0.30)" }}>
            <div className="font-jp" style={{ position: "absolute", top: -20, right: -10, fontSize: 210, lineHeight: 1, color: "var(--violet-400)", opacity: 0.08, fontWeight: 700 }}>型</div>
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(124,58,237,0.18)", border: "1px solid rgba(167,139,250,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M8 5L3 12L8 19M16 5L21 12L16 19" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <span className="font-cond" style={{ fontSize: 10, color: "var(--violet-300)", letterSpacing: "0.26em" }}>WAY OF THE BLADE</span>
                </div>
                <span className="font-cond" style={{ fontSize: 9, padding: "3px 9px", borderRadius: 5, background: "rgba(124,58,237,0.14)", color: "var(--violet-200)", border: "1px solid rgba(167,139,250,0.3)", letterSpacing: "0.16em" }}>FREE TRACK</span>
              </div>
              <h3 className="font-display" style={{ fontSize: 34, color: "var(--bone)", margin: "14px 0 0", lineHeight: 1 }}>DSA TRACK</h3>
              {/* video + editor mock */}
              <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 6, border: "1px solid var(--ink-4)", borderRadius: 8, padding: 6, background: "#08060f" }}>
                <div style={{ aspectRatio: "16/9", borderRadius: 6, position: "relative", background: "linear-gradient(135deg, #2a1a3a, #0a0814)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(244,63,94,0.95)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px rgba(244,63,94,0.5)" }}>
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="#fff"><path d="M3 2 L13 8 L3 14 Z" /></svg>
                  </div>
                  <span className="font-mono" style={{ position: "absolute", top: 5, left: 7, fontSize: 7, color: "rgba(255,255,255,0.7)", letterSpacing: "0.15em" }}>STRIVER · A2Z</span>
                  <span className="font-mono" style={{ position: "absolute", bottom: 5, right: 7, fontSize: 7, color: "rgba(255,255,255,0.6)" }}>22:14</span>
                </div>
                <div className="font-mono" style={{ aspectRatio: "16/9", borderRadius: 6, padding: "6px 8px", background: "#08060f", border: "1px solid var(--ink-3)", fontSize: 7, lineHeight: 1.45, color: "var(--ash)", overflow: "hidden" }}>
                  <div style={{ display: "flex", gap: 5, marginBottom: 4 }}>
                    <span style={{ color: "var(--violet-300)", borderBottom: "1px solid var(--violet-400)", paddingBottom: 1 }}>py</span>
                    <span style={{ color: "var(--smoke)" }}>js</span><span style={{ color: "var(--smoke)" }}>cpp</span>
                  </div>
                  <div><span style={{ color: "#6a607a" }}>1</span> <span style={{ color: "#6ee7b7" }}>def</span> <span style={{ color: "#a78bfa" }}>twoSum</span>(nums,t):</div>
                  <div><span style={{ color: "#6a607a" }}>2</span>  seen = {"{}"}</div>
                  <div><span style={{ color: "#6a607a" }}>3</span>  <span style={{ color: "#6ee7b7" }}>for</span> i,n <span style={{ color: "#6ee7b7" }}>in</span>…</div>
                  <div><span style={{ color: "#6a607a" }}>4</span>   <span style={{ color: "#fda4af" }}>if</span> t-n <span style={{ color: "#fda4af" }}>in</span> seen:</div>
                </div>
              </div>
              <TrackBullets dot="var(--violet-400)" items={["3 curated playlists (Striver, NeetCode, Aditya)", "Watch-and-code split view", "Auto-progress tracking"]} />
            </div>
          </div>

          {/* PROMPT TRACK */}
          <div className="ax-card ax-ticks" style={{ padding: 22, position: "relative", overflow: "hidden" }}>
            <div className="font-jp" style={{ position: "absolute", top: -20, right: -10, fontSize: 210, lineHeight: 1, color: "var(--gold)", opacity: 0.08, fontWeight: 700 }}>言</div>
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(245,196,81,0.12)", border: "1px solid rgba(245,196,81,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 3a3 3 0 0 0-3 3v.5a3 3 0 0 0-3 3v3a3 3 0 0 0 1 2.2V18a3 3 0 0 0 3 3 3 3 0 0 0 3-3v-3M15 3a3 3 0 0 1 3 3v.5a3 3 0 0 1 3 3v3a3 3 0 0 1-1 2.2V18a3 3 0 0 1-3 3 3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z" stroke="#f5c451" strokeWidth="1.4" /></svg>
                  </div>
                  <span className="font-cond" style={{ fontSize: 10, color: "var(--gold)", letterSpacing: "0.26em" }}>WAY OF WORDS</span>
                </div>
                <span className="font-cond" style={{ fontSize: 9, padding: "3px 9px", borderRadius: 5, background: "rgba(245,196,81,0.12)", color: "var(--gold)", border: "1px solid rgba(245,196,81,0.35)", letterSpacing: "0.16em", display: "inline-flex", alignItems: "center", gap: 4 }}>★ PRO</span>
              </div>
              <h3 className="font-display" style={{ fontSize: 34, color: "var(--bone)", margin: "14px 0 0", lineHeight: 1 }}>AI PROMPTING</h3>
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6, border: "1px solid var(--ink-4)", borderRadius: 8, padding: 8, background: "#08060f" }}>
                {[
                  { n: "01", t: "Foundations", chip: "FREE", done: "1/3", active: true },
                  { n: "02", t: "Constraints & Format Control", chip: "PRO", done: "0/3" },
                  { n: "03", t: "Robustness & Edge Cases", chip: "PRO", done: "0/3" },
                  { n: "04", t: "Efficiency · Advanced Tech.", chip: "PRO", done: "0/3" },
                ].map(m => (
                  <div key={m.n} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 5, background: m.active ? "rgba(124,58,237,0.10)" : "transparent", border: m.active ? "1px solid rgba(167,139,250,0.30)" : "1px solid transparent" }}>
                    <span className="font-mono" style={{ fontSize: 9, color: "var(--smoke)", letterSpacing: "0.15em" }}>{m.n}</span>
                    <span style={{ flex: 1, fontSize: 11, color: m.active ? "var(--bone)" : "var(--ash)" }}>{m.t}</span>
                    <span className="font-cond" style={{ fontSize: 8, letterSpacing: "0.16em", padding: "2px 6px", borderRadius: 3, background: m.chip === "FREE" ? "rgba(52,211,153,0.10)" : "rgba(245,196,81,0.10)", color: m.chip === "FREE" ? "var(--win)" : "var(--gold)", border: `1px solid ${m.chip === "FREE" ? "rgba(52,211,153,0.3)" : "rgba(245,196,81,0.3)"}` }}>{m.chip}</span>
                    <span className="font-mono" style={{ fontSize: 9, color: "var(--smoke)" }}>{m.done}</span>
                  </div>
                ))}
              </div>
              <TrackBullets dot="var(--gold)" items={["4 modules · 12 hands-on exercises", "AI judge scores every prompt", "Pro unlocks all modules + revision"]} />
            </div>
          </div>
        </div>

        {/* footer */}
        <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--ink-4)", display: "flex", alignItems: "center", gap: 14 }}>
          <span className="font-jp" style={{ fontSize: 26, color: "var(--violet-300)", lineHeight: 1 }}>学</span>
          <div>
            <div className="font-cond" style={{ fontSize: 11, color: "var(--bone)", letterSpacing: "0.2em" }}>ZERO TO INTERVIEW-READY</div>
            <div className="font-mono" style={{ fontSize: 10, color: "var(--smoke)", marginTop: 2 }}>Daily Kata + practice problems keep the blade sharp between duels.</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   PAGE 5 · The Summit
════════════════════════════════════════════════════════════════════ */
const PODIUM_C = ["#f5c451", "#a78bfa", "#8b5cf6"];
type Champ = { name: string; tier: string; jp: string; tierColor: string; kt: "ronin" | "ashigaru" | "samurai" | "daimyo" | "shogun"; elo: string };
const TOP3: Champ[] = [
  { name: "KENJI",    tier: "DAIMYŌ",  jp: "大名", tierColor: "#c026d3", kt: "daimyo",  elo: "1879" },
  { name: "HYDRA_AX", tier: "SAMURAI", jp: "侍",   tierColor: "#a78bfa", kt: "samurai", elo: "1623" },
  { name: "RAVN_天",  tier: "SAMURAI", jp: "侍",   tierColor: "#a78bfa", kt: "samurai", elo: "1547" },
];

/* Top hero — the real-leaderboard podium, full width */
function HeroPodium() {
  const order = [TOP3[1], TOP3[0], TOP3[2]];
  const ranks = [2, 1, 3];
  const ringSz = [70, 92, 60];
  const barH   = [70, 110, 52];
  return (
    <div className="ax-card ax-ticks" style={{ position: "absolute", left: FX, top: FY, width: 1200, height: 332, padding: "18px 28px 0", overflow: "hidden" }}>
      <div className="ax-dotgrid" style={{ position: "absolute", inset: 0, opacity: 0.2 }} />
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10 }}>
        <span className="font-cond" style={{ fontSize: 12, color: "var(--bone)", letterSpacing: "0.22em" }}>TOP WARRIORS</span>
        <span className="font-jp" style={{ fontSize: 16, color: "var(--violet-300)" }}>戦士</span>
        <span className="font-cond" style={{ marginLeft: 6, fontSize: 8, padding: "2px 8px", borderRadius: 8, background: "rgba(244,63,94,0.14)", color: "#fda4af", border: "1px solid rgba(244,63,94,0.35)", display: "inline-flex", alignItems: "center", gap: 5, letterSpacing: "0.14em" }}>
          <span className="ax-pulse" style={{ width: 5, height: 5 }} />LIVE
        </span>
      </div>
      <TitlePlate title="THE SUMMIT" jp="戦士" pos={{ right: 26, top: 18 }} />
      <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 28, alignItems: "end", width: 720, margin: "10px auto 0" }}>
        {order.map((e, idx) => {
          const rank = ranks[idx];
          const pColor = PODIUM_C[rank - 1];
          return (
            <div key={e.name} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ position: "relative", marginBottom: 8 }}>
                {rank === 1 && <Crown className="w-5 h-5" style={{ position: "absolute", top: -24, left: "50%", transform: "translateX(-50%)", color: PODIUM_C[0] }} />}
                <TierRing tier={e.kt} size={ringSz[idx]}>
                  <Kabuto size={ringSz[idx] - 14} tier={e.kt} glow />
                </TierRing>
              </div>
              <div style={{ textAlign: "center", marginBottom: 8 }}>
                <div className="font-display" style={{ fontSize: 16, color: "var(--bone)", lineHeight: 1 }}>{e.name}</div>
                <div className="font-jp" style={{ fontSize: 13, color: e.tierColor, marginTop: 3 }}>{e.jp}</div>
                <div className="font-mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--violet-200)", marginTop: 3 }}>{e.elo} ELO</div>
              </div>
              <div style={{ width: "100%", height: barH[idx], borderRadius: "8px 8px 0 0", display: "flex", alignItems: "center", justifyContent: "center", background: `${pColor}14`, border: `1px solid ${pColor}30`, borderBottom: "none" }}>
                <span className="font-display" style={{ fontSize: 28, color: pColor }}>#{rank}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* Flat leaderboard row (real-leaderboard style) */
function BoardRow({ rank, crown, name, jp, tierColor, kt, elo, you }: {
  rank: string; crown?: boolean; name: string; jp: string;
  tierColor: string; kt: "ronin" | "ashigaru" | "samurai" | "daimyo" | "shogun"; elo: string; you?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "7px 8px", borderRadius: 8, background: you ? "rgba(124,58,237,0.08)" : undefined }}>
      <span className={crown ? "font-display" : "font-mono"} style={{ width: 20, textAlign: "center", fontSize: crown ? 15 : 11, color: crown ? "var(--gold)" : you ? "var(--violet-300)" : "var(--smoke)" }}>{rank}</span>
      <Kabuto size={28} tier={kt} glow={false} />
      <span className="font-display" style={{ flex: 1, fontSize: 14, color: you ? "var(--violet-300)" : "var(--bone)", letterSpacing: "0.04em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
      <span className="font-jp" style={{ fontSize: 12, color: tierColor, minWidth: 28, textAlign: "right" }}>{jp}</span>
      <span className="font-display" style={{ fontSize: 16, color: crown ? "var(--gold)" : "var(--bone)", minWidth: 46, textAlign: "right" }}>{elo}</span>
    </div>
  );
}

function Page5() {
  return (
    <motion.div key="p5" {...anim} style={{ position: "absolute", inset: 0 }}>
      <HeroPodium />

      {/* Scout badge — real feature: top warriors by ELO */}
      <Panel x={FX} y={FY + 344} w={344} h={304} dark tone>
        <CaptionTag jp="偵" text="SCOUT BADGE" accent="var(--gold)" />
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 9, zIndex: 3, padding: "40px 26px 18px" }}>
          <ScoutBadgeArt />
          <span className="font-display" style={{ fontSize: 24, color: "var(--gold)", letterSpacing: "0.06em" }}>SCOUT</span>
          <span className="font-mono" style={{ fontSize: 9, color: "var(--ash)", letterSpacing: "0.08em", textAlign: "center", lineHeight: 1.7 }}>
            CLIMB INTO THE TOP RANKS BY ELO — THE MARK SHOWS ON YOUR PROFILE &amp; THE LEADERBOARD.
          </span>
        </div>
      </Panel>

      {/* Flat leaderboard list (reverted) */}
      <div className="ax-card" style={{ position: "absolute", left: FX + 372, top: FY + 344, width: 464, height: 304, padding: "16px 18px", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span className="font-cond" style={{ fontSize: 11, color: "var(--bone)", letterSpacing: "0.2em" }}>FULL LADDER</span>
          <span className="font-jp" style={{ fontSize: 14, color: "var(--violet-300)" }}>位 階</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          <BoardRow rank="♛" crown name="KENJI"    jp="大名" tierColor="#c026d3" kt="daimyo"  elo="1879" />
          <BoardRow rank="2"       name="HYDRA_AX" jp="侍"   tierColor="#a78bfa" kt="samurai" elo="1623" />
          <BoardRow rank="3"       name="RAVN_天"  jp="侍"   tierColor="#a78bfa" kt="samurai" elo="1547" />
        </div>
        <div style={{ height: 1, background: "var(--ink-4)", margin: "6px -18px" }} />
        <BoardRow rank="★" name="YOU" jp="浪人" tierColor="#6a607a" kt="ronin" elo="—" you />
        <div className="font-mono" style={{ fontSize: 9, color: "var(--violet-300)", letterSpacing: "0.16em", marginTop: 4, marginLeft: 39 }}>↑ 900 ELO TO ASHIGARU</div>
      </div>

      {/* Blade callback */}
      <Panel x={FX + 864} y={FY + 344} w={336} h={304}>
        <KatanaArt flip />
        <ShoutBubble x={16} y={22} w={206} jp="刀 は 君 の も の。 抜 け。">THE BLADE<br />IS YOURS.<br />STRIKE.</ShoutBubble>
      </Panel>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Shell
════════════════════════════════════════════════════════════════════ */
export default function WelcomeCarousel({
  onDismiss, totalUsers = 0, totalMatches = 0,
}: { onDismiss: () => void; totalUsers?: number; totalMatches?: number }) {
  const [step, setStep] = useState(1);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / STAGE_W, (window.innerHeight - 24) / STAGE_H, 1));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const next = useCallback(() => setStep(s => Math.min(TOTAL, s + 1)), []);
  const prev = useCallback(() => setStep(s => Math.max(1, s - 1)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onDismiss]);

  const lastStep = step === TOTAL;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "var(--ink-1)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <div className="ax-aura" style={{ width: 760, height: 760, background: "var(--violet-700)", top: -220, left: -200, opacity: 0.26 }} />
      <div className="ax-aura" style={{ width: 560, height: 560, background: "var(--orchid)", bottom: -220, right: -200, opacity: 0.16 }} />
      <div className="ax-dotgrid" style={{ position: "absolute", inset: 0, opacity: 0.3 }} />

      <div style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})`, transformOrigin: "center", position: "relative", flexShrink: 0 }}>
        <Chrome step={step} totalUsers={totalUsers} onSkip={onDismiss} />

        <AnimatePresence mode="wait">
          {step === 1 && <Page1 key="p1" totalUsers={totalUsers} totalMatches={totalMatches} />}
          {step === 2 && <Page2 key="p2" />}
          {step === 3 && <Page3 key="p3" />}
          {step === 4 && <Page4 key="p4" />}
          {step === 5 && <Page5 key="p5" />}
        </AnimatePresence>

        {step > 1 && (
          <button onClick={prev} className="font-cond" style={{
            position: "absolute", bottom: 22, right: 232, zIndex: 10, height: 48, padding: "0 20px",
            display: "flex", alignItems: "center", fontSize: 12, letterSpacing: "0.16em",
            background: "transparent", border: "1px solid var(--ink-4)", borderRadius: 10, color: "var(--ash)", cursor: "pointer",
          }}>← BACK</button>
        )}
        {lastStep
          ? <PageCTA label="ENTER THE ARENA ⟶" href="/battle" onClick={onDismiss} />
          : <PageCTA label="TURN PAGE →" onClick={next} />}
      </div>
    </div>
  );
}