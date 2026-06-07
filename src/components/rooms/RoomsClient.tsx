"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Plus, Users, Clock, Lock, Globe, Zap,
  Swords, Trophy, Flame, ChevronRight, Loader2, ArrowRight,
} from "lucide-react";

const MODE_META: Record<string, { label: string; jp: string; color: string; icon: typeof Swords; desc: string }> = {
  standard:     { label: "Standard",     jp: "標",  color: "#a78bfa", icon: Trophy,  desc: "Solve as many problems as possible in time" },
  blitz:        { label: "Blitz",        jp: "迅",  color: "#f97316", icon: Zap,     desc: "Solve sequentially — can't skip" },
  sudden_death: { label: "Sudden Death", jp: "死",  color: "#ef4444", icon: Flame,   desc: "One wrong answer and you're out" },
  speed_run:    { label: "Speed Run",    jp: "速",  color: "#22d3ee", icon: Clock,   desc: "Fastest total solve time wins" },
  marathon:     { label: "Marathon",     jp: "耐",  color: "#a855f7", icon: Swords,  desc: "8-10 problems, ICPC-style scoring" },
};

interface Room {
  id: string; code: string; title: string; mode: string;
  status: string; visibility: string; max_players: number;
  settings: { time_limit_minutes?: number };
  participant_count: number;
  host: { display_name: string; username: string };
}

export default function RoomsClient({ userId, displayName }: { userId: string; displayName: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<"public" | "mine">("public");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/list?tab=${tab}`);
      const { rooms: data } = await res.json();
      setRooms(data ?? []);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  async function handleJoin(code: string) {
    const c = code.trim().toUpperCase();
    if (!c) return;
    setJoining(true); setJoinError("");
    const res = await fetch(`/api/rooms/${c}/join`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) { setJoinError(data.error ?? "Failed to join"); setJoining(false); return; }
    router.push(`/rooms/${c}`);
  }

  void userId; void displayName;

  return (
    <div className="min-h-screen" style={{ background: "var(--ink-1)", position: "relative", overflow: "hidden" }}>
      <div className="ax-aura pointer-events-none"
        style={{ width: 600, height: 350, background: "var(--violet-700)", top: 56, right: -80, opacity: 0.13 }} />

      <div className="max-w-5xl mx-auto px-4 pt-20 pb-12">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="relative mb-6 overflow-hidden rounded-xl px-5 py-4"
          style={{ background: "var(--ink-2)", border: "1px solid var(--ink-4)" }}>
          <div className="ax-dotgrid" style={{ position: "absolute", inset: 0, opacity: 0.25 }} />
          <div className="relative flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-cond text-[10px]" style={{ color: "var(--violet-300)", letterSpacing: "0.3em" }}>
                  PRIVATE DŌJŌ · 道場
                </span>
                <Swords className="w-3.5 h-3.5" style={{ color: "var(--violet-400)" }} />
              </div>
              <h1 className="font-display" style={{ fontSize: 44, color: "var(--bone)", lineHeight: 0.9 }}>
                CUSTOM <span style={{ background: "linear-gradient(180deg, var(--violet-200), var(--violet-500))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ROOMS</span>.
              </h1>
              <p className="font-cond text-[10px] mt-2" style={{ color: "var(--smoke)", letterSpacing: "0.18em" }}>
                CHALLENGE FRIENDS · UNRANKED
              </p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-cond text-[11px] transition-all hover:opacity-90 shrink-0"
              style={{ background: "linear-gradient(135deg, var(--violet-600), var(--violet-800))", color: "var(--bone)", letterSpacing: "0.18em", border: "1px solid rgba(167,139,250,0.3)" }}
            >
              <Plus className="w-3.5 h-3.5" /> CREATE ROOM
            </button>
          </div>
        </motion.div>

        {/* Join by code */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
          className="ax-card mb-5 p-4">
          <p className="font-cond text-[9px] mb-3" style={{ color: "var(--ash)", letterSpacing: "0.28em" }}>JOIN BY ROOM CODE · 合言葉</p>
          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && handleJoin(joinCode)}
              placeholder="ENTER 6-CHARACTER CODE"
              maxLength={6}
              className="flex-1 rounded-xl px-4 py-2.5 font-mono text-sm tracking-widest focus:outline-none transition-all"
              style={{ background: "var(--ink-3)", border: "1px solid var(--ink-4)", color: "var(--bone)", letterSpacing: "0.3em" }}
            />
            <button
              onClick={() => handleJoin(joinCode)}
              disabled={joining || joinCode.length < 3}
              className="px-5 py-2.5 rounded-xl font-cond text-[11px] disabled:opacity-40 transition-all flex items-center gap-1.5"
              style={{ background: "linear-gradient(135deg, var(--violet-600), var(--violet-800))", color: "var(--bone)", letterSpacing: "0.2em" }}
            >
              {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ArrowRight className="w-3.5 h-3.5" /> JOIN</>}
            </button>
          </div>
          {joinError && <p className="font-cond text-[10px] mt-2" style={{ color: "var(--loss)", letterSpacing: "0.1em" }}>{joinError}</p>}
        </motion.div>

        {/* Tabs */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="flex gap-1 mb-4 rounded-xl p-1 w-fit"
          style={{ background: "var(--ink-2)", border: "1px solid var(--ink-4)" }}>
          {(["public", "mine"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-1.5 rounded-lg font-cond text-[10px] transition-all"
              style={{
                background: tab === t ? "rgba(124,58,237,0.18)" : "transparent",
                color: tab === t ? "var(--violet-300)" : "var(--smoke)",
                letterSpacing: "0.18em",
                border: tab === t ? "1px solid rgba(124,58,237,0.3)" : "1px solid transparent",
              }}>
              {t === "public" ? "PUBLIC ROOMS" : "MY ROOMS"}
            </button>
          ))}
        </motion.div>

        {/* Rooms list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--violet-400)" }} />
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--void)", opacity: 0.4 }} />
            <p className="font-cond text-[10px]" style={{ color: "var(--void)", letterSpacing: "0.2em" }}>
              {tab === "public" ? "NO PUBLIC ROOMS OPEN · 待機中" : "NO ROOMS YET · 未入室"}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {rooms.map((room, i) => {
              const meta = MODE_META[room.mode] ?? MODE_META.standard;
              const Icon = meta.icon;
              return (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="ax-card group relative overflow-hidden transition-all cursor-pointer"
                  style={{ padding: "14px 18px" }}
                  onClick={() => router.push(`/rooms/${room.code}`)}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${meta.color}40`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--ink-4)"; }}
                >
                  {/* Kanji watermark */}
                  <div className="font-jp pointer-events-none select-none" style={{
                    position: "absolute", top: -8, right: -8, fontSize: 80, lineHeight: 1,
                    color: meta.color, opacity: 0.07, fontWeight: 700,
                  }}>{meta.jp}</div>

                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${meta.color}12`, border: `1px solid ${meta.color}25` }}>
                        <Icon className="w-5 h-5" style={{ color: meta.color }} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-display text-sm" style={{ color: "var(--bone)" }}>{room.title.toUpperCase()}</span>
                          <span className="font-cond text-[8px] px-2 py-0.5 rounded"
                            style={{ background: `${meta.color}12`, color: meta.color, border: `1px solid ${meta.color}25`, letterSpacing: "0.12em" }}>
                            {meta.label.toUpperCase()}
                          </span>
                          {room.visibility === "private"
                            ? <Lock className="w-3 h-3 shrink-0" style={{ color: "var(--smoke)" }} />
                            : <Globe className="w-3 h-3 shrink-0" style={{ color: "var(--smoke)" }} />}
                        </div>
                        <p className="font-cond text-[9px] mt-0.5" style={{ color: "var(--smoke)", letterSpacing: "0.1em" }}>
                          BY @{room.host.username} · {room.settings.time_limit_minutes ?? 30}MIN
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="font-mono text-xs" style={{ color: "var(--ash)" }}>{room.participant_count}/{room.max_players}</p>
                        <p className="font-cond text-[9px]" style={{ color: "var(--void)", letterSpacing: "0.1em" }}>PLAYERS</p>
                      </div>
                      <span className="font-cond text-[9px] px-2 py-1 rounded-lg"
                        style={{
                          background: room.status === "lobby" ? "rgba(34,197,94,0.1)" : room.status === "active" ? "rgba(249,115,22,0.1)" : "rgba(90,90,122,0.1)",
                          color: room.status === "lobby" ? "#22c55e" : room.status === "active" ? "#f97316" : "var(--smoke)",
                          letterSpacing: "0.12em",
                        }}>
                        {room.status === "lobby" ? "OPEN" : room.status === "active" ? "LIVE" : "ENDED"}
                      </span>
                      <ChevronRight className="w-4 h-4 transition-colors" style={{ color: "var(--void)" }} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && <CreateRoomModal onClose={() => setShowCreate(false)} onCreated={(code) => router.push(`/rooms/${code}`)} />}
    </div>
  );
}

// ─── Create Room Modal ─────────────────────────────────────────────────────────
const DSA_TOPICS = [
  "arrays", "strings", "hashing", "two-pointers", "sliding-window",
  "stacks", "queues", "linked-lists", "trees", "graphs",
  "dynamic-programming", "binary-search", "sorting", "math", "backtracking",
];

const inputStyle = {
  background: "var(--ink-3)",
  border: "1px solid var(--ink-4)",
  color: "var(--bone)",
};

function CreateRoomModal({ onClose, onCreated }: { onClose: () => void; onCreated: (code: string) => void }) {
  const [title, setTitle] = useState("My Room");
  const [mode, setMode] = useState("standard");
  const [visibility, setVisibility] = useState("private");
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [topics, setTopics] = useState<string[]>(["arrays"]);
  const [difficulty, setDifficulty] = useState("mixed");
  const [numQuestions, setNumQuestions] = useState(3);
  const [timeLimit, setTimeLimit] = useState(30);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const toggleTopic = (t: string) => {
    setTopics(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  async function create() {
    if (!topics.length) { setError("Select at least one topic"); return; }
    setCreating(true); setError("");
    const res = await fetch("/api/rooms/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title, mode, visibility, max_players: maxPlayers,
        settings: { topics, difficulty, num_questions: numQuestions, time_limit_minutes: timeLimit },
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed to create"); setCreating(false); return; }
    onCreated(data.code);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="ax-card ax-ticks w-full max-w-lg max-h-[90vh] overflow-y-auto"
        style={{ padding: 24 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-5">
          <Swords className="w-3.5 h-3.5" style={{ color: "var(--violet-400)" }} />
          <h2 className="font-display text-xl" style={{ color: "var(--bone)" }}>CREATE ROOM</h2>
        </div>

        {/* Title */}
        <div className="mb-4">
          <label className="font-cond text-[9px] block mb-1.5" style={{ color: "var(--ash)", letterSpacing: "0.25em" }}>ROOM TITLE</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none transition-all"
            style={inputStyle} />
        </div>

        {/* Mode */}
        <div className="mb-4">
          <label className="font-cond text-[9px] block mb-1.5" style={{ color: "var(--ash)", letterSpacing: "0.25em" }}>BATTLE MODE</label>
          <div className="grid grid-cols-1 gap-2">
            {Object.entries(MODE_META).map(([key, meta]) => {
              const Icon = meta.icon;
              return (
                <button key={key} onClick={() => setMode(key)}
                  className="flex items-center gap-3 p-3 rounded-xl border text-left transition-all"
                  style={{
                    border: mode === key ? `1px solid ${meta.color}50` : "1px solid var(--ink-4)",
                    background: mode === key ? `${meta.color}10` : "var(--ink-3)",
                  }}>
                  <Icon className="w-4 h-4 shrink-0" style={{ color: meta.color }} />
                  <div>
                    <p className="font-cond text-[10px]" style={{ color: mode === key ? "var(--bone)" : "var(--ash)", letterSpacing: "0.12em" }}>{meta.label.toUpperCase()}</p>
                    <p className="font-cond text-[9px] mt-0.5" style={{ color: "var(--smoke)", letterSpacing: "0.06em" }}>{meta.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Topics */}
        <div className="mb-4">
          <label className="font-cond text-[9px] block mb-1.5" style={{ color: "var(--ash)", letterSpacing: "0.25em" }}>TOPICS · DSA</label>
          <div className="flex flex-wrap gap-1.5">
            {DSA_TOPICS.map(t => (
              <button key={t} onClick={() => toggleTopic(t)}
                className="font-cond text-[9px] px-2.5 py-1 rounded-lg border transition-all capitalize"
                style={topics.includes(t)
                  ? { background: "rgba(124,58,237,0.18)", border: "1px solid rgba(124,58,237,0.4)", color: "var(--violet-300)", letterSpacing: "0.1em" }
                  : { background: "var(--ink-3)", border: "1px solid var(--ink-4)", color: "var(--smoke)", letterSpacing: "0.1em" }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty + Questions */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="font-cond text-[9px] block mb-1.5" style={{ color: "var(--ash)", letterSpacing: "0.25em" }}>DIFFICULTY</label>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
              style={inputStyle}>
              <option value="mixed">Mixed</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label className="font-cond text-[9px] block mb-1.5" style={{ color: "var(--ash)", letterSpacing: "0.25em" }}>QUESTIONS</label>
            <select value={numQuestions} onChange={e => setNumQuestions(Number(e.target.value))}
              className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
              style={inputStyle}>
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {/* Time + Players */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="font-cond text-[9px] block mb-1.5" style={{ color: "var(--ash)", letterSpacing: "0.25em" }}>TIME LIMIT</label>
            <select value={timeLimit} onChange={e => setTimeLimit(Number(e.target.value))}
              className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
              style={inputStyle}>
              {[15,30,45,60,90].map(t => <option key={t} value={t}>{t} min</option>)}
            </select>
          </div>
          <div>
            <label className="font-cond text-[9px] block mb-1.5" style={{ color: "var(--ash)", letterSpacing: "0.25em" }}>MAX PLAYERS</label>
            <select value={maxPlayers} onChange={e => setMaxPlayers(Number(e.target.value))}
              className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
              style={inputStyle}>
              {[2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {/* Visibility */}
        <div className="mb-5">
          <label className="font-cond text-[9px] block mb-1.5" style={{ color: "var(--ash)", letterSpacing: "0.25em" }}>VISIBILITY</label>
          <div className="grid grid-cols-2 gap-2">
            {(["private", "public"] as const).map(v => (
              <button key={v} onClick={() => setVisibility(v)}
                className="flex items-center gap-2 p-2.5 rounded-xl border font-cond text-[10px] transition-all capitalize"
                style={visibility === v
                  ? { border: "1px solid rgba(124,58,237,0.4)", background: "rgba(124,58,237,0.12)", color: "var(--bone)", letterSpacing: "0.15em" }
                  : { border: "1px solid var(--ink-4)", color: "var(--smoke)", background: "var(--ink-3)", letterSpacing: "0.15em" }}>
                {v === "private" ? <Lock className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                {v.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="font-cond text-[10px] mb-3" style={{ color: "var(--loss)", letterSpacing: "0.1em" }}>{error}</p>}

        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl font-cond text-[10px] transition-colors"
            style={{ border: "1px solid var(--ink-4)", color: "var(--smoke)", letterSpacing: "0.15em" }}>
            CANCEL
          </button>
          <button onClick={create} disabled={creating}
            className="flex-1 py-2.5 rounded-xl font-cond text-[10px] disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
            style={{ background: "linear-gradient(135deg, var(--violet-600), var(--violet-800))", color: "var(--bone)", letterSpacing: "0.15em" }}>
            {creating
              ? <><Loader2 className="w-4 h-4 animate-spin" /> CREATING...</>
              : "CREATE & ENTER LOBBY"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
