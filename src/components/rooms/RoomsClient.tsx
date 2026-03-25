"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Plus, Users, Clock, Lock, Globe, Zap,
  Swords, Trophy, Flame, ChevronRight, Loader2,
} from "lucide-react";

const MODE_META: Record<string, { label: string; color: string; icon: typeof Swords; desc: string }> = {
  standard:     { label: "Standard",     color: "#6366f1", icon: Trophy,  desc: "Solve as many problems as possible in time" },
  blitz:        { label: "Blitz",        color: "#f97316", icon: Zap,     desc: "Solve sequentially — can't skip" },
  sudden_death: { label: "Sudden Death", color: "#ef4444", icon: Flame,   desc: "One wrong answer and you're out" },
  speed_run:    { label: "Speed Run",    color: "#22d3ee", icon: Clock,   desc: "Fastest total solve time wins" },
  marathon:     { label: "Marathon",     color: "#a855f7", icon: Swords,  desc: "8-10 problems, ICPC-style scoring" },
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
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Custom Rooms</h1>
            <p className="text-sm text-[#5a5a7a] mt-1">Compete with friends in private or public rooms</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
          >
            <Plus className="w-4 h-4" /> Create Room
          </button>
        </div>

        {/* Join by code */}
        <div className="bg-[#111118] border border-[#2a2a3a] rounded-2xl p-4 mb-6">
          <p className="text-xs text-[#5a5a7a] font-medium uppercase tracking-wider mb-3">Join by Room Code</p>
          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && handleJoin(joinCode)}
              placeholder="Enter 6-character code"
              maxLength={6}
              className="flex-1 bg-[#0d0d15] border border-[#2a2a3a] rounded-xl px-4 py-2.5 text-white font-mono text-sm tracking-widest placeholder:text-[#3a3a5a] focus:outline-none focus:border-[#6366f1]/50"
            />
            <button
              onClick={() => handleJoin(joinCode)}
              disabled={joining || joinCode.length < 3}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all"
              style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
            >
              {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : "Join"}
            </button>
          </div>
          {joinError && <p className="text-red-400 text-xs mt-2">{joinError}</p>}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-[#111118] border border-[#2a2a3a] rounded-xl p-1 w-fit">
          {(["public", "mine"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${tab === t ? "bg-[#6366f1]/20 text-[#818cf8]" : "text-[#5a5a7a] hover:text-[#a1a1b5]"}`}
            >
              {t === "public" ? "Public Rooms" : "My Rooms"}
            </button>
          ))}
        </div>

        {/* Rooms list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-[#6366f1] animate-spin" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-20 text-[#5a5a7a]">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">{tab === "public" ? "No public rooms open right now" : "You haven't joined any rooms yet"}</p>
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
                  className="bg-[#111118] border border-[#2a2a3a] rounded-2xl p-4 hover:border-[#3a3a4a] transition-all cursor-pointer group"
                  onClick={() => router.push(`/rooms/${room.code}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}30` }}>
                        <Icon className="w-5 h-5" style={{ color: meta.color }} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white truncate">{room.title}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                            style={{ background: `${meta.color}15`, color: meta.color }}>
                            {meta.label}
                          </span>
                          {room.visibility === "private"
                            ? <Lock className="w-3 h-3 text-[#5a5a7a] shrink-0" />
                            : <Globe className="w-3 h-3 text-[#5a5a7a] shrink-0" />}
                        </div>
                        <p className="text-xs text-[#5a5a7a] mt-0.5">
                          by @{room.host.username} · {room.settings.time_limit_minutes ?? 30}min
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-[#a1a1b5] font-medium">{room.participant_count}/{room.max_players}</p>
                        <p className="text-[10px] text-[#5a5a7a]">players</p>
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-lg font-medium ${
                        room.status === "lobby" ? "bg-[#22c55e]/10 text-[#22c55e]" :
                        room.status === "active" ? "bg-[#f97316]/10 text-[#f97316]" :
                        "bg-[#5a5a7a]/10 text-[#5a5a7a]"
                      }`}>
                        {room.status === "lobby" ? "Open" : room.status === "active" ? "Live" : "Ended"}
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#3a3a5a] group-hover:text-[#6366f1] transition-colors" />
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#111118] border border-[#2a2a3a] rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-white mb-5">Create Room</h2>

        {/* Title */}
        <div className="mb-4">
          <label className="text-xs text-[#5a5a7a] uppercase tracking-wider font-medium block mb-1.5">Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            className="w-full bg-[#0d0d15] border border-[#2a2a3a] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#6366f1]/50" />
        </div>

        {/* Mode */}
        <div className="mb-4">
          <label className="text-xs text-[#5a5a7a] uppercase tracking-wider font-medium block mb-1.5">Mode</label>
          <div className="grid grid-cols-1 gap-2">
            {Object.entries(MODE_META).map(([key, meta]) => {
              const Icon = meta.icon;
              return (
                <button key={key} onClick={() => setMode(key)}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${mode === key ? "border-[#6366f1] bg-[#6366f1]/10" : "border-[#2a2a3a] hover:border-[#3a3a4a]"}`}
                >
                  <Icon className="w-4 h-4 shrink-0" style={{ color: meta.color }} />
                  <div>
                    <p className={`text-sm font-medium ${mode === key ? "text-white" : "text-[#a1a1b5]"}`}>{meta.label}</p>
                    <p className="text-xs text-[#5a5a7a]">{meta.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Topics */}
        <div className="mb-4">
          <label className="text-xs text-[#5a5a7a] uppercase tracking-wider font-medium block mb-1.5">Topics (DSA)</label>
          <div className="flex flex-wrap gap-1.5">
            {DSA_TOPICS.map(t => (
              <button key={t} onClick={() => toggleTopic(t)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-all capitalize ${topics.includes(t) ? "bg-[#6366f1]/20 border-[#6366f1] text-[#818cf8]" : "bg-[#0d0d15] border-[#2a2a3a] text-[#5a5a7a] hover:border-[#3a3a4a]"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty + Questions row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs text-[#5a5a7a] uppercase tracking-wider font-medium block mb-1.5">Difficulty</label>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
              className="w-full bg-[#0d0d15] border border-[#2a2a3a] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#6366f1]/50">
              <option value="mixed">Mixed</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-[#5a5a7a] uppercase tracking-wider font-medium block mb-1.5">Questions</label>
            <select value={numQuestions} onChange={e => setNumQuestions(Number(e.target.value))}
              className="w-full bg-[#0d0d15] border border-[#2a2a3a] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#6366f1]/50">
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {/* Time + Players row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs text-[#5a5a7a] uppercase tracking-wider font-medium block mb-1.5">Time Limit</label>
            <select value={timeLimit} onChange={e => setTimeLimit(Number(e.target.value))}
              className="w-full bg-[#0d0d15] border border-[#2a2a3a] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#6366f1]/50">
              {[15,30,45,60,90].map(t => <option key={t} value={t}>{t} min</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-[#5a5a7a] uppercase tracking-wider font-medium block mb-1.5">Max Players</label>
            <select value={maxPlayers} onChange={e => setMaxPlayers(Number(e.target.value))}
              className="w-full bg-[#0d0d15] border border-[#2a2a3a] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#6366f1]/50">
              {[2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {/* Visibility */}
        <div className="mb-5">
          <label className="text-xs text-[#5a5a7a] uppercase tracking-wider font-medium block mb-1.5">Visibility</label>
          <div className="grid grid-cols-2 gap-2">
            {(["private", "public"] as const).map(v => (
              <button key={v} onClick={() => setVisibility(v)}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-sm font-medium transition-all capitalize ${visibility === v ? "border-[#6366f1] bg-[#6366f1]/10 text-white" : "border-[#2a2a3a] text-[#5a5a7a] hover:border-[#3a3a4a]"}`}
              >
                {v === "private" ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                {v}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[#2a2a3a] text-sm text-[#5a5a7a] hover:text-white transition-colors">
            Cancel
          </button>
          <button onClick={create} disabled={creating}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
          >
            {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : "Create & Enter Lobby"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}