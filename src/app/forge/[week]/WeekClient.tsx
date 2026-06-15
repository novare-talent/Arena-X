"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Lock, CheckCircle2, Clock, AlertCircle, ExternalLink, BookOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { TRACK_META, DIFFICULTY_META } from "@/lib/forge/track-meta";
import type { ForgeChallenge } from "@/lib/forge/challenges";
import SubmissionForm from "@/components/forge/SubmissionForm";

const CP   = "'Copperplate Gothic 32 BC','Copperplate Gothic Bold','Copperplate',var(--font-cinzel,Cinzel),serif";
const BODY = "'DM Sans',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";

interface DbChallenge extends Omit<ForgeChallenge, "rubric"> {
  id: string;
  status: "scheduled" | "active" | "judging" | "closed";
  starts_at: string | null;
  closes_at: string | null;
  reference_solution_url: string | null;
  rubric: ForgeChallenge["rubric"];
}

interface MySubmission {
  id: string;
  artifact_format: string;
  external_link: string | null;
  notes: string | null;
  judge_status: "pending" | "judging" | "scored" | "failed";
  overall_score: number | null;
  rubric_scores: Record<string, number> | null;
  judge_feedback: string | null;
  rank_in_week: number | null;
  elo_delta: number | null;
  submitted_at: string;
  judged_at: string | null;
}

function fmtCountdown(target: string | null): string {
  if (!target) return "";
  const ms = new Date(target).getTime() - Date.now();
  if (ms <= 0) return "closed";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h ${m}m left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

export default function WeekClient({
  challenge, mySubmission, isPro,
}: { challenge: DbChallenge; mySubmission: MySubmission | null; isPro: boolean }) {
  const track = TRACK_META[challenge.track];
  const diff = DIFFICULTY_META[challenge.difficulty];
  const timeLocked = challenge.status === "scheduled";
  const proLocked = challenge.status === "active" && challenge.is_pro_only && !isPro;
  const acceptingSubmissions = challenge.status === "active" && !mySubmission && !proLocked;
  const [refreshKey, setRefreshKey] = useState(0); // bumped after submit to refetch

  return (
    <div style={{ background: "#111", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "60px 32px 60px" }}>
        <Link href="/forge" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#777", fontFamily: BODY, fontSize: 11, textDecoration: "none", letterSpacing: "0.08em", marginBottom: 18 }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> ALL WEEKS
        </Link>

        {/* Title block */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontFamily: MONO, fontSize: 10, color: "#666", letterSpacing: "0.18em" }}>
              WEEK {String(challenge.week_number).padStart(2, "0")} · {track.season}
            </span>
            <span style={{ fontFamily: BODY, fontSize: 8, letterSpacing: "0.16em", padding: "3px 8px", borderRadius: 10, border: `1px solid ${track.color}55`, color: track.color, background: `${track.color}10` }}>
              {track.label.toUpperCase()}
            </span>
            <span style={{ fontFamily: BODY, fontSize: 8, letterSpacing: "0.16em", padding: "3px 8px", borderRadius: 10, border: `1px solid ${diff.color}55`, color: diff.color, background: `${diff.color}10` }}>
              {diff.label.toUpperCase()}
            </span>
            {challenge.is_pro_only && (
              <span style={{ fontFamily: BODY, fontSize: 8, letterSpacing: "0.16em", padding: "3px 8px", borderRadius: 10, border: "1px solid #f59e0b55", color: "#f59e0b", background: "#f59e0b10" }}>
                PRO
              </span>
            )}
          </div>
          <div style={{ fontFamily: CP, fontSize: 38, color: "#fff", letterSpacing: "0.03em", textTransform: "uppercase", lineHeight: 1.05 }}>
            {timeLocked ? `Week ${challenge.week_number} · Locked` : challenge.title}
          </div>
          {!timeLocked && (
            <div style={{ fontFamily: BODY, fontSize: 12, color: "#999", marginTop: 8 }}>
              <strong style={{ color: "#bbb" }}>What this forces:</strong> {challenge.skill_forced}
            </div>
          )}
        </motion.div>

        {/* Status strip */}
        <div style={{ marginTop: 18, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, padding: "10px 14px", borderRadius: 10, background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {challenge.status === "active" && (
              <>
                <Clock style={{ width: 14, height: 14, color: "#34d399" }} />
                <span style={{ fontFamily: MONO, fontSize: 11, color: "#34d399", letterSpacing: "0.08em" }}>
                  LIVE · {fmtCountdown(challenge.closes_at)}
                </span>
              </>
            )}
            {challenge.status === "judging" && (
              <span style={{ fontFamily: MONO, fontSize: 11, color: "#f59e0b", letterSpacing: "0.08em" }}>
                JUDGING — results land Mon
              </span>
            )}
            {challenge.status === "closed" && (
              <span style={{ fontFamily: MONO, fontSize: 11, color: "#777", letterSpacing: "0.08em" }}>
                CLOSED
              </span>
            )}
            {challenge.status === "scheduled" && (
              <span style={{ fontFamily: MONO, fontSize: 11, color: "#555", letterSpacing: "0.08em" }}>
                SCHEDULED — opens on its week
              </span>
            )}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: "#666", letterSpacing: "0.06em" }}>
            Accepts: {challenge.submission_formats.join(" · ")} · max {challenge.max_file_mb}MB
          </div>
        </div>

        {/* Time-locked placeholder — brief/rubric stay hidden until this Monday */}
        {timeLocked && (
          <div style={{ marginTop: 18, padding: "28px 24px", border: "1px solid #2a2a2a", borderRadius: 12, background: "#1a1a1a", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 8 }}>
            <Lock style={{ width: 22, height: 22, color: "#777" }} />
            <div style={{ fontFamily: BODY, fontSize: 13, fontWeight: 600, color: "#ddd" }}>
              This week is still locked.
            </div>
            <div style={{ fontFamily: BODY, fontSize: 12, color: "#888", maxWidth: 440, lineHeight: 1.6 }}>
              Drops go out every Monday 00:00 IST. Until Week {challenge.week_number} unlocks,
              the brief, the rubric, and the submission form are hidden — finish the active week first.
            </div>
            <Link href="/forge" style={{ marginTop: 8, padding: "8px 18px", borderRadius: 8, background: "#fff", color: "#111", fontFamily: BODY, fontSize: 11, fontWeight: 600, textDecoration: "none", letterSpacing: "0.08em" }}>
              ← BACK TO WEEKS
            </Link>
          </div>
        )}

        {/* Pro lock */}
        {!timeLocked && proLocked && (
          <div style={{ marginTop: 18, padding: "20px", border: "1px solid #f59e0b55", borderRadius: 12, background: "#f59e0b08", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Lock style={{ width: 18, height: 18, color: "#f59e0b" }} />
              <div>
                <div style={{ fontFamily: BODY, fontSize: 12, fontWeight: 600, color: "#f59e0b" }}>Pro week</div>
                <div style={{ fontFamily: BODY, fontSize: 11, color: "#aaa", marginTop: 2 }}>
                  Weeks 1–4 are free. From week 5 on, you'll need Pro (₹499/mo) to submit and earn Forge Elo.
                </div>
              </div>
            </div>
            <Link href="/profile" style={{ padding: "8px 18px", borderRadius: 8, background: "#f59e0b", color: "#111", fontFamily: BODY, fontSize: 11, fontWeight: 600, textDecoration: "none", letterSpacing: "0.08em" }}>
              Upgrade
            </Link>
          </div>
        )}

        {!timeLocked && (<>
        {/* Stuck? — directs to the matching season on /learn/agent */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.06 }}
          style={{ marginTop: 16, padding: "14px 18px", border: `1px solid ${track.color}55`, borderRadius: 12, background: `${track.color}0d`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 200 }}>
            <BookOpen style={{ width: 16, height: 16, color: track.color, flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: MONO, fontSize: 9, color: track.color, letterSpacing: "0.18em" }}>
                STUCK? START WITH THE LESSON · {track.season} · {track.label.toUpperCase()}
              </div>
              <div style={{ fontFamily: BODY, fontSize: 11, color: "#bbb", marginTop: 3, lineHeight: 1.5 }}>
                {track.learnHint}
              </div>
            </div>
          </div>
          <Link href={track.learnHref}
            style={{ flexShrink: 0, padding: "8px 16px", borderRadius: 8, background: track.color, color: "#111", fontFamily: BODY, fontSize: 11, fontWeight: 600, textDecoration: "none", letterSpacing: "0.08em" }}>
            GO TO {track.season} →
          </Link>
        </motion.div>

        {/* Brief */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}
          style={{ marginTop: 16, padding: "20px 22px", border: "1px solid #2a2a2a", borderRadius: 12, background: "#1a1a1a" }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: "#666", letterSpacing: "0.18em", marginBottom: 10 }}>THE BUILD</div>
          <div style={{ fontFamily: BODY, fontSize: 13, color: "#ddd", lineHeight: 1.65 }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{challenge.brief}</ReactMarkdown>
          </div>
        </motion.div>

        {/* Rubric */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.18 }}
          style={{ marginTop: 16, padding: "20px 22px", border: "1px solid #2a2a2a", borderRadius: 12, background: "#1a1a1a" }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: "#666", letterSpacing: "0.18em", marginBottom: 12 }}>RUBRIC · how the judge scores you</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {challenge.rubric.map((r) => (
              <div key={r.dimension} style={{ display: "flex", gap: 12, alignItems: "flex-start", paddingBottom: 10, borderBottom: "1px solid #222" }}>
                <div style={{ fontFamily: MONO, fontSize: 11, color: track.color, minWidth: 60, letterSpacing: "0.06em" }}>
                  {Math.round(r.weight * 100)}%
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: BODY, fontSize: 12, fontWeight: 600, color: "#ddd" }}>
                    {r.dimension.replace(/_/g, " ")}
                  </div>
                  <div style={{ fontFamily: BODY, fontSize: 11, color: "#888", marginTop: 3, lineHeight: 1.5 }}>
                    {r.description}
                  </div>
                </div>
                {mySubmission?.rubric_scores?.[r.dimension] != null && (
                  <div style={{ fontFamily: MONO, fontSize: 12, color: "#34d399", minWidth: 50, textAlign: "right" }}>
                    {mySubmission.rubric_scores[r.dimension]}/{r.max_score}
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Your submission status / form */}
        {mySubmission && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.22 }}
            style={{ marginTop: 16, padding: "20px 22px", border: `1px solid ${mySubmission.judge_status === "scored" ? "#34d39955" : "#a78bfa55"}`, borderRadius: 12, background: "#0f1614" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {mySubmission.judge_status === "scored" ? (
                  <CheckCircle2 style={{ width: 16, height: 16, color: "#34d399" }} />
                ) : mySubmission.judge_status === "failed" ? (
                  <AlertCircle style={{ width: 16, height: 16, color: "#f43f5e" }} />
                ) : (
                  <Clock style={{ width: 16, height: 16, color: "#a78bfa" }} />
                )}
                <span style={{ fontFamily: MONO, fontSize: 11, color: "#bbb", letterSpacing: "0.08em" }}>
                  YOUR SUBMISSION · {mySubmission.judge_status.toUpperCase()}
                </span>
              </div>
              {mySubmission.judge_status === "scored" && (
                <div style={{ display: "flex", gap: 14, fontFamily: MONO, fontSize: 11 }}>
                  <span style={{ color: "#bbb" }}>SCORE <span style={{ color: "#34d399" }}>{mySubmission.overall_score}/100</span></span>
                  {mySubmission.rank_in_week != null && <span style={{ color: "#bbb" }}>RANK <span style={{ color: "#34d399" }}>#{mySubmission.rank_in_week}</span></span>}
                  {mySubmission.elo_delta != null && (
                    <span style={{ color: "#bbb" }}>ELO <span style={{ color: mySubmission.elo_delta >= 0 ? "#34d399" : "#f43f5e" }}>{mySubmission.elo_delta >= 0 ? "+" : ""}{mySubmission.elo_delta}</span></span>
                  )}
                </div>
              )}
            </div>
            {mySubmission.judge_feedback && (
              <div style={{ marginTop: 12, fontFamily: BODY, fontSize: 12, color: "#ccc", lineHeight: 1.6 }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{mySubmission.judge_feedback}</ReactMarkdown>
              </div>
            )}
          </motion.div>
        )}

        {acceptingSubmissions && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.28 }}
            style={{ marginTop: 16 }}>
            <SubmissionForm
              challengeId={challenge.id}
              submissionFormats={challenge.submission_formats}
              maxFileMb={challenge.max_file_mb}
              onSubmitted={() => { setRefreshKey((k) => k + 1); window.location.reload(); }}
              key={refreshKey}
            />
          </motion.div>
        )}

        {/* Reference solution accordion (gated until they submit) */}
        {challenge.reference_solution_url && (
          <div style={{ marginTop: 16, padding: "14px 18px", border: "1px solid #2a2a2a", borderRadius: 12, background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: "#666", letterSpacing: "0.18em" }}>REFERENCE SOLUTION</div>
              <div style={{ fontFamily: BODY, fontSize: 12, color: "#aaa", marginTop: 4 }}>
                Last week's winning build, unlocked because you submitted.
              </div>
            </div>
            <a href={challenge.reference_solution_url} target="_blank" rel="noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, background: "#fff", color: "#111", fontFamily: BODY, fontSize: 11, fontWeight: 600, textDecoration: "none", letterSpacing: "0.08em" }}>
              VIEW <ExternalLink style={{ width: 12, height: 12 }} />
            </a>
          </div>
        )}
        </>)}
      </div>
    </div>
  );
}
