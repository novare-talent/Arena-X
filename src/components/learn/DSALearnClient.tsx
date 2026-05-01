"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MonacoEditor from "@monaco-editor/react";
import {
  BookOpen, CheckCircle2, Circle, ChevronDown, ChevronRight,
  ArrowLeft, Play, ExternalLink, Code2, ListVideo, X,
  PlayCircle, Loader2, ChevronUp, AlertCircle, Terminal,
} from "lucide-react";

type RunResult = {
  status_id: number;
  status: string;
  stdout: string;
  stderr: string;
  compile_output: string;
  time_ms: number | null;
  memory_kb: number | null;
};

// ─── Curriculum (hardcoded per playlist — no DB rows needed) ────────────────

type Lesson = { title: string; index: number; durationMin?: number };
type Section = { title: string; lessons: Lesson[] };

const CURRICULUM: Record<string, Section[]> = {
  PLgUwDviBIf0oF6QL8m22w1hIDC1vJ_BHz: [
    {
      title: "Step 1 – Basics",
      lessons: [
        { title: "Time & Space Complexity", index: 0, durationMin: 25 },
        { title: "STL / Standard Library", index: 1, durationMin: 60 },
        { title: "Basic Recursion", index: 2, durationMin: 30 },
        { title: "Hashing Concepts", index: 3, durationMin: 20 },
      ],
    },
    {
      title: "Step 2 – Sorting",
      lessons: [
        { title: "Selection Sort", index: 4, durationMin: 12 },
        { title: "Bubble Sort", index: 5, durationMin: 10 },
        { title: "Insertion Sort", index: 6, durationMin: 10 },
        { title: "Merge Sort", index: 7, durationMin: 22 },
        { title: "Quick Sort", index: 8, durationMin: 18 },
      ],
    },
    {
      title: "Step 3 – Arrays",
      lessons: [
        { title: "Largest Element", index: 9, durationMin: 10 },
        { title: "Second Largest", index: 10, durationMin: 12 },
        { title: "Remove Duplicates", index: 11, durationMin: 14 },
        { title: "Kadane's Algorithm", index: 16, durationMin: 20 },
        { title: "Two Sum", index: 18, durationMin: 18 },
        { title: "3 Sum", index: 19, durationMin: 22 },
        { title: "Merge Overlapping Intervals", index: 21, durationMin: 20 },
      ],
    },
    {
      title: "Step 4 – Binary Search",
      lessons: [
        { title: "Binary Search Intro", index: 30, durationMin: 22 },
        { title: "Lower / Upper Bound", index: 31, durationMin: 18 },
        { title: "Search in Rotated Array", index: 36, durationMin: 22 },
        { title: "Find Peak Element", index: 40, durationMin: 18 },
        { title: "Binary Search on Answer", index: 42, durationMin: 20 },
      ],
    },
    {
      title: "Step 5 – Strings",
      lessons: [
        { title: "Reverse Words in String", index: 50, durationMin: 14 },
        { title: "Longest Palindromic Substring", index: 52, durationMin: 22 },
        { title: "Roman to Integer", index: 54, durationMin: 16 },
      ],
    },
    {
      title: "Step 6 – Linked Lists",
      lessons: [
        { title: "Introduction to LL", index: 60, durationMin: 20 },
        { title: "Reverse a LL", index: 63, durationMin: 18 },
        { title: "Detect Cycle (Floyd's)", index: 67, durationMin: 25 },
        { title: "Merge Two Sorted Lists", index: 70, durationMin: 20 },
        { title: "LRU Cache", index: 80, durationMin: 35 },
      ],
    },
    {
      title: "Step 7 – Recursion & Backtracking",
      lessons: [
        { title: "Subsets", index: 90, durationMin: 22 },
        { title: "Permutations", index: 92, durationMin: 28 },
        { title: "N-Queens", index: 94, durationMin: 30 },
        { title: "Sudoku Solver", index: 95, durationMin: 32 },
      ],
    },
    {
      title: "Step 8 – Stacks & Queues",
      lessons: [
        { title: "Implement Stack using Arrays", index: 100, durationMin: 15 },
        { title: "Next Greater Element", index: 104, durationMin: 20 },
        { title: "Largest Rectangle in Histogram", index: 108, durationMin: 30 },
      ],
    },
    {
      title: "Step 9 – Sliding Window",
      lessons: [
        { title: "Max Consecutive Ones", index: 115, durationMin: 14 },
        { title: "Longest Substring No Repeat", index: 116, durationMin: 22 },
        { title: "Fruits in Baskets", index: 119, durationMin: 20 },
      ],
    },
    {
      title: "Step 10 – Binary Trees",
      lessons: [
        { title: "Tree Traversals (BFS/DFS)", index: 125, durationMin: 30 },
        { title: "Height of Tree", index: 128, durationMin: 18 },
        { title: "Diameter of Tree", index: 129, durationMin: 20 },
        { title: "LCA of Binary Tree", index: 135, durationMin: 25 },
        { title: "Max Path Sum", index: 138, durationMin: 28 },
      ],
    },
    {
      title: "Step 11 – BST",
      lessons: [
        { title: "Search in BST", index: 145, durationMin: 15 },
        { title: "Validate BST", index: 147, durationMin: 22 },
        { title: "Kth Largest / Smallest", index: 152, durationMin: 22 },
      ],
    },
    {
      title: "Step 12 – Graphs",
      lessons: [
        { title: "BFS of Graph", index: 160, durationMin: 25 },
        { title: "DFS of Graph", index: 161, durationMin: 22 },
        { title: "Bipartite Check", index: 165, durationMin: 24 },
        { title: "Dijkstra's Algorithm", index: 175, durationMin: 35 },
        { title: "Topological Sort", index: 180, durationMin: 30 },
      ],
    },
    {
      title: "Step 13 – Dynamic Programming",
      lessons: [
        { title: "DP Intro & Memoization", index: 195, durationMin: 30 },
        { title: "Climbing Stairs", index: 196, durationMin: 18 },
        { title: "0/1 Knapsack", index: 200, durationMin: 35 },
        { title: "Longest Common Subsequence", index: 205, durationMin: 30 },
        { title: "Edit Distance", index: 208, durationMin: 32 },
        { title: "Partition Equal Subset Sum", index: 220, durationMin: 28 },
      ],
    },
  ],

  PLot38l8Xth8QPBpMhGPNHkHzLhkWrq59e: [
    {
      title: "Arrays & Hashing",
      lessons: [
        { title: "Contains Duplicate", index: 0, durationMin: 8 },
        { title: "Valid Anagram", index: 1, durationMin: 9 },
        { title: "Two Sum", index: 2, durationMin: 11 },
        { title: "Group Anagrams", index: 3, durationMin: 14 },
        { title: "Top K Frequent Elements", index: 4, durationMin: 13 },
        { title: "Product of Array Except Self", index: 5, durationMin: 12 },
      ],
    },
    {
      title: "Two Pointers",
      lessons: [
        { title: "Valid Palindrome", index: 7, durationMin: 8 },
        { title: "3Sum", index: 8, durationMin: 14 },
        { title: "Container With Most Water", index: 9, durationMin: 12 },
      ],
    },
    {
      title: "Sliding Window",
      lessons: [
        { title: "Best Time to Buy and Sell Stock", index: 10, durationMin: 10 },
        { title: "Longest Substring Without Repeating", index: 11, durationMin: 13 },
        { title: "Longest Repeating Char Replacement", index: 12, durationMin: 16 },
        { title: "Minimum Window Substring", index: 13, durationMin: 18 },
      ],
    },
    {
      title: "Stack",
      lessons: [
        { title: "Valid Parentheses", index: 14, durationMin: 8 },
        { title: "Min Stack", index: 15, durationMin: 10 },
        { title: "Daily Temperatures", index: 16, durationMin: 12 },
      ],
    },
    {
      title: "Binary Search",
      lessons: [
        { title: "Binary Search", index: 17, durationMin: 9 },
        { title: "Search 2D Matrix", index: 18, durationMin: 11 },
        { title: "Koko Eating Bananas", index: 19, durationMin: 14 },
        { title: "Search in Rotated Sorted Array", index: 20, durationMin: 12 },
        { title: "Find Min in Rotated Sorted Array", index: 21, durationMin: 10 },
      ],
    },
    {
      title: "Linked List",
      lessons: [
        { title: "Reverse Linked List", index: 23, durationMin: 9 },
        { title: "Merge Two Sorted Lists", index: 24, durationMin: 10 },
        { title: "Reorder List", index: 25, durationMin: 13 },
        { title: "Remove Nth Node From End", index: 26, durationMin: 11 },
        { title: "Linked List Cycle", index: 27, durationMin: 8 },
        { title: "Merge K Sorted Lists", index: 28, durationMin: 18 },
      ],
    },
    {
      title: "Trees",
      lessons: [
        { title: "Invert Binary Tree", index: 29, durationMin: 8 },
        { title: "Maximum Depth of Binary Tree", index: 30, durationMin: 8 },
        { title: "Diameter of Binary Tree", index: 31, durationMin: 10 },
        { title: "Lowest Common Ancestor of BST", index: 35, durationMin: 11 },
        { title: "Binary Tree Level Order Traversal", index: 36, durationMin: 12 },
        { title: "Binary Tree Right Side View", index: 37, durationMin: 11 },
        { title: "Count Good Nodes", index: 38, durationMin: 10 },
      ],
    },
    {
      title: "Heap / Priority Queue",
      lessons: [
        { title: "Kth Largest Element", index: 39, durationMin: 11 },
        { title: "K Closest Points to Origin", index: 40, durationMin: 12 },
        { title: "Find Median from Data Stream", index: 41, durationMin: 18 },
      ],
    },
    {
      title: "Backtracking",
      lessons: [
        { title: "Subsets", index: 42, durationMin: 12 },
        { title: "Combination Sum", index: 43, durationMin: 14 },
        { title: "Permutations", index: 44, durationMin: 14 },
        { title: "Word Search", index: 45, durationMin: 16 },
      ],
    },
    {
      title: "Graphs",
      lessons: [
        { title: "Number of Islands", index: 46, durationMin: 14 },
        { title: "Clone Graph", index: 47, durationMin: 13 },
        { title: "Pacific Atlantic Water Flow", index: 49, durationMin: 16 },
        { title: "Course Schedule", index: 50, durationMin: 18 },
      ],
    },
    {
      title: "1-D Dynamic Programming",
      lessons: [
        { title: "Climbing Stairs", index: 51, durationMin: 10 },
        { title: "House Robber", index: 53, durationMin: 11 },
        { title: "Longest Palindromic Substring", index: 54, durationMin: 14 },
        { title: "Coin Change", index: 56, durationMin: 14 },
      ],
    },
    {
      title: "2-D DP & Greedy",
      lessons: [
        { title: "Unique Paths", index: 57, durationMin: 12 },
        { title: "Longest Common Subsequence", index: 58, durationMin: 16 },
        { title: "Maximum Subarray", index: 60, durationMin: 10 },
        { title: "Jump Game", index: 61, durationMin: 10 },
        { title: "Merge Intervals", index: 62, durationMin: 12 },
      ],
    },
  ],

  PL_z_8CaSLPWekqhdCPmFohncHwz8TY2Go: [
    {
      title: "Introduction to DP",
      lessons: [
        { title: "What is DP? Recursion vs DP", index: 0, durationMin: 28 },
        { title: "Top-down vs Bottom-up", index: 1, durationMin: 25 },
      ],
    },
    {
      title: "0/1 Knapsack Pattern",
      lessons: [
        { title: "0/1 Knapsack – Introduction", index: 2, durationMin: 30 },
        { title: "Subset Sum", index: 3, durationMin: 28 },
        { title: "Equal Sum Partition", index: 4, durationMin: 25 },
        { title: "Count of Subset Sum", index: 5, durationMin: 22 },
        { title: "Minimum Subset Sum Difference", index: 6, durationMin: 25 },
        { title: "Target Sum", index: 8, durationMin: 20 },
      ],
    },
    {
      title: "Unbounded Knapsack",
      lessons: [
        { title: "Unbounded Knapsack – Introduction", index: 9, durationMin: 22 },
        { title: "Rod Cutting Problem", index: 10, durationMin: 25 },
        { title: "Coin Change – Min Coins", index: 11, durationMin: 24 },
        { title: "Coin Change – Count Ways", index: 12, durationMin: 22 },
      ],
    },
    {
      title: "Longest Common Subsequence",
      lessons: [
        { title: "LCS – Introduction", index: 14, durationMin: 30 },
        { title: "Longest Common Substring", index: 15, durationMin: 25 },
        { title: "Shortest Common Supersequence", index: 16, durationMin: 22 },
        { title: "Longest Palindromic Subsequence", index: 18, durationMin: 25 },
        { title: "LIS (Longest Increasing Subsequence)", index: 23, durationMin: 30 },
      ],
    },
    {
      title: "Matrix Chain Multiplication",
      lessons: [
        { title: "MCM – Introduction", index: 24, durationMin: 35 },
        { title: "Palindrome Partitioning", index: 25, durationMin: 28 },
        { title: "Egg Dropping Problem", index: 28, durationMin: 32 },
      ],
    },
    {
      title: "DP on Trees & Grid",
      lessons: [
        { title: "Max Sum of Non-Adjacent Nodes", index: 29, durationMin: 25 },
        { title: "Diameter of Binary Tree", index: 30, durationMin: 28 },
        { title: "Grid Unique Paths", index: 32, durationMin: 22 },
        { title: "Min Path Sum in Grid", index: 33, durationMin: 20 },
      ],
    },
  ],
};

// ─── Starter code templates ─────────────────────────────────────────────────
const STARTER: Record<string, string> = {
  python: `# Write your solution here\ndef solution():\n    pass\n\nprint(solution())\n`,
  javascript: `// Write your solution here\nfunction solution() {\n\n}\n\nconsole.log(solution());\n`,
  java: `public class Solution {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}\n`,
  cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n`,
};

// ─── Types ─────────────────────────────────────────────────────────────────
type DbLesson = { id: string; title: string; youtube_video_id: string; duration_min: number | null; sort_order: number };
type Playlist = { id: string; title: string; creator: string; youtube_id: string; description: string | null; level: string; learn_lessons: DbLesson[] };
type Props = { playlists: Playlist[]; completedLessons: string[]; userId: string };
type ActiveLesson = { lesson: Lesson; sectionTitle: string; key: string };

const LEVEL_COLOR: Record<string, string> = { beginner: "#22c55e", intermediate: "#f59e0b", advanced: "#ef4444" };
const LANGS = ["python", "javascript", "java", "cpp"] as const;
type Lang = typeof LANGS[number];

// ─── Component ─────────────────────────────────────────────────────────────
export default function DSALearnClient({ playlists, completedLessons }: Props) {
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [activeLesson, setActiveLesson] = useState<ActiveLesson | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set(completedLessons));
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [showLessons, setShowLessons] = useState(false);
  const [lang, setLang] = useState<Lang>("python");
  const [code, setCode] = useState(STARTER.python);
  const [stdin, setStdin] = useState("");
  const [showStdin, setShowStdin] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [showOutput, setShowOutput] = useState(false);
  const lessonPanelRef = useRef<HTMLDivElement>(null);

  // Close lesson overlay when clicking outside
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (lessonPanelRef.current && !lessonPanelRef.current.contains(e.target as Node)) {
        setShowLessons(false);
      }
    }
    if (showLessons) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [showLessons]);

  function pickPlaylist(p: Playlist) {
    setSelectedPlaylist(p);
    const sections = CURRICULUM[p.youtube_id] ?? [];
    if (sections.length) {
      setExpandedSections(new Set([sections[0].title]));
      if (sections[0].lessons.length) {
        const first = sections[0].lessons[0];
        setActiveLesson({ lesson: first, sectionTitle: sections[0].title, key: `${p.youtube_id}-${first.index}` });
      }
    }
  }

  function pickLesson(playlist: Playlist, sectionTitle: string, lesson: Lesson) {
    setActiveLesson({ lesson, sectionTitle, key: `${playlist.youtube_id}-${lesson.index}` });
    setShowLessons(false);
  }

  function toggleSection(title: string) {
    setExpandedSections((prev) => {
      const next = new Set(Array.from(prev));
      if (next.has(title)) { next.delete(title); } else { next.add(title); }
      return next;
    });
  }

  function markComplete(key: string, lessonId: string, playlistId: string) {
    setCompleted((prev) => new Set(Array.from(prev).concat(key)));
    fetch("/api/learn/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lesson_id: lessonId, playlist_id: playlistId }),
    }).catch(() => {});
  }

  async function handleRun() {
    if (!code.trim() || running) return;
    setRunning(true);
    setRunResult(null);
    setShowOutput(true);
    try {
      const res = await fetch("/api/learn/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_code: code, language: lang, stdin }),
      });
      const data = await res.json();
      // API always returns 200 with a shaped result — just use it directly
      setRunResult(data as RunResult);
    } catch (err) {
      // Only hits here on true network failure (no internet, etc.)
      setRunResult({
        status_id: 0,
        status: "Network Error",
        stdout: "",
        stderr: err instanceof Error ? err.message : "Could not reach the server.",
        compile_output: "",
        time_ms: null,
        memory_kb: null,
      });
    } finally {
      setRunning(false);
    }
  }

  const sections = selectedPlaylist ? (CURRICULUM[selectedPlaylist.youtube_id] ?? []) : [];
  const totalLessons = sections.reduce((a, s) => a + s.lessons.length, 0);
  const completedCount = sections.reduce(
    (a, s) => a + s.lessons.filter((l) => completed.has(`${selectedPlaylist!.youtube_id}-${l.index}`)).length,
    0
  );

  function embedUrl() {
    if (!selectedPlaylist) return "";
    const base = "https://www.youtube.com/embed";
    if (activeLesson) return `${base}?listType=playlist&list=${selectedPlaylist.youtube_id}&index=${activeLesson.lesson.index}&rel=0&modestbranding=1`;
    return `${base}?listType=playlist&list=${selectedPlaylist.youtube_id}&rel=0&modestbranding=1`;
  }

  // ── Playlist picker ───────────────────────────────────────────────────────
  if (!selectedPlaylist) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] pt-20 pb-12 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-[#6366f1]" />
              <span className="text-sm text-[#5a5a7a] font-medium uppercase tracking-wider">DSA Track</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Choose a Playlist</h1>
            <p className="text-[#5a5a7a] text-sm">Video on the left, code editor on the right. Pick one to begin.</p>
          </motion.div>

          <div className="space-y-4">
            {playlists.map((p, i) => {
              const cur = CURRICULUM[p.youtube_id] ?? [];
              const count = cur.reduce((a, s) => a + s.lessons.length, 0);
              return (
                <motion.button
                  key={p.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => pickPlaylist(p)}
                  className="w-full text-left bg-[#111118] border border-[#2a2a3a] hover:border-[#6366f1]/40 rounded-2xl p-6 transition-all hover:scale-[1.01] group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded uppercase"
                          style={{ color: LEVEL_COLOR[p.level] ?? "#fff", background: `${LEVEL_COLOR[p.level] ?? "#fff"}22` }}
                        >
                          {p.level}
                        </span>
                        <span className="text-xs text-[#3a3a4a]">{count} lessons</span>
                      </div>
                      <h3 className="text-lg font-bold text-white mb-0.5">{p.title}</h3>
                      <p className="text-sm text-[#5a5a7a] mb-2">by {p.creator}</p>
                      {p.description && <p className="text-xs text-[#5a5a7a] leading-relaxed line-clamp-2">{p.description}</p>}
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-[#6366f1]/10 group-hover:bg-[#6366f1]/20 flex items-center justify-center transition-colors shrink-0">
                      <Play className="w-5 h-5 text-[#6366f1]" />
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Learning view ─────────────────────────────────────────────────────────
  const isDone = activeLesson ? completed.has(activeLesson.key) : false;

  return (
    <div className="h-screen bg-[#0a0a0f] flex flex-col overflow-hidden pt-16">

      {/* Top bar */}
      <div className="h-11 shrink-0 bg-[#111118] border-b border-[#2a2a3a] flex items-center justify-between px-4 gap-4">
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => { setSelectedPlaylist(null); setActiveLesson(null); setShowLessons(false); }}
            className="flex items-center gap-1.5 text-xs text-[#5a5a7a] hover:text-white transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Playlists
          </button>
          <span className="text-[#2a2a3a]">·</span>
          <span className="text-xs font-semibold text-white truncate max-w-48">{selectedPlaylist.title}</span>
          {activeLesson && (
            <>
              <span className="hidden sm:block text-[#2a2a3a]">·</span>
              <span className="hidden sm:block text-xs text-[#6b6b8a] truncate max-w-40">{activeLesson.lesson.title}</span>
            </>
          )}
        </div>

        {/* Center: lessons toggle */}
        <div className="relative" ref={lessonPanelRef}>
          <button
            onClick={() => setShowLessons((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              showLessons ? "bg-[#6366f1]/20 text-[#818cf8]" : "bg-[#1e1e2e] text-[#a1a1b5] hover:text-white"
            }`}
          >
            <ListVideo className="w-3.5 h-3.5" />
            Lessons
            <ChevronDown className={`w-3 h-3 transition-transform ${showLessons ? "rotate-180" : ""}`} />
          </button>

          {/* Lessons overlay panel */}
          <AnimatePresence>
            {showLessons && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full mt-2 left-0 w-80 max-h-[70vh] bg-[#111118] border border-[#2a2a3a] rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
              >
                {/* Panel header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a3a] shrink-0">
                  <div>
                    <p className="text-xs font-semibold text-white">{selectedPlaylist.title}</p>
                    <p className="text-[10px] text-[#5a5a7a] mt-0.5">{completedCount}/{totalLessons} completed</p>
                  </div>
                  {/* Progress */}
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1 bg-[#1e1e2e] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#6366f1] transition-all"
                        style={{ width: `${totalLessons ? (completedCount / totalLessons) * 100 : 0}%` }}
                      />
                    </div>
                    <button onClick={() => setShowLessons(false)} className="text-[#5a5a7a] hover:text-white ml-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Scrollable list */}
                <div className="overflow-y-auto flex-1">
                  {sections.map((section) => {
                    const isOpen = expandedSections.has(section.title);
                    const sectionDone = section.lessons.filter((l) =>
                      completed.has(`${selectedPlaylist.youtube_id}-${l.index}`)
                    ).length;
                    return (
                      <div key={section.title} className="border-b border-[#1a1a24] last:border-0">
                        <button
                          onClick={() => toggleSection(section.title)}
                          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#16161e] transition-colors"
                        >
                          <span className="text-xs font-semibold text-[#a1a1b5] text-left leading-snug pr-2">{section.title}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-[#3a3a4a]">{sectionDone}/{section.lessons.length}</span>
                            {isOpen ? <ChevronDown className="w-3 h-3 text-[#5a5a7a]" /> : <ChevronRight className="w-3 h-3 text-[#5a5a7a]" />}
                          </div>
                        </button>

                        {isOpen && section.lessons.map((lesson) => {
                          const key = `${selectedPlaylist.youtube_id}-${lesson.index}`;
                          const lessonDone = completed.has(key);
                          const isActive = activeLesson?.key === key;
                          return (
                            <button
                              key={key}
                              onClick={() => pickLesson(selectedPlaylist, section.title, lesson)}
                              className={`w-full flex items-center gap-3 px-5 py-2 text-left transition-colors hover:bg-[#16161e] ${
                                isActive ? "bg-[#6366f1]/10 border-l-2 border-[#6366f1]" : ""
                              }`}
                            >
                              {lessonDone ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#22c55e] shrink-0" />
                              ) : (
                                <Circle className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-[#818cf8]" : "text-[#3a3a4a]"}`} />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs leading-snug truncate ${
                                  isActive ? "text-[#818cf8] font-medium" : lessonDone ? "text-[#5a5a7a]" : "text-[#a1a1b5]"
                                }`}>
                                  {lesson.title}
                                </p>
                                {lesson.durationMin && (
                                  <p className="text-[10px] text-[#3a3a4a] mt-0.5">{lesson.durationMin}m</p>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3 shrink-0">
          {activeLesson && (
            <button
              onClick={() => !isDone && markComplete(activeLesson.key, "", selectedPlaylist.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                isDone
                  ? "bg-[#22c55e]/15 text-[#4ade80] cursor-default"
                  : "bg-[#1e1e2e] text-[#a1a1b5] hover:text-white hover:bg-[#6366f1]/15 hover:text-[#818cf8]"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isDone ? "Done" : "Mark complete"}
            </button>
          )}
          <a
            href={`https://www.youtube.com/playlist?list=${selectedPlaylist.youtube_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-[#5a5a7a] hover:text-white transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:block">YouTube</span>
          </a>
        </div>
      </div>

      {/* Main split: video left | editor right */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: YouTube video ── */}
        <div className="flex-1 bg-black overflow-hidden">
          <iframe
            key={embedUrl()}
            src={embedUrl()}
            title={activeLesson?.lesson.title ?? selectedPlaylist.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>

        {/* ── Right: Code editor + output ── */}
        <div className="w-[42%] shrink-0 flex flex-col border-l border-[#2a2a3a] overflow-hidden">

          {/* Toolbar */}
          <div className="h-9 bg-[#0d0d14] border-b border-[#2a2a3a] flex items-center gap-1 px-3 shrink-0">
            <Code2 className="w-3.5 h-3.5 text-[#5a5a7a] mr-1" />
            {LANGS.map((l) => (
              <button
                key={l}
                onClick={() => { setLang(l); setCode(STARTER[l]); setRunResult(null); }}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  lang === l ? "bg-[#6366f1]/20 text-[#818cf8]" : "text-[#5a5a7a] hover:text-[#a1a1b5]"
                }`}
              >
                {l === "cpp" ? "C++" : l.charAt(0).toUpperCase() + l.slice(1)}
              </button>
            ))}

            <div className="ml-auto flex items-center gap-1.5">
              {/* stdin toggle */}
              <button
                onClick={() => setShowStdin((v) => !v)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  showStdin ? "text-[#f59e0b] bg-[#f59e0b]/10" : "text-[#5a5a7a] hover:text-[#a1a1b5]"
                }`}
                title="Custom stdin"
              >
                stdin
              </button>
              {/* Run */}
              <button
                onClick={handleRun}
                disabled={running}
                className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold bg-[#22c55e]/20 text-[#4ade80] hover:bg-[#22c55e]/30 disabled:opacity-50 transition-colors"
              >
                {running ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <PlayCircle className="w-3.5 h-3.5" />
                )}
                {running ? "Running…" : "Run"}
              </button>
            </div>
          </div>

          {/* Optional stdin input */}
          <AnimatePresence>
            {showStdin && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="overflow-hidden shrink-0 border-b border-[#2a2a3a]"
              >
                <textarea
                  value={stdin}
                  onChange={(e) => setStdin(e.target.value)}
                  placeholder="Custom stdin (optional)…"
                  className="w-full h-16 bg-[#0a0a0f] text-xs text-[#a1a1b5] placeholder:text-[#3a3a4a] px-3 py-2 resize-none focus:outline-none font-mono"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Monaco — shrinks when output is open */}
          <div className={`${showOutput ? "flex-1" : "flex-1"} overflow-hidden min-h-0`}>
            <MonacoEditor
              height="100%"
              language={lang === "cpp" ? "cpp" : lang}
              value={code}
              onChange={(v) => setCode(v ?? "")}
              theme="vs-dark"
              options={{
                fontSize: 13,
                minimap: { enabled: false },
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                wordWrap: "on",
                padding: { top: 12, bottom: 12 },
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              }}
            />
          </div>

          {/* Output panel */}
          <AnimatePresence>
            {showOutput && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 220 }}
                exit={{ height: 0 }}
                className="shrink-0 border-t border-[#2a2a3a] bg-[#0a0a0f] overflow-hidden flex flex-col"
              >
                {/* Output header */}
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#1e1e2e] shrink-0">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-[#5a5a7a]" />
                    <span className="text-xs font-semibold text-[#a1a1b5]">Output</span>
                    {runResult && !running && (
                      <>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            runResult.status_id === 3
                              ? "bg-[#22c55e]/20 text-[#4ade80]"
                              : "bg-[#ef4444]/20 text-[#f87171]"
                          }`}
                        >
                          {runResult.status}
                        </span>
                        {runResult.time_ms !== null && (
                          <span className="text-[10px] text-[#3a3a4a]">{runResult.time_ms}ms</span>
                        )}
                        {runResult.memory_kb !== null && (
                          <span className="text-[10px] text-[#3a3a4a]">{Math.round(runResult.memory_kb / 1024)}MB</span>
                        )}
                      </>
                    )}
                  </div>
                  <button onClick={() => setShowOutput(false)} className="text-[#5a5a7a] hover:text-white transition-colors">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Output body */}
                <div className="flex-1 overflow-y-auto px-3 py-2 font-mono text-xs">
                  {running ? (
                    <div className="flex items-center gap-2 text-[#5a5a7a]">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Executing…
                    </div>
                  ) : runResult ? (
                    <>
                      {/* Compile error */}
                      {runResult.compile_output && (
                        <div className="mb-2">
                          <p className="text-[#f59e0b] text-[10px] font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Compile Error
                          </p>
                          <pre className="text-[#f87171] whitespace-pre-wrap leading-relaxed">{runResult.compile_output}</pre>
                        </div>
                      )}
                      {/* Stderr */}
                      {runResult.stderr && !runResult.compile_output && (
                        <div className="mb-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#f59e0b] mb-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Stderr
                          </p>
                          <pre className="text-[#f87171] whitespace-pre-wrap leading-relaxed">{runResult.stderr}</pre>
                        </div>
                      )}
                      {/* Stdout */}
                      {runResult.stdout ? (
                        <pre className="text-[#a1a1b5] whitespace-pre-wrap leading-relaxed">{runResult.stdout}</pre>
                      ) : !runResult.compile_output && !runResult.stderr ? (
                        <span className="text-[#3a3a4a]">(no output)</span>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collapsed output tab (when output exists but panel is closed) */}
          {!showOutput && runResult && (
            <button
              onClick={() => setShowOutput(true)}
              className={`shrink-0 flex items-center gap-2 px-3 py-1.5 border-t text-xs font-semibold transition-colors ${
                runResult.status_id === 3
                  ? "border-[#22c55e]/30 text-[#4ade80] bg-[#22c55e]/5 hover:bg-[#22c55e]/10"
                  : "border-[#ef4444]/30 text-[#f87171] bg-[#ef4444]/5 hover:bg-[#ef4444]/10"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              {runResult.status}
              {runResult.time_ms !== null && <span className="font-normal text-[#5a5a7a]">· {runResult.time_ms}ms</span>}
              <ChevronUp className="w-3 h-3 ml-auto" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
