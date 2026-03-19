"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { DEFAULT_STARTERS, LANGUAGE_LABELS } from "@/lib/judge0";
import {
  Flame, CheckCircle2, XCircle, Send, Loader2,
  ChevronDown, BarChart2, Trophy, Calendar, ArrowRight,
} from "lucide-react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface TestResult {
  passed: boolean;
  verdict: string;
  time_ms: number | null;
  actual_output: string | null;
  expected_output: string;
}

interface DailyChallenge {
  id: string;
  date: string;
  solved: boolean;
  streak_count: number;
  problems: {
    id: string;
    title: string;
    description: string;
    difficulty: number;
    topics: string[];
    test_cases: Array<{ stdin: string; expected_stdout: string }>;
    time_limit_ms: number;
  };
}

interface Props {
  todayChallenge: DailyChallenge | null;
  history:        Array<{ date: string; solved: boolean; streak_count: number }>;
  currentStreak:  number;
  today:          string;
}

const DIFF_COLORS = ["", "#22c55e", "#86efac", "#ffd700", "#f97316", "#ef4444"];
const DIFF_LABELS = ["", "Easy", "Easy-Med", "Medium", "Med-Hard", "Hard"];

// Build a 90-day grid
function buildHeatmap(history: Array<{ date: string; solved: boolean }>, today: string) {
  const map: Record<string, boolean> = {};
  for (const h of history) map[h.date] = h.solved;

  const days: Array<{ date: string; solved: boolean; isToday: boolean }> = [];
  for (let i = 89; i >= 0; i--) {
    const d   = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
    days.push({ date: d, solved: map[d] ?? false, isToday: d === today });
  }
  return days;
}

export default function DailyClient({ todayChallenge, history, currentStreak, today }: Props) {
  const [language,   setLanguage]   = useState("python");
  const [code,       setCode]       = useState(DEFAULT_STARTERS["python"]);
  const [submitting, setSubmitting] = useState(false);
  const [results,    setResults]    = useState<TestResult[] | null>(null);
  const [passed,     setPassed]     = useState<number | null>(null);
  const [total,      setTotal]      = useState<number | null>(null);
  const [solved,     setSolved]     = useState(todayChallenge?.solved ?? false);
  const [streak,     setStreak]     = useState(currentStreak);
  const [langOpen,   setLangOpen]   = useState(false);

  const heatmap = buildHeatmap(history, today);
  const problem = todayChallenge?.problems;

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setCode(DEFAULT_STARTERS[lang]);
    setLangOpen(false);
  };

  const handleSubmit = useCallback(async () => {
    if (submitting || solved) return;
    setSubmitting(true);
    setResults(null);

    try {
      const res  = await fetch("/api/daily/solve", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ language, source_code: code }),
      });
      const data = await res.json();

      if (res.ok) {
        setPassed(data.passed);
        setTotal(data.total);
        setResults(data.results);
        if (data.all_ac) {
          setSolved(true);
          setStreak(data.streak);
        }
      }
    } finally {
      setSubmitting(false);
    }
  }, [submitting, solved, language, code]);

  if (!todayChallenge) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 rounded-3xl bg-[#111118] border border-[#2a2a3a] flex items-center justify-center mx-auto mb-6">
          <Calendar className="w-10 h-10 text-[#5a5a7a]" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">No challenge today</h1>
        <p className="text-[#5a5a7a] mb-6">
          Today&apos;s challenge hasn&apos;t been set yet. Check back soon or practice in the arena.
        </p>
        <Link href="/arena"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-white btn-glow"
          style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>
          Go to Arena <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] bg-[#08080f] flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1a1a2a] bg-[#0d0d15] shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Flame className={`w-5 h-5 ${streak > 0 ? "text-[#f97316]" : "text-[#5a5a7a]"}`} />
            <span className="text-sm font-bold text-white">{streak}</span>
            <span className="text-xs text-[#5a5a7a]">day streak</span>
          </div>
          <div className="w-px h-4 bg-[#2a2a3a]" />
          <span className="text-xs text-[#5a5a7a]">{new Date(today).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{problem?.title}</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: `${DIFF_COLORS[problem?.difficulty ?? 1]}18`, color: DIFF_COLORS[problem?.difficulty ?? 1] }}>
            {DIFF_LABELS[problem?.difficulty ?? 1]}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#f97316]/10 border border-[#f97316]/20 text-[#f97316] font-medium">
            Daily
          </span>
        </div>
        <div className="w-32" />
      </div>

      {/* Solved banner */}
      <AnimatePresence>
        {solved && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="bg-[#f97316]/10 border-b border-[#f97316]/20 px-6 py-3 flex items-center justify-between shrink-0"
          >
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#f97316]" />
              <span className="text-sm font-semibold text-[#f97316]">
                Daily solved! 🔥 Streak: {streak} days
              </span>
            </div>
            <Link href="/arena" className="text-xs px-3 py-1.5 rounded-lg bg-[#6366f1]/20 text-[#818cf8] font-medium hover:bg-[#6366f1]/30 transition-all">
              Battle in Arena →
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Problem panel */}
        <div className="w-[45%] flex flex-col border-r border-[#1a1a2a] overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 prose-sm prose-invert max-w-none">
            <div className="flex flex-wrap gap-1.5 mb-4">
              {problem?.topics.map((t) => (
                <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/20">
                  {t}
                </span>
              ))}
            </div>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {problem?.description ?? ""}
            </ReactMarkdown>
          </div>

          {/* Heatmap */}
          <div className="border-t border-[#1a1a2a] p-4 shrink-0">
            <div className="text-xs text-[#5a5a7a] mb-2 font-medium">Last 90 days</div>
            <div className="flex flex-wrap gap-1">
              {heatmap.map((day) => (
                <div
                  key={day.date}
                  title={day.date}
                  className="w-3 h-3 rounded-sm transition-all"
                  style={{
                    background: day.isToday
                      ? day.solved ? "#f97316" : "#2a2a3a"
                      : day.solved ? "#f9731650" : "#1a1a2a",
                    border: day.isToday ? "1px solid #f97316" : "none",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Test results */}
          <AnimatePresence>
            {results && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-[#1a1a2a] bg-[#0d0d15]"
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-[#5a5a7a]" />
                      <span className="text-sm font-medium text-white">Results</span>
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
                        {r.time_ms && <span className="ml-auto text-[#5a5a7a]">{r.time_ms}ms</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Editor panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a1a2a] bg-[#0d0d15] shrink-0">
            {/* Language selector */}
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
                      <button key={key} onClick={() => handleLanguageChange(key)}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#1a1a2a] transition-colors ${language === key ? "text-[#818cf8]" : "text-[#a1a1b5]"}`}>
                        {label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || solved}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all"
              style={{ background: solved ? "#2a2a3a" : "linear-gradient(135deg, #f97316, #ea580c)" }}
            >
              {solved ? (
                <><CheckCircle2 className="w-3.5 h-3.5 text-[#22c55e]" />Solved!</>
              ) : submitting ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" />Running…</>
              ) : (
                <><Send className="w-3.5 h-3.5" />Submit</>
              )}
            </button>
          </div>

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
    </div>
  );
}