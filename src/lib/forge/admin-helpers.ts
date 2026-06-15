// Server-side shared helpers used by the admin endpoints AND the cron routes.
// Keep the "open a week", "close + judge a week" logic here so both surfaces
// stay in lock-step.

import { createAdminClient } from "@/lib/supabase/admin";
import { judgeSubmission } from "@/lib/forge/judge";
import { extractArtifactText } from "@/lib/forge/extract";
import { computeWeeklyEloDeltas } from "@/lib/forge/elo";
import { weekStart, weekClose } from "@/lib/forge/schedule";

export interface OpenResult {
  ok: boolean;
  opened_week?: number;
  starts_at?: string;
  closes_at?: string;
  skipped?: string;
}

/**
 * Flip a specific week to 'active'. Idempotent: if already active/closed/judging,
 * returns a skipped result.
 *
 * Two modes:
 *  - cron path (`startNow: false`, the default): uses the calendar-scheduled
 *    start/close from schedule.ts — correct because cron only fires once the
 *    scheduled Monday has actually arrived.
 *  - admin path (`startNow: true`): the week starts NOW and closes 7 days
 *    later (or `forceCloseInMinutes` from now if set, for testing).
 *    Admins can open any week regardless of its calendar slot.
 */
export async function openWeek(
  weekNumber: number,
  opts: { startNow?: boolean; forceCloseInMinutes?: number } = {},
): Promise<OpenResult> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("forge_challenges")
    .select("id, week_number, status")
    .eq("week_number", weekNumber)
    .single();
  if (!existing) return { ok: false, skipped: `week ${weekNumber} not seeded` };
  if (existing.status === "active" || existing.status === "judging" || existing.status === "closed") {
    return { ok: true, skipped: `week ${weekNumber} already ${existing.status}` };
  }

  let starts: Date;
  let closes: Date;
  if (opts.startNow) {
    starts = new Date();
    closes = opts.forceCloseInMinutes != null
      ? new Date(starts.getTime() + opts.forceCloseInMinutes * 60_000)
      // Standard 7-day window from the moment admin opens it (Sun 21:30 IST
      // semantics don't apply when admin force-opens off-schedule).
      : new Date(starts.getTime() + 7 * 24 * 60 * 60 * 1000);
  } else {
    starts = weekStart(weekNumber);
    closes = opts.forceCloseInMinutes != null
      ? new Date(Date.now() + opts.forceCloseInMinutes * 60_000)
      : weekClose(weekNumber);
  }

  const { error } = await admin
    .from("forge_challenges")
    .update({ status: "active", starts_at: starts.toISOString(), closes_at: closes.toISOString() })
    .eq("id", existing.id);
  if (error) return { ok: false, skipped: error.message };
  return { ok: true, opened_week: weekNumber, starts_at: starts.toISOString(), closes_at: closes.toISOString() };
}

export interface LockResult {
  ok: boolean;
  locked_week?: number;
  skipped?: string;
  error?: string;
}

/**
 * Reverse-open: flip an 'active' or 'judging' week back to 'scheduled' so it
 * looks locked again on the public surface. Use cases: admin opened the wrong
 * week, opened too many at once, or wants to redo a test cycle.
 *
 * Ordering rule (enforced): you can only lock week N if every week with a
 * higher week_number is already 'scheduled'. So if you've opened weeks 1, 2,
 * and 3, you must lock 3 first, then 2, then 1 — same shape as the natural
 * Monday-by-Monday roll-out, just reversed.
 *
 * Safety:
 *  - Submissions are NOT deleted (learner work is preserved).
 *  - If a snapshot row exists (= Elo was applied) we refuse without an
 *    explicit `force: true`. Reversing applied Elo is a separate concern.
 *  - With force=true we wipe the snapshot rows + clear rank/elo_delta on
 *    submissions but still don't reverse user_ratings.elo — that has to be
 *    a deliberate, separately-audited operation.
 */
export async function lockWeek(
  weekNumber: number,
  opts: { force?: boolean } = {},
): Promise<LockResult> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("forge_challenges")
    .select("id, week_number, status")
    .eq("week_number", weekNumber)
    .single();
  if (!existing) return { ok: false, skipped: `week ${weekNumber} not seeded` };
  if (existing.status === "scheduled") {
    return { ok: true, skipped: `week ${weekNumber} already scheduled` };
  }

  // Ordering check: any later week not scheduled blocks us.
  const { data: laterOpen } = await admin
    .from("forge_challenges")
    .select("week_number, status")
    .gt("week_number", weekNumber)
    .neq("status", "scheduled");
  if ((laterOpen ?? []).length > 0) {
    const list = (laterOpen ?? []).map((w) => `W${w.week_number} (${w.status})`).join(", ");
    return {
      ok: false,
      error: `Cannot lock week ${weekNumber} while later weeks are open: ${list}. Lock those first.`,
    };
  }

  // Snapshot-applied check
  const { count: snapCount } = await admin
    .from("forge_leaderboard_snapshots")
    .select("user_id", { count: "exact", head: true })
    .eq("challenge_id", existing.id);

  if ((snapCount ?? 0) > 0 && !opts.force) {
    return {
      ok: false,
      error: `Week ${weekNumber} already has ${snapCount} leaderboard snapshot row(s) — Elo was applied. Use force=true to lock anyway (preserves Elo in user_ratings; clears rank/snapshot only).`,
    };
  }

  if (opts.force && (snapCount ?? 0) > 0) {
    await admin.from("forge_leaderboard_snapshots").delete().eq("challenge_id", existing.id);
    await admin.from("forge_submissions")
      .update({ rank_in_week: null, elo_delta: null })
      .eq("challenge_id", existing.id);
  }

  const { error } = await admin
    .from("forge_challenges")
    .update({ status: "scheduled", starts_at: null, closes_at: null })
    .eq("id", existing.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, locked_week: weekNumber };
}

export interface CloseResult {
  ok: boolean;
  closed_week?: number;
  judged?: number;
  ranked?: number;
  error?: string;
}

/**
 * Close + judge + Elo-apply for a specific week. If weekNumber is omitted, picks
 * whichever week is currently 'active'. Idempotent: re-running on a closed week
 * only re-judges pending/failed submissions and re-snapshots if no snapshot exists.
 */
export async function closeAndJudgeWeek(weekNumber?: number): Promise<CloseResult> {
  const admin = createAdminClient();

  const query = admin.from("forge_challenges").select("*");
  const { data: challenge } = weekNumber != null
    ? await query.eq("week_number", weekNumber).single()
    : await query.eq("status", "active").maybeSingle();

  if (!challenge) return { ok: true, error: weekNumber != null ? `week ${weekNumber} not found` : "no active week" };

  if (challenge.status === "active" || challenge.status === "scheduled") {
    await admin.from("forge_challenges").update({ status: "judging" }).eq("id", challenge.id);
  }

  // Judge every pending or failed submission.
  const { data: pending } = await admin
    .from("forge_submissions")
    .select("*")
    .eq("challenge_id", challenge.id)
    .in("judge_status", ["pending", "failed"]);

  let judged = 0;
  for (const sub of pending ?? []) {
    try {
      let bytes: ArrayBuffer | null = null;
      if (sub.artifact_url) {
        const { data: file, error: dlErr } = await admin.storage
          .from("forge-submissions").download(sub.artifact_url);
        if (dlErr) throw new Error(`download failed: ${dlErr.message}`);
        bytes = await file.arrayBuffer();
      }
      const artifactText = await extractArtifactText({
        format: sub.artifact_format, bytes, externalLink: sub.external_link, notes: sub.notes,
      });
      const result = await judgeSubmission(challenge, artifactText);
      await admin.from("forge_submissions").update({
        judge_status: "scored",
        judge_model: result.judge_model,
        rubric_scores: result.rubric_scores,
        overall_score: result.overall_score,
        judge_feedback: result.feedback,
        judge_error: null,
        judged_at: new Date().toISOString(),
      }).eq("id", sub.id);
      judged++;
    } catch (err) {
      await admin.from("forge_submissions").update({
        judge_status: "failed",
        judge_error: String(err).slice(0, 500),
        judged_at: new Date().toISOString(),
      }).eq("id", sub.id);
    }
  }

  // Skip Elo + snapshot if we've already snapshotted this week.
  const { count: snapCount } = await admin
    .from("forge_leaderboard_snapshots")
    .select("user_id", { count: "exact", head: true })
    .eq("challenge_id", challenge.id);

  let ranked = 0;
  if ((snapCount ?? 0) === 0) {
    const { data: scored } = await admin
      .from("forge_submissions")
      .select("user_id, overall_score")
      .eq("challenge_id", challenge.id)
      .eq("judge_status", "scored");

    if ((scored ?? []).length > 0) {
      const userIds = (scored ?? []).map((s) => s.user_id);
      const { data: ratings } = await admin
        .from("user_ratings")
        .select("user_id, elo")
        .eq("track", "forge")
        .in("user_id", userIds);
      const eloByUser = new Map<string, number>();
      for (const r of ratings ?? []) eloByUser.set(r.user_id, r.elo);

      const eloInputs = (scored ?? []).map((s) => ({
        user_id: s.user_id,
        elo: eloByUser.get(s.user_id) ?? 1000,
        overall_score: s.overall_score ?? 0,
      }));
      const deltas = computeWeeklyEloDeltas(eloInputs);

      for (const d of deltas) {
        await admin.rpc("apply_forge_weekly_delta", {
          p_user_id: d.user_id,
          p_elo_change: d.elo_delta,
        });
        await admin.from("forge_submissions").update({
          elo_delta: d.elo_delta,
          rank_in_week: d.rank,
        }).eq("challenge_id", challenge.id).eq("user_id", d.user_id);
        await admin.from("forge_leaderboard_snapshots").upsert({
          challenge_id: challenge.id,
          user_id: d.user_id,
          rank: d.rank,
          overall_score: eloInputs.find((e) => e.user_id === d.user_id)!.overall_score,
          elo_before: d.elo_before,
          elo_after: d.elo_after,
          elo_delta: d.elo_delta,
        });
        ranked++;
      }
    }
  }

  await admin.from("forge_challenges").update({ status: "closed" }).eq("id", challenge.id);

  return { ok: true, closed_week: challenge.week_number, judged, ranked };
}
