"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Swords, Clock, Users, Trophy, ArrowLeft, Loader2, X, Timer, Lock } from "lucide-react";
import { Kabuto, Crest, dbTierToKabuto, TIER_LABELS } from "@/components/ui-samurai/primitives";

const TRACK_LABELS: Record<string, string> = {
  dsa:      "DSA",
  backend:  "Backend",
  ml:       "Machine Learning",
  frontend: "Frontend",
};

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
  const color = result === "win" ? "var(--win)" : result === "loss" ? "var(--loss)" : "#f5c451";
  const label = result === "win" ? "W" : result === "loss" ? "L" : "D";
  return (
    <span className="w-5 h-5 rounded flex items-center justify-center font-mono shrink-0"
      style={{ fontSize: 9, background: `${color}18`, border: `1px solid ${color}40`, color, letterSpacing: "0.05em" }}>
      {label}
    </span>
  );
}

function PlayerCard({ player, label, isMe, loading }: {
  player: PreMatchPlayer | null; label: string; isMe: boolean; loading: boolean;
}) {
  const tier       = player?.tier ?? "unrated";
  const kabutoTier = dbTierToKabuto(tier);
  const tierInfo   = TIER_LABELS[tier] ?? TIER_LABELS.unrated;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="font-cond text-[9px] mb-1" style={{ color: "var(--smoke)", letterSpacing: "0.22em" }}>{label}</div>
      {loading ? (
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--ink-3)", border: "1px solid var(--ink-4)" }} className="animate-pulse" />
      ) : (
        <div style={{
          background: "conic-gradient(from 220deg, var(--violet-300), var(--violet-700), var(--orchid), var(--violet-300))",
          padding: 2, borderRadius: "50%",
        }}>
          <div style={{ background: "var(--ink-2)", borderRadius: "50%", padding: 3 }}>
            <Kabuto size={50} tier={kabutoTier} glow={false} />
          </div>
        </div>
      )}
      {loading ? (
        <div className="space-y-1 w-20">
          <div className="h-2.5 bg-[var(--ink-4)] rounded animate-pulse" />
          <div className="h-2 bg-[var(--ink-4)] rounded animate-pulse w-3/4 mx-auto" />
        </div>
      ) : player ? (
        <div className="text-center">
          <div className="font-display text-sm truncate max-w-[100px]" style={{ color: "var(--bone)", lineHeight: 1 }}>{player.displayName.toUpperCase()}</div>
          <div className="font-jp text-[10px] mt-0.5" style={{ color: tierInfo.color }}>{tierInfo.jp}</div>
          <div className="font-mono text-[10px]" style={{ color: "var(--violet-200)" }}>{player.elo} ELO</div>
          {player.streak >= 3 && <div className="font-cond text-[9px] mt-0.5" style={{ color: "#f5c451" }}>🔥 {player.streak}W</div>}
        </div>
      ) : isMe ? (
        <div className="text-center">
          <div className="font-display text-sm" style={{ color: "var(--bone)" }}>YOU</div>
        </div>
      ) : (
        <div className="text-center">
          <div className="font-mono text-[11px]" style={{ color: "var(--void)" }}>? ? ?</div>
          <div className="font-cond text-[9px] mt-0.5" style={{ color: "var(--smoke)", letterSpacing: "0.2em" }}>SEARCHING</div>
        </div>
      )}
    </div>
  );
}

export default function ArenaPage() {
  const router = useRouter();
  const supabase = createClient();

  const [status,         setStatus]        = useState<QueueStatus>("idle");
  const [track,          setTrack]         = useState("dsa");
  const [waitTime,       setWaitTime]      = useState(0);
  const [profile,        setProfile]       = useState<{ username: string; tier: string; elo: number } | null>(null);
  const [onlineCount,    setOnlineCount]   = useState<number | null>(null);
  const [currentMatchId, setCurrentMatchId]= useState<string | null>(null);
  const [preMatchData,   setPreMatchData]  = useState<PreMatchData | null>(null);
  const [countdown,      setCountdown]     = useState(5);

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
      const { data: rating } = await supabase.from("user_ratings").select("tier, elo").eq("user_id", user.id).eq("track", track).single();
      setProfile({ username: prof?.username ?? "you", tier: rating?.tier ?? "unrated", elo: rating?.elo ?? 800 });

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
      .then(r => r.json())
      .then(d => setPreMatchData(d))
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
      const { data } = await supabase.from("matchmaking_queue").select("status, match_id").eq("user_id", uid).single();
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
    timerRef.current = setInterval(() => setWaitTime(t => t + 1), 1000);
    subscribeToQueue(userId.current);
    startPolling(userId.current);

    const res  = await fetch("/api/matchmaking/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ track }) });
    const data = await res.json();
    if (data.status === "matched" && data.match_id) { handleMatched(data.match_id); return; }

    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    botTimerRef.current = setTimeout(async () => {
      if (statusRef.current !== "waiting") return;
      try {
        const botRes  = await fetch("/api/matchmaking/bot-match", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ track }) });
        const botData = await botRes.json();
        if (botData.status === "matched" && botData.match_id) handleMatched(botData.match_id);
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

  const myKabuto   = dbTierToKabuto(profile?.tier ?? "unrated");
  const myTierInfo = TIER_LABELS[profile?.tier ?? "unrated"] ?? TIER_LABELS.unrated;

  return (
    <div className="min-h-screen" style={{ background: "var(--ink-1)", position: "relative", overflow: "hidden" }}>
      {/* Atmosphere */}
      <div className="ax-aura pointer-events-none" style={{ width: 600, height: 500, background: "var(--violet-700)", top: -200, left: -200, opacity: 0.22 }} />
      <div className="ax-aura pointer-events-none" style={{ width: 400, height: 400, background: "var(--orchid)", bottom: -100, right: -100, opacity: 0.12 }} />
      <div className="ax-dotgrid" style={{ position: "absolute", inset: 0, opacity: 0.3 }} />

      {/* Kanji watermark */}
      <div className="font-jp pointer-events-none select-none" style={{
        position: "absolute", right: -60, top: "50%", transform: "translateY(-50%)",
        fontSize: 600, lineHeight: 1, color: "var(--violet-700)", opacity: 0.06, fontWeight: 700,
      }}>刀</div>

      {/* Back nav */}
      <div className="relative z-10 flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--ink-4)" }}>
        <Link href="/dashboard" className="flex items-center gap-2 font-cond text-xs transition-colors"
          style={{ color: "var(--smoke)", letterSpacing: "0.18em" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--bone)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--smoke)"}>
          <ArrowLeft className="w-3.5 h-3.5" /> DASHBOARD
        </Link>
        <div className="flex items-center gap-2">
          <Crest size={14} color="var(--violet-400)" />
          <span className="font-cond text-xs" style={{ color: "var(--smoke)", letterSpacing: "0.2em" }}>IAIDŌ DUEL · 刀</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-xs" style={{ color: "var(--smoke)" }}>
          <Users className="w-3 h-3" />
          <span>{onlineCount !== null ? `${onlineCount} IN QUEUE` : "···"}</span>
        </div>
      </div>

      <main className="relative z-10 flex items-center justify-center px-4 py-12" style={{ minHeight: "calc(100vh - 57px)" }}>
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">

            {/* ── IDLE ── */}
            {status === "idle" && (
              <motion.div key="idle" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>

                {/* Hero */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center mb-5" style={{
                    width: 88, height: 88,
                    background: "radial-gradient(circle, rgba(124,58,237,0.35), transparent 70%)",
                    position: "relative",
                  }}>
                    <Kabuto size={72} tier={myKabuto} glow={true} />
                  </div>
                  <h1 className="font-display" style={{ fontSize: 52, color: "var(--bone)", lineHeight: 0.9, marginBottom: 8 }}>
                    FIND A<br /><span style={{ color: "var(--violet-400)" }}>MATCH.</span>
                  </h1>
                  <p className="font-cond text-xs" style={{ color: "var(--ash)", letterSpacing: "0.12em", lineHeight: 1.6 }}>
                    Paired with a real opponent. Same problem. First clean blade wins.
                  </p>
                </div>

                {/* Track selector */}
                <div className="ax-card ax-ticks mb-4" style={{ padding: "18px 20px" }}>
                  <div className="font-cond text-[9px] mb-3" style={{ color: "var(--ash)", letterSpacing: "0.3em" }}>SELECT TRACK · 形</div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(TRACK_LABELS).map(([key, label]) => {
                      const locked = key !== "dsa";
                      const active = track === key;
                      return (
                        <button key={key} onClick={() => !locked && setTrack(key)} disabled={locked}
                          className="relative font-cond text-[11px] py-2.5 px-3 rounded-lg transition-all"
                          style={{
                            border: `1px solid ${active ? "var(--violet-500)" : "var(--ink-4)"}`,
                            background: active ? "rgba(124,58,237,0.14)" : "var(--ink-3)",
                            color: locked ? "var(--void)" : active ? "var(--violet-200)" : "var(--ash)",
                            cursor: locked ? "not-allowed" : "pointer",
                            letterSpacing: "0.12em",
                          }}>
                          <span className="flex items-center justify-center gap-1.5">
                            {locked && <Lock className="w-2.5 h-2.5" />}{label}
                          </span>
                          {locked && (
                            <span className="absolute -top-1.5 -right-1.5 font-mono px-1 py-0.5 rounded"
                              style={{ fontSize: 7, background: "var(--ink-4)", color: "var(--smoke)", letterSpacing: "0.1em" }}>
                              SOON
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {[
                    { icon: Clock,  label: "AVG WAIT",  value: "< 30s" },
                    { icon: Users,  label: "IN QUEUE",  value: onlineCount !== null ? String(onlineCount) : "—" },
                    { icon: Trophy, label: "YOUR TIER",  value: myTierInfo.label.toUpperCase() },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="ax-card flex flex-col items-center gap-1 py-3">
                      <Icon className="w-3 h-3" style={{ color: "var(--violet-300)", opacity: 0.7 }} />
                      <div className="font-display" style={{ fontSize: 16, color: "var(--bone)", lineHeight: 1 }}>{value}</div>
                      <div className="font-cond text-[8px]" style={{ color: "var(--smoke)", letterSpacing: "0.18em" }}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <button onClick={joinQueue}
                  className="w-full font-cond btn-glow transition-all"
                  style={{
                    height: 54, borderRadius: 10, fontSize: 14, letterSpacing: "0.2em",
                    background: "linear-gradient(180deg, var(--violet-500), var(--violet-700))",
                    border: "1px solid rgba(196,181,253,0.3)",
                    color: "var(--bone)", cursor: "pointer",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14), 0 8px 24px -8px rgba(124,58,237,0.5)",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  }}>
                  <Swords className="w-4 h-4" />ENTER THE ARENA ⟶
                </button>

                <Link href="/arena/solo"
                  className="mt-3 flex items-center justify-center gap-2 font-cond text-[10px] transition-colors"
                  style={{ color: "var(--smoke)", letterSpacing: "0.18em" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--violet-300)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--smoke)"}>
                  <Timer className="w-3 h-3" />TRY SOLO MODE INSTEAD
                </Link>
              </motion.div>
            )}

            {/* ── WAITING ── */}
            {status === "waiting" && (
              <motion.div key="waiting" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="text-center">

                {/* Pulsing rings around kabuto */}
                <div className="relative mx-auto mb-8" style={{ width: 120, height: 120 }}>
                  {[0, 1, 2].map(i => (
                    <motion.div key={i} style={{
                      position: "absolute", inset: 0, borderRadius: "50%",
                      border: "1px solid rgba(124,58,237,0.4)",
                    }}
                      animate={{ scale: [1, 1.6 + i * 0.25], opacity: [0.6, 0] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.55, ease: "easeOut" }}
                    />
                  ))}
                  <div style={{
                    position: "absolute", inset: 0, borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(124,58,237,0.3), transparent 70%)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                      style={{ position: "absolute", inset: 6, borderRadius: "50%", border: "1px solid rgba(167,139,250,0.3)", borderTopColor: "var(--violet-400)" }} />
                    <Kabuto size={72} tier={myKabuto} glow={true} />
                  </div>
                </div>

                <div className="font-cond text-xs mb-1" style={{ color: "var(--violet-300)", letterSpacing: "0.3em" }}>
                  SEARCHING · 探索
                </div>
                <h2 className="font-display" style={{ fontSize: 40, color: "var(--bone)", lineHeight: 0.9, marginBottom: 6 }}>
                  SEEKING<br />AN OPPONENT.
                </h2>
                <div className="font-cond text-xs mb-1" style={{ color: "var(--ash)", letterSpacing: "0.15em" }}>
                  TRACK: <span style={{ color: "var(--violet-300)" }}>{TRACK_LABELS[track]}</span>
                </div>
                <div className="font-mono text-4xl font-bold mb-8" style={{ color: "var(--violet-300)" }}>
                  {fmtTime(waitTime)}
                </div>

                {/* VS card */}
                <div className="ax-card ax-ticks mb-5" style={{ padding: "20px 24px" }}>
                  <div className="grid" style={{ gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center" }}>
                    <PlayerCard player={profile ? { displayName: profile.username, avatarUrl: null, elo: profile.elo, tier: profile.tier, streak: 0, last3: [] } : null} label="YOU" isMe={true} loading={!profile} />
                    <div className="flex flex-col items-center gap-1">
                      <div className="font-display text-lg" style={{ color: "var(--ash)" }}>VS</div>
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}
                        className="font-mono text-[8px]" style={{ color: "var(--smoke)", letterSpacing: "0.2em" }}>
                        MATCHING…
                      </motion.div>
                    </div>
                    <PlayerCard player={null} label="OPPONENT" isMe={false} loading={false} />
                  </div>
                </div>

                {/* Solo suggestion after 20s */}
                <AnimatePresence>
                  {waitTime >= 20 && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="ax-card mb-4" style={{ padding: "14px 18px", borderColor: "rgba(124,58,237,0.3)", textAlign: "center" }}>
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Timer className="w-3 h-3" style={{ color: "var(--violet-300)" }} />
                        <span className="font-cond text-[10px]" style={{ color: "var(--violet-300)", letterSpacing: "0.18em" }}>FEWER WARRIORS ONLINE</span>
                      </div>
                      <p className="font-mono text-[9px] mb-3" style={{ color: "var(--ash)" }}>Try solo mode while you wait — no ELO at stake.</p>
                      <button onClick={async () => { await leaveQueue(); router.push("/arena/solo"); }}
                        className="font-cond text-[10px] px-4 py-2 rounded"
                        style={{ background: "rgba(124,58,237,0.15)", border: "1px solid var(--violet-500)", color: "var(--violet-200)", cursor: "pointer", letterSpacing: "0.15em" }}>
                        SOLO MODE ⟶
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button onClick={leaveQueue}
                  className="flex items-center gap-2 mx-auto font-cond text-[10px] transition-colors"
                  style={{ color: "var(--smoke)", letterSpacing: "0.18em", background: "none", border: "none", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--loss)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--smoke)"}>
                  <X className="w-3 h-3" />CANCEL SEARCH
                </button>
              </motion.div>
            )}

            {/* ── MATCHED ── */}
            {status === "matched" && currentMatchId && (
              <motion.div key="matched" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="w-full">

                {/* Header */}
                <div className="text-center mb-6">
                  <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 0.45 }}
                    className="inline-flex items-center justify-center mb-3"
                    style={{ width: 60, height: 60, borderRadius: 12, background: "linear-gradient(180deg, var(--violet-500), var(--violet-700))", boxShadow: "0 0 32px rgba(124,58,237,0.5)" }}>
                    <Swords className="w-7 h-7" style={{ color: "var(--bone)" }} />
                  </motion.div>
                  <div className="font-cond text-[10px] mb-1" style={{ color: "var(--violet-300)", letterSpacing: "0.3em" }}>OPPONENT FOUND · 対戦相手</div>
                  <h2 className="font-display" style={{ fontSize: 44, color: "var(--bone)", lineHeight: 0.9 }}>
                    DUEL BEGINS<br /><span style={{ color: "var(--violet-400)" }}>IN {countdown}s.</span>
                  </h2>
                  {/* Countdown bar */}
                  <div className="mt-3 mx-8" style={{ height: 2, background: "var(--ink-4)", borderRadius: 2, overflow: "hidden" }}>
                    <motion.div style={{ height: "100%", background: "linear-gradient(90deg, var(--violet-500), var(--orchid))" }}
                      initial={{ width: "100%" }} animate={{ width: "0%" }} transition={{ duration: 5, ease: "linear" }} />
                  </div>
                </div>

                {/* Scouting panel */}
                <div className="ax-card ax-ticks" style={{ padding: "20px 24px" }}>
                  <div className="font-cond text-[9px] mb-4" style={{ color: "var(--ash)", letterSpacing: "0.28em" }}>SCOUTING · 偵察</div>

                  {/* Players */}
                  <div className="grid mb-5" style={{ gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center" }}>
                    <PlayerCard
                      player={preMatchData?.me ?? null}
                      label="YOU"
                      isMe={true}
                      loading={!preMatchData}
                    />
                    <div className="flex flex-col items-center gap-1">
                      <div className="font-display text-xl" style={{ color: "var(--ash)" }}>VS</div>
                      {(preMatchData?.h2h?.total ?? 0) > 0 && preMatchData && (
                        <div className="text-center">
                          <div className="font-cond text-[8px] mb-0.5" style={{ color: "var(--smoke)", letterSpacing: "0.18em" }}>H2H</div>
                          <div className="font-display text-sm" style={{ lineHeight: 1 }}>
                            <span style={{ color: "var(--win)" }}>{preMatchData.h2h.myWins}</span>
                            <span style={{ color: "var(--void)" }}> – </span>
                            <span style={{ color: "var(--loss)" }}>{preMatchData.h2h.theirWins}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <PlayerCard
                      player={preMatchData?.opponent ?? null}
                      label="OPPONENT"
                      isMe={false}
                      loading={!preMatchData}
                    />
                  </div>

                  {/* Recent form */}
                  <div style={{ borderTop: "1px solid var(--ink-4)", paddingTop: 14 }}>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: "YOUR FORM", matches: preMatchData?.me.last3 },
                        { label: "THEIR FORM", matches: preMatchData?.opponent.last3 },
                      ].map(({ label, matches }) => (
                        <div key={label}>
                          <div className="font-cond text-[8px] mb-2" style={{ color: "var(--void)", letterSpacing: "0.22em" }}>{label}</div>
                          {!preMatchData ? (
                            <div className="space-y-1.5">
                              {[0, 1, 2].map(i => <div key={i} className="h-5 rounded animate-pulse" style={{ background: "var(--ink-4)" }} />)}
                            </div>
                          ) : !matches || matches.length === 0 ? (
                            <p className="font-mono text-[9px]" style={{ color: "var(--void)" }}>No matches yet</p>
                          ) : (
                            <div className="space-y-1.5">
                              {matches.map((m, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <ResultDot result={m.result} />
                                  <span className="font-mono text-[9px] truncate" style={{ color: "var(--ash)" }}>{m.problemTitle ?? "—"}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Loader */}
                {!preMatchData && (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <Loader2 className="w-3 h-3 animate-spin" style={{ color: "var(--violet-400)" }} />
                    <span className="font-mono text-[9px]" style={{ color: "var(--smoke)", letterSpacing: "0.2em" }}>LOADING INTEL…</span>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
