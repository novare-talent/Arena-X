"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, ChevronRight, ChevronDown, Lock, Star,
  Loader2, Zap, CheckCircle2, AlertCircle, Eye,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

type Task = {
  id: string;
  goal: string;
  input_material: string | null;
  domain: string;
  difficulty: number;
};

type Exercise = {
  id: string;
  title: string;
  guide_markdown: string;
  sort_order: number;
  prompt_tasks: Task | null;
};

type Module = {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_free: boolean;
  prompt_exercises: Exercise[];
};

type ScoreResult = {
  score_goal: number;
  score_context: number;
  score_constraint: number;
  score_robustness: number;
  score_efficiency: number;
  composite_score: number;
  tier: string;
  feedback: string;
  model_output: string;
};

const CRITERIA = [
  { key: "score_goal",       label: "Goal Specificity"    },
  { key: "score_context",    label: "Context Provisioning" },
  { key: "score_constraint", label: "Constraint Precision" },
  { key: "score_robustness", label: "Robustness"           },
  { key: "score_efficiency", label: "Efficiency"            },
] as const;

const TIER_COLOR: Record<string, string> = {
  Novice:       "#6b7280",
  Apprentice:   "#22d3ee",
  Practitioner: "#22c55e",
  Expert:       "#f59e0b",
  Master:       "#e879f9",
};

type Props = {
  modules: Module[];
  progressMap: Record<string, { best_score: number; completed: boolean }>;
  isPro: boolean;
  userId: string;
};

export default function PromptLearnClient({ modules, progressMap, isPro, userId }: Props) {
  const [expandedModule, setExpandedModule] = useState<string | null>(modules[0]?.id ?? null);
  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);
  const [promptText, setPromptText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [showOutput, setShowOutput] = useState(false);
  const [localProgress, setLocalProgress] = useState<Record<string, { best_score: number; completed: boolean }>>(progressMap);

  async function handleSubmit() {
    if (!activeExercise?.prompt_tasks || !promptText.trim()) return;
    setIsSubmitting(true);
    setResult(null);
    setShowOutput(false);

    try {
      const res = await fetch("/api/prompt-battle/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: "learn-" + activeExercise.id,
          task_id: activeExercise.prompt_tasks.id,
          prompt_text: promptText,
          model: "gpt-4o-mini",
          attempt_number: 1,
          is_pro_revision: false,
        }),
      });
      const data: ScoreResult = await res.json();
      setResult(data);

      // Save progress
      const prev = localProgress[activeExercise.id];
      const newBest = Math.max(prev?.best_score ?? 0, data.composite_score);
      const nowCompleted = data.composite_score >= 60 || (prev?.completed ?? false);
      setLocalProgress((p) => ({
        ...p,
        [activeExercise.id]: { best_score: newBest, completed: nowCompleted },
      }));

      await fetch("/api/learn/exercise-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exercise_id: activeExercise.id,
          best_score: newBest,
          completed: nowCompleted,
        }),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  }

  const completedCount = Object.values(localProgress).filter((p) => p.completed).length;
  const totalExercises = modules.reduce((a, m) => a + m.prompt_exercises.length, 0);

  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-20 pb-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-5 h-5 text-[#f59e0b]" />
            <span className="text-sm text-[#5a5a7a] font-medium uppercase tracking-wider">AI Prompting Track</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Prompt Engineering</h1>
              <p className="text-[#5a5a7a] text-sm">
                {completedCount} / {totalExercises} exercises completed
              </p>
            </div>
            {totalExercises > 0 && (
              <p className="text-2xl font-bold text-[#f59e0b]">
                {Math.round((completedCount / totalExercises) * 100)}%
              </p>
            )}
          </div>
          {totalExercises > 0 && (
            <div className="mt-3 h-1.5 bg-[#1e1e2e] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-[#f59e0b]"
                initial={{ width: 0 }}
                animate={{ width: `${(completedCount / totalExercises) * 100}%` }}
                transition={{ duration: 0.6, delay: 0.2 }}
              />
            </div>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Module list */}
          <div className="lg:col-span-2 space-y-3">
            {modules.length === 0 ? (
              <div className="bg-[#111118] border border-[#2a2a3a] rounded-xl p-6 text-center text-[#5a5a7a] text-sm">
                Modules coming soon.
              </div>
            ) : (
              modules.map((mod, i) => {
                const locked = !mod.is_free && !isPro;
                const isExpanded = expandedModule === mod.id && !locked;
                const exercises = mod.prompt_exercises.sort((a, b) => a.sort_order - b.sort_order);
                const modDone = exercises.filter((e) => localProgress[e.id]?.completed).length;

                return (
                  <motion.div
                    key={mod.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className={`bg-[#111118] border rounded-xl overflow-hidden ${
                      locked ? "border-[#2a2a3a] opacity-70" : "border-[#2a2a3a]"
                    }`}
                  >
                    <button
                      disabled={locked}
                      onClick={() => setExpandedModule(isExpanded ? null : mod.id)}
                      className="w-full flex items-center justify-between p-4 hover:bg-[#16161e] transition-colors disabled:cursor-not-allowed"
                    >
                      <div className="text-left">
                        <div className="flex items-center gap-2 mb-0.5">
                          {mod.is_free ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#22c55e]/20 text-[#4ade80] uppercase">Free</span>
                          ) : (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#f59e0b]/20 text-[#fbbf24] uppercase flex items-center gap-1">
                              <Star className="w-2.5 h-2.5" /> Pro
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-white">Module {mod.sort_order}: {mod.title}</p>
                        <p className="text-xs text-[#5a5a7a] mt-0.5">{modDone}/{exercises.length} done</p>
                      </div>
                      <div className="shrink-0">
                        {locked ? (
                          <Lock className="w-4 h-4 text-[#3a3a4a]" />
                        ) : isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-[#5a5a7a]" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-[#5a5a7a]" />
                        )}
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          className="overflow-hidden border-t border-[#2a2a3a]"
                        >
                          <div className="max-h-64 overflow-y-auto">
                            {exercises.map((ex) => {
                              const prog = localProgress[ex.id];
                              const isActive = activeExercise?.id === ex.id;
                              return (
                                <button
                                  key={ex.id}
                                  onClick={() => { setActiveExercise(ex); setPromptText(""); setResult(null); setShowOutput(false); }}
                                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[#16161e] ${isActive ? "bg-[#1a1a2e]" : ""}`}
                                >
                                  {prog?.completed ? (
                                    <CheckCircle2 className="w-4 h-4 text-[#22c55e] shrink-0" />
                                  ) : (
                                    <div className="w-4 h-4 rounded-full border border-[#3a3a4a] shrink-0" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-[#a1a1b5] truncate">{ex.title}</p>
                                    {prog?.best_score ? (
                                      <p className="text-[10px] text-[#5a5a7a]">Best: {prog.best_score}/100</p>
                                    ) : null}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Exercise panel */}
          <div className="lg:col-span-3">
            {!activeExercise ? (
              <div className="rounded-2xl border border-[#2a2a3a] bg-[#111118] flex flex-col items-center justify-center text-center p-12">
                <div className="w-16 h-16 rounded-2xl bg-[#f59e0b]/10 flex items-center justify-center mb-4">
                  <Brain className="w-8 h-8 text-[#f59e0b]" />
                </div>
                <p className="text-white font-semibold mb-1">Select an exercise</p>
                <p className="text-sm text-[#5a5a7a]">Choose a module and click any exercise to begin.</p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeExercise.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  className="space-y-4"
                >
                  {/* Guide card */}
                  <div className="bg-[#111118] border border-[#2a2a3a] rounded-2xl p-5">
                    <p className="text-xs font-semibold text-[#f59e0b] uppercase tracking-wider mb-3">
                      {activeExercise.title}
                    </p>
                    <div className="prose prose-sm prose-invert max-w-none text-[#a1a1b5] leading-relaxed">
                      <ReactMarkdown>{activeExercise.guide_markdown}</ReactMarkdown>
                    </div>
                  </div>

                  {/* Task */}
                  {activeExercise.prompt_tasks && (
                    <div className="bg-[#0d0d14] border border-[#2a2a3a] rounded-2xl p-5">
                      <p className="text-xs font-semibold text-[#5a5a7a] uppercase tracking-wider mb-2">Your task</p>
                      <p className="text-sm text-white leading-relaxed mb-3">{activeExercise.prompt_tasks.goal}</p>
                      {activeExercise.prompt_tasks.input_material && (
                        <pre className="text-xs text-[#a1a1b5] bg-[#111118] border border-[#2a2a3a] rounded-xl p-4 overflow-x-auto whitespace-pre-wrap">
                          {activeExercise.prompt_tasks.input_material}
                        </pre>
                      )}
                    </div>
                  )}

                  {/* Prompt input */}
                  {!result && (
                    <div className="bg-[#111118] border border-[#2a2a3a] rounded-2xl p-5">
                      <label className="block text-sm font-semibold text-[#a1a1b5] mb-2">Your prompt</label>
                      <textarea
                        value={promptText}
                        onChange={(e) => setPromptText(e.target.value)}
                        placeholder="Write your prompt here…"
                        className="w-full h-36 bg-[#0d0d14] border border-[#2a2a3a] rounded-xl p-4 text-sm text-white placeholder:text-[#3a3a4a] focus:outline-none focus:border-[#f59e0b]/40 resize-none leading-relaxed"
                      />
                      <div className="flex justify-end mt-3">
                        <button
                          onClick={handleSubmit}
                          disabled={isSubmitting || !promptText.trim()}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-[#0a0a0f] disabled:opacity-50"
                          style={{ background: isSubmitting ? "#555" : "#f59e0b" }}
                        >
                          {isSubmitting ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Judging…</>
                          ) : (
                            <><Zap className="w-4 h-4" /> Submit</>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Score result */}
                  {result && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      <div className="bg-[#111118] border border-[#2a2a3a] rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <span className="text-3xl font-bold" style={{ color: TIER_COLOR[result.tier] ?? "#fff" }}>
                              {result.composite_score}
                              <span className="text-base text-[#5a5a7a] font-normal">/100</span>
                            </span>
                            <p className="text-sm font-semibold mt-0.5" style={{ color: TIER_COLOR[result.tier] ?? "#fff" }}>
                              {result.tier}
                            </p>
                          </div>
                          <button
                            onClick={() => setShowOutput(!showOutput)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2a2a3a] text-xs text-[#6b6b8a] hover:text-white transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            {showOutput ? "Hide" : "Show"} output
                          </button>
                        </div>

                        <div className="space-y-2 mb-4">
                          {CRITERIA.map((c) => {
                            const val = result[c.key];
                            return (
                              <div key={c.key} className="flex items-center gap-3">
                                <span className="text-xs text-[#6b6b8a] w-36 shrink-0">{c.label}</span>
                                <div className="flex-1 h-1.5 bg-[#1e1e2e] rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${(val / 4) * 100}%`,
                                      background: val >= 3 ? "#22c55e" : val >= 2 ? "#f59e0b" : "#ef4444",
                                    }}
                                  />
                                </div>
                                <span className="text-xs font-semibold text-white w-8 text-right">{val}/4</span>
                              </div>
                            );
                          })}
                        </div>

                        <div className="pt-4 border-t border-[#2a2a3a]">
                          <div className="flex items-start gap-2 text-sm text-[#a1a1b5]">
                            <AlertCircle className="w-4 h-4 text-[#f59e0b] shrink-0 mt-0.5" />
                            <p className="leading-relaxed">{result.feedback}</p>
                          </div>
                        </div>
                      </div>

                      {showOutput && (
                        <div className="bg-[#0d0d14] border border-[#2a2a3a] rounded-2xl p-5">
                          <p className="text-xs font-semibold text-[#5a5a7a] uppercase tracking-wider mb-3">Model output</p>
                          <p className="text-sm text-[#a1a1b5] leading-relaxed whitespace-pre-wrap">{result.model_output}</p>
                        </div>
                      )}

                      <div className="flex gap-3">
                        <button
                          onClick={() => { setResult(null); setPromptText(""); setShowOutput(false); }}
                          className="flex-1 py-2.5 rounded-xl border border-[#2a2a3a] text-sm font-semibold text-[#a1a1b5] hover:text-white hover:border-[#4a4a5a] transition-colors"
                        >
                          Try again
                        </button>
                        {isPro && (
                          <button
                            onClick={() => { setResult(null); setShowOutput(false); }}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#f59e0b]/30 text-sm font-semibold text-[#fbbf24] hover:bg-[#f59e0b]/10 transition-colors"
                          >
                            <Star className="w-4 h-4" /> Revise (Pro)
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
