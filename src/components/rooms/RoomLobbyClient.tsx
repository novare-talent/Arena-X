"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Users, Copy, CheckCheck, Play, UserPlus, Loader2, Crown, Clock, Layers, Swords } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import roninImg from "../../../public/images/chars/ronin.png";

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
  const router   = useRouter();
  const supabase = createClient();
  const [room, setRoom]           = useState(initialRoom);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [copied, setCopied]       = useState(false);
  const [starting, setStarting]   = useState(false);
  const [inviting, setInviting]   = useState<string | null>(null);
  const [inviteSent, setInviteSent] = useState<Set<string>>(new Set());
  const [showInvite, setShowInvite] = useState(false);

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

    return () => {
      supabase.removeChannel(roomSub);
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

  const isHost   = room.host_id === userId;
  const canStart = isHost && participants.length >= 2 && room.status === "lobby";
  const alreadyIn = participants.some(p => p.user_id === userId);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 pt-20"
      style={{ background: "var(--ink-1)", position: "relative", overflow: "hidden" }}>
      <div className="ax-aura pointer-events-none"
        style={{ width: 500, height: 400, background: "var(--violet-700)", top: "20%", left: "50%", transform: "translateX(-50%)", opacity: 0.1 }} />

      <div className="w-full max-w-md relative">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="ax-card ax-ticks overflow-hidden"
          style={{ padding: 0 }}
        >
          {/* Header */}
          <div className="p-5" style={{ borderBottom: "1px solid var(--ink-4)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Swords className="w-3 h-3" style={{ color: "var(--violet-400)" }} />
              <span className="font-cond text-[9px]" style={{ color: "var(--violet-300)", letterSpacing: "0.25em" }}>PRIVATE DŌJŌ</span>
            </div>
            <div className="flex items-center justify-between mb-1">
              <h1 className="font-display text-lg truncate" style={{ color: "var(--bone)" }}>{room.title.toUpperCase()}</h1>
              <span className="font-cond text-[9px] px-2 py-0.5 rounded"
                style={{ background: "rgba(124,58,237,0.15)", color: "var(--violet-300)", border: "1px solid rgba(124,58,237,0.3)", letterSpacing: "0.12em" }}>
                {(MODE_LABELS[room.mode] ?? room.mode).toUpperCase()}
              </span>
            </div>
            <p className="font-cond text-[9px]" style={{ color: "var(--smoke)", letterSpacing: "0.1em" }}>
              {room.settings.num_questions ?? 3} PROBLEMS · {room.settings.time_limit_minutes ?? 30} MIN · {(room.settings.difficulty ?? "mixed").toUpperCase()}
            </p>

            {/* Room code */}
            <button
              onClick={copyCode}
              className="mt-3 flex items-center gap-2 rounded-xl px-4 py-2.5 w-full transition-colors group"
              style={{ background: "var(--ink-3)", border: "1px solid var(--ink-4)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,0.3)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--ink-4)"; }}
            >
              <span className="font-mono text-xl font-bold flex-1 text-center"
                style={{ color: "var(--bone)", letterSpacing: "0.3em" }}>{room.code}</span>
              {copied
                ? <CheckCheck className="w-4 h-4" style={{ color: "#22c55e" }} />
                : <Copy className="w-4 h-4" style={{ color: "var(--smoke)" }} />}
            </button>
            <p className="font-cond text-[9px] text-center mt-1" style={{ color: "var(--void)", letterSpacing: "0.1em" }}>
              SHARE CODE TO INVITE PLAYERS
            </p>
          </div>

          {/* Room stats */}
          <div className="grid grid-cols-3" style={{ borderBottom: "1px solid var(--ink-4)" }}>
            {[
              { icon: Layers, label: "PROBLEMS", value: String(room.settings.num_questions ?? 3) },
              { icon: Clock,  label: "TIME",     value: `${room.settings.time_limit_minutes ?? 30}M` },
              { icon: Users,  label: "PLAYERS",  value: `${participants.length}/${room.max_players}` },
            ].map(({ icon: Icon, label, value }, idx) => (
              <div key={label} className="flex flex-col items-center py-3 gap-0.5"
                style={{ borderRight: idx < 2 ? "1px solid var(--ink-4)" : undefined }}>
                <Icon className="w-3.5 h-3.5" style={{ color: "var(--smoke)" }} />
                <span className="font-display text-base" style={{ color: "var(--bone)" }}>{value}</span>
                <span className="font-cond text-[8px]" style={{ color: "var(--void)", letterSpacing: "0.15em" }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Participants */}
          <div className="p-4">
            <p className="font-cond text-[9px] mb-3" style={{ color: "var(--ash)", letterSpacing: "0.22em" }}>
              PLAYERS JOINED ({participants.length}/{room.max_players})
            </p>
            <div className="space-y-2 min-h-[80px]">
              {participants.map((p, i) => {
                return (
                  <motion.div
                    key={p.user_id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-2.5"
                  >
                    <div style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden", background: "#111", flexShrink: 0 }}>
                      <Image src={roninImg} alt="" width={28} height={28}
                        style={{ objectFit: "contain", filter: "invert(1)", pointerEvents: "none", userSelect: "none" }}
                        draggable={false} placeholder="blur" />
                    </div>
                    <span className="text-sm flex-1" style={{ color: "var(--bone)" }}>{p.profile.display_name}</span>
                    <span className="font-mono text-[10px]" style={{ color: "var(--smoke)" }}>@{p.profile.username}</span>
                    {p.user_id === room.host_id && <Crown className="w-3.5 h-3.5" style={{ color: "#f59e0b" }} />}
                    {p.user_id === userId && (
                      <span className="font-cond text-[8px] px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(124,58,237,0.15)", color: "var(--violet-300)", letterSpacing: "0.1em" }}>
                        YOU
                      </span>
                    )}
                  </motion.div>
                );
              })}
              {participants.length === 0 && (
                <p className="font-cond text-[10px] text-center py-4" style={{ color: "var(--void)", letterSpacing: "0.15em" }}>
                  WAITING FOR PLAYERS...
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 pt-0 space-y-2">
            {friends.length > 0 && (
              <button
                onClick={() => setShowInvite(!showInvite)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-cond text-[10px] transition-colors"
                style={{ border: "1px solid var(--ink-4)", color: "var(--ash)", letterSpacing: "0.15em" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,0.3)"; (e.currentTarget as HTMLElement).style.color = "var(--bone)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--ink-4)"; (e.currentTarget as HTMLElement).style.color = "var(--ash)"; }}
              >
                <UserPlus className="w-3.5 h-3.5" /> INVITE FRIENDS
              </button>
            )}

            {showInvite && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                className="rounded-xl overflow-hidden"
                style={{ background: "var(--ink-3)", border: "1px solid var(--ink-4)" }}>
                {friends.map(f => (
                  <div key={f.id} className="flex items-center gap-2 px-3 py-2"
                    style={{ borderBottom: "1px solid var(--ink-4)" }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", overflow: "hidden", background: "#111", flexShrink: 0 }}>
                      <Image src={roninImg} alt="" width={24} height={24}
                        style={{ objectFit: "contain", filter: "invert(1)", pointerEvents: "none", userSelect: "none" }}
                        draggable={false} placeholder="blur" />
                    </div>
                    <span className="text-sm flex-1" style={{ color: "var(--bone)" }}>{f.display_name}</span>
                    <button
                      onClick={() => sendInvite(f.id)}
                      disabled={inviting === f.id || inviteSent.has(f.id)}
                      className="font-cond text-[9px] px-2.5 py-1 rounded-lg transition-all disabled:opacity-60"
                      style={inviteSent.has(f.id)
                        ? { background: "rgba(34,197,94,0.1)", color: "#22c55e", letterSpacing: "0.1em" }
                        : { background: "rgba(124,58,237,0.18)", color: "var(--violet-300)", letterSpacing: "0.1em" }}>
                      {inviting === f.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : inviteSent.has(f.id) ? "SENT ✓" : "INVITE"}
                    </button>
                  </div>
                ))}
              </motion.div>
            )}

            {!alreadyIn && (
              <button
                onClick={async () => {
                  const res = await fetch(`/api/rooms/${room.code}/join`, { method: "POST" });
                  if (res.ok) fetchParticipants();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-cond text-[10px] transition-all"
                style={{ background: "linear-gradient(135deg, #22d3ee, #0891b2)", color: "#0a0a0f", letterSpacing: "0.18em" }}
              >
                <Swords className="w-3.5 h-3.5" /> JOIN ROOM
              </button>
            )}

            {isHost && (
              <button
                onClick={startRoom}
                disabled={starting || !canStart}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-cond text-[10px] disabled:opacity-40 transition-all"
                style={{ background: "linear-gradient(135deg, var(--violet-600), var(--violet-800))", color: "var(--bone)", letterSpacing: "0.18em" }}
              >
                {starting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> STARTING...</>
                  : <><Play className="w-4 h-4" /> START ROOM</>}
              </button>
            )}
            {isHost && !canStart && room.status === "lobby" && (
              <p className="font-cond text-[9px] text-center" style={{ color: "var(--void)", letterSpacing: "0.12em" }}>
                NEED AT LEAST 2 PLAYERS TO START
              </p>
            )}
            {!isHost && alreadyIn && (
              <p className="font-cond text-[9px] text-center" style={{ color: "var(--void)", letterSpacing: "0.12em" }}>
                WAITING FOR HOST TO START...
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
