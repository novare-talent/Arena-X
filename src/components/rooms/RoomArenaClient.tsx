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

    return () => {
      supabase.removeChannel(sub);
      supabase.removeChannel(roomSub);
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
    if (s === "accepted")  return <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#22c55e" }} />;
    if (s === "attempted") return <XCircle className="w-3.5 h-3.5" style={{ color: "#f59e0b" }} />;
    if (s === "locked")    return <Lock className="w-3.5 h-3.5" style={{ color: "var(--void)" }} />;
    return <div className="w-3.5 h-3.5 rounded-full" style={{ border: "1px solid var(--void)" }} />;
  };

  const isLocked = activeProblem && problemStatuses[activeProblem.id] === "locked";
  const diff = activeProblem ? (DIFF_LABELS[activeProblem.difficulty] ?? DIFF_LABELS[1]) : DIFF_LABELS[1];

  return (
    <div className="flex h-screen pt-16 overflow-hidden" style={{ background: "var(--ink-1)" }}>

      {/* Left: Problem sidebar */}
      <div className="w-64 shrink-0 flex flex-col" style={{ borderRight: "1px solid var(--ink-4)" }}>

        {/* Timer + mode */}
        <div className="p-3" style={{ borderBottom: "1px solid var(--ink-4)" }}>
          <div className="flex items-center justify-between">
            <span className="font-cond text-[9px]" style={{ color: "var(--smoke)", letterSpacing: "0.2em" }}>
              {room.mode.replace("_", " ").toUpperCase()}
            </span>
            {timeLeft !== null && (
              <span className="font-mono text-sm font-bold flex items-center gap-1"
                style={{ color: timeLeft < 60 ? "var(--loss)" : "var(--bone)" }}>
                <Clock className="w-3 h-3" />{fmtTime(timeLeft)}
              </span>
            )}
          </div>
        </div>

        {/* Problem list */}
        <div className="flex-1 overflow-y-auto p-2">
          <p className="font-cond text-[9px] px-2 mb-2" style={{ color: "var(--void)", letterSpacing: "0.2em" }}>PROBLEMS</p>
          {problems.map((p, i) => {
            const st = problemStatuses[p.id] ?? "unsolved";
            const d = DIFF_LABELS[p.difficulty] ?? DIFF_LABELS[1];
            return (
              <button
                key={p.id}
                onClick={() => st !== "locked" && setActiveProblemIdx(i)}
                disabled={st === "locked"}
                className="w-full flex items-center gap-2 px-2 py-2.5 rounded-lg text-left transition-all mb-1"
                style={{
                  background: activeProblemIdx === i ? "rgba(124,58,237,0.12)" : "transparent",
                  border: activeProblemIdx === i ? "1px solid rgba(124,58,237,0.3)" : "1px solid transparent",
                  opacity: st === "locked" ? 0.4 : 1,
                  cursor: st === "locked" ? "not-allowed" : "pointer",
                }}
              >
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  {statusIcon(st)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-cond text-[9px] truncate" style={{ color: activeProblemIdx === i ? "var(--bone)" : "var(--ash)", letterSpacing: "0.1em" }}>
                    {i + 1}. {p.title.toUpperCase()}
                  </p>
                  <p className="font-cond text-[9px]" style={{ color: d.color, letterSpacing: "0.1em" }}>{d.label.toUpperCase()}</p>
                </div>
                {activeProblemIdx === i && <ChevronRight className="w-3 h-3 shrink-0" style={{ color: "var(--violet-400)" }} />}
              </button>
            );
          })}
        </div>

        {/* Live leaderboard */}
        <div className="p-3" style={{ borderTop: "1px solid var(--ink-4)" }}>
          <div className="flex items-center gap-1.5 mb-2">
            <Users className="w-3 h-3" style={{ color: "var(--smoke)" }} />
            <p className="font-cond text-[9px]" style={{ color: "var(--smoke)", letterSpacing: "0.18em" }}>LIVE STANDINGS</p>
          </div>
          <div className="space-y-1">
            {leaderboard.slice(0, 5).map((e, i) => (
              <div key={e.user_id} className="flex items-center gap-1.5"
                style={{ color: e.user_id === userId ? "var(--violet-300)" : "var(--ash)" }}>
                <span className="font-mono text-[10px] w-3 font-bold">{i + 1}</span>
                {i === 0 && <Crown className="w-2.5 h-2.5" style={{ color: "#f5c451" }} />}
                <span className="font-cond text-[10px] flex-1 truncate" style={{ letterSpacing: "0.06em" }}>{e.profile.display_name}</span>
                {e.status === "eliminated" && <Flame className="w-3 h-3" style={{ color: "var(--loss)" }} />}
                <span className="font-mono text-[10px] font-bold">{e.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Middle: Problem statement */}
      <div className="w-[38%] flex flex-col overflow-hidden" style={{ borderRight: "1px solid var(--ink-4)" }}>
        <div className="flex-1 overflow-y-auto">
          {activeProblem ? (
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="font-display text-base" style={{ color: "var(--bone)" }}>{activeProblem.order_index + 1}. {activeProblem.title}</span>
                <span className="font-cond text-[9px] px-2 py-0.5 rounded" style={{ color: diff.color, background: `${diff.color}15`, letterSpacing: "0.12em" }}>
                  {diff.label.toUpperCase()}
                </span>
              </div>
              {isLocked ? (
                <div className="flex flex-col items-center justify-center py-20" style={{ color: "var(--void)" }}>
                  <Lock className="w-10 h-10 mb-3" />
                  <p className="font-cond text-[10px]" style={{ letterSpacing: "0.15em" }}>SOLVE THE PREVIOUS PROBLEM TO UNLOCK</p>
                </div>
              ) : (
                <div className="prose prose-invert prose-sm max-w-none text-sm leading-relaxed" style={{ color: "var(--ash)" }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeProblem.description}</ReactMarkdown>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full font-cond text-[10px]" style={{ color: "var(--void)", letterSpacing: "0.15em" }}>
              NO PROBLEMS
            </div>
          )}
        </div>

        {/* Test results panel */}
        <AnimatePresence>
          {submitResult?.results && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden shrink-0"
              style={{ borderTop: "1px solid var(--ink-4)", background: "var(--ink-2)" }}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="w-4 h-4" style={{ color: "var(--smoke)" }} />
                    <span className="font-cond text-[10px]" style={{ color: "var(--bone)", letterSpacing: "0.15em" }}>TEST RESULTS</span>
                  </div>
                  <span className="font-mono text-sm font-bold"
                    style={{ color: submitResult.passed === submitResult.total ? "#22c55e" : "#f97316" }}>
                    {submitResult.passed}/{submitResult.total} passed
                  </span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {submitResult.results.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
                      style={r.passed
                        ? { background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }
                        : { background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                      {r.passed
                        ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: "#22c55e" }} />
                        : <XCircle      className="w-3.5 h-3.5 shrink-0" style={{ color: "#f87171" }} />}
                      <span style={{ color: r.passed ? "#22c55e" : "#f87171" }}>
                        Case {i + 1}: {r.verdict}
                      </span>
                      {r.time_ms && (
                        <span className="ml-auto font-mono" style={{ color: "var(--smoke)" }}>{r.time_ms}ms</span>
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
        <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: "1px solid var(--ink-4)", background: "var(--ink-2)" }}>
          <select
            value={language}
            onChange={e => {
              const lang = e.target.value as LangKey;
              setLanguage(lang);
              if (activeProblem && !codeMap[activeProblem.id]) {
                setCodeMap(prev => ({ ...prev, [activeProblem.id]: DEFAULT_STARTERS[lang] }));
              }
            }}
            className="rounded-lg px-3 py-1.5 font-cond text-[10px] focus:outline-none"
            style={{ background: "var(--ink-3)", border: "1px solid var(--ink-4)", color: "var(--bone)", letterSpacing: "0.1em" }}
          >
            {(Object.entries(LANGUAGE_LABELS) as [LangKey, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            {!showLeaveConfirm ? (
              <button
                onClick={() => setShowLeaveConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-cond text-[9px] transition-all"
                style={{ border: "1px solid var(--ink-4)", color: "var(--smoke)", letterSpacing: "0.15em" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--loss)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(239,68,68,0.3)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--smoke)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--ink-4)"; }}
              >
                <LogOut className="w-3.5 h-3.5" /> LEAVE
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="font-cond text-[9px]" style={{ color: "var(--ash)", letterSpacing: "0.12em" }}>LEAVE ROOM?</span>
                <button
                  onClick={handleLeave}
                  disabled={leaving}
                  className="px-2.5 py-1.5 rounded-lg font-cond text-[9px] transition-all"
                  style={{ background: "rgba(239,68,68,0.12)", color: "var(--loss)", letterSpacing: "0.12em" }}
                >
                  {leaving ? <Loader2 className="w-3 h-3 animate-spin" /> : "YES"}
                </button>
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  className="px-2.5 py-1.5 rounded-lg font-cond text-[9px] transition-all"
                  style={{ color: "var(--smoke)", letterSpacing: "0.12em" }}
                >
                  NO
                </button>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || isLocked || eliminated}
              className="flex items-center gap-2 px-5 py-1.5 rounded-lg font-cond text-[9px] disabled:opacity-40 transition-all"
              style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#0a0a0f", letterSpacing: "0.15em" }}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              SUBMIT
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
            <div className="flex items-center justify-center h-full font-cond text-[10px]" style={{ color: "var(--void)", letterSpacing: "0.15em" }}>
              {isLocked ? <><Lock className="w-5 h-5 mr-2" /> PROBLEM LOCKED</> : "SELECT A PROBLEM"}
            </div>
          )}
        </div>

        {/* Result / error banner */}
        {submitError && (
          <div className="px-4 py-3 flex items-center gap-2"
            style={{ background: "rgba(249,115,22,0.08)", borderTop: "1px solid rgba(249,115,22,0.3)" }}>
            <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: "#f97316" }} />
            <p className="font-cond text-[9px]" style={{ color: "#f97316", letterSpacing: "0.1em" }}>{submitError}</p>
          </div>
        )}
        {submitResult && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="px-4 py-3 flex items-center justify-between"
            style={submitResult.verdict === "accepted"
              ? { background: "rgba(34,197,94,0.08)", borderTop: "1px solid rgba(34,197,94,0.3)" }
              : { background: "rgba(239,68,68,0.08)", borderTop: "1px solid rgba(239,68,68,0.3)" }}
          >
            <div className="flex items-center gap-2">
              {submitResult.verdict === "accepted"
                ? <CheckCircle2 className="w-4 h-4" style={{ color: "#22c55e" }} />
                : <XCircle className="w-4 h-4" style={{ color: "#f87171" }} />}
              <span className="font-cond text-[10px] capitalize"
                style={{ color: submitResult.verdict === "accepted" ? "#22c55e" : "#f87171", letterSpacing: "0.12em" }}>
                {submitResult.verdict.replace("_", " ").toUpperCase()}
              </span>
              <span className="font-mono text-[9px]" style={{ color: "var(--smoke)" }}>
                {submitResult.passed}/{submitResult.total} tests passed
              </span>
            </div>
            {submitResult.score > 0 && (
              <span className="font-mono text-xs font-bold" style={{ color: "#f5c451" }}>+{submitResult.score} pts</span>
            )}
          </motion.div>
        )}
        {eliminated && (
          <div className="px-4 py-3 flex items-center gap-2"
            style={{ background: "rgba(239,68,68,0.08)", borderTop: "1px solid rgba(239,68,68,0.3)" }}>
            <Flame className="w-4 h-4" style={{ color: "#f87171" }} />
            <p className="font-cond text-[9px]" style={{ color: "#f87171", letterSpacing: "0.12em" }}>
              YOU&apos;VE BEEN ELIMINATED (SUDDEN DEATH)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}