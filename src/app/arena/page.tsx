"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Zap, Swords, Clock, Users, Trophy, ArrowLeft,
  Loader2, X, ChevronRight, Lock, Timer,
} from "lucide-react";

const TIER_COLORS: Record<string, string> = {
  unrated:  "#5a5a7a",
  bronze:   "#cd7f32",
  silver:   "#c0c0c0",
  gold:     "#ffd700",
  platinum: "#22d3ee",
  diamond:  "#a855f7",
};

const TRACK_LABELS: Record<string, string> = {
  dsa:      "DSA",
  backend:  "Backend",
  ml:       "Machine Learning",
  frontend: "Frontend",
};

type QueueStatus = "idle" | "waiting" | "matched" | "error";

export default function ArenaPage() {
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState<QueueStatus>("idle");
  const [track, setTrack] = useState("dsa");
  const [waitTime, setWaitTime] = useState(0);
  const [profile, setProfile] = useState<{ username: string; tier: string } | null>(null);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timerRef   = useRef<NodeJS.Timeout | null>(null);
  const pollRef    = useRef<NodeJS.Timeout | null>(null);
  const userId     = useRef<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      userId.current = user.id;

      const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single();
      const { data: rating  } = await supabase.from("user_ratings").select("tier").eq("user_id", user.id).eq("track", track).single();
      setProfile({ username: profile?.username ?? "you", tier: rating?.tier ?? "unrated" });

      // Count users in waiting queue
      const { count } = await supabase.from("matchmaking_queue").select("*", { count: "exact", head: true }).eq("status", "waiting").eq("track", track);
      setOnlineCount(count ?? 0);
    })();
  }, [track]); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to own queue row via Realtime — detect when matched
  function subscribeToQueue(uid: string) {
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const channel = supabase
      .channel(`queue-${uid}`)
      .on(
        "postgres_changes",
        {
          event:  "UPDATE",
          schema: "public",
          table:  "matchmaking_queue",
          filter: `user_id=eq.${uid}`,
        },
        (payload) => {
          const row = payload.new as { status: string; match_id: string };
          if (row.status === "matched" && row.match_id) {
            setStatus("matched");
            clearInterval(timerRef.current!);
            setTimeout(() => router.push(`/arena/${row.match_id}`), 1000);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
  }

  // Polling fallback — in case Realtime misses the event
  function startPolling(uid: string) {
    clearInterval(pollRef.current!);
    pollRef.current = setInterval(async () => {
      const { data } = await supabase
        .from("matchmaking_queue")
        .select("status, match_id")
        .eq("user_id", uid)
        .single();

      if (data?.status === "matched" && data.match_id) {
        clearInterval(pollRef.current!);
        clearInterval(timerRef.current!);
        if (channelRef.current) supabase.removeChannel(channelRef.current);
        setStatus("matched");
        setTimeout(() => router.push(`/arena/${data.match_id}`), 1000);
      }
    }, 2000);
  }

  async function joinQueue() {
    if (!userId.current) return;
    setStatus("waiting");
    setWaitTime(0);

    timerRef.current = setInterval(() => setWaitTime((t) => t + 1), 1000);

    subscribeToQueue(userId.current);
    startPolling(userId.current);

    const res  = await fetch("/api/matchmaking/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ track }),
    });
    const data = await res.json();

    if (data.status === "matched" && data.match_id) {
      clearInterval(pollRef.current!);
      clearInterval(timerRef.current!);
      setStatus("matched");
      setTimeout(() => router.push(`/arena/${data.match_id}`), 1000);
    }
    // if "waiting", Realtime + polling will detect when opponent joins
  }

  async function leaveQueue() {
    clearInterval(timerRef.current!);
    clearInterval(pollRef.current!);
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    await fetch("/api/matchmaking/leave", { method: "POST" });
    setStatus("idle");
    setWaitTime(0);
  }

  useEffect(() => () => {
    clearInterval(timerRef.current!);
    clearInterval(pollRef.current!);
    if (channelRef.current) supabase.removeChannel(channelRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="min-h-screen grid-bg relative flex flex-col">
      <div className="orb orb-purple w-[600px] h-[600px] top-[-200px] left-[-200px] opacity-15" />
      <div className="orb orb-cyan w-96 h-96 bottom-0 right-0 opacity-10" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-[#2a2a3a]">
        <Link href="/dashboard" className="flex items-center gap-2 text-[#5a5a7a] hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Dashboard</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#22d3ee] flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white">Arena<span className="text-[#6366f1]">X</span></span>
        </div>
        <div className="flex items-center gap-2 text-sm text-[#5a5a7a]">
          <Users className="w-4 h-4" />
          <span>{onlineCount !== null ? `${onlineCount} in queue` : "..."}</span>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">

          <AnimatePresence mode="wait">
            {/* ── Idle State ── */}
            {status === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center"
              >
                <div className="mb-8">
                  <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-[#6366f1] to-[#4f46e5] flex items-center justify-center shadow-2xl shadow-[#6366f1]/30 mb-6">
                    <Swords className="w-12 h-12 text-white" />
                  </div>
                  <h1 className="text-4xl font-bold text-white mb-3">Find a Match</h1>
                  <p className="text-[#5a5a7a] text-base">
                    You&apos;ll be paired with another player and given the same coding problem.
                    Best score wins.
                  </p>
                </div>

                {/* Track selector */}
                <div className="gradient-border rounded-2xl mb-6">
                  <div className="bg-[#0d0d15] rounded-2xl p-5">
                    <p className="text-xs text-[#5a5a7a] font-medium uppercase tracking-wider mb-3">Select Track</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(TRACK_LABELS).map(([key, label]) => {
                        const locked = key !== "dsa";
                        return (
                          <button
                            key={key}
                            onClick={() => !locked && setTrack(key)}
                            disabled={locked}
                            title={locked ? "Coming soon" : undefined}
                            className={`relative py-2.5 px-4 rounded-xl text-sm font-medium transition-all border ${
                              locked
                                ? "bg-[#0d0d15] border-[#1a1a2a] text-[#3a3a5a] cursor-not-allowed"
                                : track === key
                                ? "bg-[#6366f1]/20 border-[#6366f1] text-[#818cf8]"
                                : "bg-[#111118] border-[#2a2a3a] text-[#5a5a7a] hover:border-[#3a3a4a] hover:text-[#a1a1b5]"
                            }`}
                          >
                            <span className="flex items-center justify-center gap-1.5">
                              {locked && <Lock className="w-3 h-3" />}
                              {label}
                            </span>
                            {locked && (
                              <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold px-1 py-0.5 rounded bg-[#2a2a3a] text-[#5a5a7a] leading-none">
                                SOON
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 mb-8">
                  {[
                    { icon: Clock,   label: "Avg wait", value: "< 30s" },
                    { icon: Users,   label: "In queue",  value: onlineCount !== null ? String(onlineCount) : "–" },
                    { icon: Trophy,  label: "Your tier",  value: profile?.tier ? profile.tier.charAt(0).toUpperCase() + profile.tier.slice(1) : "–" },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="bg-[#111118] border border-[#2a2a3a] rounded-xl p-3 text-center">
                      <Icon className="w-4 h-4 text-[#5a5a7a] mx-auto mb-1" />
                      <div className="text-base font-bold text-white">{value}</div>
                      <div className="text-xs text-[#5a5a7a]">{label}</div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={joinQueue}
                  className="w-full py-4 rounded-2xl font-bold text-white text-lg flex items-center justify-center gap-3 btn-glow transition-all"
                  style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
                >
                  <Swords className="w-5 h-5" />
                  Enter the Arena
                  <ChevronRight className="w-5 h-5" />
                </button>
              </motion.div>
            )}

            {/* ── Waiting State ── */}
            {status === "waiting" && (
              <motion.div
                key="waiting"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <div className="relative w-32 h-32 mx-auto mb-8">
                  {/* Animated rings */}
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="absolute inset-0 rounded-full border-2 border-[#6366f1]/30"
                      animate={{ scale: [1, 1.5 + i * 0.3], opacity: [0.6, 0] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.5, ease: "easeOut" }}
                    />
                  ))}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#6366f1] to-[#4f46e5] flex items-center justify-center shadow-2xl shadow-[#6366f1]/40">
                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-white mb-2">Searching for opponent…</h2>
                <p className="text-[#5a5a7a] mb-2">Track: <span className="text-[#818cf8]">{TRACK_LABELS[track]}</span></p>
                <p className="text-4xl font-mono font-bold text-[#6366f1] mb-8">{fmtTime(waitTime)}</p>

                <div className="bg-[#111118] border border-[#2a2a3a] rounded-2xl p-5 mb-8">
                  <div className="flex items-center justify-center gap-4">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6366f1] to-[#818cf8] mx-auto mb-2" />
                      <div className="text-sm font-medium text-white">{profile?.username ?? "You"}</div>
                      <div className="text-xs mt-0.5" style={{ color: TIER_COLORS[profile?.tier ?? "unrated"] }}>
                        {profile?.tier ?? "unrated"}
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="text-[#5a5a7a] font-bold">VS</div>
                      <motion.div
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="text-xs text-[#5a5a7a]"
                      >
                        matching…
                      </motion.div>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full bg-[#1a1a2e] border-2 border-dashed border-[#2a2a3a] mx-auto mb-2 flex items-center justify-center">
                        <span className="text-[#5a5a7a] text-xl">?</span>
                      </div>
                      <div className="text-sm text-[#5a5a7a]">Opponent</div>
                      <div className="text-xs text-[#3a3a5a] mt-0.5">searching…</div>
                    </div>
                  </div>
                </div>

                {/* Solo mode suggestion after 20s */}
                <AnimatePresence>
                  {waitTime >= 20 && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mb-4 p-4 rounded-2xl bg-[#6366f1]/10 border border-[#6366f1]/25 text-center"
                    >
                      <div className="flex items-center justify-center gap-2 mb-1.5">
                        <Timer className="w-4 h-4 text-[#818cf8]" />
                        <span className="text-sm font-medium text-[#818cf8]">Fewer players online right now</span>
                      </div>
                      <p className="text-xs text-[#5a5a7a] mb-3">Try solving a problem solo while you wait — no ELO at stake.</p>
                      <button
                        onClick={async () => { await leaveQueue(); router.push("/arena/solo"); }}
                        className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                        style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
                      >
                        Try Solo Mode →
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={leaveQueue}
                  className="flex items-center gap-2 mx-auto text-sm text-[#5a5a7a] hover:text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Cancel search
                </button>
              </motion.div>
            )}

            {/* ── Matched State ── */}
            {status === "matched" && (
              <motion.div
                key="matched"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.5 }}
                  className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-[#22d3ee] to-[#6366f1] flex items-center justify-center mb-6 shadow-2xl shadow-[#22d3ee]/30"
                >
                  <Swords className="w-12 h-12 text-white" />
                </motion.div>
                <h2 className="text-3xl font-bold text-white mb-2">Opponent found!</h2>
                <p className="text-[#5a5a7a]">Entering the arena…</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}