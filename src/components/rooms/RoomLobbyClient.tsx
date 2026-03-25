"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Users, Copy, CheckCheck, Play, UserPlus, Loader2, Crown, Clock, Layers, Swords } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const MODE_LABELS: Record<string, string> = {
  standard: "Standard", blitz: "Blitz", sudden_death: "Sudden Death",
  speed_run: "Speed Run", marathon: "Marathon",
};

interface Participant {
  user_id: string;
  status: string;
  profile: { display_name: string; username: string };
}

interface Friend { id: string; display_name: string; username: string }

interface Room {
  id: string; code: string; title: string; mode: string; status: string;
  host_id: string; max_players: number;
  settings: { time_limit_minutes?: number; num_questions?: number; difficulty?: string; topics?: string[] };
}

export default function RoomLobbyClient({
  room: initialRoom, userId, displayName, friends,
}: {
  room: Room;
  userId: string;
  displayName: string;
  friends: Friend[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [room, setRoom] = useState(initialRoom);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const [inviteSent, setInviteSent] = useState<Set<string>>(new Set());
  const [showInvite, setShowInvite] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  void displayName;

  const fetchParticipants = useCallback(async () => {
    const res = await fetch(`/api/rooms/${room.code}`);
    if (!res.ok) return;
    const { participants: p, room: r } = await res.json();
    setParticipants(p ?? []);
    if (r) setRoom(r);
    if (r?.status === "active") router.push(`/rooms/${room.code}/arena`);
  }, [room.code, router]);

  useEffect(() => {
    fetchParticipants();

    // Realtime subscription on rooms table
    const roomSub = supabase
      .channel(`room-lobby-${room.id}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "rooms",
        filter: `id=eq.${room.id}`,
      }, (payload) => {
        const updated = payload.new as Room;
        setRoom(updated);
        if (updated.status === "active") router.push(`/rooms/${room.code}/arena`);
      })
      .on("postgres_changes", {
        event: "*", schema: "public", table: "room_participants",
        filter: `room_id=eq.${room.id}`,
      }, () => { fetchParticipants(); })
      .subscribe();

    // Poll every 3s as fallback
    pollRef.current = setInterval(fetchParticipants, 3000);

    return () => {
      supabase.removeChannel(roomSub);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [room.id, room.code, fetchParticipants, router, supabase]);

  async function startRoom() {
    setStarting(true);
    const res = await fetch(`/api/rooms/${room.code}/start`, { method: "POST" });
    if (!res.ok) {
      const { error } = await res.json();
      alert(error ?? "Failed to start");
      setStarting(false);
    }
    // redirect happens via Realtime
  }

  async function sendInvite(friendId: string) {
    setInviting(friendId);
    await fetch(`/api/rooms/${room.code}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friend_id: friendId }),
    });
    setInviteSent(prev => new Set(prev).add(friendId));
    setInviting(null);
  }

  function copyCode() {
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isHost = room.host_id === userId;
  const canStart = isHost && participants.length >= 2 && room.status === "lobby";
  const alreadyIn = participants.some(p => p.user_id === userId);

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Room card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#111118] border border-[#2a2a3a] rounded-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 border-b border-[#2a2a3a]">
            <div className="flex items-center justify-between mb-1">
              <h1 className="text-lg font-bold text-white truncate">{room.title}</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#6366f1]/15 text-[#818cf8] font-medium">
                {MODE_LABELS[room.mode] ?? room.mode}
              </span>
            </div>
            <p className="text-xs text-[#5a5a7a]">
              {room.settings.num_questions ?? 3} problems · {room.settings.time_limit_minutes ?? 30} min · {room.settings.difficulty ?? "mixed"}
            </p>

            {/* Room code */}
            <button
              onClick={copyCode}
              className="mt-3 flex items-center gap-2 bg-[#0d0d15] border border-[#2a2a3a] rounded-xl px-4 py-2.5 w-full hover:border-[#6366f1]/30 transition-colors group"
            >
              <span className="font-mono text-xl font-bold text-white tracking-[0.3em] flex-1 text-center">{room.code}</span>
              {copied
                ? <CheckCheck className="w-4 h-4 text-[#22c55e]" />
                : <Copy className="w-4 h-4 text-[#5a5a7a] group-hover:text-[#a1a1b5]" />}
            </button>
            <p className="text-[10px] text-[#3a3a5a] text-center mt-1">Share this code to invite players</p>
          </div>

          {/* Room stats */}
          <div className="grid grid-cols-3 divide-x divide-[#1a1a2a] border-b border-[#2a2a3a]">
            {[
              { icon: Layers, label: "Problems", value: room.settings.num_questions ?? 3 },
              { icon: Clock,  label: "Time",     value: `${room.settings.time_limit_minutes ?? 30}m` },
              { icon: Users,  label: "Players",  value: `${participants.length}/${room.max_players}` },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex flex-col items-center py-3 gap-0.5">
                <Icon className="w-3.5 h-3.5 text-[#5a5a7a]" />
                <span className="text-sm font-bold text-white">{value}</span>
                <span className="text-[10px] text-[#5a5a7a]">{label}</span>
              </div>
            ))}
          </div>

          {/* Participants */}
          <div className="p-4">
            <p className="text-xs text-[#5a5a7a] uppercase tracking-wider font-medium mb-3">
              Players Joined ({participants.length}/{room.max_players})
            </p>
            <div className="space-y-2 min-h-[80px]">
              {participants.map((p, i) => (
                <motion.div
                  key={p.user_id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-2.5"
                >
                  <div className="w-7 h-7 rounded-full bg-[#6366f1]/20 border border-[#6366f1]/30 flex items-center justify-center text-xs font-bold text-[#818cf8]">
                    {p.profile.display_name[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm text-white flex-1">{p.profile.display_name}</span>
                  <span className="text-xs text-[#5a5a7a]">@{p.profile.username}</span>
                  {p.user_id === room.host_id && <Crown className="w-3.5 h-3.5 text-[#f59e0b]" />}
                  {p.user_id === userId && <span className="text-[10px] text-[#6366f1]">you</span>}
                </motion.div>
              ))}
              {participants.length === 0 && (
                <p className="text-xs text-[#3a3a5a] text-center py-4">Waiting for players...</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 pt-0 space-y-2">
            {/* Invite friends */}
            {friends.length > 0 && (
              <button
                onClick={() => setShowInvite(!showInvite)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#2a2a3a] text-sm text-[#a1a1b5] hover:border-[#6366f1]/30 hover:text-white transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Invite Friends
              </button>
            )}

            {showInvite && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                className="bg-[#0d0d15] border border-[#2a2a3a] rounded-xl overflow-hidden">
                {friends.map(f => (
                  <div key={f.id} className="flex items-center gap-2 px-3 py-2 border-b border-[#1a1a2a] last:border-0">
                    <div className="w-6 h-6 rounded-full bg-[#2a2a3a] flex items-center justify-center text-xs text-white">
                      {f.display_name[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm text-white flex-1">{f.display_name}</span>
                    <button
                      onClick={() => sendInvite(f.id)}
                      disabled={inviting === f.id || inviteSent.has(f.id)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                        inviteSent.has(f.id) ? "bg-[#22c55e]/10 text-[#22c55e]" : "bg-[#6366f1]/20 text-[#818cf8] hover:bg-[#6366f1]/30"
                      }`}
                    >
                      {inviting === f.id ? <Loader2 className="w-3 h-3 animate-spin" /> : inviteSent.has(f.id) ? "Sent ✓" : "Invite"}
                    </button>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Join button (if not already in) */}
            {!alreadyIn && (
              <button
                onClick={async () => {
                  const res = await fetch(`/api/rooms/${room.code}/join`, { method: "POST" });
                  if (res.ok) fetchParticipants();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: "linear-gradient(135deg, #22d3ee, #0891b2)" }}
              >
                <Swords className="w-4 h-4" /> Join Room
              </button>
            )}

            {/* Start button (host only) */}
            {isHost && (
              <button
                onClick={startRoom}
                disabled={starting || !canStart}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all"
                style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
              >
                {starting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting...</>
                  : <><Play className="w-4 h-4" /> Start Room</>}
              </button>
            )}
            {isHost && !canStart && room.status === "lobby" && (
              <p className="text-xs text-center text-[#5a5a7a]">Need at least 2 players to start</p>
            )}
            {!isHost && alreadyIn && (
              <p className="text-xs text-center text-[#5a5a7a]">Waiting for host to start...</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}