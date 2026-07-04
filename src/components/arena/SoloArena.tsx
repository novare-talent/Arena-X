"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import Markdown from "@/components/ui/Markdown";
import { DEFAULT_STARTERS, LANGUAGE_LABELS } from "@/lib/judge0";
import { buildStarter, type HarnessProblem } from "@/lib/harness";
import {
  Clock, CheckCircle2, XCircle, ChevronDown,
  Loader2, Send, BarChart2, Trophy, ArrowLeft, Timer,
} from "lucide-react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface TestResult {
  passed: boolean;
  verdict: string;
  time_ms: number | null;
  actual_output?: string | null;
  expected_output?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
}

interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: number;
  topics: string[];
  time_limit_ms: number;
  io_mode?: string | null;
  function_name?: string | null;
  param_spec?: HarnessProblem["param_spec"];
  return_spec?: HarnessProblem["return_spec"];
}

const DIFF_LABELS = ["", "Easy", "Easy-Med", "Medium", "Med-Hard", "Hard"];
const DIFF_COLORS = ["", "#22c55e", "#86efac", "#ffd700", "#f97316", "#ef4444"];

// 15 minutes for solo mode
const SOLO_DURATION_SECONDS = 15 * 60;

export default function SoloArena({ problem }: { problem: Problem }) {
  const router  = useRouter();
  const starterFor = (lang: string) => buildStarter(problem, lang) ?? DEFAULT_STARTERS[lang];

  const [timeLeft,    setTimeLeft]    = useState(SOLO_DURATION_SECONDS);
  const [language,    setLanguage]    = useState("python");
  const [code,        setCode]        = useState(() => starterFor("python"));
  const [submitting,  setSubmitting]  = useState(false);
  const [results,     setResults]     = useState<TestResult[] | null>(null);
  const [passed,      setPassed]      = useState<number | null>(null);
  const [total,       setTotal]       = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [solved,      setSolved]      = useState(false);
  const [timeUp,      setTimeUp]      = useState(false);
  const [langOpen,    setLangOpen]    = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const startedAt = Date.now();
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const left    = Math.max(0, SOLO_DURATION_SECONDS - elapsed);
      setTimeLeft(left);
      if (left === 0) {
        clearInterval(timerRef.current!);
        setTimeUp(true);
      }
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current!);
  }, []);

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setCode(starterFor(lang));
    setLangOpen(false);
  };

  const handleSubmit = useCallback(async () => {
    if (submitting || solved || timeUp) return;
    setSubmitting(true);
    setResults(null);
    setSubmitError(null);

    try {
      const res  = await fetch("/api/arena/solo/submit", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ problem_id: problem.id, language, source_code: code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error ?? "Submission failed");
        return;
      }

      setPassed(data.passed);
      setTotal(data.total);
      setResults(data.results);

      if (data.passed === data.total && data.total > 0) {
        setSolved(true);
        clearInterval(timerRef.current!);
      }
    } finally {
      setSubmitting(false);
    }
  }, [submitting, solved, timeUp, problem.id, language, code]);

  const timerColor = timeLeft < 60 ? "#ef4444" : timeLeft < 300 ? "#f97316" : "#22d3ee";
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "var(--ink-1)" }}>
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 shrink-0"
        style={{ borderBottom: "1px solid var(--ink-4)", background: "var(--ink-2)" }}>
        {/* Back button */}
        <button
          onClick={() => router.push("/arena")}
          className="flex items-center gap-1.5 text-[#5a5a7a] hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Exit
        </button>

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

        {/* Solo badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6366f1]/10 border border-[#6366f1]/20">
          <Timer className="w-3.5 h-3.5 text-[#818cf8]" />
          <span className="text-xs font-medium text-[#818cf8]">Solo Mode</span>
        </div>
      </div>

      {/* ── Body: Problem | Editor ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Problem Panel */}
        <div className="w-[45%] flex flex-col border-r border-[#1a1a2a] overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 max-w-none">
            <div className="flex flex-wrap gap-1.5 mb-4">
              {problem.topics.map((t) => (
                <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-[#6366f1]/10 text-[#818cf8] border border-[#6366f1]/20">
                  {t}
                </span>
              ))}
            </div>
            <Markdown>{problem.description}</Markdown>
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
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {results.map((r, i) => {
                      const out = r.actual_output ?? "";
                      const emptyOut = out.trim() === "";
                      const hasDetail = !r.passed && (r.expected_output != null || r.stderr || r.compile_output);
                      return (
                        <div key={i} className={`text-xs px-3 py-2 rounded-lg ${r.passed ? "bg-[#22c55e]/10 border border-[#22c55e]/20" : "bg-red-500/10 border border-red-500/20"}`}>
                          <div className="flex items-center gap-2">
                            {r.passed
                              ? <CheckCircle2 className="w-3.5 h-3.5 text-[#22c55e] shrink-0" />
                              : <XCircle      className="w-3.5 h-3.5 text-red-400   shrink-0" />}
                            <span className={r.passed ? "text-[#22c55e]" : "text-red-400"}>Case {i + 1}: {r.verdict}</span>
                            {r.time_ms && <span className="ml-auto text-[#5a5a7a]">{r.time_ms}ms</span>}
                          </div>
                          {hasDetail && (
                            <div className="mt-1.5 pl-5 space-y-1 font-mono text-[10px] text-[#8a8aa0]">
                              {r.compile_output && (
                                <pre className="whitespace-pre-wrap text-red-300/80">{r.compile_output.slice(0, 300)}</pre>
                              )}
                              {r.stderr && (
                                <pre className="whitespace-pre-wrap text-red-300/80">{r.stderr.slice(0, 300)}</pre>
                              )}
                              {r.expected_output != null && (
                                <>
                                  <div>expected: <span className="text-[#22c55e]">{JSON.stringify(r.expected_output)}</span></div>
                                  <div>got: <span className="text-red-300">{emptyOut ? "(no output)" : JSON.stringify(out)}</span></div>
                                </>
                              )}
                              {emptyOut && !r.stderr && !r.compile_output && (
                                <div className="text-[#f5c451]">No output — did you <b>print</b> your answer instead of returning it?</div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
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

            {/* Submit */}
            <button
              onClick={() => handleSubmit()}
              disabled={submitting || solved || timeUp}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
            >
              {submitting
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Judging…</>
                : <><Send className="w-3.5 h-3.5" />Submit</>
              }
            </button>
          </div>

          {/* Error banner */}
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

      {/* ── Solved Overlay ── */}
      <AnimatePresence>
        {solved && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", bounce: 0.4 }}
              className="bg-[#0d0d15] border border-[#22c55e]/30 rounded-2xl p-10 max-w-sm w-full mx-4 text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 0.6 }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-[#22c55e] to-[#16a34a] mx-auto flex items-center justify-center mb-5 shadow-2xl shadow-[#22c55e]/30"
              >
                <Trophy className="w-10 h-10 text-white" />
              </motion.div>
              <h2 className="text-3xl font-bold text-white mb-1">Problem Solved!</h2>
              <p className="text-[#5a5a7a] text-sm mb-1">All test cases passed</p>
              <p className="text-lg font-mono font-bold text-[#22c55e] mb-6">
                Time: {fmt(SOLO_DURATION_SECONDS - timeLeft)}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push("/arena")}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-[#a1a1b5] border border-[#2a2a3a] hover:border-[#3a3a4a] transition-all"
                >
                  Back to Arena
                </button>
                <button
                  onClick={() => router.push("/arena/solo")}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                  style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
                >
                  Next Problem
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Time Up Overlay ── */}
      <AnimatePresence>
        {timeUp && !solved && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", bounce: 0.3 }}
              className="bg-[#0d0d15] border border-[#2a2a3a] rounded-2xl p-10 max-w-sm w-full mx-4 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-[#1a1a2a] border border-[#2a2a3a] mx-auto flex items-center justify-center mb-5">
                <Clock className="w-10 h-10 text-[#5a5a7a]" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-1">Time&apos;s Up</h2>
              <p className="text-[#5a5a7a] text-sm mb-2">
                {passed !== null ? `You passed ${passed}/${total} test cases.` : "Keep practicing — you'll get it!"}
              </p>
              <p className="text-xs text-[#3a3a5a] mb-6">No ELO change in solo mode.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push("/arena")}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-[#a1a1b5] border border-[#2a2a3a] hover:border-[#3a3a4a] transition-all"
                >
                  Back to Arena
                </button>
                <button
                  onClick={() => router.push("/arena/solo")}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                  style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
                >
                  Try Again
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}