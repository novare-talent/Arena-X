"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, CheckCircle2, Clock, Trophy, CalendarClock } from "lucide-react";
import { TRACK_META, DIFFICULTY_META } from "@/lib/forge/track-meta";
import type { ForgeTrack, ForgeDifficulty } from "@/lib/forge/challenges";

const CP   = "'Copperplate Gothic 32 BC','Copperplate Gothic Bold','Copperplate',var(--font-cinzel,Cinzel),serif";
const BODY = "'DM Sans',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";

interface WeekRow {
  id: string;
  week_number: number;
  track: ForgeTrack;
  title: string;
  skill_forced: string;
  difficulty: ForgeDifficulty;
  is_pro_only: boolean;
  status: "scheduled" | "active" | "judging" | "closed";
  starts_at: string | null;
  closes_at: string | null;
  submission_formats: string[];
  mySubmission: null | {
    judge_status: "pending" | "judging" | "scored" | "failed";
    overall_score: number | null;
    rank_in_week: number | null;
    elo_delta: number | null;
  };
}

function fmtCountdown(target: string | null): string {
  if (!target) return "";
  const ms = new Date(target).getTime() - Date.now();
  if (ms <= 0) return "closed";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

function WeekCard({ w, isPro }: { w: WeekRow; isPro: boolean }) {
  const track = TRACK_META[w.track];
  const diff = DIFFICULTY_META[w.difficulty];

  const active = w.status === "active";
  const judging = w.status === "judging";
  const closed = w.status === "closed";
  const scheduled = w.status === "scheduled";
  const submitted = !!w.mySubmission;
  const scored = w.mySubmission?.judge_status === "scored";

  // A scheduled week is time-locked regardless of Pro status — we don't show
  // the brief, the rubric, or the title's full body until its Monday arrives.
  // Pro gating only matters once a week is LIVE.
  const timeLocked = scheduled;
  const proLocked  = active && w.is_pro_only && !isPro;
  const locked     = timeLocked || proLocked;

  const accent = active ? track.color : "#2a2a2a";
  const titleText = timeLocked ? "Locked" : w.title;

  const inner = (
    <div
      style={{
        position: "relative",
        background: "#1a1a1a",
        border: `1px solid ${accent}${active ? "" : "55"}`,
        borderRadius: 12,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        opacity: timeLocked && !active ? 0.55 : 1,
        cursor: locked ? "default" : "pointer",
        transition: "border-color .15s, transform .15s",
        minHeight: 168,
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: "#666", letterSpacing: "0.18em" }}>
            WEEK {String(w.week_number).padStart(2, "0")} · {track.season}
          </div>
          <div style={{ fontFamily: CP, fontSize: 18, color: timeLocked ? "#555" : "#fff", letterSpacing: "0.03em", textTransform: "uppercase", marginTop: 4, lineHeight: 1.15 }}>
            {titleText}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          <span style={{ fontFamily: BODY, fontSize: 8, letterSpacing: "0.16em", padding: "3px 8px", borderRadius: 10, border: `1px solid ${track.color}55`, color: track.color, background: `${track.color}10` }}>
            {track.label.toUpperCase()}
          </span>
          <span style={{ fontFamily: BODY, fontSize: 8, letterSpacing: "0.16em", padding: "3px 8px", borderRadius: 10, border: `1px solid ${diff.color}55`, color: diff.color, background: `${diff.color}10` }}>
            {diff.label.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Skill line — hidden for time-locked future weeks */}
      {!timeLocked && (
        <div style={{ fontFamily: BODY, fontSize: 11, color: "#888", lineHeight: 1.5 }}>
          {w.skill_forced}
        </div>
      )}

      {/* Status / submission state */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {active && (
            <>
              <Clock style={{ width: 12, height: 12, color: "#34d399" }} />
              <span style={{ fontFamily: MONO, fontSize: 10, color: "#34d399", letterSpacing: "0.08em" }}>
                LIVE · {fmtCountdown(w.closes_at)}
              </span>
            </>
          )}
          {judging && (
            <span style={{ fontFamily: MONO, fontSize: 10, color: "#f59e0b", letterSpacing: "0.08em" }}>
              JUDGING…
            </span>
          )}
          {closed && (
            <>
              <Trophy style={{ width: 12, height: 12, color: "#777" }} />
              <span style={{ fontFamily: MONO, fontSize: 10, color: "#777", letterSpacing: "0.08em" }}>CLOSED</span>
            </>
          )}
          {scheduled && (
            <>
              <CalendarClock style={{ width: 12, height: 12, color: "#555" }} />
              <span style={{ fontFamily: MONO, fontSize: 10, color: "#555", letterSpacing: "0.08em" }}>
                UNLOCKS WEEK {String(w.week_number).padStart(2, "0")}
              </span>
            </>
          )}
        </div>
        {submitted && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <CheckCircle2 style={{ width: 12, height: 12, color: scored ? "#34d399" : "#a78bfa" }} />
            <span style={{ fontFamily: MONO, fontSize: 10, color: scored ? "#34d399" : "#a78bfa", letterSpacing: "0.08em" }}>
              {scored ? `${w.mySubmission!.overall_score}/100${w.mySubmission!.elo_delta != null ? ` · ${w.mySubmission!.elo_delta >= 0 ? "+" : ""}${w.mySubmission!.elo_delta} elo` : ""}` : "SUBMITTED"}
            </span>
          </div>
        )}
      </div>

      {/* Overlay: time lock takes precedence over Pro lock */}
      {timeLocked && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(10,10,10,0.55)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12, pointerEvents: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, background: "rgba(0,0,0,0.85)", border: "1px solid #2a2a2a", fontFamily: BODY, fontSize: 10, color: "#777", letterSpacing: "0.14em" }}>
            <Lock style={{ width: 12, height: 12 }} />
            UNLOCKS WEEK {w.week_number}
          </div>
        </div>
      )}
      {proLocked && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(10,10,10,0.78)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, background: "rgba(0,0,0,0.85)", border: "1px solid #2a2a2a", fontFamily: BODY, fontSize: 10, color: "#f59e0b", letterSpacing: "0.14em" }}>
            <Lock style={{ width: 12, height: 12 }} />
            PRO REQUIRED
          </div>
        </div>
      )}
    </div>
  );

  if (timeLocked) {
    // Not navigable yet — render as a static div.
    return <div>{inner}</div>;
  }
  if (proLocked) {
    return (
      <Link href="/profile" style={{ textDecoration: "none", display: "block" }}>
        {inner}
      </Link>
    );
  }
  return (
    <Link href={`/forge/${w.week_number}`} style={{ textDecoration: "none", display: "block" }}>
      {inner}
    </Link>
  );
}

export default function ForgeClient({ weeks, isPro }: { weeks: WeekRow[]; isPro: boolean }) {
  const liveWeek = weeks.find((w) => w.status === "active");

  return (
    <div style={{ background: "#111", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "70px 32px 60px" }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div style={{ fontFamily: BODY, fontSize: 10, letterSpacing: "0.2em", color: "#777", textTransform: "uppercase", marginBottom: 6 }}>
            Weekly Challenge · 鍛
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontFamily: CP, fontSize: 48, fontWeight: 700, color: "#fff", lineHeight: 1, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                FORGE
              </div>
              <div style={{ fontFamily: BODY, fontSize: 12, color: "#777", marginTop: 6 }}>
                40 weeks. 10 challenges per track. One drop a week. LLM-judged. Forge Elo, leaderboard, the lot.
              </div>
            </div>
            <Link href="/forge/leaderboard"
              style={{ padding: "8px 16px", borderRadius: 8, background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#bbb", fontFamily: BODY, fontSize: 11, textDecoration: "none", letterSpacing: "0.08em" }}>
              FORGE LEADERBOARD →
            </Link>
          </div>
        </motion.div>

        {/* Live banner */}
        {liveWeek && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}
            style={{ marginTop: 24, padding: "16px 20px", background: `${TRACK_META[liveWeek.track].color}10`, border: `1px solid ${TRACK_META[liveWeek.track].color}55`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 9, color: TRACK_META[liveWeek.track].color, letterSpacing: "0.18em" }}>
                LIVE · WEEK {liveWeek.week_number} · {fmtCountdown(liveWeek.closes_at)}
              </div>
              <div style={{ fontFamily: CP, fontSize: 22, color: "#fff", letterSpacing: "0.03em", textTransform: "uppercase", marginTop: 4 }}>
                {liveWeek.title}
              </div>
              <div style={{ fontFamily: BODY, fontSize: 11, color: "#aaa", marginTop: 4 }}>
                {liveWeek.skill_forced}
              </div>
            </div>
            <Link href={`/forge/${liveWeek.week_number}`}
              style={{ flexShrink: 0, padding: "10px 22px", borderRadius: 8, background: TRACK_META[liveWeek.track].color, color: "#111", fontFamily: BODY, fontSize: 11, fontWeight: 600, textDecoration: "none", letterSpacing: "0.08em" }}>
              {liveWeek.mySubmission ? "VIEW SUBMISSION →" : "ENTER →"}
            </Link>
          </motion.div>
        )}

        {/* Grid */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.16 }}
          style={{ marginTop: 28, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {weeks.map((w) => (
            <WeekCard key={w.id} w={w} isPro={isPro} />
          ))}
        </motion.div>
      </div>
    </div>
  );
}
