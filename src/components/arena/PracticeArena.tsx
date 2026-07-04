"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Markdown from "@/components/ui/Markdown";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { DEFAULT_STARTERS, LANGUAGE_LABELS } from "@/lib/judge0";
import { buildStarter, type HarnessProblem } from "@/lib/harness";
import {
  BookOpen, ArrowLeft, CheckCircle2, XCircle,
  ChevronDown, Loader2, Send, BarChart2, Trophy,
} from "lucide-react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface TestResult {
  passed: boolean;
  verdict: string;
  time_ms: number | null;
  actual_output: string | null;
  expected_output: string;
}

interface Props {
  matchId: string;
  problem: {
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
  };
}

const DIFF_COLORS = ["", "#22c55e", "#86efac", "#ffd700", "#f97316", "#ef4444"];
const DIFF_LABELS = ["", "Easy", "Easy-Med", "Medium", "Med-Hard", "Hard"];

export default function PracticeArena({ matchId, problem }: Props) {
  const starterFor = (lang: string) => buildStarter(problem, lang) ?? DEFAULT_STARTERS[lang];
  const savedLang = typeof window !== "undefined"
    ? (localStorage.getItem(`practice_lang_${problem.id}`) ?? "python")
    : "python";
  const savedCode = typeof window !== "undefined"
    ? (localStorage.getItem(`practice_code_${problem.id}`) ?? starterFor(savedLang))
    : starterFor("python");

  const [language,   setLanguage]   = useState(savedLang);
  const [code,       setCode]       = useState(savedCode);
  const [submitting, setSubmitting] = useState(false);
  const [results,    setResults]    = useState<TestResult[] | null>(null);
  const [passed,     setPassed]     = useState<number | null>(null);
  const [total,      setTotal]      = useState<number | null>(null);
  const [solved,     setSolved]     = useState(false);
  const [langOpen,   setLangOpen]   = useState(false);

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setCode(starterFor(lang));
    setLangOpen(false);
  };

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    setResults(null);

    try {
      const res  = await fetch("/api/practice/submit", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ problem_id: problem.id, language, source_code: code }),
      });
      const data = await res.json();

      if (res.ok) {
        setPassed(data.passed);
        setTotal(data.total);
        setResults(data.results);
        if (data.all_ac) setSolved(true);
      }
    } finally {
      setSubmitting(false);
    }
  }, [submitting, problem.id, language, code]);

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "var(--ink-1)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 shrink-0"
        style={{ borderBottom: "1px solid var(--ink-4)", background: "var(--ink-2)" }}>
        <Link
          href={`/arena/${matchId}/result`}
          className="flex items-center gap-1.5 text-sm text-[#5a5a7a] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to result
        </Link>

        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#6366f1]" />
          <span className="text-sm font-medium text-white">{problem.title}</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: `${DIFF_COLORS[problem.difficulty]}18`, color: DIFF_COLORS[problem.difficulty] }}>
            {DIFF_LABELS[problem.difficulty]}
          </span>
          <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[#6366f1]/10 border border-[#6366f1]/20 text-[#818cf8] font-medium">
            Practice Mode
          </span>
        </div>

        <div className="w-24" />
      </div>

      {/* Solved Banner */}
      <AnimatePresence>
        {solved && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="bg-[#22c55e]/10 border-b border-[#22c55e]/20 px-6 py-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#22c55e]" />
              <span className="text-sm font-semibold text-[#22c55e]">You solved it! All test cases passed.</span>
            </div>
            <Link
              href="/arena"
              className="text-xs px-3 py-1.5 rounded-lg bg-[#22c55e]/20 text-[#22c55e] font-medium hover:bg-[#22c55e]/30 transition-all"
            >
              Find next match →
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Body */}
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
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {results.map((r, i) => (
                      <div key={i} className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg ${r.passed ? "bg-[#22c55e]/10 border border-[#22c55e]/20" : "bg-red-500/10 border border-red-500/20"}`}>
                        {r.passed
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-[#22c55e] shrink-0 mt-0.5" />
                          : <XCircle      className="w-3.5 h-3.5 text-red-400   shrink-0 mt-0.5" />
                        }
                        <div className="flex-1 min-w-0">
                          <span className={r.passed ? "text-[#22c55e]" : "text-red-400"}>
                            Case {i + 1}: {r.verdict}
                          </span>
                          {!r.passed && r.actual_output !== null && (
                            <div className="mt-1 space-y-0.5 text-[#5a5a7a]">
                              <div>Expected: <span className="text-[#a1a1b5] font-mono">{r.expected_output.slice(0, 40)}</span></div>
                              <div>Got:      <span className="text-[#a1a1b5] font-mono">{r.actual_output.trim().slice(0, 40)}</span></div>
                            </div>
                          )}
                        </div>
                        {r.time_ms && (
                          <span className="text-[#5a5a7a] shrink-0">{r.time_ms}ms</span>
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

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all"
              style={{ background: "linear-gradient(135deg, #22d3ee, #0891b2)" }}
            >
              {submitting
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Running…</>
                : <><Send    className="w-3.5 h-3.5" />Run & Submit</>
              }
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