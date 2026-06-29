"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Markdown from "@/components/ui/Markdown";
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
      <div className="max-w-2xl mx-auto px-4 py-20 text-center" style={{ background: "var(--ink-1)", minHeight: "100vh" }}>
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "var(--ink-2)", border: "1px solid var(--ink-4)" }}>
          <Calendar className="w-10 h-10" style={{ color: "var(--smoke)" }} />
        </div>
        <h1 className="font-display text-3xl mb-3" style={{ color: "var(--bone)" }}>NO CHALLENGE TODAY</h1>
        <p className="font-cond text-[10px] mb-6" style={{ color: "var(--smoke)", letterSpacing: "0.15em" }}>
          TODAY&apos;S CHALLENGE HASN&apos;T BEEN SET YET. CHECK BACK SOON.
        </p>
        <Link href="/battle"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-cond text-[10px]"
          style={{ background: "linear-gradient(135deg, var(--violet-600), var(--violet-800))", color: "var(--bone)", letterSpacing: "0.18em" }}>
          FIND A MATCH <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden" style={{ background: "var(--ink-1)" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 shrink-0"
        style={{ borderBottom: "1px solid var(--ink-4)", background: "var(--ink-2)" }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Flame className="w-5 h-5" style={{ color: streak > 0 ? "#f97316" : "var(--void)" }} />
            <span className="font-display text-base" style={{ color: "var(--bone)" }}>{streak}</span>
            <span className="font-cond text-[9px]" style={{ color: "var(--smoke)", letterSpacing: "0.15em" }}>DAY STREAK</span>
          </div>
          <div className="w-px h-4" style={{ background: "var(--ink-4)" }} />
          <span className="font-cond text-[9px]" style={{ color: "var(--smoke)", letterSpacing: "0.1em" }}>
            {new Date(today).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-display text-sm" style={{ color: "var(--bone)" }}>{problem?.title}</span>
          <span className="font-cond text-[9px] px-2 py-0.5 rounded"
            style={{ background: `${DIFF_COLORS[problem?.difficulty ?? 1]}18`, color: DIFF_COLORS[problem?.difficulty ?? 1], letterSpacing: "0.12em" }}>
            {DIFF_LABELS[problem?.difficulty ?? 1].toUpperCase()}
          </span>
          <span className="font-cond text-[9px] px-2 py-0.5 rounded"
            style={{ background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.25)", color: "#f97316", letterSpacing: "0.12em" }}>
            DAILY · 今日
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
            className="px-6 py-3 flex items-center justify-between shrink-0"
            style={{ background: "rgba(249,115,22,0.08)", borderBottom: "1px solid rgba(249,115,22,0.2)" }}
          >
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4" style={{ color: "#f97316" }} />
              <span className="font-cond text-[10px]" style={{ color: "#f97316", letterSpacing: "0.15em" }}>
                DAILY SOLVED · STREAK: {streak} DAYS
              </span>
            </div>
            <Link href="/battle"
              className="font-cond text-[9px] px-3 py-1.5 rounded-lg transition-all"
              style={{ background: "rgba(124,58,237,0.18)", color: "var(--violet-300)", letterSpacing: "0.15em" }}>
              FIND A MATCH →
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Problem panel */}
        <div className="w-[45%] flex flex-col overflow-hidden" style={{ borderRight: "1px solid var(--ink-4)" }}>
          <div className="flex-1 overflow-y-auto p-5 max-w-none">
            <div className="flex flex-wrap gap-1.5 mb-4">
              {problem?.topics.map((t) => (
                <span key={t} className="font-cond text-[9px] px-2 py-0.5 rounded"
                  style={{ background: "rgba(249,115,22,0.1)", color: "#f97316", border: "1px solid rgba(249,115,22,0.2)", letterSpacing: "0.1em" }}>
                  {t.toUpperCase()}
                </span>
              ))}
            </div>
            <Markdown>{problem?.description ?? ""}</Markdown>
          </div>

          {/* Heatmap */}
          <div className="p-4 shrink-0" style={{ borderTop: "1px solid var(--ink-4)" }}>
            <div className="font-cond text-[9px] mb-2" style={{ color: "var(--smoke)", letterSpacing: "0.18em" }}>LAST 90 DAYS</div>
            <div className="flex flex-wrap gap-1">
              {heatmap.map((day) => (
                <div
                  key={day.date}
                  title={day.date}
                  className="w-3 h-3 rounded-sm transition-all"
                  style={{
                    background: day.isToday
                      ? day.solved ? "#f97316" : "var(--ink-4)"
                      : day.solved ? "#f9731650" : "var(--ink-3)",
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
                style={{ borderTop: "1px solid var(--ink-4)", background: "var(--ink-2)" }}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BarChart2 className="w-4 h-4" style={{ color: "var(--smoke)" }} />
                      <span className="font-cond text-[10px]" style={{ color: "var(--bone)", letterSpacing: "0.15em" }}>RESULTS</span>
                    </div>
                    <span className="font-mono text-sm font-bold" style={{ color: passed === total ? "#22c55e" : "#f97316" }}>
                      {passed}/{total} passed
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {results.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
                        style={r.passed
                          ? { background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }
                          : { background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                        {r.passed
                          ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: "#22c55e" }} />
                          : <XCircle      className="w-3.5 h-3.5 shrink-0" style={{ color: "#f87171" }} />
                        }
                        <span style={{ color: r.passed ? "#22c55e" : "#f87171" }}>
                          Case {i + 1}: {r.verdict}
                        </span>
                        {r.time_ms && <span className="ml-auto font-mono" style={{ color: "var(--smoke)" }}>{r.time_ms}ms</span>}
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
          <div className="flex items-center justify-between px-3 py-2 shrink-0"
            style={{ borderBottom: "1px solid var(--ink-4)", background: "var(--ink-2)" }}>
            {/* Language selector */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all"
                style={{ background: "var(--ink-3)", border: "1px solid var(--ink-4)", color: "var(--bone)" }}
              >
                <span className="font-cond text-[10px]" style={{ letterSpacing: "0.1em" }}>{LANGUAGE_LABELS[language]}</span>
                <ChevronDown className="w-3 h-3" style={{ color: "var(--smoke)" }} />
              </button>
              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute top-full left-0 mt-1 rounded-xl overflow-hidden z-50 min-w-[160px]"
                    style={{ background: "var(--ink-2)", border: "1px solid var(--ink-4)" }}
                  >
                    {Object.entries(LANGUAGE_LABELS).map(([key, label]) => (
                      <button key={key} onClick={() => handleLanguageChange(key)}
                        className="w-full text-left px-4 py-2.5 font-cond text-[10px] transition-colors"
                        style={{ color: language === key ? "var(--violet-300)" : "var(--ash)", letterSpacing: "0.1em" }}
                        onMouseEnter={e => { if (language !== key) (e.currentTarget as HTMLElement).style.background = "var(--ink-3)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ""; }}>
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
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg font-cond text-[10px] disabled:opacity-50 transition-all"
              style={{
                background: solved ? "var(--ink-4)" : "linear-gradient(135deg, #f97316, #ea580c)",
                color: "var(--bone)",
                letterSpacing: "0.15em",
              }}
            >
              {solved ? (
                <><CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#22c55e" }} />SOLVED</>
              ) : submitting ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" />RUNNING…</>
              ) : (
                <><Send className="w-3.5 h-3.5" />SUBMIT</>
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