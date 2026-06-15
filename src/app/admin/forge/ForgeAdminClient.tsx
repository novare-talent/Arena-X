"use client";

import { useState } from "react";
import Link from "next/link";
import { Settings, Play, Lock, Trophy, AlertCircle, RotateCcw, Undo2 } from "lucide-react";

interface Week {
  id: string;
  week_number: number;
  track: string;
  title: string;
  status: "scheduled" | "active" | "judging" | "closed";
  starts_at: string | null;
  closes_at: string | null;
  is_pro_only: boolean;
}

type Counts = Record<string, { total: number; scored: number; pending: number; failed: number }>;

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#5a5a7a", active: "#22c55e", judging: "#f59e0b", closed: "#3a3a5a",
};

const TRACK_LABEL: Record<string, string> = {
  mental_models: "S0 · Mental Models",
  daily_driver: "S1 · Daily Driver",
  operator_4d: "S2 · 4D Operator",
  agentic_eng: "S3 · Agentic Eng",
};

export default function ForgeAdminClient({ weeks, counts }: { weeks: Week[]; counts: Counts }) {
  const [busy, setBusy] = useState<number | null>(null);
  const [log, setLog] = useState<{ ok: boolean; text: string } | null>(null);

  async function openWeek(weekNumber: number, closeInMinutes?: number) {
    setBusy(weekNumber); setLog(null);
    try {
      const res = await fetch("/api/forge/admin/open-week", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week_number: weekNumber, close_in_minutes: closeInMinutes }),
      });
      const json = await res.json();
      setLog({ ok: res.ok, text: `Open Week ${weekNumber}: ${JSON.stringify(json)}` });
      if (res.ok) setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      setLog({ ok: false, text: String(e) });
    } finally { setBusy(null); }
  }

  async function lockWeek(weekNumber: number, force = false) {
    const msg = force
      ? `Force-lock Week ${weekNumber}? This will wipe its leaderboard snapshot + rank/elo_delta on submissions. Applied Elo on user_ratings is NOT reversed.`
      : `Lock Week ${weekNumber} back to 'scheduled'? Submissions are kept. Cannot lock if any later week is open.`;
    if (!confirm(msg)) return;
    setBusy(weekNumber); setLog(null);
    try {
      const res = await fetch("/api/forge/admin/lock-week", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week_number: weekNumber, force }),
      });
      const json = await res.json();
      setLog({ ok: res.ok, text: `Lock Week ${weekNumber}${force ? " (force)" : ""}: ${JSON.stringify(json)}` });
      if (res.ok) setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      setLog({ ok: false, text: String(e) });
    } finally { setBusy(null); }
  }

  // For each week, determine if it can be locked right now: any later week
  // that is not 'scheduled' blocks the lock.
  const blockedByLater = new Map<number, number[]>();
  for (const w of weeks) {
    const blockers = weeks.filter((x) => x.week_number > w.week_number && x.status !== "scheduled").map((x) => x.week_number);
    blockedByLater.set(w.week_number, blockers);
  }

  async function closeWeek(weekNumber: number) {
    if (!confirm(`Close + judge Week ${weekNumber}? This calls gpt-4o on every submission and applies Elo deltas. Cannot be cleanly undone.`)) return;
    setBusy(weekNumber); setLog(null);
    try {
      const res = await fetch("/api/forge/admin/close-week", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week_number: weekNumber }),
      });
      const json = await res.json();
      setLog({ ok: res.ok, text: `Close Week ${weekNumber}: ${JSON.stringify(json)}` });
      if (res.ok) setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      setLog({ ok: false, text: String(e) });
    } finally { setBusy(null); }
  }

  const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : "—";

  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-20 pb-16 px-4">
      <div className="max-w-6xl mx-auto">

        <div className="flex items-center justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Settings className="w-4 h-4 text-[#6366f1]" />
              <span className="text-xs font-semibold text-[#5a5a7a] uppercase tracking-wider">Admin · Forge Weekly</span>
            </div>
            <h1 className="text-3xl font-bold text-white">Weekly Challenge Control</h1>
            <p className="text-sm text-[#777] mt-1">Open, close, or re-judge any of the 40 weeks. Cron also does this automatically.</p>
          </div>
          <Link href="/admin" className="px-4 py-2 rounded-xl text-sm font-semibold text-[#a78bfa] border border-[#2a2438] hover:bg-[#1a1326]">← Admin home</Link>
        </div>

        {log && (
          <div className={`mb-6 px-4 py-3 rounded-xl border text-sm font-mono ${log.ok ? "border-green-700 bg-green-900/20 text-green-300" : "border-red-700 bg-red-900/20 text-red-300"}`}>
            <div className="flex items-start gap-2">
              {log.ok ? <Trophy className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
              <span className="break-all">{log.text}</span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {weeks.map((w) => {
            const c = counts[w.id] ?? { total: 0, scored: 0, pending: 0, failed: 0 };
            const blockers = blockedByLater.get(w.week_number) ?? [];
            const canLock = (w.status === "active" || w.status === "judging" || w.status === "closed") && blockers.length === 0;
            const wasJudged = w.status === "closed";
            return (
              <div key={w.id} className="bg-[#0d0d15] border border-[#1e1e2e] rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="font-mono text-xs text-[#5a5a7a] w-12 shrink-0">W{String(w.week_number).padStart(2, "0")}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <h3 className="font-bold text-white truncate">{w.title}</h3>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                        style={{ color: STATUS_COLORS[w.status], borderColor: `${STATUS_COLORS[w.status]}40`, background: `${STATUS_COLORS[w.status]}15` }}>
                        {w.status}
                      </span>
                      {w.is_pro_only && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-amber-700 text-amber-400 bg-amber-900/10">PRO</span>}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[#5a5a7a] flex-wrap">
                      <span>{TRACK_LABEL[w.track] ?? w.track}</span>
                      <span>opens {fmt(w.starts_at)}</span>
                      <span>closes {fmt(w.closes_at)}</span>
                      <span className="font-mono">{c.total} subs · {c.scored} scored · {c.pending} pending · {c.failed} failed</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {(w.status === "scheduled") && (
                    <>
                      <button onClick={() => openWeek(w.week_number)} disabled={busy === w.week_number}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-green-700/30 border border-green-600/40 hover:bg-green-700/50 disabled:opacity-50">
                        <Play className="w-3 h-3" /> Open
                      </button>
                      <button onClick={() => openWeek(w.week_number, 10)} disabled={busy === w.week_number}
                        title="Open with a 10-minute close window — useful for testing the full judge loop quickly."
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#a78bfa] bg-[#1a1326] border border-[#2a2438] hover:bg-[#2a1d3a] disabled:opacity-50">
                        Open · 10m test
                      </button>
                    </>
                  )}
                  {(w.status === "active" || w.status === "judging") && (
                    <button onClick={() => closeWeek(w.week_number)} disabled={busy === w.week_number}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-amber-700/30 border border-amber-600/40 hover:bg-amber-700/50 disabled:opacity-50">
                      <Lock className="w-3 h-3" /> Close + judge now
                    </button>
                  )}
                  {(w.status === "closed") && c.pending + c.failed > 0 && (
                    <button onClick={() => closeWeek(w.week_number)} disabled={busy === w.week_number}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#bbb] bg-[#111118] border border-[#2a2a3a] hover:border-[#3a3a4a] disabled:opacity-50">
                      <RotateCcw className="w-3 h-3" /> Re-judge pending
                    </button>
                  )}
                  {(w.status === "active" || w.status === "judging" || w.status === "closed") && (
                    <button
                      onClick={() => lockWeek(w.week_number, wasJudged)}
                      disabled={busy === w.week_number || !canLock}
                      title={
                        !canLock
                          ? `Lock weeks ${blockers.join(", ")} first — you can only lock the highest open week.`
                          : wasJudged
                            ? "Force-lock: wipes snapshot + clears ranks. Applied Elo on user_ratings is preserved."
                            : "Lock back to scheduled. Submissions are kept."
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#bbb] bg-[#111118] border border-[#2a2a3a] hover:border-[#3a3a4a] disabled:opacity-40 disabled:cursor-not-allowed">
                      <Undo2 className="w-3 h-3" /> Lock{wasJudged ? " (force)" : ""}
                    </button>
                  )}
                  <Link href={`/forge/${w.week_number}`} target="_blank"
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#5a5a7a] bg-[#111118] border border-[#2a2a3a] hover:border-[#3a3a4a]">
                    View
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 px-4 py-3 rounded-xl border border-[#1e1e2e] bg-[#0d0d15] text-xs text-[#777] leading-relaxed">
          <strong className="text-[#bbb]">How evaluation works:</strong> When you click <em>Close + judge now</em>, the server downloads every submission's artifact from Supabase Storage, extracts text (pdf-parse for PDFs, unzipper for zips, raw for md/code, URL for link), runs a single gpt-4o judge call per submission against that week's rubric, writes the rubric-weighted overall score (0–100), ranks submitters, applies n-way Elo deltas to the <code>forge</code> track, and snapshots the leaderboard. Idempotent — re-running won't double-apply Elo (snapshot is the lock).
        </div>
      </div>
    </div>
  );
}
