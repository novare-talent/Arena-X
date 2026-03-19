"use client";

import { motion } from "framer-motion";
import { Lock, CheckCircle2, Circle, ChevronRight, Swords } from "lucide-react";
import Link from "next/link";

// DSA Roadmap structure: each tier unlocks when prev tier has 5+ solves
export const DSA_TIERS = [
  {
    tier: 1,
    label: "Foundation",
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
    color: "#6366f1",
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
    color: "#f59e0b",
    topics: [
      { key: "binary search", label: "Binary Search",  required: 7, description: "Sorted search, answer-space BS" },
      { key: "stacks",        label: "Stacks & Queues", required: 7, description: "Monotonic, BFS/DFS" },
      { key: "linked lists",  label: "Linked Lists",   required: 7, description: "Reversal, cycle detection" },
      { key: "trees",         label: "Trees",           required: 7, description: "BST, traversals, LCA" },
    ],
  },
  {
    tier: 4,
    label: "Advanced",
    color: "#f97316",
    topics: [
      { key: "graphs",                label: "Graphs",     required: 7, description: "BFS, DFS, topological sort" },
      { key: "dynamic programming",   label: "DP",         required: 7, description: "Memoization, tabulation" },
      { key: "heaps",                 label: "Heaps",      required: 7, description: "Min/max heap, priority queue" },
    ],
  },
  {
    tier: 5,
    label: "Expert",
    color: "#a855f7",
    topics: [
      { key: "advanced dp", label: "Advanced DP",  required: 10, description: "Bitmask, interval, tree DP" },
      { key: "tries",       label: "Tries",         required: 10, description: "Prefix trees, word search" },
      { key: "greedy",      label: "Greedy",        required: 10, description: "Interval scheduling, proof" },
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
  const prevTier   = DSA_TIERS[tierIndex - 1];
  const totalSolves = getTierSolves(prevTier, topicSolvedMap);
  return totalSolves >= 5; // 5 solves in prev tier unlocks next
}

export default function RoadmapClient({ topicSolvedMap }: Props) {
  const totalSolved = Object.values(topicSolvedMap).reduce((a, b) => a + b, 0);
  const totalTopics = DSA_TIERS.flatMap((t) => t.topics).length;
  const completedTopics = DSA_TIERS.flatMap((t) =>
    t.topics.filter((topic) => (topicSolvedMap[topic.key] ?? 0) >= topic.required)
  ).length;

  return (
    <div className="min-h-screen grid-bg px-4 py-10">
      <div className="orb orb-purple w-96 h-96 top-0 right-0 opacity-10" />

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl font-bold text-white mb-2">DSA Roadmap</h1>
            <p className="text-[#5a5a7a]">Master data structures & algorithms tier by tier. Solve problems in Arena to progress.</p>
          </motion.div>

          {/* Overall progress */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6 bg-[#111118] border border-[#2a2a3a] rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-[#5a5a7a]">Overall Progress</span>
              <span className="text-sm font-medium text-white">{completedTopics}/{totalTopics} topics</span>
            </div>
            <div className="bg-[#1a1a2a] rounded-full h-2.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(completedTopics / totalTopics) * 100}%` }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                className="h-full rounded-full bg-gradient-to-r from-[#6366f1] to-[#22d3ee]"
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-[#5a5a7a]">
              <span>{totalSolved} problems solved</span>
              <span>{completedTopics} topics completed</span>
            </div>
          </motion.div>
        </div>

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
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: unlocked ? tier.color : "#2a2a3a" }}
                  >
                    {tier.tier}
                  </div>
                  <div>
                    <span className="font-semibold text-white text-sm">{tier.label}</span>
                    {!unlocked && (
                      <div className="flex items-center gap-1 text-xs text-[#5a5a7a] mt-0.5">
                        <Lock className="w-3 h-3" />
                        <span>Solve 5 problems in Tier {tier.tier - 1} to unlock</span>
                      </div>
                    )}
                    {unlocked && !tierCompleted && (
                      <div className="text-xs text-[#5a5a7a] mt-0.5">{tierSolves} solves in this tier</div>
                    )}
                    {tierCompleted && (
                      <div className="flex items-center gap-1 text-xs text-[#22c55e] mt-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Tier complete!</span>
                      </div>
                    )}
                  </div>

                  {/* Connector line */}
                  {tierIdx < DSA_TIERS.length - 1 && (
                    <div className="ml-auto flex items-center gap-1 text-[#2a2a3a]">
                      <div className="w-16 h-px bg-[#2a2a3a]" />
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  )}
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
                        animate={{ opacity: unlocked ? 1 : 0.4, scale: 1 }}
                        transition={{ delay: tierIdx * 0.1 + topicIdx * 0.05 }}
                        className={`relative rounded-xl p-4 border transition-all ${
                          completed
                            ? "bg-[#111118] border-[#22c55e]/30"
                            : unlocked
                            ? "bg-[#111118] border-[#2a2a3a] hover:border-[#3a3a4a]"
                            : "bg-[#0d0d15] border-[#1a1a2a] cursor-not-allowed"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {completed ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#22c55e]" />
                              ) : unlocked ? (
                                <Circle className="w-3.5 h-3.5 text-[#5a5a7a]" />
                              ) : (
                                <Lock className="w-3.5 h-3.5 text-[#3a3a4a]" />
                              )}
                              <span className={`text-sm font-semibold ${unlocked ? "text-white" : "text-[#3a3a4a]"}`}>
                                {topic.label}
                              </span>
                            </div>
                            <p className={`text-xs ${unlocked ? "text-[#5a5a7a]" : "text-[#2a2a3a]"}`}>
                              {topic.description}
                            </p>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span className={unlocked ? "text-[#5a5a7a]" : "text-[#2a2a3a]"}>
                              {solved}/{topic.required}
                            </span>
                            {completed && <span className="text-[#22c55e] font-medium">Done</span>}
                          </div>
                          <div className="bg-[#1a1a2a] rounded-full h-1.5 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                              className="h-full rounded-full"
                              style={{ background: completed ? "#22c55e" : tier.color }}
                            />
                          </div>
                        </div>

                        {/* Battle in Arena link */}
                        {unlocked && !completed && (
                          <Link
                            href="/arena"
                            className="mt-3 flex items-center gap-1 text-xs font-medium transition-colors hover:text-[#818cf8]"
                            style={{ color: tier.color }}
                          >
                            <Swords className="w-3 h-3" />
                            Practice in Arena
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-center"
        >
          <p className="text-[#5a5a7a] text-sm mb-4">
            Solve problems in 1v1 matches to advance through tiers
          </p>
          <Link
            href="/arena"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-white btn-glow"
            style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
          >
            <Swords className="w-4 h-4" />
            Find a Match
          </Link>
        </motion.div>
      </div>
    </div>
  );
}