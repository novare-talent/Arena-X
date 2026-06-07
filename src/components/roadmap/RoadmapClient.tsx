"use client";

import { motion } from "framer-motion";
import { Lock, CheckCircle2, Circle, Swords, ArrowRight } from "lucide-react";
import Link from "next/link";

export const DSA_TIERS = [
  {
    tier: 1,
    label: "Foundation",
    jp: "基礎",
    color: "#22c55e",
    topics: [
      { key: "arrays",    label: "Arrays",    required: 5, description: "Indexing, traversal, in-place ops" },
      { key: "strings",   label: "Strings",   required: 5, description: "Manipulation, pattern matching" },
      { key: "recursion", label: "Recursion", required: 5, description: "Base case, call stack, backtracking" },
    ],
  },
  {
    tier: 2,
    label: "Core Techniques",
    jp: "技",
    color: "#a78bfa",
    topics: [
      { key: "two pointers",   label: "Two Pointers",   required: 5, description: "Fast/slow, left/right pairs" },
      { key: "sliding window", label: "Sliding Window", required: 5, description: "Fixed & variable size windows" },
      { key: "hashing",        label: "Hashing",        required: 5, description: "HashMaps, frequency counting" },
      { key: "sorting",        label: "Sorting",        required: 5, description: "Comparison sorts, counting sort" },
    ],
  },
  {
    tier: 3,
    label: "Data Structures",
    jp: "構造",
    color: "#f59e0b",
    topics: [
      { key: "binary search", label: "Binary Search",   required: 7, description: "Sorted search, answer-space BS" },
      { key: "stacks",        label: "Stacks & Queues", required: 7, description: "Monotonic, BFS/DFS" },
      { key: "linked lists",  label: "Linked Lists",    required: 7, description: "Reversal, cycle detection" },
      { key: "trees",         label: "Trees",           required: 7, description: "BST, traversals, LCA" },
    ],
  },
  {
    tier: 4,
    label: "Advanced",
    jp: "上級",
    color: "#f97316",
    topics: [
      { key: "graphs",              label: "Graphs", required: 7, description: "BFS, DFS, topological sort" },
      { key: "dynamic programming", label: "DP",     required: 7, description: "Memoization, tabulation" },
      { key: "heaps",               label: "Heaps",  required: 7, description: "Min/max heap, priority queue" },
    ],
  },
  {
    tier: 5,
    label: "Expert",
    jp: "達人",
    color: "#a855f7",
    topics: [
      { key: "advanced dp", label: "Advanced DP", required: 10, description: "Bitmask, interval, tree DP" },
      { key: "tries",       label: "Tries",       required: 10, description: "Prefix trees, word search" },
      { key: "greedy",      label: "Greedy",      required: 10, description: "Interval scheduling, proof" },
    ],
  },
];

interface Props {
  progressMap:    Record<string, { problems_solved: number; problems_required: number; completed_at: string | null }>;
  topicSolvedMap: Record<string, number>;
}

function getTierSolves(tier: typeof DSA_TIERS[0], topicSolvedMap: Record<string, number>) {
  return tier.topics.reduce((sum, t) => sum + (topicSolvedMap[t.key] ?? 0), 0);
}

function isTierUnlocked(tierIndex: number, topicSolvedMap: Record<string, number>) {
  if (tierIndex === 0) return true;
  const prevTier    = DSA_TIERS[tierIndex - 1];
  const totalSolves = getTierSolves(prevTier, topicSolvedMap);
  return totalSolves >= 5;
}

export default function RoadmapClient({ topicSolvedMap }: Props) {
  const totalSolved     = Object.values(topicSolvedMap).reduce((a, b) => a + b, 0);
  const totalTopics     = DSA_TIERS.flatMap((t) => t.topics).length;
  const completedTopics = DSA_TIERS.flatMap((t) =>
    t.topics.filter((topic) => (topicSolvedMap[topic.key] ?? 0) >= topic.required)
  ).length;

  return (
    <div className="min-h-screen" style={{ background: "var(--ink-1)", position: "relative", overflow: "hidden" }}>
      <div className="ax-aura pointer-events-none"
        style={{ width: 600, height: 350, background: "var(--violet-700)", top: 56, right: -80, opacity: 0.13 }} />

      <div className="max-w-3xl mx-auto px-4 pt-20 pb-12">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="relative mb-6 overflow-hidden rounded-xl px-5 py-4"
          style={{ background: "var(--ink-2)", border: "1px solid var(--ink-4)" }}>
          <div className="ax-dotgrid" style={{ position: "absolute", inset: 0, opacity: 0.25 }} />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-cond text-[10px]" style={{ color: "var(--violet-300)", letterSpacing: "0.3em" }}>
                DSA ROADMAP · 道
              </span>
              <Swords className="w-3.5 h-3.5" style={{ color: "var(--violet-400)" }} />
            </div>
            <h1 className="font-display" style={{ fontSize: 44, color: "var(--bone)", lineHeight: 0.9 }}>
              THE <span style={{ background: "linear-gradient(180deg, var(--violet-200), var(--violet-500))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>PATH</span>.
            </h1>
            <p className="font-cond text-[10px] mt-2" style={{ color: "var(--smoke)", letterSpacing: "0.18em" }}>
              MASTER DATA STRUCTURES & ALGORITHMS · TIER BY TIER
            </p>
          </div>
        </motion.div>

        {/* Overall progress */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="ax-card mb-8 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="font-cond text-[9px]" style={{ color: "var(--ash)", letterSpacing: "0.25em" }}>OVERALL PROGRESS · 進歩</span>
            <span className="font-mono text-xs" style={{ color: "var(--bone)" }}>{completedTopics}/{totalTopics} TOPICS</span>
          </div>
          <div className="rounded-full overflow-hidden" style={{ height: 4, background: "var(--ink-4)" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(completedTopics / totalTopics) * 100}%` }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
              style={{ height: "100%", borderRadius: 9999, background: "linear-gradient(90deg, var(--violet-500), var(--orchid))" }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="font-cond text-[9px]" style={{ color: "var(--void)", letterSpacing: "0.12em" }}>{totalSolved} PROBLEMS SOLVED</span>
            <span className="font-cond text-[9px]" style={{ color: "var(--void)", letterSpacing: "0.12em" }}>{completedTopics} TOPICS COMPLETE</span>
          </div>
        </motion.div>

        {/* Tier list */}
        <div className="space-y-8">
          {DSA_TIERS.map((tier, tierIdx) => {
            const unlocked      = isTierUnlocked(tierIdx, topicSolvedMap);
            const tierSolves    = getTierSolves(tier, topicSolvedMap);
            const tierCompleted = tier.topics.every((t) => (topicSolvedMap[t.key] ?? 0) >= t.required);

            return (
              <motion.div
                key={tier.tier}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: tierIdx * 0.1 }}
              >
                {/* Tier header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center font-display text-base shrink-0"
                    style={{ background: unlocked ? `${tier.color}18` : "var(--ink-3)", border: `1px solid ${unlocked ? tier.color + "35" : "var(--ink-4)"}`, color: unlocked ? tier.color : "var(--void)" }}>
                    {tier.tier}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm" style={{ color: unlocked ? "var(--bone)" : "var(--void)" }}>{tier.label.toUpperCase()}</span>
                      <span className="font-jp text-xs" style={{ color: unlocked ? tier.color : "var(--void)" }}>{tier.jp}</span>
                    </div>
                    {!unlocked && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Lock className="w-3 h-3" style={{ color: "var(--void)" }} />
                        <span className="font-cond text-[9px]" style={{ color: "var(--void)", letterSpacing: "0.1em" }}>
                          SOLVE 5 IN TIER {tier.tier - 1} TO UNLOCK
                        </span>
                      </div>
                    )}
                    {unlocked && !tierCompleted && (
                      <div className="font-cond text-[9px] mt-0.5" style={{ color: "var(--smoke)", letterSpacing: "0.1em" }}>
                        {tierSolves} SOLVES IN THIS TIER
                      </div>
                    )}
                    {tierCompleted && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3 h-3" style={{ color: "#22c55e" }} />
                        <span className="font-cond text-[9px]" style={{ color: "#22c55e", letterSpacing: "0.1em" }}>TIER COMPLETE</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Topic cards */}
                <div className={`grid gap-3 ${tier.topics.length >= 4 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
                  {tier.topics.map((topic, topicIdx) => {
                    const solved    = topicSolvedMap[topic.key] ?? 0;
                    const completed = solved >= topic.required;
                    const pct       = Math.min(100, (solved / topic.required) * 100);

                    return (
                      <motion.div
                        key={topic.key}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: unlocked ? 1 : 0.35, scale: 1 }}
                        transition={{ delay: tierIdx * 0.1 + topicIdx * 0.05 }}
                        className="rounded-xl p-4 transition-all"
                        style={{
                          background: "var(--ink-2)",
                          border: completed
                            ? "1px solid rgba(34,197,94,0.25)"
                            : "1px solid var(--ink-4)",
                          cursor: unlocked ? "default" : "not-allowed",
                        }}
                      >
                        <div className="flex items-start gap-1.5 mb-1">
                          {completed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#22c55e" }} />
                          ) : unlocked ? (
                            <Circle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--void)" }} />
                          ) : (
                            <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--void)" }} />
                          )}
                          <div>
                            <span className="font-display text-sm" style={{ color: unlocked ? "var(--bone)" : "var(--void)" }}>
                              {topic.label.toUpperCase()}
                            </span>
                            <p className="font-cond text-[9px] mt-0.5" style={{ color: unlocked ? "var(--smoke)" : "var(--void)", letterSpacing: "0.08em" }}>
                              {topic.description}
                            </p>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-3">
                          <div className="flex justify-between mb-1">
                            <span className="font-mono text-[9px]" style={{ color: unlocked ? "var(--ash)" : "var(--void)" }}>
                              {solved}/{topic.required}
                            </span>
                            {completed && (
                              <span className="font-cond text-[9px]" style={{ color: "#22c55e", letterSpacing: "0.1em" }}>DONE</span>
                            )}
                          </div>
                          <div className="rounded-full overflow-hidden" style={{ height: 3, background: "var(--ink-4)" }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                              style={{ height: "100%", borderRadius: 9999, background: completed ? "#22c55e" : `linear-gradient(90deg, var(--violet-500), ${tier.color})` }}
                            />
                          </div>
                        </div>

                        {unlocked && !completed && (
                          <Link href="/battle"
                            className="mt-3 flex items-center gap-1 font-cond text-[9px] transition-colors hover:opacity-80"
                            style={{ color: tier.color, letterSpacing: "0.12em" }}>
                            <Swords className="w-3 h-3" />
                            PRACTICE IN ARENA
                          </Link>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer CTA */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          className="mt-12 flex items-center gap-2 px-4 py-3 rounded"
          style={{ background: "var(--ink-2)", border: "1px solid var(--ink-4)" }}>
          <Swords className="w-3.5 h-3.5" style={{ color: "var(--violet-400)" }} />
          <span className="font-cond text-[10px] flex-1" style={{ color: "var(--smoke)", letterSpacing: "0.16em" }}>
            SOLVE PROBLEMS IN 1V1 MATCHES TO ADVANCE THROUGH TIERS
          </span>
          <Link href="/battle"
            className="flex items-center gap-1.5 font-cond text-[10px] transition-all hover:gap-2.5"
            style={{ color: "var(--violet-300)", letterSpacing: "0.15em" }}>
            FIND A MATCH <ArrowRight className="w-3 h-3" />
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
