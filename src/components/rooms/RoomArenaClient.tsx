"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import {
  CheckCircle2, XCircle, Lock, Clock, Users, ChevronRight,
  Loader2, Play, AlertTriangle, Flame, Crown, LogOut, BarChart2,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { LANGUAGE_LABELS, DEFAULT_STARTERS, type LangKey } from "@/lib/judge0";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const DIFF_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Easy",   color: "#22c55e" },
  2: { label: "Easy+",  color: "#84cc16" },
  3: { label: "Medium", color: "#f59e0b" },
  4: { label: "Hard",   color: "#f97316" },
  5: { label: "Hard+",  color: "#ef4444" },
};

interface Problem {
  id: string; title: string; description: string;
  difficulty: number; topics: string[]; match_duration_minutes: number;
  order_index: number;
}

interface Room {
  id: string; code: string; title: string; mode: string; status: string;
  ends_at: string | null; host_id: string;
  settings: { time_limit_minutes?: number };
}

interface LeaderboardEntry {
  user_id: string; score: number; status: string;
  profile: { display_name: string; username: string };
}

type ProblemStatus = "unsolved" | "attempted" | "accepted" | "locked" | "eliminated";

export default function RoomArenaClient({
  room, userId, displayName, problems,
}: {
  room: Room;
  userId: string;
  displayName: string;
  problems: Problem[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [activeProblemIdx, setActiveProblemIdx] = useState(0);
  const [language, setLanguage] = useState<LangKey>("python");
  const [codeMap, setCodeMap] = useState<Record<string, string>>(() =>
    Object.fromEntries(problems.map(p => [p.id, DEFAULT_STARTERS.python]))
  );
  const [problemStatuses, setProblemStatuses] = useState<Record<string, ProblemStatus>>(
    () => Object.fromEntries(problems.map(p => [p.id, "unsolved"]))
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ verdict: string; passed: number; total: number; score: number; next?: string | null; results?: { passed: boolean; verdict: string; time_ms?: number }[] } | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [eliminated, setEliminated] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  void displayName;

  const activeProblem = problems[activeProblemIdx];

  // Timer
  useEffect(() => {
    if (!room.ends_at) return;
    const endsAt = new Date(room.ends_at).getTime();

    timerRef.current = setInterval(() => {
      const left = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
      setTimeLeft(left);
      if (left === 0) {
        clearInterval(timerRef.current!);
        setTimeout(() => router.push(`/rooms/${room.code}/results`), 2000);
      }
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [room.ends_at, room.code, router]);

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async () => {
    const { data } = await supabase
      .from("room_participants")
      .select(`user_id, score, status, profile:profiles!room_participants_user_id_fkey(display_name, username)`)
      .eq("room_id", room.id)
      .neq("status", "left")
      .order("score", { ascending: false });
    const entries = ((data ?? []) as unknown[]).map((row) => {
      const r = row as { user_id: string; score: number; status: string; profile: { display_name: string; username: string } | { display_name: string; username: string }[] };
      return { ...r, profile: Array.isArray(r.profile) ? r.profile[0] : r.profile } as LeaderboardEntry;
    });
    setLeaderboard(entries);

    // Check if I'm eliminated
    const me = entries.find((p) => p.user_id === userId);
    if (me?.status === "eliminated") setEliminated(true);
  }, [room.id, supabase, userId]);

  // Fetch my submission statuses
  const fetchMyStatuses = useCallback(async () => {
    const { data } = await supabase
      .from("room_submissions")
      .select("problem_id, verdict")
      .eq("room_id", room.id)
      .eq("user_id", userId);

    const newStatuses: Record<string, ProblemStatus> = {};
    const accepted = new Set((data ?? []).filter(s => s.verdict === "accepted").map(s => s.problem_id));
    const attempted = new Set((data ?? []).map(s => s.problem_id));

    for (let i = 0; i < problems.length; i++) {
      const p = problems[i];
      if (accepted.has(p.id)) {
        newStatuses[p.id] = "accepted";
      } else if (room.mode === "blitz" && i > 0 && !accepted.has(problems[i - 1].id)) {
        newStatuses[p.id] = "locked";
      } else if (attempted.has(p.id)) {
        newStatuses[p.id] = "attempted";
      } else {
        newStatuses[p.id] = "unsolved";
      }
    }
    setProblemStatuses(newStatuses);
  }, [room.id, room.mode, supabase, userId, problems]);

  useEffect(() => {
    fetchLeaderboard();
    fetchMyStatuses();

    // Realtime for participant score updates
    const sub = supabase
      .channel(`room-arena-${room.id}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "room_participants",
        filter: `room_id=eq.${room.id}`,
      }, () => { fetchLeaderboard(); fetchMyStatuses(); })
      .subscribe();

    // Check room status
    const roomSub = supabase
      .channel(`room-status-${room.id}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "rooms",
        filter: `id=eq.${room.id}`,
      }, (payload) => {
        if ((payload.new as Room).status === "completed") {
          router.push(`/rooms/${room.code}/results`);
        }
      })
      .subscribe();

    pollRef.current = setInterval(() => { fetchLeaderboard(); fetchMyStatuses(); }, 5000);

    return () => {
      supabase.removeChannel(sub);
      supabase.removeChannel(roomSub);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [room.id, room.code, fetchLeaderboard, fetchMyStatuses, router, supabase]);

  async function handleLeave() {
    setLeaving(true);
    await fetch(`/api/rooms/${room.code}/leave`, { method: "POST" });
    router.push("/rooms");
  }

  async function handleSubmit() {
    if (!activeProblem) return;
    setSubmitting(true);
    setSubmitResult(null);
    setSubmitError("");

    const res = await fetch(`/api/rooms/${room.code}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        problem_id: activeProblem.id,
        language,
        code: codeMap[activeProblem.id] ?? "",
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      if (res.status === 503) { setSubmitError("Code execution unavailable — Judge0 not configured"); return; }
      setSubmitError(data.error ?? "Submission failed");
      return;
    }

    setSubmitResult(data);
    fetchMyStatuses();
    fetchLeaderboard();

    // Blitz: auto-advance to next unlocked problem
    if (data.verdict === "accepted" && data.next_problem_id) {
      const nextIdx = problems.findIndex(p => p.id === data.next_problem_id);
      if (nextIdx !== -1) setTimeout(() => setActiveProblemIdx(nextIdx), 1200);
    }

    if (data.finished) {
      setTimeout(() => router.push(`/rooms/${room.code}/results`), 2000);
    }
  }

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const statusIcon = (s: ProblemStatus) => {
    if (s === "accepted")  return <CheckCircle2 className="w-3.5 h-3.5 text-[#22c55e]" />;
    if (s === "attempted") return <XCircle className="w-3.5 h-3.5 text-[#f59e0b]" />;
    if (s === "locked")    return <Lock className="w-3.5 h-3.5 text-[#3a3a5a]" />;
    return <div className="w-3.5 h-3.5 rounded-full border border-[#3a3a5a]" />;
  };

  const isLocked = activeProblem && problemStatuses[activeProblem.id] === "locked";
  const diff = activeProblem ? (DIFF_LABELS[activeProblem.difficulty] ?? DIFF_LABELS[1]) : DIFF_LABELS[1];

  return (
    <div className="flex h-screen bg-[#0a0a0f] pt-16 overflow-hidden">

      {/* Left: Problem sidebar */}
      <div className="w-64 shrink-0 border-r border-[#2a2a3a] flex flex-col">

        {/* Timer + mode */}
        <div className="p-3 border-b border-[#2a2a3a]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#5a5a7a] font-medium uppercase tracking-wider">{room.mode.replace("_", " ")}</span>
            {timeLeft !== null && (
              <span className={`font-mono text-sm font-bold flex items-center gap-1 ${timeLeft < 60 ? "text-red-400" : "text-white"}`}>
                <Clock className="w-3 h-3" />{fmtTime(timeLeft)}
              </span>
            )}
          </div>
        </div>

        {/* Problem list */}
        <div className="flex-1 overflow-y-auto p-2">
          <p className="text-[10px] text-[#3a3a5a] uppercase tracking-wider px-2 mb-2 font-medium">Problems</p>
          {problems.map((p, i) => {
            const st = problemStatuses[p.id] ?? "unsolved";
            const d = DIFF_LABELS[p.difficulty] ?? DIFF_LABELS[1];
            return (
              <button
                key={p.id}
                onClick={() => st !== "locked" && setActiveProblemIdx(i)}
                disabled={st === "locked"}
                className={`w-full flex items-center gap-2 px-2 py-2.5 rounded-lg text-left transition-all mb-1 ${
                  activeProblemIdx === i
                    ? "bg-[#6366f1]/15 border border-[#6366f1]/30"
                    : st === "locked"
                    ? "opacity-40 cursor-not-allowed"
                    : "hover:bg-[#1a1a24]"
                }`}
              >
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  {statusIcon(st)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-medium truncate ${activeProblemIdx === i ? "text-white" : "text-[#a1a1b5]"}`}>
                    {i + 1}. {p.title}
                  </p>
                  <p className="text-[10px] font-medium" style={{ color: d.color }}>{d.label}</p>
                </div>
                {activeProblemIdx === i && <ChevronRight className="w-3 h-3 text-[#6366f1] shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Live leaderboard */}
        <div className="border-t border-[#2a2a3a] p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Users className="w-3 h-3 text-[#5a5a7a]" />
            <p className="text-[10px] text-[#5a5a7a] uppercase tracking-wider font-medium">Live Standings</p>
          </div>
          <div className="space-y-1">
            {leaderboard.slice(0, 5).map((e, i) => (
              <div key={e.user_id} className={`flex items-center gap-1.5 ${e.user_id === userId ? "text-[#818cf8]" : "text-[#a1a1b5]"}`}>
                <span className="text-[10px] w-3 font-bold">{i + 1}</span>
                {i === 0 && <Crown className="w-2.5 h-2.5 text-[#f59e0b]" />}
                <span className="text-[11px] flex-1 truncate">{e.profile.display_name}</span>
                {e.status === "eliminated" && <Flame className="w-3 h-3 text-red-400" />}
                <span className="text-[11px] font-bold">{e.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Middle: Problem statement */}
      <div className="w-[38%] border-r border-[#2a2a3a] flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {activeProblem ? (
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-white font-bold text-base">{activeProblem.order_index + 1}. {activeProblem.title}</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ color: diff.color, background: `${diff.color}15` }}>
                  {diff.label}
                </span>
              </div>
              {isLocked ? (
                <div className="flex flex-col items-center justify-center py-20 text-[#3a3a5a]">
                  <Lock className="w-10 h-10 mb-3" />
                  <p className="text-sm font-medium">Solve the previous problem to unlock</p>
                </div>
              ) : (
                <div className="prose prose-invert prose-sm max-w-none text-[#c9cad1] text-sm leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeProblem.description}</ReactMarkdown>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-[#3a3a5a] text-sm">No problems</div>
          )}
        </div>

        {/* Test results panel */}
        <AnimatePresence>
          {submitResult?.results && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-[#1a1a2a] bg-[#0d0d15] overflow-hidden shrink-0"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-[#5a5a7a]" />
                    <span className="text-sm font-medium text-white">Test Results</span>
                  </div>
                  <span className={`text-sm font-bold ${submitResult.passed === submitResult.total ? "text-[#22c55e]" : "text-[#f97316]"}`}>
                    {submitResult.passed}/{submitResult.total} passed
                  </span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {submitResult.results.map((r, i) => (
                    <div key={i} className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${r.passed ? "bg-[#22c55e]/10 border border-[#22c55e]/20" : "bg-red-500/10 border border-red-500/20"}`}>
                      {r.passed
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-[#22c55e] shrink-0" />
                        : <XCircle      className="w-3.5 h-3.5 text-red-400   shrink-0" />}
                      <span className={r.passed ? "text-[#22c55e]" : "text-red-400"}>
                        Case {i + 1}: {r.verdict}
                      </span>
                      {r.time_ms && (
                        <span className="ml-auto text-[#5a5a7a]">{r.time_ms}ms</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right: Editor */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Editor toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#2a2a3a] bg-[#0d0d15]">
          <select
            value={language}
            onChange={e => {
              const lang = e.target.value as LangKey;
              setLanguage(lang);
              if (activeProblem && !codeMap[activeProblem.id]) {
                setCodeMap(prev => ({ ...prev, [activeProblem.id]: DEFAULT_STARTERS[lang] }));
              }
            }}
            className="bg-[#1a1a24] border border-[#2a2a3a] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#6366f1]/50"
          >
            {(Object.entries(LANGUAGE_LABELS) as [LangKey, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            {!showLeaveConfirm ? (
              <button
                onClick={() => setShowLeaveConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#5a5a7a] hover:text-red-400 hover:bg-red-500/10 border border-[#2a2a3a] hover:border-red-500/30 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" /> Leave
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[#a1a1b5]">Leave room?</span>
                <button
                  onClick={handleLeave}
                  disabled={leaving}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all"
                >
                  {leaving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Yes"}
                </button>
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  className="px-2.5 py-1.5 rounded-lg text-xs text-[#5a5a7a] hover:text-white transition-all"
                >
                  No
                </button>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || isLocked || eliminated}
              className="flex items-center gap-2 px-5 py-1.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40 transition-all"
              style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Submit
            </button>
          </div>
        </div>

        {/* Monaco */}
        <div className="flex-1">
          {activeProblem && !isLocked ? (
            <MonacoEditor
              height="100%"
              language={language === "cpp" ? "cpp" : language === "java" ? "java" : language === "c" ? "c" : language === "javascript" ? "javascript" : "python"}
              theme="vs-dark"
              value={codeMap[activeProblem.id] ?? DEFAULT_STARTERS[language]}
              onChange={val => {
                if (activeProblem) setCodeMap(prev => ({ ...prev, [activeProblem.id]: val ?? "" }));
              }}
              options={{ fontSize: 14, minimap: { enabled: false }, scrollBeyondLastLine: false, padding: { top: 12 } }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-[#3a3a5a]">
              {isLocked ? <><Lock className="w-5 h-5 mr-2" /> Problem locked</> : "Select a problem"}
            </div>
          )}
        </div>

        {/* Result / error banner */}
        {submitError && (
          <div className="px-4 py-3 bg-[#f97316]/10 border-t border-[#f97316]/30 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#f97316] shrink-0" />
            <p className="text-sm text-[#f97316]">{submitError}</p>
          </div>
        )}
        {submitResult && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`px-4 py-3 border-t flex items-center justify-between ${
              submitResult.verdict === "accepted"
                ? "bg-[#22c55e]/10 border-[#22c55e]/30"
                : "bg-red-500/10 border-red-500/30"
            }`}
          >
            <div className="flex items-center gap-2">
              {submitResult.verdict === "accepted"
                ? <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
                : <XCircle className="w-4 h-4 text-red-400" />}
              <span className={`text-sm font-semibold capitalize ${submitResult.verdict === "accepted" ? "text-[#22c55e]" : "text-red-400"}`}>
                {submitResult.verdict.replace("_", " ")}
              </span>
              <span className="text-xs text-[#5a5a7a]">{submitResult.passed}/{submitResult.total} tests passed</span>
            </div>
            {submitResult.score > 0 && (
              <span className="text-xs font-bold text-[#f59e0b]">+{submitResult.score} pts</span>
            )}
          </motion.div>
        )}
        {eliminated && (
          <div className="px-4 py-3 bg-red-500/10 border-t border-red-500/30 flex items-center gap-2">
            <Flame className="w-4 h-4 text-red-400" />
            <p className="text-sm text-red-400 font-medium">You&apos;ve been eliminated (Sudden Death)</p>
          </div>
        )}
      </div>
    </div>
  );
}