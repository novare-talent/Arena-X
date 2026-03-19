"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Users, UserPlus, Search, Swords, Check, X,
  Clock, Crown, Copy, CheckCheck, Loader2, Bell,
} from "lucide-react";

const TIER_CONFIG: Record<string, { color: string; label: string }> = {
  unrated:  { color: "#5a5a7a", label: "Unrated"  },
  bronze:   { color: "#cd7f32", label: "Bronze"   },
  silver:   { color: "#c0c0c0", label: "Silver"   },
  gold:     { color: "#ffd700", label: "Gold"     },
  platinum: { color: "#22d3ee", label: "Platinum" },
  diamond:  { color: "#a855f7", label: "Diamond"  },
};

function tierFromElo(elo: number) {
  if (elo >= 1700) return "diamond";
  if (elo >= 1500) return "platinum";
  if (elo >= 1300) return "gold";
  if (elo >= 1100) return "silver";
  if (elo >= 900)  return "bronze";
  return "unrated";
}

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

  // Search
  const [search, setSearch]               = useState("");
  const [searchResult, setSearchResult]   = useState<FriendEntry | null | "not_found">(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounce = useRef<NodeJS.Timeout | null>(null);

  // Challenge modal
  const [challengeTarget, setChallengeTarget] = useState<FriendEntry | null>(null);
  const [challengeTrack, setChallengeTrack]   = useState("dsa");
  const [challengeMode, setChallengeMode]     = useState<"casual" | "ranked">("casual");
  const [challengeSending, setChallengeSending] = useState(false);
  const [challengeSent, setChallengeSent]       = useState(false);

  // Copy invite link
  const [copied, setCopied] = useState(false);

  // ── Load friend data ─────────────────────────────────────────────────────
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

  useEffect(() => {
    loadData();
    loadChallenges();
  }, [loadData, loadChallenges]);

  // ── Realtime: incoming challenges ────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("incoming-challenges")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "challenges",
        filter: `challenged_id=eq.${currentUserId}`,
      }, () => loadChallenges())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, loadChallenges, supabase]);

  // ── Realtime: watch for challenge acceptance (challenger side) ───────────
  useEffect(() => {
    const channel = supabase
      .channel("sent-challenges")
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "challenges",
        filter: `challenger_id=eq.${currentUserId}`,
      }, (payload) => {
        const row = payload.new as { status: string; match_id: string };
        if (row.status === "accepted" && row.match_id) {
          router.push(`/arena/${row.match_id}`);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, router, supabase]);

  // ── Search ───────────────────────────────────────────────────────────────
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

  // ── Actions ──────────────────────────────────────────────────────────────
  async function sendRequest(username: string) {
    await fetch("/api/friends/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    setSearch("");
    setSearchResult(null);
    loadData();
  }

  async function respondRequest(friendship_id: string, action: "accept" | "decline") {
    await fetch("/api/friends/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendship_id, action }),
    });
    loadData();
  }

  async function sendChallenge() {
    if (!challengeTarget) return;
    setChallengeSending(true);
    const res = await fetch("/api/challenges/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challenged_id: challengeTarget.id, track: challengeTrack, mode: challengeMode }),
    });
    setChallengeSending(false);
    if (res.ok) setChallengeSent(true);
  }

  async function respondChallenge(challenge_id: string, action: "accept" | "decline") {
    const res = await fetch("/api/challenges/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challenge_id, action }),
    });
    const data = await res.json();
    if (data.match_id) router.push(`/arena/${data.match_id}`);
    else loadChallenges();
  }

  function copyInviteLink() {
    const url = `${window.location.origin}/invite/${referralCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  function isFriendOrPending(id: string) {
    return (
      friends.some((f) => f.id === id) ||
      incoming.some((f) => f.id === id) ||
      outgoing.some((f) => f.id === id)
    );
  }

  const tabs = [
    { id: "friends",  label: "Friends",  count: friends.length },
    { id: "requests", label: "Requests", count: incoming.length },
    { id: "find",     label: "Find",     count: null },
  ] as const;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen grid-bg px-4 py-10">
      <div className="orb orb-purple w-80 h-80 top-0 right-0 opacity-10" />

      <div className="max-w-2xl mx-auto relative z-10">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-3xl font-bold text-white">Friends</h1>
              <p className="text-[#5a5a7a] text-sm mt-1">@{currentUsername}</p>
            </div>
            {/* Invite link */}
            <button
              onClick={copyInviteLink}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#2a2a3a] text-sm text-[#a1a1b5] hover:border-[#6366f1]/40 hover:text-white transition-all"
            >
              {copied ? <CheckCheck className="w-4 h-4 text-[#22c55e]" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy invite link"}
            </button>
          </div>
        </motion.div>

        {/* Pending challenges banner */}
        <AnimatePresence>
          {pendingChallenges.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-4 space-y-2"
            >
              {pendingChallenges.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-[#f97316]/30 bg-[#f97316]/8"
                >
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-[#f97316] shrink-0" />
                    <div>
                      <p className="text-sm text-white font-medium">
                        <span className="text-[#f97316]">@{c.challenger_username}</span> challenged you!
                      </p>
                      <p className="text-xs text-[#5a5a7a]">
                        {TRACK_LABELS[c.track]} · {c.mode === "ranked" ? "Ranked" : "Casual"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => respondChallenge(c.id, "accept")}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#6366f1] hover:bg-[#4f46e5] transition-colors"
                    >
                      <Swords className="w-3 h-3" /> Accept
                    </button>
                    <button
                      onClick={() => respondChallenge(c.id, "decline")}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-[#5a5a7a] hover:text-red-400 border border-[#2a2a3a] hover:border-red-500/30 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="flex gap-1 mb-4 bg-[#111118] border border-[#2a2a3a] rounded-xl p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.id
                  ? "bg-[#6366f1]/15 text-white border border-[#6366f1]/25"
                  : "text-[#5a5a7a] hover:text-[#a1a1b5]"
              }`}
            >
              {t.label}
              {t.count !== null && t.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  t.id === "requests" ? "bg-[#f97316]/20 text-[#f97316]" : "bg-[#6366f1]/20 text-[#818cf8]"
                }`}>{t.count}</span>
              )}
            </button>
          ))}
        </motion.div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {/* ── Friends tab ── */}
          {tab === "friends" && (
            <motion.div key="friends" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-[#6366f1] animate-spin" /></div>
              ) : friends.length === 0 ? (
                <EmptyState icon={Users} text="No friends yet" sub="Use the Find tab to add people" />
              ) : (
                <div className="space-y-2">
                  {friends.map((f) => {
                    const tier = tierFromElo(f.elo);
                    const cfg  = TIER_CONFIG[tier];
                    return (
                      <FriendRow key={f.id} f={{ ...f, tier }} cfg={cfg}>
                        <button
                          onClick={() => { setChallengeTarget(f); setChallengeMode("casual"); setChallengeTrack("dsa"); setChallengeSent(false); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#6366f1]/15 border border-[#6366f1]/30 hover:bg-[#6366f1]/25 transition-colors shrink-0"
                        >
                          <Swords className="w-3.5 h-3.5" /> Challenge
                        </button>
                      </FriendRow>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Requests tab ── */}
          {tab === "requests" && (
            <motion.div key="requests" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {incoming.length > 0 && (
                <div>
                  <p className="text-xs text-[#5a5a7a] uppercase tracking-wider font-medium mb-2">Incoming</p>
                  <div className="space-y-2">
                    {incoming.map((f) => {
                      const tier = tierFromElo(f.elo);
                      const cfg  = TIER_CONFIG[tier];
                      return (
                        <FriendRow key={f.id} f={{ ...f, tier }} cfg={cfg}>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => respondRequest(f.friendship_id, "accept")}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#22c55e]/15 border border-[#22c55e]/30 hover:bg-[#22c55e]/25 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5 text-[#22c55e]" /> Accept
                            </button>
                            <button
                              onClick={() => respondRequest(f.friendship_id, "decline")}
                              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-[#5a5a7a] hover:text-red-400 border border-[#2a2a3a] hover:border-red-500/30 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </FriendRow>
                      );
                    })}
                  </div>
                </div>
              )}

              {outgoing.length > 0 && (
                <div>
                  <p className="text-xs text-[#5a5a7a] uppercase tracking-wider font-medium mb-2">Sent</p>
                  <div className="space-y-2">
                    {outgoing.map((f) => {
                      const tier = tierFromElo(f.elo);
                      const cfg  = TIER_CONFIG[tier];
                      return (
                        <FriendRow key={f.id} f={{ ...f, tier }} cfg={cfg}>
                          <span className="flex items-center gap-1.5 text-xs text-[#5a5a7a] shrink-0">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        </FriendRow>
                      );
                    })}
                  </div>
                </div>
              )}

              {incoming.length === 0 && outgoing.length === 0 && !loading && (
                <EmptyState icon={UserPlus} text="No pending requests" sub="Search for players to add as friends" />
              )}
            </motion.div>
          )}

          {/* ── Find tab ── */}
          {tab === "find" && (
            <motion.div key="find" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a7a]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by @username…"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#111118] border border-[#2a2a3a] text-white placeholder-[#5a5a7a] text-sm focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-all"
                />
              </div>

              {searchLoading && (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-[#6366f1] animate-spin" /></div>
              )}

              {!searchLoading && searchResult === "not_found" && (
                <div className="py-10 text-center text-[#5a5a7a] text-sm">No user found with that username</div>
              )}

              {!searchLoading && searchResult && searchResult !== "not_found" && (() => {
                const tier = tierFromElo(searchResult.elo);
                const cfg  = TIER_CONFIG[tier];
                const alreadyConnected = isFriendOrPending(searchResult.id);
                return (
                  <FriendRow f={{ ...searchResult, tier }} cfg={cfg}>
                    {alreadyConnected ? (
                      <span className="text-xs text-[#5a5a7a] flex items-center gap-1 shrink-0">
                        <Check className="w-3 h-3 text-[#22c55e]" /> {friends.some(f => f.id === searchResult.id) ? "Friends" : "Pending"}
                      </span>
                    ) : (
                      <button
                        onClick={() => sendRequest(searchResult.username)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#6366f1]/15 border border-[#6366f1]/30 hover:bg-[#6366f1]/25 transition-colors shrink-0"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Add Friend
                      </button>
                    )}
                  </FriendRow>
                );
              })()}

              {!search && (
                <EmptyState icon={Search} text="Search by username" sub="Type an exact @username to find a player" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Challenge modal ── */}
      <AnimatePresence>
        {challengeTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
            onClick={() => { setChallengeTarget(null); setChallengeSent(false); }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[#111118] border border-[#2a2a3a] rounded-2xl p-6"
            >
              {challengeSent ? (
                <div className="text-center py-4">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-[#6366f1]/15 border border-[#6366f1]/30 flex items-center justify-center mb-4">
                    <Swords className="w-8 h-8 text-[#818cf8]" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Challenge sent!</h3>
                  <p className="text-sm text-[#5a5a7a]">
                    Waiting for <span className="text-[#818cf8]">@{challengeTarget.username}</span> to accept…
                  </p>
                  <p className="text-xs text-[#5a5a7a] mt-2">You&apos;ll be redirected automatically when they accept.</p>
                  <button
                    onClick={() => { setChallengeTarget(null); setChallengeSent(false); }}
                    className="mt-5 w-full py-2 rounded-xl text-sm text-[#5a5a7a] border border-[#2a2a3a] hover:text-white transition-colors"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-base font-bold text-white">
                      Challenge <span className="text-[#818cf8]">@{challengeTarget.username}</span>
                    </h3>
                    <button onClick={() => setChallengeTarget(null)} className="text-[#5a5a7a] hover:text-white transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Mode */}
                  <div className="mb-4">
                    <p className="text-xs text-[#5a5a7a] uppercase tracking-wider font-medium mb-2">Mode</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(["casual", "ranked"] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setChallengeMode(m)}
                          className={`py-2.5 rounded-xl text-sm font-medium border transition-all capitalize ${
                            challengeMode === m
                              ? "bg-[#6366f1]/20 border-[#6366f1] text-[#818cf8]"
                              : "bg-[#0d0d15] border-[#2a2a3a] text-[#5a5a7a] hover:border-[#3a3a4a]"
                          }`}
                        >
                          {m === "ranked" ? "⚡ Ranked" : "🎮 Casual"}
                        </button>
                      ))}
                    </div>
                    {challengeMode === "ranked" && (
                      <p className="text-xs text-[#f97316] mt-1.5">ELO changes apply after this match</p>
                    )}
                    {challengeMode === "casual" && (
                      <p className="text-xs text-[#5a5a7a] mt-1.5">No ELO change — just for fun</p>
                    )}
                  </div>

                  {/* Track */}
                  <div className="mb-5">
                    <p className="text-xs text-[#5a5a7a] uppercase tracking-wider font-medium mb-2">Track</p>
                    <div className="grid grid-cols-2 gap-2">
                      {TRACKS.map((t) => (
                        <button
                          key={t}
                          onClick={() => setChallengeTrack(t)}
                          className={`py-2 rounded-xl text-sm font-medium border transition-all ${
                            challengeTrack === t
                              ? "bg-[#22d3ee]/10 border-[#22d3ee]/50 text-[#22d3ee]"
                              : "bg-[#0d0d15] border-[#2a2a3a] text-[#5a5a7a] hover:border-[#3a3a4a]"
                          }`}
                        >
                          {TRACK_LABELS[t]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={sendChallenge}
                    disabled={challengeSending}
                    className="w-full py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-70"
                    style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
                  >
                    {challengeSending
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                      : <><Swords className="w-4 h-4" /> Send Challenge</>
                    }
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

// ── Shared sub-components ────────────────────────────────────────────────────

function FriendRow({
  f,
  cfg,
  children,
}: {
  f: FriendEntry;
  cfg: { color: string; label: string };
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-3.5 bg-[#111118] border border-[#2a2a3a] rounded-2xl hover:border-[#6366f1]/20 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-sm font-bold text-white"
          style={{ background: `linear-gradient(135deg, ${cfg.color}50, ${cfg.color}20)`, border: `1px solid ${cfg.color}40` }}
        >
          {f.display_name[0]?.toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white truncate">{f.display_name}</span>
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-medium capitalize shrink-0"
              style={{ background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}30` }}
            >
              {cfg.label}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-[#5a5a7a]">@{f.username}</span>
            <span className="text-xs text-[#a1a1b5] font-medium">
              <Crown className="w-2.5 h-2.5 inline mr-0.5 text-[#ffd700]" />{f.elo}
            </span>
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
      <Icon className="w-10 h-10 text-[#2a2a3a] mx-auto mb-3" />
      <p className="text-[#a1a1b5] font-medium">{text}</p>
      <p className="text-[#5a5a7a] text-sm mt-1">{sub}</p>
    </div>
  );
}