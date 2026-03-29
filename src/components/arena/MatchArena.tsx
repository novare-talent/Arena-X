"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_STARTERS, LANGUAGE_LABELS } from "@/lib/judge0";
import {
  Clock, Swords, CheckCircle2, XCircle, AlertTriangle,
  ChevronDown, Loader2, Flag, Send, BarChart2,
} from "lucide-react";

// Monaco editor — client-only
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const TIER_COLORS: Record<string, string> = {
  unrated: "#5a5a7a", bronze: "#cd7f32", silver: "#c0c0c0",
  gold: "#ffd700", platinum: "#22d3ee", diamond: "#a855f7",
};

interface TestResult {
  passed: boolean;
  verdict: string;
  time_ms: number | null;
  actual_output: string | null;
  expected_output: string;
}

interface Props {
  matchId: string;
  userId: string;
  problem: {
    id: string;
    title: string;
    description: string;
    difficulty: number;
    topics: string[];
    match_duration_minutes: number;
    test_cases: Array<{ stdin: string; expected_stdout: string }>;
    time_limit_ms: number;
  };
  startedAt: string;
  myElo: number;
  myTier: string;
  opponentUsername: string;
  opponentElo: number;
  opponentTier: string;
  isPlayerOne: boolean;
}

const DIFF_LABELS = ["", "Easy", "Easy-Med", "Medium", "Med-Hard", "Hard"];
const DIFF_COLORS = ["", "#22c55e", "#86efac", "#ffd700", "#f97316", "#ef4444"];

export default function MatchArena({
  matchId, problem, startedAt,
  myElo, myTier, opponentUsername, opponentElo, opponentTier, isPlayerOne,
}: Omit<Props, "userId">) {
  const router   = useRouter();
  const supabase = createClient();

  const totalSeconds = problem.match_duration_minutes * 60;
  const [timeLeft,  setTimeLeft]   = useState(totalSeconds);
  const [language,  setLanguage]   = useState("python");
  const [code,      setCode]       = useState(DEFAULT_STARTERS["python"]);
  const [submitting, setSubmitting] = useState(false);
  const [results,   setResults]    = useState<TestResult[] | null>(null);
  const [passed,    setPassed]     = useState<number | null>(null);
  const [total,     setTotal]      = useState<number | null>(null);
  const [showResign, setShowResign] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null); // shown when Judge0 unreachable
  const [matchEnded, setMatchEnded] = useState(false);
  const [opponentStatus, setOpponentStatus] = useState<"solving" | "submitted" | "won">("solving");
  const [langOpen,  setLangOpen]  = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef  = useRef<NodeJS.Timeout | null>(null);

  // Countdown timer
  useEffect(() => {
    const started = new Date(startedAt).getTime();
    const tick = () => {
      const elapsed = Math.floor((Date.now() - started) / 1000);
      const left    = Math.max(0, totalSeconds - elapsed);
      setTimeLeft(left);
      if (left === 0) {
        clearInterval(timerRef.current!);
        // Auto-submit when time runs out (if not already ended)
        if (!matchEnded) handleSubmit();
      }
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current!);
  }, [startedAt, totalSeconds]); // eslint-disable-line react-hooks/exhaustive-deps

  // Shared handler — called by both Realtime and the poll fallback
  const handleMatchUpdate = useCallback((m: Record<string, unknown>) => {
    const oppScoreField = isPlayerOne ? "player_two_score" : "player_one_score";
    if (m[oppScoreField] !== null && m[oppScoreField] !== undefined) {
      setOpponentStatus("submitted");
    }
    if (m.status === "completed") {
      setMatchEnded(true);
      clearInterval(timerRef.current!);
      clearInterval(pollRef.current!);
      router.push(`/arena/${matchId}/result`);
    }
  }, [matchId, isPlayerOne, router]); // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime + polling fallback for match state
  useEffect(() => {
    // Realtime (primary)
    const channel = supabase
      .channel(`match-${matchId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${matchId}` },
        (payload) => handleMatchUpdate(payload.new as Record<string, unknown>)
      )
      .subscribe();

    // Poll every 2s as fallback (catches missed Realtime events)
    pollRef.current = setInterval(async () => {
      const { data } = await supabase
        .from("matches")
        .select("status, player_one_score, player_two_score")
        .eq("id", matchId)
        .single();
      if (data) handleMatchUpdate(data as Record<string, unknown>);
    }, 2000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollRef.current!);
    };
  }, [matchId, handleMatchUpdate]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setCode(DEFAULT_STARTERS[lang]);
    setLangOpen(false);
  };

  const handleSubmit = useCallback(async () => {
    if (submitting || matchEnded) return;
    setSubmitting(true);
    setResults(null);
    setSubmitError(null);

    try {
      // Save last submitted code so "Continue Practicing" can restore it
      try {
        localStorage.setItem(`practice_code_${problem.id}`, code);
        localStorage.setItem(`practice_lang_${problem.id}`, language);
      } catch { /* ignore storage errors */ }

      const res  = await fetch("/api/arena/submit", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ match_id: matchId, language, source_code: code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error ?? "Submission failed");
        return;
      }

      setPassed(data.passed);
      setTotal(data.total);
      setResults(data.results);

      if (data.match_ended) {
        setMatchEnded(true);
        clearInterval(timerRef.current!);
        setTimeout(() => router.push(`/arena/${matchId}/result`), 2000);
      }
    } finally {
      setSubmitting(false);
    }
  }, [submitting, matchEnded, matchId, language, code]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleResign = async () => {
    setShowResign(false);
    await fetch("/api/arena/resign", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ match_id: matchId }),
    });
    router.push(`/arena/${matchId}/result`);
  };

  const timerColor = timeLeft < 60 ? "#ef4444" : timeLeft < 300 ? "#f97316" : "#22d3ee";
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="h-screen bg-[#08080f] flex flex-col overflow-hidden">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1a1a2a] bg-[#0d0d15] shrink-0">
        {/* My info */}
        <div className="flex items-center gap-2 w-40">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#6366f1] to-[#818cf8]" />
          <div>
            <div className="text-xs font-medium text-white">You</div>
            <div className="text-xs" style={{ color: TIER_COLORS[myTier] }}>{myElo} ELO</div>
          </div>
        </div>

        {/* Center: timer + problem */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" style={{ color: timerColor }} />
            <span className="font-mono text-xl font-bold" style={{ color: timerColor }}>{fmt(timeLeft)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-white truncate max-w-[180px]">{problem.title}</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: `${DIFF_COLORS[problem.difficulty]}18`, color: DIFF_COLORS[problem.difficulty] }}>
              {DIFF_LABELS[problem.difficulty]}
            </span>
          </div>
        </div>

        {/* Opponent info */}
        <div className="flex items-center gap-2 justify-end w-40">
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end">
              <div className="text-xs font-medium text-white">{opponentUsername}</div>
              {opponentStatus === "submitted" && <CheckCircle2 className="w-3 h-3 text-[#22d3ee]" />}
              {opponentStatus === "won"       && <Swords       className="w-3 h-3 text-[#ffd700]" />}
            </div>
            <div className="text-xs" style={{ color: TIER_COLORS[opponentTier] }}>{opponentElo} ELO</div>
          </div>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#22d3ee] to-[#0891b2]" />
        </div>
      </div>

      {/* ── Body: Problem | Editor ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Problem Panel */}
        <div className="w-[45%] flex flex-col border-r border-[#1a1a2a] overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 prose-sm prose-invert max-w-none">
            <div className="flex flex-wrap gap-1.5 mb-4">
              {problem.topics.map((t) => (
                <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-[#6366f1]/10 text-[#818cf8] border border-[#6366f1]/20">
                  {t}
                </span>
              ))}
            </div>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {problem.description}
            </ReactMarkdown>
          </div>

          {/* Test results panel */}
          <AnimatePresence>
            {results && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-[#1a1a2a] bg-[#0d0d15] overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-[#5a5a7a]" />
                      <span className="text-sm font-medium text-white">Test Results</span>
                    </div>
                    <span className={`text-sm font-bold ${passed === total ? "text-[#22c55e]" : "text-[#f97316]"}`}>
                      {passed}/{total} passed
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {results.map((r, i) => (
                      <div key={i} className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${r.passed ? "bg-[#22c55e]/10 border border-[#22c55e]/20" : "bg-red-500/10 border border-red-500/20"}`}>
                        {r.passed
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-[#22c55e] shrink-0" />
                          : <XCircle      className="w-3.5 h-3.5 text-red-400   shrink-0" />
                        }
                        <span className={r.passed ? "text-[#22c55e]" : "text-red-400"}>
                          Case {i + 1}: {r.verdict}
                        </span>
                        {r.time_ms && (
                          <span className="ml-auto text-[#5a5a7a]">{r.time_ms}ms</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Editor Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor toolbar */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a1a2a] bg-[#0d0d15] shrink-0">
            {/* Language dropdown */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111118] border border-[#2a2a3a] text-sm text-white hover:border-[#3a3a4a] transition-all"
              >
                <span>{LANGUAGE_LABELS[language]}</span>
                <ChevronDown className="w-3 h-3 text-[#5a5a7a]" />
              </button>
              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute top-full left-0 mt-1 bg-[#111118] border border-[#2a2a3a] rounded-xl overflow-hidden z-50 min-w-[160px]"
                  >
                    {Object.entries(LANGUAGE_LABELS).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => handleLanguageChange(key)}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-[#1a1a2a] ${language === key ? "text-[#818cf8]" : "text-[#a1a1b5]"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowResign(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#5a5a7a] hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
              >
                <Flag className="w-3.5 h-3.5" />
                Resign
              </button>
              <button
                onClick={() => handleSubmit()}
                disabled={submitting || matchEnded}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
              >
                {submitting
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Judging…</>
                  : <><Send className="w-3.5 h-3.5" />Submit</>
                }
              </button>
            </div>
          </div>

          {/* Judge0 error banner */}
          <AnimatePresence>
            {submitError && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 flex items-center gap-2 text-xs text-red-400"
              >
                <XCircle className="w-3.5 h-3.5 shrink-0" />
                {submitError}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Monaco Editor */}
          <div className="flex-1">
            <MonacoEditor
              height="100%"
              language={language === "cpp" ? "cpp" : language === "javascript" ? "javascript" : language === "java" ? "java" : language === "c" ? "c" : "python"}
              value={code}
              onChange={(v) => setCode(v ?? "")}
              theme="vs-dark"
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbersMinChars: 3,
                padding: { top: 12, bottom: 12 },
                tabSize: 4,
                automaticLayout: true,
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Match Ended Overlay ── */}
      <AnimatePresence>
        {matchEnded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#6366f1] to-[#22d3ee] mx-auto flex items-center justify-center mb-4">
                <Swords className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Match Over</h2>
              <p className="text-[#5a5a7a]">Loading results…</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Resign Modal ── */}
      <AnimatePresence>
        {showResign && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowResign(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0d0d15] border border-[#2a2a3a] rounded-2xl p-8 max-w-sm w-full mx-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white text-center mb-2">Resign the match?</h3>
              <p className="text-[#5a5a7a] text-sm text-center mb-6">
                You&apos;ll forfeit this match and lose ELO. Your opponent wins immediately.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResign(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-[#a1a1b5] border border-[#2a2a3a] hover:border-[#3a3a4a] transition-all"
                >
                  Keep fighting
                </button>
                <button
                  onClick={handleResign}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500/80 hover:bg-red-500 transition-all"
                >
                  Resign
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}