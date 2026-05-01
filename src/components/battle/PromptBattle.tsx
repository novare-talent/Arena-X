"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Zap, ChevronRight, RotateCcw, Star,
  CheckCircle2, AlertCircle, Loader2, Eye,
} from "lucide-react";

type Task = {
  id: string;
  domain: string;
  task_type: string;
  difficulty: number;
  goal: string;
  input_material: string | null;
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
  attempt_id: string;
};

const MODELS = [
  { id: "gpt-4o-mini", label: "GPT-4o mini", provider: "OpenAI", color: "#22c55e" },
  { id: "gpt-4o",      label: "GPT-4o",      provider: "OpenAI", color: "#22c55e" },
  { id: "gemini-pro",  label: "Gemini 1.5 Flash", provider: "Google", color: "#4285f4" },
];

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

const DIFFICULTY_LABEL = ["", "Easy", "Medium", "Medium", "Hard", "Expert"];

type Props = {
  userId: string;
  isPro: boolean;
  displayName: string;
};

export default function PromptBattle({ userId, isPro, displayName }: Props) {
  const [phase, setPhase] = useState<"setup" | "battle" | "results">("setup");
  const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTaskIdx, setCurrentTaskIdx] = useState(0);
  const [promptText, setPromptText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<(ScoreResult | null)[]>([null, null, null]);
  const [showOutput, setShowOutput] = useState(false);
  const [isRevising, setIsRevising] = useState(false);
  const [sessionScores, setSessionScores] = useState<number[]>([]);
  const [dailyTask, setDailyTask] = useState<Task | null>(null);
  const [loadingStart, setLoadingStart] = useState(false);

  const currentTask = tasks[currentTaskIdx];
  const currentResult = results[currentTaskIdx];

  async function handleStart() {
    setLoadingStart(true);
    try {
      const res = await fetch("/api/prompt-battle/start", { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSessionId(data.session_id);
      setTasks(data.tasks);
      setDailyTask(data.daily_task ?? null);
      setResults([null, null, null]);
      setSessionScores([]);
      setCurrentTaskIdx(0);
      setPromptText("");
      setPhase("battle");
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStart(false);
    }
  }

  const handleSubmit = useCallback(async (revision = false) => {
    if (!promptText.trim() || !sessionId || !currentTask) return;
    setIsSubmitting(true);
    setShowOutput(false);

    try {
      const res = await fetch("/api/prompt-battle/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          task_id: currentTask.id,
          prompt_text: promptText,
          model: selectedModel,
          attempt_number: revision ? 2 : 1,
          is_pro_revision: revision,
        }),
      });
      const data: ScoreResult = await res.json();
      const updated = [...results];
      updated[currentTaskIdx] = data;
      setResults(updated);
      if (!revision) {
        setSessionScores((prev) => [...prev, data.composite_score]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
      setIsRevising(false);
    }
  }, [promptText, sessionId, currentTask, selectedModel, results, currentTaskIdx]);

  function handleNext() {
    if (currentTaskIdx < 2) {
      setCurrentTaskIdx(currentTaskIdx + 1);
      setPromptText("");
      setShowOutput(false);
      setIsRevising(false);
    } else {
      setPhase("results");
    }
  }

  function handleReset() {
    setPhase("setup");
    setSessionId(null);
    setTasks([]);
    setResults([null, null, null]);
    setPromptText("");
    setSessionScores([]);
  }

  const avgScore = sessionScores.length
    ? Math.round(sessionScores.reduce((a, b) => a + b, 0) / sessionScores.length)
    : 0;

  // ── Setup screen ─────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <div className="min-h-screen bg-[#0a0a0f] pt-20 pb-12 px-4 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[#f59e0b]/20 flex items-center justify-center mx-auto mb-4">
              <Brain className="w-8 h-8 text-[#f59e0b]" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Prompt Battle</h1>
            <p className="text-[#6b6b8a]">3 tasks · AI judge · 5-criteria scoring</p>
          </div>

          {/* Model selector */}
          <div className="bg-[#111118] border border-[#2a2a3a] rounded-2xl p-5 mb-4">
            <p className="text-xs font-semibold text-[#5a5a7a] uppercase tracking-wider mb-3">
              Choose execution model
            </p>
            <div className="space-y-2">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModel(m.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                    selectedModel === m.id
                      ? "border-[#f59e0b]/40 bg-[#f59e0b]/8"
                      : "border-[#2a2a3a] hover:border-[#3a3a4a]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: selectedModel === m.id ? m.color : "#3a3a4a" }}
                    />
                    <span className="text-sm font-medium text-white">{m.label}</span>
                    <span className="text-xs text-[#5a5a7a]">{m.provider}</span>
                  </div>
                  {selectedModel === m.id && (
                    <CheckCircle2 className="w-4 h-4 text-[#f59e0b]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div className="bg-[#111118] border border-[#2a2a3a] rounded-2xl p-5 mb-6 space-y-2.5">
            <p className="text-xs font-semibold text-[#5a5a7a] uppercase tracking-wider mb-1">How it works</p>
            {[
              "You get 3 curated tasks from our task bank",
              "Write a prompt you'd send to the selected model",
              "The model runs your prompt and an AI judge scores it on 5 criteria",
              isPro ? "Pro: submit a revised prompt after seeing feedback" : "Pro: revise after feedback (upgrade to unlock)",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm text-[#8888aa]">
                <span className="w-4 h-4 rounded-full bg-[#1e1e2e] flex items-center justify-center text-[10px] text-[#5a5a7a] shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {step}
              </div>
            ))}
          </div>

          <button
            onClick={handleStart}
            disabled={loadingStart}
            className="w-full py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
          >
            {loadingStart ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Loading tasks…</>
            ) : (
              <><Zap className="w-4 h-4" /> Start Battle</>
            )}
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Results screen ───────────────────────────────────────────────
  if (phase === "results") {
    const topTier = sessionScores.length
      ? (() => {
          const max = Math.max(...sessionScores);
          if (max >= 91) return "Master";
          if (max >= 76) return "Expert";
          if (max >= 61) return "Practitioner";
          if (max >= 41) return "Apprentice";
          return "Novice";
        })()
      : "Novice";

    return (
      <div className="min-h-screen bg-[#0a0a0f] pt-20 pb-12 px-4 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg text-center"
        >
          <div className="text-5xl mb-4">🏆</div>
          <h2 className="text-2xl font-bold text-white mb-1">Session Complete</h2>
          <p className="text-[#5a5a7a] mb-6">3 tasks attempted, {displayName}</p>

          <div className="bg-[#111118] border border-[#2a2a3a] rounded-2xl p-6 mb-6">
            <div className="flex justify-around">
              <div>
                <p className="text-3xl font-bold text-white">{avgScore}</p>
                <p className="text-xs text-[#5a5a7a] mt-1">Avg score</p>
              </div>
              <div>
                <p className="text-3xl font-bold" style={{ color: TIER_COLOR[topTier] ?? "#fff" }}>
                  {topTier}
                </p>
                <p className="text-xs text-[#5a5a7a] mt-1">Best tier</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{Math.max(...(sessionScores.length ? sessionScores : [0]))}</p>
                <p className="text-xs text-[#5a5a7a] mt-1">Highest</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#2a2a3a] space-y-2">
              {results.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-[#6b6b8a]">Task {i + 1} — {tasks[i]?.domain}</span>
                  <span
                    className="font-semibold"
                    style={{ color: r ? TIER_COLOR[r.tier] ?? "#fff" : "#3a3a4a" }}
                  >
                    {r ? `${r.composite_score}/100` : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 py-3 rounded-xl border border-[#2a2a3a] text-sm font-semibold text-[#a1a1b5] hover:border-[#4a4a5a] hover:text-white transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> New Session
            </button>
            <a
              href="/battle"
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
            >
              Battle Hub <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Battle screen ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-20 pb-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-[#5a5a7a] mb-2">
            <span>Task {currentTaskIdx + 1} of 3</span>
            <span className="capitalize">{selectedModel}</span>
          </div>
          <div className="h-1 bg-[#1e1e2e] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: "#f59e0b" }}
              initial={{ width: 0 }}
              animate={{ width: `${((currentTaskIdx) / 3) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        {currentTask && (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTaskIdx}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              {/* Task card */}
              <div className="bg-[#111118] border border-[#2a2a3a] rounded-2xl p-5 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#f59e0b]/20 text-[#fbbf24]">
                    {currentTask.domain}
                  </span>
                  <span className="text-xs text-[#5a5a7a]">{DIFFICULTY_LABEL[currentTask.difficulty]}</span>
                </div>

                <p className="text-sm font-semibold text-[#a1a1b5] mb-1">Goal</p>
                <p className="text-white leading-relaxed mb-4">{currentTask.goal}</p>

                {currentTask.input_material && (
                  <>
                    <p className="text-sm font-semibold text-[#a1a1b5] mb-2">Input material</p>
                    <pre className="text-xs text-[#a1a1b5] bg-[#0d0d14] border border-[#2a2a3a] rounded-xl p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {currentTask.input_material}
                    </pre>
                  </>
                )}
              </div>

              {/* Prompt input */}
              {!currentResult && (
                <div className="bg-[#111118] border border-[#2a2a3a] rounded-2xl p-5 mb-4">
                  <label className="block text-sm font-semibold text-[#a1a1b5] mb-2">
                    Your prompt
                  </label>
                  <textarea
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder="Write the prompt you'd send to the model to accomplish this task…"
                    className="w-full h-40 bg-[#0d0d14] border border-[#2a2a3a] rounded-xl p-4 text-sm text-white placeholder:text-[#3a3a4a] focus:outline-none focus:border-[#f59e0b]/40 resize-none leading-relaxed"
                  />
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-[#3a3a4a]">{promptText.trim().split(/\s+/).filter(Boolean).length} words</span>
                    <button
                      onClick={() => handleSubmit(false)}
                      disabled={isSubmitting || !promptText.trim()}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-[#0a0a0f] disabled:opacity-50 transition-all"
                      style={{ background: isSubmitting ? "#555" : "#f59e0b" }}
                    >
                      {isSubmitting ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Judging…</>
                      ) : (
                        <><Zap className="w-4 h-4" /> Submit & Judge</>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Score result */}
              {currentResult && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Score header */}
                  <div className="bg-[#111118] border border-[#2a2a3a] rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span
                          className="text-3xl font-bold"
                          style={{ color: TIER_COLOR[currentResult.tier] ?? "#fff" }}
                        >
                          {currentResult.composite_score}
                          <span className="text-base text-[#5a5a7a] font-normal">/100</span>
                        </span>
                        <p className="text-sm font-semibold mt-0.5" style={{ color: TIER_COLOR[currentResult.tier] ?? "#fff" }}>
                          {currentResult.tier}
                        </p>
                      </div>
                      <button
                        onClick={() => setShowOutput(!showOutput)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2a2a3a] text-xs text-[#6b6b8a] hover:text-white hover:border-[#4a4a5a] transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {showOutput ? "Hide" : "Show"} model output
                      </button>
                    </div>

                    {/* Criteria table */}
                    <div className="space-y-2">
                      {CRITERIA.map((c) => {
                        const val = currentResult[c.key];
                        return (
                          <div key={c.key} className="flex items-center gap-3">
                            <span className="text-xs text-[#6b6b8a] w-36 shrink-0">{c.label}</span>
                            <div className="flex-1 h-1.5 bg-[#1e1e2e] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
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

                    {/* Feedback */}
                    <div className="mt-4 pt-4 border-t border-[#2a2a3a]">
                      <div className="flex items-start gap-2 text-sm text-[#a1a1b5]">
                        <AlertCircle className="w-4 h-4 text-[#f59e0b] shrink-0 mt-0.5" />
                        <p className="leading-relaxed">{currentResult.feedback}</p>
                      </div>
                    </div>
                  </div>

                  {/* Model output */}
                  <AnimatePresence>
                    {showOutput && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-[#0d0d14] border border-[#2a2a3a] rounded-2xl p-5 overflow-hidden"
                      >
                        <p className="text-xs font-semibold text-[#5a5a7a] uppercase tracking-wider mb-3">
                          Model output ({selectedModel})
                        </p>
                        <p className="text-sm text-[#a1a1b5] leading-relaxed whitespace-pre-wrap">
                          {currentResult.model_output}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Pro revision or next */}
                  <div className="flex gap-3">
                    {isPro && !isRevising && (
                      <button
                        onClick={() => { setIsRevising(true); setPromptText(""); }}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#f59e0b]/30 text-sm font-semibold text-[#fbbf24] hover:bg-[#f59e0b]/10 transition-colors"
                      >
                        <Star className="w-4 h-4" /> Revise prompt
                      </button>
                    )}
                    {!isPro && (
                      <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#2a2a3a] text-sm text-[#5a5a7a]">
                        <Star className="w-4 h-4" /> <span>Revise — Pro only</span>
                      </div>
                    )}
                    <button
                      onClick={handleNext}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                      style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
                    >
                      {currentTaskIdx < 2 ? "Next task" : "See results"}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Revision input */}
                  {isRevising && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-[#111118] border border-[#f59e0b]/20 rounded-2xl p-5"
                    >
                      <p className="text-sm font-semibold text-[#fbbf24] mb-3">Revised prompt</p>
                      <textarea
                        value={promptText}
                        onChange={(e) => setPromptText(e.target.value)}
                        placeholder="Apply the feedback and rewrite your prompt…"
                        className="w-full h-36 bg-[#0d0d14] border border-[#2a2a3a] rounded-xl p-4 text-sm text-white placeholder:text-[#3a3a4a] focus:outline-none focus:border-[#f59e0b]/40 resize-none leading-relaxed"
                      />
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => setIsRevising(false)}
                          className="px-4 py-2 rounded-lg border border-[#2a2a3a] text-sm text-[#6b6b8a] hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSubmit(true)}
                          disabled={isSubmitting || !promptText.trim()}
                          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold text-[#0a0a0f] disabled:opacity-50"
                          style={{ background: "#f59e0b" }}
                        >
                          {isSubmitting ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Judging revision…</>
                          ) : (
                            <><Star className="w-4 h-4" /> Submit revision</>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
