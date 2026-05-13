"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { Kabuto, Crest, Hooded, Moon, LogoKasa, Wordmark } from "@/components/ui-samurai/primitives";

const TIERS = [
  { t: "ronin",    name: "Rōnin",    jp: "浪人", elo: "< 900",      note: "You start here.", you: true  },
  { t: "ashigaru", name: "Ashigaru", jp: "足軽", elo: "900–1099"                                        },
  { t: "samurai",  name: "Samurai",  jp: "侍",   elo: "1100–1299"                                       },
  { t: "daimyo",   name: "Daimyō",   jp: "大名", elo: "1300–1499"                                       },
  { t: "shogun",   name: "Shōgun",   jp: "将軍", elo: "1500+",      note: "Few stand here.", gold: true },
] as const;

const FORMS = [
  { jp: "刀", name: "Iaidō Duel",       sub: "DSA · 1V1 · LIVE",   desc: "Real-time 1v1. One algorithm, first clean blade wins.", accent: "var(--violet-300)", primary: true,  chip: "IN QUEUE", chipPulse: true,  href: "/battle"        },
  { jp: "言", name: "Kotodama",         sub: "AI PROMPT BATTLE",   desc: "Wield words. GPT judges your sharpness.",               accent: "var(--gold)",        primary: false, chip: "NEW",      chipPulse: false, href: "/battle/prompt" },
  { jp: "鍵", name: "Private Dōjō",    sub: "CUSTOM ROOM",        desc: "Pick a problem. Share a code. Duel anyone, unranked.",  accent: "var(--plum)",        primary: false, chip: null,       chipPulse: false, href: "/rooms"         },
  { jp: "友", name: "Challenge Friend", sub: "DIRECT DUEL",        desc: "Send the gauntlet. They have 24h to draw the blade.",   accent: "var(--orchid)",      primary: false, chip: null,       chipPulse: false, href: "/friends"       },
];

const btnPrimary: React.CSSProperties = {
  background: "linear-gradient(180deg, var(--violet-500), var(--violet-700))",
  border: "none", borderRadius: 10, color: "var(--bone)",
  fontFamily: "var(--font-cond), Oswald, system-ui", letterSpacing: "0.1em", cursor: "pointer",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), 0 8px 24px -8px rgba(124,58,237,0.55)",
};
const btnGhost: React.CSSProperties = {
  background: "transparent", border: "1px solid var(--ink-4)", borderRadius: 10, color: "var(--ash)",
  fontFamily: "var(--font-cond), Oswald, system-ui", letterSpacing: "0.1em", cursor: "pointer",
};

function StepDots({ step }: { step: number }) {
  return (
    <div style={{ position: "absolute", top: 72, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 10, zIndex: 5, alignItems: "center" }}>
      {[1, 2, 3].map(s => (
        <div key={s} style={{ width: s === step ? 32 : 8, height: 4, borderRadius: 2, background: s <= step ? "var(--violet-400)" : "var(--ink-4)", transition: "width .3s, background .3s" }} />
      ))}
    </div>
  );
}

function Step1Card({ onNext, onSkip, totalUsers, totalMatches }: { onNext: () => void; onSkip: () => void; totalUsers: number; totalMatches: number }) {
  return (
    <motion.div key="s1" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}
      className="ax-card-glass ax-ticks"
      style={{ width: "min(980px, 95vw)", padding: "clamp(28px,4vw,56px)", position: "relative", zIndex: 4, display: "grid", gridTemplateColumns: "1fr 0.85fr", gap: 48, alignItems: "center" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <Crest size={26} color="var(--violet-400)" />
          <span className="font-cond" style={{ fontSize: 11, color: "var(--violet-300)", letterSpacing: "0.3em" }}>FIRST LIGHT · 始</span>
        </div>
        <h1 className="font-display" style={{ fontSize: "clamp(56px,6vw,88px)", margin: 0, lineHeight: 0.88, color: "var(--bone)" }}>
          WELCOME,<br/><span style={{ color: "var(--violet-400)" }}>RŌNIN.</span>
        </h1>
        <p style={{ color: "var(--ash)", fontSize: 15, lineHeight: 1.65, marginTop: 22, maxWidth: 420 }}>
          You arrive masterless — without rank, without record. That ends today.
          The dōjō has {totalUsers.toLocaleString()} warriors waiting. One blade. One algorithm.
          One duel at a time, you become someone the leaderboard remembers.
        </p>
        <div className="font-jp" style={{ fontSize: 18, color: "var(--violet-300)", marginTop: 18, letterSpacing: "0.15em" }}>刀 を 抜 け 。 始 ま る 。</div>
        <div style={{ display: "flex", gap: 12, marginTop: 36 }}>
          <button onClick={onNext} style={{ ...btnPrimary, height: 54, padding: "0 32px", fontSize: 13 }}>CONTINUE THE BRIEF ⟶</button>
          <button onClick={onSkip} style={{ ...btnGhost, height: 54, padding: "0 24px", fontSize: 12 }}>I KNOW THE WAY</button>
        </div>
        <div style={{ display: "flex", gap: 32, marginTop: 32 }}>
          {[{ v: totalUsers.toLocaleString(), l: "WARRIORS" }, { v: (totalMatches + 100).toLocaleString(), l: "DUELS FOUGHT" }, { v: "15s", l: "AVG QUEUE" }].map(s => (
            <div key={s.l}>
              <div className="font-display" style={{ fontSize: 24, color: "var(--violet-200)", lineHeight: 1 }}>{s.v}</div>
              <div className="font-mono" style={{ fontSize: 9, color: "var(--smoke)", letterSpacing: "0.22em", marginTop: 3 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: "relative", height: 460, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", top: 0, right: -30 }}><Moon size={300} /></div>
        <div style={{ position: "relative", zIndex: 2 }}><Hooded width={300} height={400} /></div>
        <svg viewBox="0 0 200 4" style={{ position: "absolute", left: -10, top: "58%", width: 240, zIndex: 3 }}>
          <line x1="0" y1="2" x2="180" y2="2" stroke="#a78bfa" strokeWidth="1.2" />
          <line x1="180" y1="2" x2="196" y2="2" stroke="#5b21b6" strokeWidth="4" strokeLinecap="round" />
        </svg>
        <div className="ax-card-glass" style={{ position: "absolute", bottom: 14, left: -10, padding: "10px 14px", zIndex: 4, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--win)", boxShadow: "0 0 8px var(--win)" }} />
          <span className="font-mono" style={{ fontSize: 10, color: "var(--ash)", letterSpacing: "0.22em" }}>READY FOR THE BRIEF</span>
        </div>
      </div>
    </motion.div>
  );
}

function Step2Card({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <motion.div key="s2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}
      className="ax-card-glass ax-ticks"
      style={{ width: "min(1180px, 95vw)", padding: "clamp(28px,4vw,56px)", position: "relative", zIndex: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <span style={{ width: 28, height: 1, background: "var(--violet-400)" }} />
        <span className="font-cond" style={{ fontSize: 11, color: "var(--violet-300)", letterSpacing: "0.3em" }}>THE PATH · 道</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 36, flexWrap: "wrap", gap: 16 }}>
        <h2 className="font-display" style={{ fontSize: "clamp(44px,5vw,68px)", color: "var(--bone)", margin: 0, lineHeight: 0.9 }}>
          FIVE RANKS.<br/>ONE <span style={{ color: "var(--violet-400)" }}>BLADE.</span>
        </h2>
        <p style={{ color: "var(--ash)", fontSize: 13, lineHeight: 1.65, margin: 0, maxWidth: 360 }}>
          Win duels, climb ELO. Your avatar evolves as you rise. Every rank is harder-earned than the last.
        </p>
      </div>
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: "8%", right: "8%", top: 56, height: 1, background: "linear-gradient(90deg, transparent, var(--violet-400), var(--orchid), #f5c451, transparent)" }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          {TIERS.map(r => (
            <div key={r.t} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: 12, borderRadius: 10, position: "relative", background: "you" in r ? "rgba(124,58,237,0.10)" : "transparent", border: "you" in r ? "1px solid var(--violet-500)" : "1px solid transparent" }}>
              {"you" in r && <span style={{ position: "absolute", top: -11, padding: "0 10px", borderRadius: 999, background: "var(--violet-500)", color: "var(--bone)", border: "1px solid var(--violet-400)", fontSize: 9, fontFamily: "var(--font-cond),Oswald,system-ui", letterSpacing: "0.15em" }}>YOU ARE HERE</span>}
              <Kabuto size={88} tier={r.t} glow={false} />
              <div className="font-display" style={{ fontSize: 26, color: "var(--bone)", marginTop: 4 }}>{r.name}</div>
              <div className="font-jp" style={{ fontSize: 16, color: "gold" in r ? "var(--gold)" : "var(--violet-300)" }}>{r.jp}</div>
              <div className="font-mono" style={{ fontSize: 10, color: "var(--violet-200)", letterSpacing: "0.15em" }}>{r.elo}</div>
              {"note" in r && r.note && <div style={{ fontSize: 11, color: "gold" in r ? "var(--gold)" : "var(--ash)", textAlign: "center", fontStyle: "italic", opacity: 0.85 }}>&ldquo;{r.note}&rdquo;</div>}
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 36, paddingTop: 24, borderTop: "1px solid var(--ink-4)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <span className="font-mono" style={{ fontSize: 11, color: "var(--smoke)", letterSpacing: "0.22em" }}>YOUR START</span>
          <Kabuto size={32} tier="ronin" glow={false} />
          <div>
            <div className="font-cond" style={{ fontSize: 12, color: "var(--bone)", letterSpacing: "0.15em" }}>RŌNIN · 800 ELO START</div>
            <div className="font-mono" style={{ fontSize: 10, color: "var(--ash)" }}>Reach 900 ELO to promote to Ashigaru</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onBack} style={{ ...btnGhost, height: 46, padding: "0 18px", fontSize: 11 }}>← BACK</button>
          <button onClick={onNext} style={{ ...btnPrimary, height: 46, padding: "0 24px", fontSize: 12 }}>SHOW THE FORMS ⟶</button>
        </div>
      </div>
    </motion.div>
  );
}

function Step3Card({ onEnter, onBack }: { onEnter: () => void; onBack: () => void }) {
  return (
    <motion.div key="s3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}
      className="ax-card-glass ax-ticks"
      style={{ width: "min(1180px, 95vw)", padding: "clamp(28px,4vw,56px)", position: "relative", zIndex: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <span style={{ width: 28, height: 1, background: "var(--violet-400)" }} />
        <span className="font-cond" style={{ fontSize: 11, color: "var(--violet-300)", letterSpacing: "0.3em" }}>CHOOSE YOUR FORM · 形</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <h2 className="font-display" style={{ fontSize: "clamp(44px,5vw,68px)", color: "var(--bone)", margin: 0, lineHeight: 0.9 }}>
          FOUR FORMS<br/>OF <span style={{ color: "var(--violet-400)" }}>COMBAT.</span>
        </h2>
        <p style={{ color: "var(--ash)", fontSize: 13, lineHeight: 1.65, margin: 0, maxWidth: 360 }}>
          Only ranked duels move your ELO. Start with a quick Iaidō or warm up in the Dōjō.
        </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 12 }}>
        {FORMS.map((f, i) => (
          <div key={f.name} className="ax-card ax-ticks" style={{ padding: f.primary ? 28 : 22, position: "relative", overflow: "hidden", minHeight: 240, display: "flex", flexDirection: "column", background: f.primary ? "radial-gradient(80% 100% at 0% 0%, rgba(124,58,237,0.22), rgba(13,10,22,1) 60%), var(--ink-2)" : undefined, borderColor: f.primary ? "rgba(167,139,250,0.35)" : undefined }}>
            <div style={{ position: "absolute", top: -20, right: -20, fontSize: f.primary ? 200 : 140, lineHeight: 1, color: f.accent, opacity: 0.10, fontFamily: "var(--font-jp),Noto Serif JP,serif", fontWeight: 700 }}>{f.jp}</div>
            <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 8, height: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="font-mono" style={{ fontSize: 9, color: "var(--smoke)", letterSpacing: "0.28em" }}>0{i + 1}</span>
                {f.chip && (
                  <span style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 10px", height: 20, borderRadius: 999, fontSize: 9, background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.28)", color: "var(--violet-200)", fontFamily: "var(--font-cond),Oswald", letterSpacing: "0.15em" }}>
                    {f.chipPulse && <span className="ax-pulse" style={{ width: 5, height: 5 }} />}
                    {f.chip}
                  </span>
                )}
              </div>
              <span className="font-cond" style={{ fontSize: 10, color: f.accent, letterSpacing: "0.24em" }}>{f.sub}</span>
              <div className="font-display" style={{ fontSize: f.primary ? 36 : 26, color: "var(--bone)", lineHeight: 0.95 }}>{f.name}</div>
              <p style={{ fontSize: 12, color: "var(--ash)", lineHeight: 1.5, margin: 0 }}>{f.desc}</p>
              <div style={{ flex: 1 }} />
              <div className="font-cond" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: f.accent, letterSpacing: "0.22em", marginTop: 8 }}>
                {f.primary ? "START HERE" : "STEP IN"} ⟶
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 36, paddingTop: 24, borderTop: "1px solid var(--ink-4)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Crest size={28} color="var(--violet-400)" />
          <div>
            <div className="font-cond" style={{ fontSize: 11, color: "var(--bone)", letterSpacing: "0.2em" }}>THE DŌJŌ IS YOURS</div>
            <div className="font-mono" style={{ fontSize: 10, color: "var(--smoke)", marginTop: 2 }}>Revisit this brief via the ? button next to Quick Actions.</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onBack} style={{ ...btnGhost, height: 50, padding: "0 18px", fontSize: 11 }}>← BACK</button>
          <Link href="/battle" onClick={onEnter} style={{ ...btnPrimary, height: 50, padding: "0 32px", fontSize: 13, display: "flex", alignItems: "center", textDecoration: "none" }}>
            ENTER THE ARENA ⟶
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export default function WelcomeCarousel({ onDismiss, totalUsers = 0, totalMatches = 0 }: { onDismiss: () => void; totalUsers?: number; totalMatches?: number }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "var(--ink-1)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      {/* Atmosphere */}
      <div className="ax-aura" style={{ width: 800, height: 800, background: "var(--violet-700)", top: -200, left: -200, opacity: 0.32 }} />
      <div className="ax-aura" style={{ width: 600, height: 600, background: "var(--orchid)", bottom: -200, right: -200, opacity: 0.18 }} />
      <div className="ax-dotgrid" style={{ position: "absolute", inset: 0, opacity: 0.35 }} />
      <svg viewBox="0 0 1440 200" preserveAspectRatio="none" style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: 220, opacity: 0.45 }}>
        <path d="M0 200 L160 100 L260 140 L400 60 L560 130 L680 90 L840 150 L1000 110 L1160 130 L1320 80 L1440 120 L1440 200 Z" fill="#15101f" />
        <path d="M0 200 L120 140 L280 170 L460 110 L640 160 L800 130 L1000 170 L1200 130 L1440 170 L1440 200 Z" fill="#0d0a16" />
      </svg>
      <div className="font-jp" style={{ position: "absolute", left: 28, top: 60, writingMode: "vertical-rl", textOrientation: "upright", fontSize: 22, color: "var(--violet-300)", opacity: 0.32, letterSpacing: "0.45em" }}>道 は 一 歩 か ら 始 ま る</div>

      {/* Top chrome */}
      <div style={{ position: "absolute", top: 24, left: 32, right: 32, display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}><LogoKasa size={28} /><Wordmark size={18} /></div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span className="font-mono" style={{ fontSize: 10, color: "var(--smoke)", letterSpacing: "0.3em" }}>STEP {step} / 3</span>
          <button onClick={onDismiss} className="font-cond" style={{ fontSize: 10, color: "var(--ash)", letterSpacing: "0.22em", background: "none", border: "none", cursor: "pointer" }}>SKIP THE BRIEF ⟶</button>
        </div>
      </div>

      {/* Step dots */}
      <StepDots step={step} />

      {/* Cards */}
      <AnimatePresence mode="wait">
        {step === 1 && <Step1Card key="s1" onNext={() => setStep(2)} onSkip={onDismiss} totalUsers={totalUsers} totalMatches={totalMatches} />}
        {step === 2 && <Step2Card key="s2" onNext={() => setStep(3)} onBack={() => setStep(1)} />}
        {step === 3 && <Step3Card key="s3" onEnter={onDismiss} onBack={() => setStep(2)} />}
      </AnimatePresence>
    </div>
  );
}
