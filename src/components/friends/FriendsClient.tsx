"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Users, UserPlus, Search, Swords, Check, X,
  Clock, Copy, CheckCheck, Loader2, Bell, Lock,
} from "lucide-react";
import Image, { type StaticImageData } from "next/image";
import { TIER_LABELS } from "@/components/ui-samurai/primitives";
import roninImg    from "../../../public/images/chars/ronin.png";
import ashigaruImg from "../../../public/images/chars/ashigaru.png";
import samuraiImg  from "../../../public/images/chars/samurai.png";
import daimyoImg   from "../../../public/images/chars/daimyo.png";
import shoganImg   from "../../../public/images/chars/shogan.png";

const CHAR_MAP: Record<string, StaticImageData> = {
  unrated: roninImg, bronze: ashigaruImg, silver: samuraiImg,
  gold: daimyoImg, platinum: shoganImg, diamond: shoganImg,
};
function tierToCharImg(tier: string): StaticImageData { return CHAR_MAP[tier] ?? roninImg; }

const TRACKS = ["dsa", "backend", "ml", "frontend"] as const;
const TRACK_LABELS: Record<string, string> = {
  dsa: "DSA", backend: "Backend", ml: "Machine Learning", frontend: "Frontend",
};

interface FriendEntry {
  friendship_id: string;
  id: string;
  username: string;
  display_name: string;
  college: string | null;
  elo: number;
  tier: string;
}

interface PendingChallenge {
  id: string;
  challenger_id: string;
  challenger_name: string;
  challenger_username: string;
  track: string;
  mode: string;
  expires_at: string;
}

interface Props {
  currentUserId: string;
  currentUsername: string;
  referralCode: string;
}

export default function FriendsClient({ currentUserId, currentUsername, referralCode }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [tab, setTab] = useState<"friends" | "requests" | "find">("friends");
  const [friends, setFriends]   = useState<FriendEntry[]>([]);
  const [incoming, setIncoming] = useState<FriendEntry[]>([]);
  const [outgoing, setOutgoing] = useState<FriendEntry[]>([]);
  const [pendingChallenges, setPendingChallenges] = useState<PendingChallenge[]>([]);
  const [loading, setLoading]   = useState(true);

  const [search, setSearch]               = useState("");
  const [searchResult, setSearchResult]   = useState<FriendEntry | null | "not_found">(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounce = useRef<NodeJS.Timeout | null>(null);

  const [challengeTarget, setChallengeTarget] = useState<FriendEntry | null>(null);
  const [challengeTrack, setChallengeTrack]   = useState("dsa");
  const [challengeMode, setChallengeMode]     = useState<"casual" | "ranked">("casual");
  const [challengeSending, setChallengeSending] = useState(false);
  const [challengeSent, setChallengeSent]       = useState(false);

  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/friends/list");
    const data = await res.json();
    setFriends(data.friends ?? []);
    setIncoming(data.incoming ?? []);
    setOutgoing(data.outgoing ?? []);
    setLoading(false);
  }, []);

  const loadChallenges = useCallback(async () => {
    const { data } = await supabase
      .from("challenges")
      .select("id, challenger_id, track, mode, expires_at, challenger:profiles!challenges_challenger_id_fkey(display_name, username)")
      .eq("challenged_id", currentUserId)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString());

    setPendingChallenges(
      (data ?? []).map((c) => {
        const ch = c.challenger as unknown as { display_name: string; username: string };
        return {
          id: c.id,
          challenger_id: c.challenger_id,
          challenger_name: ch?.display_name ?? "Someone",
          challenger_username: ch?.username ?? "",
          track: c.track,
          mode: c.mode,
          expires_at: c.expires_at,
        };
      })
    );
  }, [currentUserId, supabase]);

  useEffect(() => { loadData(); loadChallenges(); }, [loadData, loadChallenges]);

  useEffect(() => {
    const channel = supabase
      .channel("incoming-challenges")
      .on("postgres_changes", { event: "*", schema: "public", table: "challenges", filter: `challenged_id=eq.${currentUserId}` }, () => loadChallenges())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, loadChallenges, supabase]);

  useEffect(() => {
    const channel = supabase
      .channel("sent-challenges")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "challenges", filter: `challenger_id=eq.${currentUserId}` }, (payload) => {
        const row = payload.new as { status: string; match_id: string };
        if (row.status === "accepted" && row.match_id) router.push(`/arena/${row.match_id}`);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, router, supabase]);

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    const q = search.trim();
    if (!q) { setSearchResult(null); return; }
    setSearchLoading(true);
    searchDebounce.current = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, college")
        .eq("username", q.toLowerCase().replace(/^@/, ""))
        .maybeSingle();
      if (!data || data.id === currentUserId) {
        setSearchResult("not_found");
      } else {
        const { data: rating } = await supabase
          .from("user_ratings")
          .select("elo, tier")
          .eq("user_id", data.id)
          .eq("track", "dsa")
          .maybeSingle();
        setSearchResult({ ...data, friendship_id: "", elo: rating?.elo ?? 800, tier: rating?.tier ?? "unrated" });
      }
      setSearchLoading(false);
    }, 500);
  }, [search, currentUserId, supabase]);

  async function sendRequest(username: string) {
    await fetch("/api/friends/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username }) });
    setSearch(""); setSearchResult(null); loadData();
  }

  async function respondRequest(friendship_id: string, action: "accept" | "decline") {
    await fetch("/api/friends/respond", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ friendship_id, action }) });
    loadData();
  }

  async function sendChallenge() {
    if (!challengeTarget) return;
    setChallengeSending(true);
    const res = await fetch("/api/challenges/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ challenged_id: challengeTarget.id, track: challengeTrack, mode: challengeMode }) });
    setChallengeSending(false);
    if (res.ok) setChallengeSent(true);
  }

  async function respondChallenge(challenge_id: string, action: "accept" | "decline") {
    const res = await fetch("/api/challenges/respond", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ challenge_id, action }) });
    const data = await res.json();
    if (data.match_id) router.push(`/arena/${data.match_id}`);
    else loadChallenges();
  }

  function copyInviteLink() {
    navigator.clipboard.writeText(`${window.location.origin}/invite/${referralCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function isFriendOrPending(id: string) {
    return friends.some(f => f.id === id) || incoming.some(f => f.id === id) || outgoing.some(f => f.id === id);
  }

  const tabs = [
    { id: "friends",  label: "FRIENDS",  count: friends.length },
    { id: "requests", label: "REQUESTS", count: incoming.length },
    { id: "find",     label: "FIND",     count: null },
  ] as const;

  return (
    <div className="min-h-screen" style={{ background: "var(--ink-1)", position: "relative", overflow: "hidden" }}>
      <div className="ax-aura pointer-events-none"
        style={{ width: 500, height: 350, background: "var(--violet-700)", top: 56, right: -80, opacity: 0.13 }} />

      <div className="max-w-2xl mx-auto px-4 pt-20 pb-12 relative">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-xl px-5 py-4 mb-5"
          style={{ background: "var(--ink-2)", border: "1px solid var(--ink-4)" }}>
          <div className="ax-dotgrid" style={{ position: "absolute", inset: 0, opacity: 0.2 }} />
          <div className="relative flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-cond text-[10px]" style={{ color: "var(--violet-300)", letterSpacing: "0.3em" }}>FRIENDS · 仲間</span>
                <Users className="w-3 h-3" style={{ color: "var(--violet-400)" }} />
              </div>
              <h1 className="font-display" style={{ fontSize: 36, color: "var(--bone)", lineHeight: 1 }}>YOUR DŌJŌ.</h1>
              <p className="font-mono text-xs mt-0.5" style={{ color: "var(--smoke)" }}>@{currentUsername}</p>
            </div>
            <button onClick={copyInviteLink}
              className="flex items-center gap-2 px-3 py-2 rounded-lg font-cond text-[10px] transition-all"
              style={{ border: "1px solid var(--ink-4)", color: copied ? "var(--win)" : "var(--violet-300)", letterSpacing: "0.15em" }}>
              {copied ? <><CheckCheck className="w-3.5 h-3.5" />COPIED!</> : <><Copy className="w-3.5 h-3.5" />COPY INVITE</>}
            </button>
          </div>
        </motion.div>

        {/* Pending challenges */}
        <AnimatePresence>
          {pendingChallenges.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="mb-4 space-y-2">
              {pendingChallenges.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 p-4 rounded-xl"
                  style={{ border: "1px solid rgba(249,115,22,0.3)", background: "rgba(249,115,22,0.06)" }}>
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4 shrink-0" style={{ color: "#f97316" }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--bone)" }}>
                        <span style={{ color: "#f97316" }}>@{c.challenger_username}</span> challenged you!
                      </p>
                      <p className="font-cond text-[9px] mt-0.5" style={{ color: "var(--smoke)", letterSpacing: "0.12em" }}>
                        {TRACK_LABELS[c.track]} · {c.mode === "ranked" ? "RANKED" : "CASUAL"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => respondChallenge(c.id, "accept")}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-cond text-[9px] font-semibold text-white transition-colors"
                      style={{ background: "linear-gradient(180deg, var(--violet-500), var(--violet-700))", letterSpacing: "0.15em" }}>
                      <Swords className="w-3 h-3" /> ACCEPT
                    </button>
                    <button onClick={() => respondChallenge(c.id, "decline")}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg transition-colors"
                      style={{ border: "1px solid var(--ink-4)", color: "var(--smoke)" }}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="flex gap-1 mb-4 p-1 rounded-xl"
          style={{ background: "var(--ink-2)", border: "1px solid var(--ink-4)" }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-cond text-[10px] transition-all"
              style={{
                background: tab === t.id ? "rgba(124,58,237,0.15)" : "transparent",
                color: tab === t.id ? "var(--bone)" : "var(--smoke)",
                border: tab === t.id ? "1px solid rgba(139,92,246,0.3)" : "1px solid transparent",
                letterSpacing: "0.2em",
              }}>
              {t.label}
              {t.count !== null && t.count > 0 && (
                <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{ background: t.id === "requests" ? "rgba(249,115,22,0.2)" : "rgba(124,58,237,0.2)", color: t.id === "requests" ? "#f97316" : "var(--violet-300)" }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </motion.div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {tab === "friends" && (
            <motion.div key="friends" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--violet-400)" }} /></div>
              ) : friends.length === 0 ? (
                <EmptyState icon={Users} text="No friends yet" sub="Use the FIND tab to add people" />
              ) : (
                <div className="space-y-2">
                  {friends.map((f) => (
                    <FriendRow key={f.id} f={f}>
                      <button
                        onClick={() => { setChallengeTarget(f); setChallengeMode("casual"); setChallengeTrack("dsa"); setChallengeSent(false); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-cond text-[9px] font-semibold transition-colors shrink-0"
                        style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(139,92,246,0.3)", color: "var(--violet-300)", letterSpacing: "0.15em" }}>
                        <Swords className="w-3 h-3" /> CHALLENGE
                      </button>
                    </FriendRow>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {tab === "requests" && (
            <motion.div key="requests" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {incoming.length > 0 && (
                <div>
                  <p className="font-cond text-[9px] mb-2" style={{ color: "var(--smoke)", letterSpacing: "0.25em" }}>INCOMING</p>
                  <div className="space-y-2">
                    {incoming.map((f) => (
                      <FriendRow key={f.id} f={f}>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => respondRequest(f.friendship_id, "accept")}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg font-cond text-[9px] font-semibold transition-colors"
                            style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)", color: "var(--win)", letterSpacing: "0.12em" }}>
                            <Check className="w-3 h-3" /> ACCEPT
                          </button>
                          <button onClick={() => respondRequest(f.friendship_id, "decline")}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg transition-colors"
                            style={{ border: "1px solid var(--ink-4)", color: "var(--smoke)" }}>
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </FriendRow>
                    ))}
                  </div>
                </div>
              )}
              {outgoing.length > 0 && (
                <div>
                  <p className="font-cond text-[9px] mb-2" style={{ color: "var(--smoke)", letterSpacing: "0.25em" }}>SENT</p>
                  <div className="space-y-2">
                    {outgoing.map((f) => (
                      <FriendRow key={f.id} f={f}>
                        <span className="flex items-center gap-1.5 font-cond text-[9px] shrink-0" style={{ color: "var(--smoke)", letterSpacing: "0.12em" }}>
                          <Clock className="w-3 h-3" /> PENDING
                        </span>
                      </FriendRow>
                    ))}
                  </div>
                </div>
              )}
              {incoming.length === 0 && outgoing.length === 0 && !loading && (
                <EmptyState icon={UserPlus} text="No pending requests" sub="Search for players to add as friends" />
              )}
            </motion.div>
          )}

          {tab === "find" && (
            <motion.div key="find" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--smoke)" }} />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by @username…"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm focus:outline-none transition-all font-cond"
                  style={{ background: "var(--ink-2)", border: "1px solid var(--ink-4)", color: "var(--bone)", letterSpacing: "0.06em" }}
                />
              </div>
              {searchLoading && (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--violet-400)" }} /></div>
              )}
              {!searchLoading && searchResult === "not_found" && (
                <p className="font-cond text-center py-10" style={{ color: "var(--void)", letterSpacing: "0.18em", fontSize: 11 }}>NO WARRIOR FOUND</p>
              )}
              {!searchLoading && searchResult && searchResult !== "not_found" && (() => {
                const alreadyConnected = isFriendOrPending(searchResult.id);
                return (
                  <FriendRow f={searchResult}>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link href={`/profile/${searchResult.username}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-cond text-[9px] transition-colors"
                        style={{ border: "1px solid var(--ink-4)", color: "var(--ash)", letterSpacing: "0.12em" }}>
                        PROFILE
                      </Link>
                      {alreadyConnected ? (
                        <span className="text-[9px] font-cond flex items-center gap-1" style={{ color: "var(--smoke)", letterSpacing: "0.12em" }}>
                          <Check className="w-3 h-3" style={{ color: "var(--win)" }} />
                          {friends.some(f => f.id === searchResult.id) ? "FRIENDS" : "PENDING"}
                        </span>
                      ) : (
                        <button onClick={() => sendRequest(searchResult.username)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-cond text-[9px] font-semibold transition-colors"
                          style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(139,92,246,0.3)", color: "var(--violet-300)", letterSpacing: "0.12em" }}>
                          <UserPlus className="w-3 h-3" /> ADD
                        </button>
                      )}
                    </div>
                  </FriendRow>
                );
              })()}
              {!search && <EmptyState icon={Search} text="Search by username" sub="Type an exact @username to find a player" />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Challenge modal */}
      <AnimatePresence>
        {challengeTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
            onClick={() => { setChallengeTarget(null); setChallengeSent(false); }}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="ax-card ax-ticks w-full max-w-sm p-6">
              {challengeSent ? (
                <div className="text-center py-4">
                  <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(139,92,246,0.3)" }}>
                    <Swords className="w-8 h-8" style={{ color: "var(--violet-300)" }} />
                  </div>
                  <h3 className="font-display text-xl mb-1" style={{ color: "var(--bone)" }}>CHALLENGE SENT!</h3>
                  <p className="text-sm" style={{ color: "var(--ash)" }}>
                    Waiting for <span style={{ color: "var(--violet-300)" }}>@{challengeTarget.username}</span> to accept…
                  </p>
                  <p className="font-cond text-[9px] mt-2" style={{ color: "var(--smoke)", letterSpacing: "0.15em" }}>
                    YOU&apos;LL BE REDIRECTED AUTOMATICALLY
                  </p>
                  <button onClick={() => { setChallengeTarget(null); setChallengeSent(false); }}
                    className="mt-5 w-full py-2 rounded-xl font-cond text-[10px] transition-colors"
                    style={{ border: "1px solid var(--ink-4)", color: "var(--smoke)", letterSpacing: "0.18em" }}>
                    CLOSE
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-display text-lg" style={{ color: "var(--bone)" }}>
                      CHALLENGE <span style={{ color: "var(--violet-300)" }}>@{challengeTarget.username.toUpperCase()}</span>
                    </h3>
                    <button onClick={() => setChallengeTarget(null)} style={{ color: "var(--smoke)" }}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mb-4">
                    <p className="font-cond text-[9px] mb-2" style={{ color: "var(--smoke)", letterSpacing: "0.25em" }}>MODE</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(["casual", "ranked"] as const).map((m) => (
                        <button key={m} onClick={() => setChallengeMode(m)}
                          className="py-2.5 rounded-xl font-cond text-[10px] border transition-all capitalize"
                          style={{
                            background: challengeMode === m ? "rgba(124,58,237,0.15)" : "var(--ink-3)",
                            border: `1px solid ${challengeMode === m ? "rgba(139,92,246,0.5)" : "var(--ink-4)"}`,
                            color: challengeMode === m ? "var(--violet-300)" : "var(--smoke)",
                            letterSpacing: "0.15em",
                          }}>
                          {m === "ranked" ? "⚡ RANKED" : "🎮 CASUAL"}
                        </button>
                      ))}
                    </div>
                    {challengeMode === "ranked" && (
                      <p className="font-cond text-[9px] mt-1.5" style={{ color: "#f97316", letterSpacing: "0.12em" }}>ELO CHANGES APPLY</p>
                    )}
                    {challengeMode === "casual" && (
                      <p className="font-cond text-[9px] mt-1.5" style={{ color: "var(--smoke)", letterSpacing: "0.12em" }}>NO ELO CHANGE</p>
                    )}
                  </div>

                  <div className="mb-5">
                    <p className="font-cond text-[9px] mb-2" style={{ color: "var(--smoke)", letterSpacing: "0.25em" }}>TRACK</p>
                    <div className="grid grid-cols-2 gap-2">
                      {TRACKS.map((t) => {
                        const locked = t !== "dsa";
                        return (
                          <button key={t} onClick={() => !locked && setChallengeTrack(t)}
                            disabled={locked}
                            className="relative py-2 rounded-xl font-cond text-[10px] border transition-all"
                            style={{
                              background: locked ? "var(--ink-3)" : challengeTrack === t ? "rgba(124,58,237,0.15)" : "var(--ink-3)",
                              border: `1px solid ${locked ? "var(--ink-4)" : challengeTrack === t ? "rgba(139,92,246,0.5)" : "var(--ink-4)"}`,
                              color: locked ? "var(--void)" : challengeTrack === t ? "var(--violet-300)" : "var(--smoke)",
                              letterSpacing: "0.12em",
                              cursor: locked ? "not-allowed" : "pointer",
                            }}>
                            <span className="flex items-center justify-center gap-1.5">
                              {locked && <Lock className="w-3 h-3" />}
                              {TRACK_LABELS[t]}
                            </span>
                            {locked && (
                              <span className="absolute -top-1.5 -right-1.5 font-cond text-[7px] px-1 py-0.5 rounded"
                                style={{ background: "var(--ink-4)", color: "var(--void)", letterSpacing: "0.1em" }}>
                                SOON
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button onClick={sendChallenge} disabled={challengeSending}
                    className="w-full py-3 rounded-xl font-cond text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-70"
                    style={{ background: "linear-gradient(180deg, var(--violet-500), var(--violet-700))", color: "#fff", letterSpacing: "0.18em", border: "1px solid rgba(196,181,253,0.3)" }}>
                    {challengeSending
                      ? <><Loader2 className="w-4 h-4 animate-spin" />SENDING…</>
                      : <><Swords className="w-4 h-4" />SEND CHALLENGE</>}
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FriendRow({ f, children }: { f: FriendEntry; children?: React.ReactNode }) {
  const charImg = tierToCharImg(f.tier);
  const tInfo   = TIER_LABELS[f.tier] ?? TIER_LABELS.unrated;
  return (
    <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl transition-colors"
      style={{ background: "var(--ink-2)", border: "1px solid var(--ink-4)" }}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="shrink-0" style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", background: "#111" }}>
          <Image src={charImg} alt="" width={32} height={32}
            style={{ objectFit: "contain", filter: "invert(1)", pointerEvents: "none", userSelect: "none" }}
            draggable={false} placeholder="blur" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display text-sm" style={{ color: "var(--bone)" }}>{f.display_name.toUpperCase()}</span>
            <span className="font-cond text-[8px] px-1.5 py-0.5 rounded shrink-0"
              style={{ background: `${tInfo.color}15`, color: tInfo.color, border: `1px solid ${tInfo.color}30`, letterSpacing: "0.1em" }}>
              {tInfo.label.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono text-[10px]" style={{ color: "var(--smoke)" }}>@{f.username}</span>
            <span className="font-mono text-[10px]" style={{ color: "var(--violet-200)" }}>{f.elo} ELO</span>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

function EmptyState({ icon: Icon, text, sub }: { icon: React.ElementType; text: string; sub: string }) {
  return (
    <div className="py-16 text-center">
      <Icon className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--void)" }} />
      <p className="font-display text-lg" style={{ color: "var(--ash)" }}>{text.toUpperCase()}</p>
      <p className="font-cond text-[10px] mt-1" style={{ color: "var(--smoke)", letterSpacing: "0.18em" }}>{sub.toUpperCase()}</p>
    </div>
  );
}
