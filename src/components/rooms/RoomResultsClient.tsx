"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Trophy, Clock, CheckCircle2, XCircle, Crown, Flame, Home, RotateCcw } from "lucide-react";

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

  // Sort participants by score desc
  const sorted = [...participants].sort((a, b) => b.score - a.score);
  const myRank = sorted.findIndex(p => p.user_id === userId) + 1;

  // Build solve map: user_id + problem_id → submission
  const solveMap = new Map(submissions.map(s => [`${s.user_id}:${s.problem_id}`, s]));

  const fmtTime = (ms: number | null) => {
    if (!ms) return "—";
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const podiumColors = ["#f59e0b", "#94a3b8", "#b45309"];

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="max-w-4xl mx-auto px-4 pt-20 pb-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#f59e0b]/15 border border-[#f59e0b]/30 flex items-center justify-center mx-auto mb-3">
            <Trophy className="w-7 h-7 text-[#f59e0b]" />
          </div>
          <h1 className="text-2xl font-bold text-white">{room.title}</h1>
          <p className="text-sm text-[#5a5a7a] mt-1">
            {MODE_LABELS[room.mode] ?? room.mode} · {room.settings.time_limit_minutes ?? 30} min · {problems.length} problems
          </p>
          {myRank > 0 && (
            <p className="text-sm mt-2 font-medium" style={{ color: myRank === 1 ? "#f59e0b" : myRank <= 3 ? "#94a3b8" : "#818cf8" }}>
              You finished #{myRank}
            </p>
          )}
        </motion.div>

        {/* Podium — top 3 */}
        {sorted.length >= 2 && (
          <div className="flex items-end justify-center gap-3 mb-8">
            {[sorted[1], sorted[0], sorted[2]].filter(Boolean).map((p, i) => {
              const realRank = i === 0 ? 2 : i === 1 ? 1 : 3;
              const color = podiumColors[realRank - 1];
              const heights = [80, 110, 64];
              return (
                <motion.div
                  key={p.user_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.15 }}
                  className="flex flex-col items-center"
                >
                  <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold text-white mb-2"
                    style={{ background: `${color}20`, borderColor: `${color}60` }}>
                    {p.profile.display_name[0]?.toUpperCase()}
                  </div>
                  <p className="text-xs text-white font-medium text-center mb-1 max-w-[80px] truncate">{p.profile.display_name}</p>
                  <p className="text-xs text-[#5a5a7a] mb-1">{p.score} pts</p>
                  <div className="w-20 rounded-t-lg flex items-center justify-center font-bold text-lg"
                    style={{ height: heights[i], background: `${color}20`, borderTop: `2px solid ${color}40`, color }}>
                    #{realRank}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Full results table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-[#111118] border border-[#2a2a3a] rounded-2xl overflow-hidden mb-6"
        >
          {/* Header row */}
          <div className="grid border-b border-[#2a2a3a] px-4 py-2.5 text-xs font-medium text-[#5a5a7a] uppercase tracking-wider"
            style={{ gridTemplateColumns: `40px 1fr repeat(${problems.length}, 1fr) 80px` }}>
            <div>#</div>
            <div>Player</div>
            {problems.map(p => (
              <div key={p.id} className="text-center truncate px-1">
                <span style={{ color: (DIFF_LABELS[p.difficulty] ?? DIFF_LABELS[1]).color }}>P{p.order_index + 1}</span>
              </div>
            ))}
            <div className="text-right">Score</div>
          </div>

          {sorted.map((p, i) => {
            const isMe = p.user_id === userId;
            return (
              <div key={p.user_id}
                className={`grid items-center px-4 py-3 border-b border-[#1a1a2a] last:border-0 ${isMe ? "bg-[#6366f1]/5" : ""}`}
                style={{ gridTemplateColumns: `40px 1fr repeat(${problems.length}, 1fr) 80px` }}>
                <div className="flex items-center gap-1">
                  {i === 0 && <Crown className="w-4 h-4 text-[#f59e0b]" />}
                  {i !== 0 && <span className="text-sm text-[#5a5a7a] font-bold">{i + 1}</span>}
                </div>
                <div className="min-w-0 pr-2">
                  <p className={`text-sm font-medium truncate ${isMe ? "text-[#818cf8]" : "text-white"}`}>
                    {p.profile.display_name} {isMe && <span className="text-xs text-[#6366f1]">(you)</span>}
                  </p>
                  <p className="text-[11px] text-[#5a5a7a]">
                    {p.status === "eliminated" ? <span className="text-red-400 flex items-center gap-1"><Flame className="w-3 h-3" />Eliminated</span>
                      : p.status === "finished" ? "Finished"
                      : "Active"}
                  </p>
                </div>
                {problems.map(prob => {
                  const sub = solveMap.get(`${p.user_id}:${prob.id}`);
                  return (
                    <div key={prob.id} className="flex flex-col items-center gap-0.5">
                      {sub
                        ? <>
                            <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
                            <span className="text-[10px] text-[#5a5a7a] flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />{fmtTime(sub.solve_time_ms)}
                            </span>
                          </>
                        : <XCircle className="w-4 h-4 text-[#2a2a3a]" />}
                    </div>
                  );
                })}
                <div className="text-right">
                  <span className="text-sm font-bold text-white">{p.score}</span>
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* Problem summary */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="bg-[#111118] border border-[#2a2a3a] rounded-2xl p-4 mb-6"
        >
          <p className="text-xs text-[#5a5a7a] uppercase tracking-wider font-medium mb-3">Problem Summary</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {problems.map(p => {
              const solved = submissions.filter(s => s.problem_id === p.id && s.verdict === "accepted").length;
              const d = DIFF_LABELS[p.difficulty] ?? DIFF_LABELS[1];
              return (
                <div key={p.id} className="bg-[#0d0d15] border border-[#2a2a3a] rounded-xl p-3">
                  <p className="text-xs text-white font-medium truncate mb-1">{p.order_index + 1}. {p.title}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium" style={{ color: d.color }}>{d.label}</span>
                    <span className="text-[10px] text-[#5a5a7a]">{solved}/{participants.length} solved</span>
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
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#2a2a3a] text-sm text-[#a1a1b5] hover:text-white hover:border-[#3a3a4a] transition-colors"
          >
            <Home className="w-4 h-4" /> All Rooms
          </button>
          <button
            onClick={() => router.push("/rooms")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
          >
            <RotateCcw className="w-4 h-4" /> New Room
          </button>
        </div>
      </div>
    </div>
  );
}