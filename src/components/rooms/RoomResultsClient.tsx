"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Trophy, Clock, CheckCircle2, XCircle, Crown, Flame, Home, RotateCcw } from "lucide-react";
import Image from "next/image";
import roninImg from "../../../public/images/chars/ronin.png";

const MODE_LABELS: Record<string, string> = {
  standard: "Standard", blitz: "Blitz", sudden_death: "Sudden Death",
  speed_run: "Speed Run", marathon: "Marathon",
};

const DIFF_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Easy",   color: "#22c55e" },
  2: { label: "Easy+",  color: "#84cc16" },
  3: { label: "Medium", color: "#f59e0b" },
  4: { label: "Hard",   color: "#f97316" },
  5: { label: "Hard+",  color: "#ef4444" },
};

interface Participant {
  user_id: string; score: number; rank: number | null; status: string;
  finished_at: string | null;
  profile: { display_name: string; username: string };
}

interface Problem { id: string; title: string; difficulty: number; order_index: number }
interface Submission { user_id: string; problem_id: string; verdict: string; score: number; solve_time_ms: number | null }
interface Room { id: string; code: string; title: string; mode: string; settings: { time_limit_minutes?: number } }

export default function RoomResultsClient({
  room, userId, participants, problems, submissions,
}: {
  room: Room; userId: string;
  participants: Participant[];
  problems: Problem[];
  submissions: Submission[];
}) {
  const router = useRouter();

  const sorted = [...participants].sort((a, b) => b.score - a.score);
  const myRank = sorted.findIndex(p => p.user_id === userId) + 1;
  const solveMap = new Map(submissions.map(s => [`${s.user_id}:${s.problem_id}`, s]));

  const fmtTime = (ms: number | null) => {
    if (!ms) return "—";
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const podiumColors = ["#f5c451", "#94a3b8", "#b45309"];

  return (
    <div className="min-h-screen" style={{ background: "var(--ink-1)", position: "relative", overflow: "hidden" }}>
      <div className="ax-aura pointer-events-none"
        style={{ width: 600, height: 350, background: "var(--violet-700)", top: 56, right: -80, opacity: 0.13 }} />

      <div className="max-w-4xl mx-auto px-4 pt-20 pb-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: "rgba(245,196,81,0.12)", border: "1px solid rgba(245,196,81,0.3)" }}>
            <Trophy className="w-7 h-7" style={{ color: "#f5c451" }} />
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <Trophy className="w-3 h-3" style={{ color: "var(--violet-400)" }} />
            <span className="font-cond text-[9px]" style={{ color: "var(--violet-300)", letterSpacing: "0.25em" }}>
              ROOM RESULTS · 結果
            </span>
          </div>
          <h1 className="font-display text-3xl" style={{ color: "var(--bone)" }}>{room.title.toUpperCase()}</h1>
          <p className="font-cond text-[9px] mt-1" style={{ color: "var(--smoke)", letterSpacing: "0.18em" }}>
            {(MODE_LABELS[room.mode] ?? room.mode).toUpperCase()} · {room.settings.time_limit_minutes ?? 30} MIN · {problems.length} PROBLEMS
          </p>
          {myRank > 0 && (
            <p className="font-display text-lg mt-2" style={{ color: myRank === 1 ? "#f5c451" : myRank <= 3 ? "#94a3b8" : "var(--violet-300)" }}>
              YOU FINISHED #{myRank}
            </p>
          )}
        </motion.div>

        {/* Podium — top 3 */}
        {sorted.length >= 2 && (
          <div className="flex items-end justify-center gap-4 mb-8">
            {[sorted[1], sorted[0], sorted[2]].filter(Boolean).map((p, i) => {
              const realRank = i === 0 ? 2 : i === 1 ? 1 : 3;
              const color = podiumColors[realRank - 1];
              const heights = [80, 110, 64];
              const ktSize = i === 1 ? 44 : 34;
              return (
                <motion.div
                  key={p.user_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.15 }}
                  className="flex flex-col items-center"
                >
                  <div className="mb-2" style={{ width: ktSize, height: ktSize, borderRadius: "50%", overflow: "hidden", background: "#111", border: `1px solid ${color}40` }}>
                    <Image src={roninImg} alt="" width={ktSize} height={ktSize}
                      style={{ objectFit: "contain", filter: "invert(1)", pointerEvents: "none", userSelect: "none" }}
                      draggable={false} placeholder="blur" />
                  </div>
                  <p className="font-display text-sm text-center mb-1 max-w-[90px] truncate" style={{ color: "var(--bone)" }}>
                    {p.profile.display_name.toUpperCase()}
                  </p>
                  <p className="font-mono text-xs mb-1" style={{ color: "var(--smoke)" }}>{p.score} PTS</p>
                  <div className="w-22 rounded-t-lg flex items-center justify-center"
                    style={{ height: heights[i], width: 88, background: `${color}12`, borderTop: `2px solid ${color}40` }}>
                    <span className="font-display text-2xl" style={{ color }}>#{realRank}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Full results table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="ax-card overflow-hidden mb-5"
          style={{ padding: 0 }}
        >
          <div className="grid border-b px-4 py-2.5 font-cond text-[9px]"
            style={{ gridTemplateColumns: `40px 1fr repeat(${problems.length}, 1fr) 80px`, borderColor: "var(--ink-4)", color: "var(--smoke)", letterSpacing: "0.2em" }}>
            <div>#</div>
            <div>PLAYER</div>
            {problems.map(p => (
              <div key={p.id} className="text-center truncate px-1">
                <span style={{ color: (DIFF_LABELS[p.difficulty] ?? DIFF_LABELS[1]).color }}>P{p.order_index + 1}</span>
              </div>
            ))}
            <div className="text-right">SCORE</div>
          </div>

          {sorted.map((p, i) => {
            const isMe = p.user_id === userId;
            return (
              <div key={p.user_id}
                className="grid items-center px-4 py-3"
                style={{
                  gridTemplateColumns: `40px 1fr repeat(${problems.length}, 1fr) 80px`,
                  borderBottom: "1px solid var(--ink-4)",
                  background: isMe ? "rgba(124,58,237,0.06)" : undefined,
                }}>
                <div className="flex items-center gap-1">
                  {i === 0 ? <Crown className="w-4 h-4" style={{ color: "#f5c451" }} />
                    : <span className="font-display text-sm" style={{ color: "var(--smoke)" }}>{i + 1}</span>}
                </div>
                <div className="min-w-0 pr-2">
                  <p className="font-display text-sm truncate" style={{ color: isMe ? "var(--violet-300)" : "var(--bone)" }}>
                    {p.profile.display_name.toUpperCase()}
                    {isMe && <span className="font-cond text-[8px] ml-1" style={{ color: "var(--violet-400)" }}>(YOU)</span>}
                  </p>
                  <p className="font-cond text-[9px]" style={{ letterSpacing: "0.1em" }}>
                    {p.status === "eliminated"
                      ? <span className="flex items-center gap-1" style={{ color: "var(--loss)" }}><Flame className="w-3 h-3" />ELIMINATED</span>
                      : p.status === "finished"
                      ? <span style={{ color: "var(--win)" }}>FINISHED</span>
                      : <span style={{ color: "var(--ash)" }}>ACTIVE</span>}
                  </p>
                </div>
                {problems.map(prob => {
                  const sub = solveMap.get(`${p.user_id}:${prob.id}`);
                  return (
                    <div key={prob.id} className="flex flex-col items-center gap-0.5">
                      {sub
                        ? <>
                            <CheckCircle2 className="w-4 h-4" style={{ color: "#22c55e" }} />
                            <span className="font-mono text-[9px] flex items-center gap-0.5" style={{ color: "var(--smoke)" }}>
                              <Clock className="w-2.5 h-2.5" />{fmtTime(sub.solve_time_ms)}
                            </span>
                          </>
                        : <XCircle className="w-4 h-4" style={{ color: "var(--ink-4)" }} />}
                    </div>
                  );
                })}
                <div className="text-right">
                  <span className="font-display text-sm" style={{ color: "var(--bone)" }}>{p.score}</span>
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* Problem summary */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="ax-card p-4 mb-5"
        >
          <p className="font-cond text-[9px] mb-3" style={{ color: "var(--ash)", letterSpacing: "0.25em" }}>PROBLEM SUMMARY · 問題</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {problems.map(p => {
              const solved = submissions.filter(s => s.problem_id === p.id && s.verdict === "accepted").length;
              const d = DIFF_LABELS[p.difficulty] ?? DIFF_LABELS[1];
              return (
                <div key={p.id} className="rounded-xl p-3" style={{ background: "var(--ink-3)", border: "1px solid var(--ink-4)" }}>
                  <p className="font-cond text-[9px] truncate mb-1" style={{ color: "var(--bone)", letterSpacing: "0.1em" }}>
                    {p.order_index + 1}. {p.title.toUpperCase()}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="font-cond text-[9px]" style={{ color: d.color, letterSpacing: "0.1em" }}>{d.label.toUpperCase()}</span>
                    <span className="font-mono text-[9px]" style={{ color: "var(--smoke)" }}>{solved}/{participants.length}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.push("/rooms")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-cond text-[10px] transition-colors"
            style={{ border: "1px solid var(--ink-4)", color: "var(--ash)", letterSpacing: "0.18em" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--bone)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--ash)"; }}
          >
            <Home className="w-3.5 h-3.5" /> ALL ROOMS
          </button>
          <button
            onClick={() => router.push("/rooms")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-cond text-[10px] transition-all"
            style={{ background: "linear-gradient(135deg, var(--violet-600), var(--violet-800))", color: "var(--bone)", letterSpacing: "0.18em" }}
          >
            <RotateCcw className="w-3.5 h-3.5" /> NEW ROOM
          </button>
        </div>
      </div>
    </div>
  );
}
