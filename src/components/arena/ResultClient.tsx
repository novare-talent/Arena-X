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

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const TIER_COLORS: Record<string, string> = {
  unrated: "#5a5a7a", bronze: "#cd7f32", silver: "#c0c0c0",
  gold: "#ffd700", platinum: "#22d3ee", diamond: "#a855f7",
};

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
  oppScore, oppSolveMs,
  resigned, resignedBy, userId,
  oppSolution,
}: Props) {
  const router    = useRouter();
  const eloDelta  = myEloAfter - myEloBefore;
  const iResigned = resigned && resignedBy === userId;
  const [showSolution, setShowSolution] = useState(false);

  const OUTCOME_CONFIG = {
    win:  { label: "Victory!",   color: "#22d3ee", bg: "from-[#22d3ee]/20 to-transparent", icon: Trophy,    glow: "shadow-[#22d3ee]/30" },
    loss: { label: "Defeated",   color: "#ef4444", bg: "from-red-500/20 to-transparent",   icon: Swords,    glow: "shadow-red-500/30"   },
    draw: { label: "Draw",       color: "#ffd700", bg: "from-[#ffd700]/20 to-transparent", icon: Minus,     glow: "shadow-[#ffd700]/30"  },
  };
  const cfg = OUTCOME_CONFIG[outcome];
  const Icon = cfg.icon;

  return (
    <div className="min-h-screen grid-bg flex flex-col items-center justify-start py-12 px-4">
      <div className="orb orb-purple w-96 h-96 top-0 left-0 opacity-10" />
      <div className="orb orb-cyan w-96 h-96 bottom-0 right-0 opacity-10" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg relative z-10"
      >
        {/* Outcome badge */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", delay: 0.1 }}
          className={`w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br ${cfg.bg} border flex items-center justify-center mb-6 shadow-2xl ${cfg.glow}`}
          style={{ borderColor: `${cfg.color}40` }}
        >
          <Icon className="w-12 h-12" style={{ color: cfg.color }} />
        </motion.div>

        <h1 className="text-4xl font-bold text-white text-center mb-1">{cfg.label}</h1>
        <p className="text-[#5a5a7a] text-center text-sm mb-8">
          {endReason === "ac"      && "First to solve — all test cases passed"}
          {endReason === "timeout" && "Time's up — winner by score"}
          {endReason === "resign"  && (iResigned ? "You resigned" : `${opponentUsername} resigned`)}
          {endReason === "draw"    && "Equal scores — no ELO change"}
        </p>

        {/* ELO change */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="gradient-border rounded-2xl mb-4"
        >
          <div className="bg-[#0d0d15] rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-[#5a5a7a] mb-1">ELO Change</div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold" style={{ color: cfg.color }}>
                    {eloDelta > 0 ? `+${eloDelta}` : eloDelta}
                  </span>
                  {eloDelta > 0 && <TrendingUp  className="w-5 h-5 text-[#22d3ee]" />}
                  {eloDelta < 0 && <TrendingDown className="w-5 h-5 text-red-400"  />}
                  {eloDelta === 0 && <Minus      className="w-5 h-5 text-[#ffd700]" />}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-[#5a5a7a] mb-1">New ELO</div>
                <div className="text-2xl font-bold text-white">{myCurrentElo}</div>
                <div className="text-xs font-medium capitalize mt-0.5" style={{ color: TIER_COLORS[myCurrentTier] }}>
                  {myCurrentTier}
                </div>
              </div>
            </div>

            {/* ELO bar */}
            <div className="mt-4 bg-[#1a1a2a] rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: `${((myEloBefore - 600) / (2400 - 600)) * 100}%` }}
                animate={{ width: `${Math.min(100, ((myCurrentElo - 600) / (2400 - 600)) * 100)}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${TIER_COLORS[myCurrentTier]}, ${cfg.color})` }}
              />
            </div>
          </div>
        </motion.div>

        {/* Score comparison */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#111118] border border-[#2a2a3a] rounded-2xl p-5 mb-4"
        >
          <div className="text-xs text-[#5a5a7a] font-medium uppercase tracking-wider mb-4">Match Summary</div>
          <div className="grid grid-cols-3 gap-4">
            {/* My stats */}
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6366f1] to-[#818cf8] mx-auto mb-2" />
              <div className="text-sm font-medium text-white mb-2">{myUsername}</div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-center gap-1.5 text-xs text-[#5a5a7a]">
                  <BarChart2 className="w-3 h-3" />
                  <span>{myScore !== null ? `${Math.round(myScore)}pts` : "—"}</span>
                </div>
                <div className="flex items-center justify-center gap-1.5 text-xs text-[#5a5a7a]">
                  <Clock className="w-3 h-3" />
                  <span>{fmtTime(mySolveMs)}</span>
                </div>
              </div>
            </div>

            {/* VS */}
            <div className="flex items-center justify-center">
              <div className="text-[#5a5a7a] font-bold text-lg">VS</div>
            </div>

            {/* Opponent stats */}
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#22d3ee] to-[#0891b2] mx-auto mb-2" />
              <div className="text-sm font-medium text-white mb-2">
                {opponentProfileUsername ? (
                  <Link href={`/profile/${opponentProfileUsername}`} className="hover:text-[#22d3ee] transition-colors">
                    {opponentUsername}
                  </Link>
                ) : opponentUsername}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-center gap-1.5 text-xs text-[#5a5a7a]">
                  <BarChart2 className="w-3 h-3" />
                  <span>{oppScore !== null ? `${Math.round(oppScore)}pts` : "—"}</span>
                </div>
                <div className="flex items-center justify-center gap-1.5 text-xs text-[#5a5a7a]">
                  <Clock className="w-3 h-3" />
                  <span>{fmtTime(oppSolveMs)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[#1a1a2a] flex items-center justify-between text-sm">
            <span className="text-[#5a5a7a]">Problem</span>
            <span className="text-white font-medium">{problem.title}</span>
          </div>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          {/* View opponent's solution — only on loss */}
          {oppSolution && (
            <button
              onClick={() => setShowSolution(true)}
              className="flex items-center justify-between w-full px-5 py-4 rounded-2xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <Eye className="w-4 h-4 text-red-400" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-white">View Opponent&apos;s Solution</div>
                  <div className="text-xs text-[#5a5a7a]">See how {opponentUsername} solved it</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#5a5a7a] group-hover:text-red-400 transition-colors" />
            </button>
          )}

          {/* Continue practicing — key feature for learning */}
          <Link
            href={`/arena/${matchId}/practice`}
            className="flex items-center justify-between w-full px-5 py-4 rounded-2xl border border-[#6366f1]/30 bg-[#6366f1]/10 hover:bg-[#6366f1]/15 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#6366f1]/20 flex items-center justify-center">
                <BookOpen className="w-4.5 h-4.5 text-[#818cf8]" />
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-white">Continue Practicing</div>
                <div className="text-xs text-[#5a5a7a]">Keep solving this problem — no ELO at stake</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#5a5a7a] group-hover:text-[#818cf8] transition-colors" />
          </Link>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => router.push("/arena")}
              className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
            >
              <RotateCcw className="w-4 h-4" />
              Rematch
            </button>
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-[#a1a1b5] border border-[#2a2a3a] hover:border-[#3a3a4a] transition-all"
            >
              Dashboard
            </Link>
          </div>
        </motion.div>
      </motion.div>

      {/* Opponent solution modal */}
      <AnimatePresence>
        {showSolution && oppSolution && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowSolution(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-2xl bg-[#0d0d15] border border-[#2a2a3a] rounded-2xl overflow-hidden flex flex-col"
              style={{ maxHeight: "80vh" }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e2e]">
                <div>
                  <p className="text-sm font-semibold text-white">{opponentUsername}&apos;s Solution</p>
                  <p className="text-xs text-[#5a5a7a] mt-0.5 capitalize">{oppSolution.language}</p>
                </div>
                <button onClick={() => setShowSolution(false)} className="text-[#5a5a7a] hover:text-white transition-colors">
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