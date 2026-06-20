"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  RotateCcw,
} from "lucide-react";
import { AGENT_SEASONS, AgentCard, AgentSeason, CardFormat } from "@/lib/agentSeasons";
import { MODEL_ANSWERS } from "@/lib/agentModelAnswers";

// ─── constants ────────────────────────────────────────────────────────────────

const CYAN = "#06b6d4";
const STORAGE_KEY = "arenax-agent-v1";

const FORMAT_LABEL: Record<CardFormat, string> = {
  glitch_diagnosis: "GLITCH DIAG",
  prediction: "PREDICTION",
  mental_model: "MENTAL MODEL",
  repair: "REPAIR",
  output_match: "OUTPUT MATCH",
  delegation_sim: "DELEGATION",
  spec_to_agent: "SPEC → AGENT",
};

const FORMAT_COLOR: Record<CardFormat, string> = {
  glitch_diagnosis: "#f87171",
  prediction: "#fb923c",
  mental_model: "#a78bfa",
  repair: "#34d399",
  output_match: "#60a5fa",
  delegation_sim: "#fbbf24",
  spec_to_agent: "#06b6d4",
};

const DIFFICULTY_COLOR = { intro: "#22c55e", core: "#f59e0b", stretch: "#ef4444" };

const MCQ_FORMATS: CardFormat[] = ["glitch_diagnosis", "prediction"];

// ─── localStorage helpers ─────────────────────────────────────────────────────

type Progress = Record<string, boolean>;

function loadProgress(): Progress {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"); }
  catch { return {}; }
}

function saveProgress(p: Progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

// ─── sub-components ───────────────────────────────────────────────────────────

function Pill({ text, color }: { text: string; color: string }) {
  return (
    <span
      className="inline-block px-2 py-0.5 rounded font-cond text-[9px] font-bold uppercase"
      style={{ background: `${color}20`, color, border: `1px solid ${color}40`, letterSpacing: "0.15em" }}
    >
      {text}
    </span>
  );
}

function CardListItem({
  card,
  isActive,
  isDone,
  onClick,
}: {
  card: AgentCard;
  isActive: boolean;
  isDone: boolean;
  onClick: () => void;
}) {
  const fmtColor = FORMAT_COLOR[card.format];
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all hover:bg-white/5"
      style={{ background: isActive ? "rgba(6,182,212,0.08)" : "transparent", border: isActive ? "1px solid rgba(6,182,212,0.2)" : "1px solid transparent" }}
    >
      <div className="mt-0.5 shrink-0">
        {isDone ? (
          <CheckCircle2 className="w-4 h-4" style={{ color: CYAN }} />
        ) : (
          <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: "#3a3a4a" }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate" style={{ color: isActive ? "#e2e8f0" : "#a1a1b5" }}>
          {card.title}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="font-cond text-[9px]" style={{ color: fmtColor, letterSpacing: "0.1em" }}>
            {FORMAT_LABEL[card.format]}
          </span>
          <span className="text-[9px]" style={{ color: "#3a3a4a" }}>·</span>
          <span className="font-cond text-[9px] uppercase" style={{ color: DIFFICULTY_COLOR[card.difficulty] }}>
            {card.difficulty}
          </span>
        </div>
      </div>
      <span className="shrink-0 font-cond text-[9px] mt-1" style={{ color: "#5a5a7a" }}>
        {Math.round(card.est_seconds / 60)}m
      </span>
    </button>
  );
}

// MCQ option button
function OptionBtn({
  text,
  index,
  selected,
  correctAnswer,
  answered,
  onClick,
}: {
  text: string;
  index: number;
  selected: number | null;
  correctAnswer: number;
  answered: boolean;
  onClick: () => void;
}) {
  let bg = "rgba(255,255,255,0.04)";
  let border = "#2a2a3a";
  let textColor = "#c4c4d4";
  let icon: React.ReactNode = null;

  if (answered) {
    if (index === correctAnswer) {
      bg = "rgba(34,197,94,0.12)";
      border = "#22c55e";
      textColor = "#4ade80";
      icon = <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "#22c55e" }} />;
    } else if (index === selected) {
      bg = "rgba(239,68,68,0.1)";
      border = "#ef4444";
      textColor = "#f87171";
      icon = <XCircle className="w-4 h-4 shrink-0" style={{ color: "#ef4444" }} />;
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={answered}
      className="w-full flex items-start gap-3 px-4 py-3 rounded-xl text-left transition-all disabled:cursor-default hover:bg-white/5"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      <span
        className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
        style={{ background: `${border}30`, color: textColor, border: `1px solid ${border}` }}
      >
        {String.fromCharCode(65 + index)}
      </span>
      <span className="text-sm leading-relaxed flex-1" style={{ color: textColor }}>
        {text}
      </span>
      {icon}
    </button>
  );
}

// Rubric reveal panel
function RubricPanel({ rubric }: { rubric: NonNullable<AgentCard["rubric"]> }) {
  const dimLabel: Record<string, string> = {
    D1: "Correctness",
    D2: "Constraint Adherence",
    D3: "Craft",
    D4: "Judgment",
    D5: "Articulation",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-4 space-y-3"
      style={{ background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.2)" }}
    >
      <p className="font-cond text-[10px] uppercase" style={{ color: CYAN, letterSpacing: "0.2em" }}>
        PERFECT ANSWER · 90–100 BAND
      </p>
      {rubric.map((r) => (
        <div key={r.dim}>
          <p className="font-cond text-[10px] mb-1" style={{ color: "#5a5a7a", letterSpacing: "0.1em" }}>
            {r.dim} · {dimLabel[r.dim] ?? r.label}
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "#c4c4d4" }}>
            {r.perfect}
          </p>
        </div>
      ))}
    </motion.div>
  );
}

// Code/transcript block
function Block({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #2a2a3a" }}>
      <div className="px-4 py-2 font-cond text-[9px] uppercase" style={{ background: "#111118", color: "#5a5a7a", letterSpacing: "0.15em", borderBottom: "1px solid #2a2a3a" }}>
        {label}
      </div>
      <pre className="px-4 py-3 text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap" style={{ background: "#0d0d14", color: "#a1a1b5", fontFamily: "monospace" }}>
        {text}
      </pre>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function AgentLearnClient() {
  const searchParams = useSearchParams();
  // Deep-link support: /learn/agent?s=S2 jumps straight to that season — used
  // by the Forge weekly challenge page's "stuck? start with the lesson" CTA.
  const initialSeason =
    AGENT_SEASONS.find((s) => s.id === searchParams.get("s")) ?? AGENT_SEASONS[0];

  const [activeSeason, setActiveSeason] = useState<AgentSeason>(initialSeason);
  const [activeCard, setActiveCard] = useState<AgentCard | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showRubric, setShowRubric] = useState(false);
  const [userText, setUserText] = useState("");
  const [progress, setProgress] = useState<Progress>({});
  const [mounted, setMounted] = useState(false);
  const cardPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    setProgress(loadProgress());
  }, []);

  function selectSeason(s: AgentSeason) {
    setActiveSeason(s);
    setActiveCard(null);
    setSelectedOption(null);
    setShowRubric(false);
    setUserText("");
  }

  function selectCard(card: AgentCard) {
    setActiveCard(card);
    setSelectedOption(null);
    setShowRubric(false);
    setUserText("");
    setTimeout(() => cardPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function markDone(cardId: string) {
    const next = { ...progress, [cardId]: true };
    setProgress(next);
    saveProgress(next);
  }

  function handleOptionClick(i: number) {
    if (selectedOption !== null || !activeCard) return;
    setSelectedOption(i);
    if (i === activeCard.correctAnswer) markDone(activeCard.id);
  }

  function goNext() {
    if (!activeCard) return;
    const cards = activeSeason.cards;
    const idx = cards.findIndex((c) => c.id === activeCard.id);
    if (idx < cards.length - 1) selectCard(cards[idx + 1]);
  }

  function resetCard() {
    setSelectedOption(null);
    setShowRubric(false);
    setUserText("");
  }

  const isMCQ = activeCard ? MCQ_FORMATS.includes(activeCard.format) : false;
  const answered = selectedOption !== null;
  const isCorrect = answered && selectedOption === activeCard?.correctAnswer;

  const seasonDone = (s: AgentSeason) => s.cards.filter((c) => progress[c.id]).length;

  // Next card exists?
  const hasNext = activeCard
    ? activeSeason.cards.findIndex((c) => c.id === activeCard.id) < activeSeason.cards.length - 1
    : false;

  return (
    <div className="min-h-screen pt-20 pb-16 px-4" style={{ background: "var(--ink-1)" }}>
      {/* Aura */}
      <div
        className="pointer-events-none fixed"
        style={{ width: 500, height: 300, background: CYAN, top: 60, right: -100, opacity: 0.05, borderRadius: "50%", filter: "blur(80px)" }}
      />

      <div className="max-w-6xl mx-auto">

        {/* ── Header ─────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-5 h-5" style={{ color: CYAN }} />
            <span className="font-cond text-[10px] uppercase" style={{ color: CYAN, letterSpacing: "0.3em" }}>
              AGENTIC LEARNING TRACK · 機
            </span>
          </div>
          <h1 className="font-display" style={{ fontSize: 36, color: "var(--bone)", lineHeight: 1 }}>
            AGENTIC{" "}
            <span style={{ background: `linear-gradient(180deg, ${CYAN}, #0891b2)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              FLUENCY
            </span>
          </h1>
          <p className="font-cond text-[10px] mt-1.5" style={{ color: "var(--smoke)", letterSpacing: "0.15em" }}>
            4 SEASONS · 75 CARDS · WORK THROUGH THEM IN ORDER
          </p>
        </motion.div>

        {/* ── Season tabs ────────────────────────────────── */}
        <div className="flex flex-wrap gap-2 mb-5">
          {AGENT_SEASONS.map((s, i) => {
            const done = seasonDone(s);
            const total = s.cards.length;
            const active = s.id === activeSeason.id;
            return (
              <motion.button
                key={s.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                onClick={() => selectSeason(s)}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all"
                style={{
                  background: active ? `${CYAN}15` : "var(--ink-2)",
                  border: `1px solid ${active ? CYAN + "50" : "var(--ink-4)"}`,
                }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-cond text-[10px] font-bold" style={{ color: active ? CYAN : "#5a5a7a", letterSpacing: "0.15em" }}>
                      {s.id}
                    </span>
                    <span className="font-cond text-[10px]" style={{ color: active ? "var(--bone)" : "#8888a0", letterSpacing: "0.05em" }}>
                      {s.title}
                    </span>
                  </div>
                  {mounted && (
                    <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: "#2a2a3a", width: 80 }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${(done / total) * 100}%`, background: CYAN }}
                      />
                    </div>
                  )}
                </div>
                {mounted && (
                  <span className="font-cond text-[9px]" style={{ color: done === total ? CYAN : "#5a5a7a" }}>
                    {done}/{total}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* ── Season thesis ──────────────────────────────── */}
        <motion.div
          key={activeSeason.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-5 px-4 py-3 rounded-xl"
          style={{ background: "var(--ink-2)", border: "1px solid var(--ink-4)" }}
        >
          <p className="text-sm" style={{ color: "var(--ash)", lineHeight: 1.6 }}>
            <span className="font-cond text-[10px] mr-2" style={{ color: CYAN, letterSpacing: "0.2em" }}>THESIS</span>
            {activeSeason.thesis}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {activeSeason.traits.map((t) => (
              <span key={t} className="font-cond text-[9px] px-2 py-0.5 rounded" style={{ background: `${CYAN}12`, color: CYAN, border: `1px solid ${CYAN}30`, letterSpacing: "0.1em" }}>
                {t.replace(/_/g, " ").toUpperCase()}
              </span>
            ))}
          </div>
        </motion.div>

        {/* ── Main grid ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Card list */}
          <div className="lg:col-span-2">
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: "var(--ink-2)", border: "1px solid var(--ink-4)" }}
            >
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--ink-4)" }}>
                <span className="font-cond text-[10px] uppercase" style={{ color: "var(--smoke)", letterSpacing: "0.2em" }}>
                  {activeSeason.cards.length} CARDS
                </span>
                <div className="flex gap-2">
                  {(["intro", "core", "stretch"] as const).map((d) => (
                    <span key={d} className="font-cond text-[9px] px-1.5 py-0.5 rounded" style={{ color: DIFFICULTY_COLOR[d], background: `${DIFFICULTY_COLOR[d]}15`, letterSpacing: "0.1em" }}>
                      {d.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
              <div className="p-2 max-h-[520px] overflow-y-auto space-y-0.5">
                <AnimatePresence mode="wait">
                  {activeSeason.cards.map((card, i) => (
                    <motion.div
                      key={card.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                    >
                      <CardListItem
                        card={card}
                        isActive={activeCard?.id === card.id}
                        isDone={mounted && !!progress[card.id]}
                        onClick={() => selectCard(card)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Active card panel */}
          <div className="lg:col-span-3" ref={cardPanelRef}>
            <AnimatePresence mode="wait">
              {!activeCard ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl flex flex-col items-center justify-center text-center p-14"
                  style={{ background: "var(--ink-2)", border: "1px solid var(--ink-4)", minHeight: 400 }}
                >
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: `${CYAN}12`, border: `1px solid ${CYAN}30` }}
                  >
                    <Bot className="w-8 h-8" style={{ color: CYAN }} />
                  </div>
                  <p className="font-display text-lg mb-1" style={{ color: "var(--bone)" }}>
                    SELECT A CARD
                  </p>
                  <p className="text-sm" style={{ color: "var(--smoke)" }}>
                    Choose any card from the list to begin.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key={activeCard.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  className="space-y-4"
                >
                  {/* Card header */}
                  <div
                    className="rounded-xl px-5 py-4"
                    style={{ background: "var(--ink-2)", border: "1px solid var(--ink-4)" }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <Pill text={FORMAT_LABEL[activeCard.format]} color={FORMAT_COLOR[activeCard.format]} />
                          <Pill text={activeCard.difficulty.toUpperCase()} color={DIFFICULTY_COLOR[activeCard.difficulty]} />
                          {mounted && progress[activeCard.id] && (
                            <Pill text="DONE" color={CYAN} />
                          )}
                        </div>
                        <h2 className="font-display text-xl" style={{ color: "var(--bone)" }}>
                          {activeCard.title.toUpperCase()}
                        </h2>
                        <p className="font-cond text-[9px] mt-1" style={{ color: "#5a5a7a", letterSpacing: "0.1em" }}>
                          {activeCard.id}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 mt-1" style={{ color: "#5a5a7a" }}>
                        <Clock className="w-3.5 h-3.5" />
                        <span className="font-cond text-[10px]">{Math.round(activeCard.est_seconds / 60)}m</span>
                      </div>
                    </div>
                  </div>

                  {/* ── MCQ card ───────────────────────────────── */}
                  {isMCQ && (
                    <div className="space-y-4">
                      {/* Context */}
                      {activeCard.transcript && (
                        <Block label="AI TRANSCRIPT" text={activeCard.transcript} />
                      )}
                      {activeCard.setup && (
                        <div className="rounded-xl px-5 py-4" style={{ background: "var(--ink-2)", border: "1px solid var(--ink-4)" }}>
                          <p className="font-cond text-[10px] mb-2 uppercase" style={{ color: "#5a5a7a", letterSpacing: "0.15em" }}>SETUP</p>
                          <p className="text-sm leading-relaxed" style={{ color: "var(--ash)" }}>{activeCard.setup}</p>
                        </div>
                      )}

                      {/* Question */}
                      <div className="rounded-xl px-5 py-4" style={{ background: "var(--ink-2)", border: "1px solid var(--ink-4)" }}>
                        <p className="font-cond text-[10px] mb-2 uppercase" style={{ color: "#5a5a7a", letterSpacing: "0.15em" }}>QUESTION</p>
                        <p className="text-sm font-semibold leading-relaxed" style={{ color: "var(--bone)" }}>
                          {activeCard.question}
                        </p>
                      </div>

                      {/* Options */}
                      <div className="space-y-2">
                        {activeCard.options?.map((opt, i) => (
                          <OptionBtn
                            key={i}
                            text={opt}
                            index={i}
                            selected={selectedOption}
                            correctAnswer={activeCard.correctAnswer ?? 0}
                            answered={answered}
                            onClick={() => handleOptionClick(i)}
                          />
                        ))}
                      </div>

                      {/* Result + explanation */}
                      <AnimatePresence>
                        {answered && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-3"
                          >
                            {/* Result banner */}
                            <div
                              className="rounded-xl px-5 py-4 flex items-start gap-3"
                              style={{
                                background: isCorrect ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                                border: `1px solid ${isCorrect ? "#22c55e40" : "#ef444440"}`,
                              }}
                            >
                              {isCorrect ? (
                                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#22c55e" }} />
                              ) : (
                                <XCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
                              )}
                              <div>
                                <p className="font-cond text-[10px] mb-1 uppercase" style={{ color: isCorrect ? "#4ade80" : "#f87171", letterSpacing: "0.15em" }}>
                                  {isCorrect ? "CORRECT" : "INCORRECT"}
                                </p>
                                <p className="text-sm leading-relaxed" style={{ color: "var(--ash)" }}>
                                  {activeCard.explanation}
                                </p>
                              </div>
                            </div>

                            {/* Action row */}
                            <div className="flex items-center gap-3">
                              <button
                                onClick={resetCard}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors hover:bg-white/5"
                                style={{ borderColor: "#2a2a3a", color: "#6b6b8a" }}
                              >
                                <RotateCcw className="w-3.5 h-3.5" /> Retry
                              </button>

                              {!isCorrect && (
                                <button
                                  onClick={() => markDone(activeCard.id)}
                                  disabled={!!progress[activeCard.id]}
                                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                                  style={{ background: `${CYAN}15`, color: CYAN, border: `1px solid ${CYAN}40` }}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Mark done anyway
                                </button>
                              )}

                              {hasNext && (
                                <button
                                  onClick={goNext}
                                  className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                                  style={{ background: CYAN, color: "#0a0a0f" }}
                                >
                                  Next <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* ── Open-ended card ───────────────────────── */}
                  {!isMCQ && (
                    <div className="space-y-4">
                      {/* Content by format */}
                      {activeCard.format === "mental_model" && activeCard.prompt && (
                        <div className="rounded-xl px-5 py-4" style={{ background: "var(--ink-2)", border: "1px solid var(--ink-4)" }}>
                          <p className="font-cond text-[10px] mb-2 uppercase" style={{ color: "#5a5a7a", letterSpacing: "0.15em" }}>YOUR PROMPT</p>
                          <p className="text-sm leading-relaxed" style={{ color: "var(--ash)" }}>{activeCard.prompt}</p>
                        </div>
                      )}

                      {activeCard.format === "repair" && (
                        <div className="space-y-3">
                          {activeCard.broken_prompt && <Block label="BROKEN PROMPT" text={activeCard.broken_prompt} />}
                          {activeCard.observed_failure && (
                            <div className="rounded-xl px-5 py-3" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                              <p className="font-cond text-[10px] mb-1 uppercase" style={{ color: "#f87171", letterSpacing: "0.15em" }}>OBSERVED FAILURE</p>
                              <p className="text-sm leading-relaxed" style={{ color: "#fca5a5" }}>{activeCard.observed_failure}</p>
                            </div>
                          )}
                          {activeCard.task && (
                            <div className="rounded-xl px-5 py-3" style={{ background: "var(--ink-2)", border: "1px solid var(--ink-4)" }}>
                              <p className="font-cond text-[10px] mb-1 uppercase" style={{ color: "#5a5a7a", letterSpacing: "0.15em" }}>YOUR TASK</p>
                              <p className="text-sm font-semibold leading-relaxed" style={{ color: "var(--bone)" }}>{activeCard.task}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {activeCard.format === "output_match" && (
                        <div className="space-y-3">
                          {activeCard.target_output && <Block label="TARGET OUTPUT" text={activeCard.target_output} />}
                          {activeCard.task_description && (
                            <div className="rounded-xl px-5 py-3" style={{ background: "var(--ink-2)", border: "1px solid var(--ink-4)" }}>
                              <p className="font-cond text-[10px] mb-1 uppercase" style={{ color: "#5a5a7a", letterSpacing: "0.15em" }}>TASK</p>
                              <p className="text-sm leading-relaxed" style={{ color: "var(--ash)" }}>{activeCard.task_description}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {activeCard.format === "delegation_sim" && (
                        <div className="space-y-3">
                          {activeCard.scenario && (
                            <div className="rounded-xl px-5 py-4" style={{ background: "var(--ink-2)", border: "1px solid var(--ink-4)" }}>
                              <p className="font-cond text-[10px] mb-2 uppercase" style={{ color: "#5a5a7a", letterSpacing: "0.15em" }}>SCENARIO</p>
                              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--ash)" }}>{activeCard.scenario}</p>
                            </div>
                          )}
                          {activeCard.task && (
                            <div className="rounded-xl px-5 py-3" style={{ background: "var(--ink-2)", border: "1px solid var(--ink-4)" }}>
                              <p className="font-cond text-[10px] mb-1 uppercase" style={{ color: "#5a5a7a", letterSpacing: "0.15em" }}>YOUR TASK</p>
                              <p className="text-sm font-semibold leading-relaxed" style={{ color: "var(--bone)" }}>{activeCard.task}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {activeCard.format === "spec_to_agent" && (
                        <div className="space-y-3">
                          {activeCard.goal && (
                            <div className="rounded-xl px-5 py-3" style={{ background: `${CYAN}08`, border: `1px solid ${CYAN}25` }}>
                              <p className="font-cond text-[10px] mb-1 uppercase" style={{ color: CYAN, letterSpacing: "0.15em" }}>GOAL</p>
                              <p className="text-sm leading-relaxed" style={{ color: "var(--ash)" }}>{activeCard.goal}</p>
                            </div>
                          )}
                          {activeCard.environment && (
                            <div className="rounded-xl px-5 py-3" style={{ background: "var(--ink-2)", border: "1px solid var(--ink-4)" }}>
                              <p className="font-cond text-[10px] mb-1 uppercase" style={{ color: "#5a5a7a", letterSpacing: "0.15em" }}>ENVIRONMENT</p>
                              <p className="text-sm leading-relaxed" style={{ color: "var(--ash)" }}>{activeCard.environment}</p>
                            </div>
                          )}
                          {activeCard.task && (
                            <div className="rounded-xl px-5 py-3" style={{ background: "var(--ink-2)", border: "1px solid var(--ink-4)" }}>
                              <p className="font-cond text-[10px] mb-1 uppercase" style={{ color: "#5a5a7a", letterSpacing: "0.15em" }}>YOUR TASK</p>
                              <p className="text-sm font-semibold leading-relaxed" style={{ color: "var(--bone)" }}>{activeCard.task}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* User response textarea */}
                      <div className="rounded-xl px-5 py-4" style={{ background: "var(--ink-2)", border: "1px solid var(--ink-4)" }}>
                        <label className="block font-cond text-[10px] mb-2 uppercase" style={{ color: "#5a5a7a", letterSpacing: "0.15em" }}>
                          YOUR RESPONSE (OPTIONAL)
                        </label>
                        <textarea
                          value={userText}
                          onChange={(e) => setUserText(e.target.value)}
                          placeholder="Write your answer here before revealing the model answer…"
                          rows={5}
                          className="w-full resize-none rounded-lg px-4 py-3 text-sm leading-relaxed focus:outline-none transition-colors"
                          style={{
                            background: "#0d0d14",
                            border: "1px solid #2a2a3a",
                            color: "var(--bone)",
                            fontFamily: "inherit",
                          }}
                          onFocus={(e) => (e.target.style.borderColor = `${CYAN}50`)}
                          onBlur={(e) => (e.target.style.borderColor = "#2a2a3a")}
                        />
                      </div>

                      {/* Answer + rubric reveal */}
                      {(MODEL_ANSWERS[activeCard.id] || activeCard.rubric) && (
                        <div>
                          <button
                            onClick={() => setShowRubric((v) => !v)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            style={{ background: "var(--ink-2)", border: `1px solid ${showRubric ? CYAN + "40" : "var(--ink-4)"}`, color: showRubric ? CYAN : "#8888a0" }}
                          >
                            {showRubric ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            {showRubric ? "Hide answer" : "Reveal answer"}
                          </button>
                          <AnimatePresence>
                            {showRubric && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-3 overflow-hidden space-y-3"
                              >
                                {/* Model answer */}
                                {MODEL_ANSWERS[activeCard.id] && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="rounded-xl p-5"
                                    style={{ background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.25)" }}
                                  >
                                    <p className="font-cond text-[10px] mb-3 uppercase" style={{ color: CYAN, letterSpacing: "0.2em" }}>
                                      MODEL ANSWER
                                    </p>
                                    <div
                                      className="text-sm leading-relaxed whitespace-pre-line"
                                      style={{ color: "#d4d4e8" }}
                                    >
                                      {MODEL_ANSWERS[activeCard.id]}
                                    </div>
                                  </motion.div>
                                )}
                                {/* Rubric (secondary) */}
                                {activeCard.rubric && (
                                  <RubricPanel rubric={activeCard.rubric} />
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      {/* Action row */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={resetCard}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors hover:bg-white/5"
                          style={{ borderColor: "#2a2a3a", color: "#6b6b8a" }}
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Reset
                        </button>

                        <button
                          onClick={() => { markDone(activeCard.id); }}
                          disabled={mounted && !!progress[activeCard.id]}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-60"
                          style={{ background: `${CYAN}20`, color: CYAN, border: `1px solid ${CYAN}40` }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {mounted && progress[activeCard.id] ? "Completed" : "Mark as done"}
                        </button>

                        {hasNext && (
                          <button
                            onClick={goNext}
                            className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                            style={{ background: CYAN, color: "#0a0a0f" }}
                          >
                            Next <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}