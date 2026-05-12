"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Trophy, Swords, TrendingUp, TrendingDown, Minus,
  Clock, BarChart2, ArrowRight, BookOpen, RotateCcw, Eye, X,
} from "lucide-react";
import { Kabuto, Crest, TierRing, dbTierToKabuto, TIER_LABELS } from "@/components/ui-samurai/primitives";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface Props {
  matchId:          string;
  outcome:          "win" | "loss" | "draw";
  endReason:        string | null;
  problem:          { id: string; title: string; slug: string; difficulty: number; match_duration_minutes: number };
  myUsername:       string;
  myEloBefore:      number;
  myEloAfter:       number;
  myCurrentElo:     number;
  myCurrentTier:    string;
  myScore:          number | null;
  mySolveMs:        number | null;
  opponentUsername:        string;
  opponentProfileUsername: string | null;
  oppEloBefore:            number;
  oppEloAfter:             number;
  oppCurrentElo:           number;
  oppCurrentTier:          string;
  oppScore:                number | null;
  oppSolveMs:              number | null;
  resigned:                boolean;
  resignedBy:              string | null;
  userId:                  string;
  oppSolution:             { code: string; language: string } | null;
}

function fmtTime(ms: number | null) {
  if (ms === null) return "—";
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export default function ResultClient({
  matchId, outcome, endReason, problem,
  myUsername, myEloBefore, myEloAfter, myCurrentElo, myCurrentTier,
  myScore, mySolveMs,
  opponentUsername, opponentProfileUsername,
  oppCurrentTier,
  oppScore, oppSolveMs,
  resigned, resignedBy, userId,
  oppSolution,
}: Props) {
  const router   = useRouter();
  const eloDelta = myEloAfter - myEloBefore;
  const iResigned = resigned && resignedBy === userId;
  const [showSolution, setShowSolution] = useState(false);

  const myKt    = dbTierToKabuto(myCurrentTier);
  const myTInfo = TIER_LABELS[myCurrentTier] ?? TIER_LABELS.unrated;
  const oppKt   = dbTierToKabuto(oppCurrentTier);

  const OUTCOME_CONFIG = {
    win:  { label: "VICTORY",  jp: "勝利", color: "var(--win)",  accent: "#22d3ee", icon: Trophy },
    loss: { label: "DEFEATED", jp: "敗北", color: "var(--loss)", accent: "#ef4444", icon: Swords },
    draw: { label: "DRAW",     jp: "引分", color: "#f5c451",     accent: "#f5c451", icon: Minus  },
  };
  const cfg  = OUTCOME_CONFIG[outcome];
  const Icon = cfg.icon;

  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-12 px-4"
      style={{ background: "var(--ink-1)", position: "relative", overflow: "hidden" }}>
      <div className="ax-aura pointer-events-none"
        style={{ width: 500, height: 400, background: "var(--violet-700)", top: 0, left: "50%", transform: "translateX(-50%)", opacity: 0.12 }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg relative"
      >
        {/* Outcome badge */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", delay: 0.1 }}
          className="flex flex-col items-center mb-6"
        >
          <div className="w-24 h-24 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: `${cfg.accent}12`, border: `1px solid ${cfg.accent}30` }}>
            <Icon className="w-12 h-12" style={{ color: cfg.accent }} />
          </div>
          <div className="font-jp text-2xl" style={{ color: cfg.color }}>{cfg.jp}</div>
          <h1 className="font-display text-5xl" style={{ color: "var(--bone)", lineHeight: 0.95 }}>{cfg.label}.</h1>
          <p className="font-cond text-[10px] mt-2" style={{ color: "var(--smoke)", letterSpacing: "0.2em" }}>
            {endReason === "ac"      && "FIRST CLEAN BLADE — ALL TESTS PASSED"}
            {endReason === "timeout" && "TIME&apos;S UP — WINNER BY SCORE"}
            {endReason === "resign"  && (iResigned ? "YOU RESIGNED" : `${opponentUsername.toUpperCase()} RESIGNED`)}
            {endReason === "draw"    && "EQUAL SCORES — NO ELO CHANGE"}
          </p>
        </motion.div>

        {/* ELO change */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="ax-card ax-ticks mb-4 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-cond text-[9px] mb-1" style={{ color: "var(--ash)", letterSpacing: "0.22em" }}>ELO CHANGE · 力</div>
              <div className="flex items-center gap-2">
                <span className="font-display text-3xl" style={{ color: eloDelta > 0 ? "var(--win)" : eloDelta < 0 ? "var(--loss)" : "#f5c451" }}>
                  {eloDelta > 0 ? `+${eloDelta}` : eloDelta}
                </span>
                {eloDelta > 0  && <TrendingUp  className="w-5 h-5" style={{ color: "var(--win)" }} />}
                {eloDelta < 0  && <TrendingDown className="w-5 h-5" style={{ color: "var(--loss)" }} />}
                {eloDelta === 0 && <Minus       className="w-5 h-5" style={{ color: "#f5c451" }} />}
              </div>
            </div>
            <div className="text-right flex items-center gap-3">
              <TierRing tier={myKt} size={52}>
                <Kabuto size={40} tier={myKt} glow={true} />
              </TierRing>
              <div>
                <div className="font-cond text-[9px] mb-0.5" style={{ color: "var(--ash)", letterSpacing: "0.22em" }}>NEW ELO</div>
                <div className="font-display text-2xl" style={{ color: "var(--bone)" }}>{myCurrentElo}</div>
                <div className="font-cond text-[9px]" style={{ color: myTInfo.color, letterSpacing: "0.12em" }}>{myTInfo.label.toUpperCase()}</div>
              </div>
            </div>
          </div>

          <div className="rounded-full overflow-hidden" style={{ height: 3, background: "var(--ink-4)" }}>
            <motion.div
              initial={{ width: `${Math.min(100, ((myEloBefore - 600) / (2400 - 600)) * 100)}%` }}
              animate={{ width: `${Math.min(100, ((myCurrentElo - 600) / (2400 - 600)) * 100)}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
              style={{ height: "100%", borderRadius: 9999, background: `linear-gradient(90deg, var(--violet-500), ${myTInfo.color})` }}
            />
          </div>
        </motion.div>

        {/* Score comparison */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="ax-card mb-4 p-5">
          <div className="font-cond text-[9px] mb-4" style={{ color: "var(--ash)", letterSpacing: "0.25em" }}>MATCH SUMMARY · 戦績</div>
          <div className="grid grid-cols-3 gap-4">
            {/* My stats */}
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <Kabuto size={36} tier={myKt} glow={false} />
              </div>
              <div className="font-cond text-[9px] mb-2" style={{ color: "var(--bone)", letterSpacing: "0.1em" }}>{myUsername.toUpperCase()}</div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-center gap-1.5">
                  <BarChart2 className="w-3 h-3" style={{ color: "var(--smoke)" }} />
                  <span className="font-mono text-[10px]" style={{ color: "var(--ash)" }}>{myScore !== null ? `${Math.round(myScore)}pts` : "—"}</span>
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  <Clock className="w-3 h-3" style={{ color: "var(--smoke)" }} />
                  <span className="font-mono text-[10px]" style={{ color: "var(--ash)" }}>{fmtTime(mySolveMs)}</span>
                </div>
              </div>
            </div>

            {/* VS */}
            <div className="flex items-center justify-center">
              <span className="font-display text-lg" style={{ color: "var(--void)" }}>VS</span>
            </div>

            {/* Opponent stats */}
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <Kabuto size={36} tier={oppKt} glow={false} />
              </div>
              <div className="font-cond text-[9px] mb-2" style={{ color: "var(--bone)", letterSpacing: "0.1em" }}>
                {opponentProfileUsername ? (
                  <Link href={`/profile/${opponentProfileUsername}`} className="hover:opacity-70 transition-opacity">
                    {opponentUsername.toUpperCase()}
                  </Link>
                ) : opponentUsername.toUpperCase()}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-center gap-1.5">
                  <BarChart2 className="w-3 h-3" style={{ color: "var(--smoke)" }} />
                  <span className="font-mono text-[10px]" style={{ color: "var(--ash)" }}>{oppScore !== null ? `${Math.round(oppScore)}pts` : "—"}</span>
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  <Clock className="w-3 h-3" style={{ color: "var(--smoke)" }} />
                  <span className="font-mono text-[10px]" style={{ color: "var(--ash)" }}>{fmtTime(oppSolveMs)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 flex items-center justify-between"
            style={{ borderTop: "1px solid var(--ink-4)" }}>
            <span className="font-cond text-[9px]" style={{ color: "var(--smoke)", letterSpacing: "0.15em" }}>PROBLEM</span>
            <span className="font-display text-sm" style={{ color: "var(--bone)" }}>{problem.title.toUpperCase()}</span>
          </div>
        </motion.div>

        {/* Action buttons */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="space-y-3">

          {oppSolution && (
            <button
              onClick={() => setShowSolution(true)}
              className="flex items-center justify-between w-full px-5 py-4 rounded-xl transition-all group"
              style={{ border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.05)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.1)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.05)"; }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(239,68,68,0.12)" }}>
                  <Eye className="w-4 h-4" style={{ color: "#f87171" }} />
                </div>
                <div className="text-left">
                  <div className="font-display text-sm" style={{ color: "var(--bone)" }}>VIEW OPPONENT&apos;S SOLUTION</div>
                  <div className="font-cond text-[9px] mt-0.5" style={{ color: "var(--smoke)", letterSpacing: "0.1em" }}>
                    SEE HOW {opponentUsername.toUpperCase()} SOLVED IT
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 transition-colors" style={{ color: "var(--void)" }} />
            </button>
          )}

          <Link href={`/arena/${matchId}/practice`}
            className="flex items-center justify-between w-full px-5 py-4 rounded-xl transition-all group"
            style={{ border: "1px solid rgba(124,58,237,0.3)", background: "rgba(124,58,237,0.08)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.12)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.08)"; }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(124,58,237,0.18)" }}>
                <BookOpen className="w-4 h-4" style={{ color: "var(--violet-300)" }} />
              </div>
              <div className="text-left">
                <div className="font-display text-sm" style={{ color: "var(--bone)" }}>CONTINUE PRACTICING</div>
                <div className="font-cond text-[9px] mt-0.5" style={{ color: "var(--smoke)", letterSpacing: "0.1em" }}>
                  KEEP SOLVING — NO ELO AT STAKE
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4" style={{ color: "var(--void)" }} />
          </Link>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => router.push("/battle")}
              className="flex items-center justify-center gap-2 py-3 rounded-xl font-cond text-[10px] transition-all"
              style={{ background: "linear-gradient(135deg, var(--violet-600), var(--violet-800))", color: "var(--bone)", letterSpacing: "0.18em" }}
            >
              <RotateCcw className="w-3.5 h-3.5" /> REMATCH
            </button>
            <Link href="/dashboard"
              className="flex items-center justify-center gap-2 py-3 rounded-xl font-cond text-[10px] transition-all"
              style={{ border: "1px solid var(--ink-4)", color: "var(--ash)", letterSpacing: "0.18em" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--bone)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--ash)"; }}
            >
              DASHBOARD
            </Link>
          </div>
        </motion.div>

        {/* Info strip */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="mt-4 flex items-center gap-2 px-4 py-3 rounded"
          style={{ background: "var(--ink-2)", border: "1px solid var(--ink-4)" }}>
          <Crest size={12} color="var(--violet-400)" />
          <span className="font-cond text-[9px]" style={{ color: "var(--smoke)", letterSpacing: "0.14em" }}>
            PLAY MORE MATCHES TO CLIMB THE RANKS · {myTInfo.label.toUpperCase()} · {myCurrentElo} ELO
          </span>
        </motion.div>
      </motion.div>

      {/* Opponent solution modal */}
      <AnimatePresence>
        {showSolution && oppSolution && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
            onClick={() => setShowSolution(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="ax-card w-full max-w-2xl overflow-hidden flex flex-col"
              style={{ maxHeight: "80vh", padding: 0 }}
            >
              <div className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid var(--ink-4)" }}>
                <div>
                  <p className="font-display text-sm" style={{ color: "var(--bone)" }}>
                    {opponentUsername.toUpperCase()}&apos;S SOLUTION
                  </p>
                  <p className="font-cond text-[9px] mt-0.5 capitalize" style={{ color: "var(--smoke)", letterSpacing: "0.12em" }}>
                    {oppSolution.language.toUpperCase()}
                  </p>
                </div>
                <button onClick={() => setShowSolution(false)}
                  className="transition-colors" style={{ color: "var(--smoke)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--bone)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--smoke)"; }}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden" style={{ minHeight: "400px" }}>
                <MonacoEditor
                  height="400px"
                  language={oppSolution.language === "cpp" ? "cpp" : oppSolution.language === "java" ? "java" : oppSolution.language === "c" ? "c" : oppSolution.language === "javascript" ? "javascript" : "python"}
                  theme="vs-dark"
                  value={oppSolution.code}
                  options={{ readOnly: true, fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, padding: { top: 12 } }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
