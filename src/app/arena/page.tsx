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

const AVATAR_GRADIENTS: Record<string, string> = {
  "1": "linear-gradient(135deg, #6366f1, #22d3ee)",
  "2": "linear-gradient(135deg, #f97316, #ef4444)",
  "3": "linear-gradient(135deg, #22c55e, #16a34a)",
  "4": "linear-gradient(135deg, #a855f7, #6366f1)",
  "5": "linear-gradient(135deg, #ffd700, #f97316)",
};

function getAvatar(avatarUrl: string | null | undefined, isOpponent = false): string {
  if (avatarUrl && AVATAR_GRADIENTS[avatarUrl]) return AVATAR_GRADIENTS[avatarUrl];
  return isOpponent
    ? "linear-gradient(135deg, #22d3ee, #0891b2)"
    : "linear-gradient(135deg, #6366f1, #818cf8)";
}

type QueueStatus = "idle" | "waiting" | "matched" | "error";

interface PreMatchPlayer {
  displayName: string; avatarUrl: string | null;
  elo: number; tier: string; streak: number;
  last3: Array<{ result: string; problemTitle: string | null }>;
}
interface PreMatchData {
  me: PreMatchPlayer;
  opponent: PreMatchPlayer & { username: string };
  h2h: { myWins: number; theirWins: number; total: number };
}

function ResultDot({ result }: { result: string }) {
  const color = result === "win" ? "#22c55e" : result === "loss" ? "#ef4444" : "#f59e0b";
  const label = result === "win" ? "W" : result === "loss" ? "L" : "D";
  return (
    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
      style={{ background: `${color}20`, border: `1px solid ${color}50`, color }}>
      {label}
    </span>
  );
}

export default function ArenaPage() {
  const router = useRouter();
  const supabase = createClient();

  const [status,       setStatus]      = useState<QueueStatus>("idle");
  const [track,        setTrack]       = useState("dsa");
  const [waitTime,     setWaitTime]    = useState(0);
  const [profile,      setProfile]     = useState<{ username: string; tier: string } | null>(null);
  const [onlineCount,  setOnlineCount] = useState<number | null>(null);
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);
  const [preMatchData,   setPreMatchData]   = useState<PreMatchData | null>(null);
  const [countdown,      setCountdown]      = useState(3);

  const channelRef   = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timerRef     = useRef<NodeJS.Timeout | null>(null);
  const pollRef      = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const botTimerRef  = useRef<NodeJS.Timeout | null>(null);
  const userId       = useRef<string | null>(null);
  const statusRef    = useRef<QueueStatus>("idle");
  const matchedRef   = useRef(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      userId.current = user.id;

      const { data: prof }   = await supabase.from("profiles").select("username").eq("id", user.id).single();
      const { data: rating } = await supabase.from("user_ratings").select("tier").eq("user_id", user.id).eq("track", track).single();
      setProfile({ username: prof?.username ?? "you", tier: rating?.tier ?? "unrated" });

      const { count } = await supabase.from("matchmaking_queue").select("*", { count: "exact", head: true }).eq("status", "waiting").eq("track", track);
      setOnlineCount(count ?? 0);
    })();
  }, [track]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleMatched(mId: string) {
    if (matchedRef.current) return;
    matchedRef.current = true;
    statusRef.current  = "matched";

    clearInterval(timerRef.current!);
    clearInterval(pollRef.current!);
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    setCurrentMatchId(mId);
    setStatus("matched");

    // Start 5s countdown immediately — data loads in background
    // User sees data for ~3s after it arrives before redirect
    let c = 5;
    setCountdown(5);
    countdownRef.current = setInterval(() => {
      c -= 1;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(countdownRef.current!);
        router.push(`/arena/${mId}`);
      }
    }, 1000);

    fetch(`/api/arena/prematch?match_id=${mId}`)
      .then((r) => r.json())
      .then((d) => setPreMatchData(d))
      .catch(() => {});
  }

  function subscribeToQueue(uid: string) {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const channel = supabase
      .channel(`queue-${uid}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matchmaking_queue", filter: `user_id=eq.${uid}` },
        (payload) => {
          const row = payload.new as { status: string; match_id: string };
          if (row.status === "matched" && row.match_id) {
            clearInterval(pollRef.current!);
            handleMatched(row.match_id);
          }
        }
      )
      .subscribe();
    channelRef.current = channel;
  }

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
        if (channelRef.current) supabase.removeChannel(channelRef.current);
        handleMatched(data.match_id);
      }
    }, 2000);
  }

  async function joinQueue() {
    if (!userId.current) return;
    matchedRef.current = false;
    statusRef.current  = "waiting";
    setStatus("waiting");
    setWaitTime(0);
    timerRef.current = setInterval(() => setWaitTime((t) => t + 1), 1000);
    subscribeToQueue(userId.current);
    startPolling(userId.current);

    const res  = await fetch("/api/matchmaking/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ track }) });
    const data = await res.json();
    if (data.status === "matched" && data.match_id) {
      handleMatched(data.match_id);
      return;
    }

    // Still waiting — schedule bot fallback at 15s
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    botTimerRef.current = setTimeout(async () => {
      if (statusRef.current !== "waiting") return;
      try {
        const botRes  = await fetch("/api/matchmaking/bot-match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ track }),
        });
        const botData = await botRes.json();
        if (botData.status === "matched" && botData.match_id) {
          handleMatched(botData.match_id);
        }
      } catch { /* ignore */ }
    }, 7000);
  }

  async function leaveQueue() {
    clearInterval(timerRef.current!);
    clearInterval(pollRef.current!);
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    statusRef.current = "idle";
    await fetch("/api/matchmaking/leave", { method: "POST" });
    setStatus("idle");
    setWaitTime(0);
  }

  useEffect(() => () => {
    clearInterval(timerRef.current!);
    clearInterval(pollRef.current!);
    clearInterval(countdownRef.current!);
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
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

            {/* ── Idle ── */}
            {status === "idle" && (
              <motion.div key="idle" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center">
                <div className="mb-8">
                  <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-[#6366f1] to-[#4f46e5] flex items-center justify-center shadow-2xl shadow-[#6366f1]/30 mb-6">
                    <Swords className="w-12 h-12 text-white" />
                  </div>
                  <h1 className="text-4xl font-bold text-white mb-3">Find a Match</h1>
                  <p className="text-[#5a5a7a] text-base">You&apos;ll be paired with another player and given the same coding problem. Best score wins.</p>
                </div>

                <div className="gradient-border rounded-2xl mb-6">
                  <div className="bg-[#0d0d15] rounded-2xl p-5">
                    <p className="text-xs text-[#5a5a7a] font-medium uppercase tracking-wider mb-3">Select Track</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(TRACK_LABELS).map(([key, label]) => {
                        const locked = key !== "dsa";
                        return (
                          <button key={key} onClick={() => !locked && setTrack(key)} disabled={locked}
                            className={`relative py-2.5 px-4 rounded-xl text-sm font-medium transition-all border ${
                              locked ? "bg-[#0d0d15] border-[#1a1a2a] text-[#3a3a5a] cursor-not-allowed"
                                : track === key ? "bg-[#6366f1]/20 border-[#6366f1] text-[#818cf8]"
                                : "bg-[#111118] border-[#2a2a3a] text-[#5a5a7a] hover:border-[#3a3a4a] hover:text-[#a1a1b5]"
                            }`}>
                            <span className="flex items-center justify-center gap-1.5">
                              {locked && <Lock className="w-3 h-3" />}{label}
                            </span>
                            {locked && <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold px-1 py-0.5 rounded bg-[#2a2a3a] text-[#5a5a7a] leading-none">SOON</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-8">
                  {[
                    { icon: Clock,  label: "Avg wait", value: "< 30s" },
                    { icon: Users,  label: "In queue",  value: onlineCount !== null ? String(onlineCount) : "–" },
                    { icon: Trophy, label: "Your tier",  value: profile?.tier ? profile.tier.charAt(0).toUpperCase() + profile.tier.slice(1) : "–" },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="bg-[#111118] border border-[#2a2a3a] rounded-xl p-3 text-center">
                      <Icon className="w-4 h-4 text-[#5a5a7a] mx-auto mb-1" />
                      <div className="text-base font-bold text-white">{value}</div>
                      <div className="text-xs text-[#5a5a7a]">{label}</div>
                    </div>
                  ))}
                </div>

                <button onClick={joinQueue}
                  className="w-full py-4 rounded-2xl font-bold text-white text-lg flex items-center justify-center gap-3 btn-glow transition-all"
                  style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>
                  <Swords className="w-5 h-5" />Enter the Arena<ChevronRight className="w-5 h-5" />
                </button>

                <Link href="/arena/solo" className="mt-3 flex items-center justify-center gap-2 text-sm text-[#5a5a7a] hover:text-[#818cf8] transition-colors">
                  <Timer className="w-4 h-4" />Try Solo Mode instead
                </Link>
              </motion.div>
            )}

            {/* ── Waiting ── */}
            {status === "waiting" && (
              <motion.div key="waiting" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center">
                <div className="relative w-32 h-32 mx-auto mb-8">
                  {[0, 1, 2].map((i) => (
                    <motion.div key={i} className="absolute inset-0 rounded-full border-2 border-[#6366f1]/30"
                      animate={{ scale: [1, 1.5 + i * 0.3], opacity: [0.6, 0] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.5, ease: "easeOut" }} />
                  ))}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#6366f1] to-[#4f46e5] flex items-center justify-center shadow-2xl shadow-[#6366f1]/40">
                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-white mb-2">Searching for opponent…</h2>
                <p className="text-[#5a5a7a] mb-2">Track: <span className="text-[#818cf8]">{TRACK_LABELS[track]}</span></p>
                <p className="text-4xl font-mono font-bold text-[#6366f1] mb-8">{fmtTime(waitTime)}</p>

                <div className="bg-[#111118] border border-[#2a2a3a] rounded-2xl p-5 mb-6">
                  <div className="flex items-center justify-center gap-4">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full mx-auto mb-2" style={{ background: getAvatar(null, false) }} />
                      <div className="text-sm font-medium text-white">{profile?.username ?? "You"}</div>
                      <div className="text-xs mt-0.5" style={{ color: TIER_COLORS[profile?.tier ?? "unrated"] }}>{profile?.tier ?? "unrated"}</div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="text-[#5a5a7a] font-bold">VS</div>
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-xs text-[#5a5a7a]">matching…</motion.div>
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

                {/* Solo suggestion after 20s */}
                <AnimatePresence>
                  {waitTime >= 20 && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="mb-4 p-4 rounded-2xl bg-[#6366f1]/10 border border-[#6366f1]/25 text-center">
                      <div className="flex items-center justify-center gap-2 mb-1.5">
                        <Timer className="w-4 h-4 text-[#818cf8]" />
                        <span className="text-sm font-medium text-[#818cf8]">Fewer players online right now</span>
                      </div>
                      <p className="text-xs text-[#5a5a7a] mb-3">Try solving a problem solo while you wait — no ELO at stake.</p>
                      <button onClick={async () => { await leaveQueue(); router.push("/arena/solo"); }}
                        className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                        style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>
                        Try Solo Mode →
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button onClick={leaveQueue} className="flex items-center gap-2 mx-auto text-sm text-[#5a5a7a] hover:text-red-400 transition-colors">
                  <X className="w-4 h-4" />Cancel search
                </button>
              </motion.div>
            )}

            {/* ── Matched: 3s scouting screen ── */}
            {status === "matched" && currentMatchId && (
              <motion.div key="matched" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full">
                {/* Header */}
                <div className="text-center mb-6">
                  <motion.div animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 0.5 }}
                    className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#22d3ee] to-[#6366f1] flex items-center justify-center mb-3 shadow-xl shadow-[#6366f1]/30">
                    <Swords className="w-8 h-8 text-white" />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-white">Opponent Found!</h2>
                  <p className="text-[#5a5a7a] text-sm mt-1">Match starts in <span className="text-[#818cf8] font-bold">{countdown}s</span></p>
                  {/* Countdown progress bar */}
                  <div className="mt-3 h-1 bg-[#1a1a2a] rounded-full overflow-hidden mx-8">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: "linear-gradient(90deg, #6366f1, #22d3ee)" }}
                      initial={{ width: "100%" }}
                      animate={{ width: "0%" }}
                      transition={{ duration: 3, ease: "linear" }}
                    />
                  </div>
                </div>

                {/* Scouting panel */}
                <div className="bg-[#0d0d15] border border-[#1e1e2e] rounded-2xl p-5">
                  {/* Players row — skeleton until data arrives */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {/* Me */}
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full mx-auto mb-2 shadow-lg"
                        style={{
                          background: preMatchData ? getAvatar(preMatchData.me.avatarUrl, false) : "linear-gradient(135deg, #6366f1, #818cf8)",
                          boxShadow: preMatchData ? `0 0 0 2px ${TIER_COLORS[preMatchData.me.tier]}, 0 0 10px ${TIER_COLORS[preMatchData.me.tier]}40` : "none",
                        }} />
                      {preMatchData ? (
                        <>
                          <p className="text-sm font-bold text-white truncate">{preMatchData.me.displayName}</p>
                          <p className="text-xs font-mono font-bold" style={{ color: TIER_COLORS[preMatchData.me.tier] }}>{preMatchData.me.elo} ELO</p>
                          {preMatchData.me.streak >= 3 && <p className="text-xs text-[#f59e0b]">⚡ {preMatchData.me.streak} streak</p>}
                        </>
                      ) : (
                        <>
                          <div className="h-3 w-16 mx-auto bg-[#1e1e2e] rounded animate-pulse mb-1" />
                          <div className="h-2.5 w-12 mx-auto bg-[#1e1e2e] rounded animate-pulse" />
                        </>
                      )}
                    </div>

                    {/* Center VS + H2H */}
                    <div className="flex flex-col items-center justify-center gap-1">
                      <div className="text-[#5a5a7a] text-xs font-bold">VS</div>
                      {(preMatchData?.h2h?.total ?? 0) > 0 && preMatchData && (
                        <div className="text-center">
                          <p className="text-[10px] text-[#5a5a7a] uppercase tracking-wide">H2H</p>
                          <p className="text-sm font-bold">
                            <span className="text-[#22c55e]">{preMatchData.h2h.myWins}</span>
                            <span className="text-[#3a3a5a]"> – </span>
                            <span className="text-[#ef4444]">{preMatchData.h2h.theirWins}</span>
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Opponent */}
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full mx-auto mb-2 shadow-lg"
                        style={{
                          background: preMatchData ? getAvatar(preMatchData.opponent.avatarUrl, true) : "linear-gradient(135deg, #22d3ee, #0891b2)",
                          boxShadow: preMatchData ? `0 0 0 2px ${TIER_COLORS[preMatchData.opponent.tier]}, 0 0 10px ${TIER_COLORS[preMatchData.opponent.tier]}40` : "none",
                        }} />
                      {preMatchData ? (
                        <>
                          <p className="text-sm font-bold text-white truncate">{preMatchData.opponent.displayName}</p>
                          <p className="text-xs font-mono font-bold" style={{ color: TIER_COLORS[preMatchData.opponent.tier] }}>{preMatchData.opponent.elo} ELO</p>
                          {preMatchData.opponent.streak >= 3 && <p className="text-xs text-[#f59e0b]">⚡ {preMatchData.opponent.streak} streak</p>}
                        </>
                      ) : (
                        <>
                          <div className="h-3 w-16 mx-auto bg-[#1e1e2e] rounded animate-pulse mb-1" />
                          <div className="h-2.5 w-12 mx-auto bg-[#1e1e2e] rounded animate-pulse" />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Recent form */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-[#5a5a7a] uppercase tracking-wide mb-2">Your recent form</p>
                      {!preMatchData ? (
                        <div className="space-y-1.5">{[0,1,2].map(i => <div key={i} className="h-6 bg-[#1e1e2e] rounded-lg animate-pulse" />)}</div>
                      ) : preMatchData.me.last3.length === 0 ? (
                        <p className="text-xs text-[#3a3a5a]">No matches yet</p>
                      ) : (
                        <div className="space-y-1.5">
                          {preMatchData.me.last3.map((m, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <ResultDot result={m.result} />
                              <span className="text-xs text-[#5a5a7a] truncate">{m.problemTitle ?? "—"}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] text-[#5a5a7a] uppercase tracking-wide mb-2">Their recent form</p>
                      {!preMatchData ? (
                        <div className="space-y-1.5">{[0,1,2].map(i => <div key={i} className="h-6 bg-[#1e1e2e] rounded-lg animate-pulse" />)}</div>
                      ) : preMatchData.opponent.last3.length === 0 ? (
                        <p className="text-xs text-[#3a3a5a]">No matches yet</p>
                      ) : (
                        <div className="space-y-1.5">
                          {preMatchData.opponent.last3.map((m, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <ResultDot result={m.result} />
                              <span className="text-xs text-[#5a5a7a] truncate">{m.problemTitle ?? "—"}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}