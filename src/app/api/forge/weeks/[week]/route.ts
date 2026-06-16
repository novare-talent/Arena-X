import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PRO_FEATURES_FREE } from "@/lib/featureFlags";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: { week: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const week = parseInt(ctx.params.week, 10);
  if (!Number.isFinite(week) || week < 1 || week > 40) {
    return NextResponse.json({ error: "Invalid week" }, { status: 400 });
  }

  const { data: challenge } = await supabase
    .from("forge_challenges")
    .select("*")
    .eq("week_number", week)
    .single();

  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_pro, pro_expires_at")
    .eq("id", user.id)
    .single();

  const now = new Date();
  const isPro = !!(profile?.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at) > now)) || PRO_FEATURES_FREE;

  const { data: mySubmission } = await supabase
    .from("forge_submissions")
    .select("id, artifact_url, artifact_format, external_link, notes, judge_status, overall_score, rubric_scores, judge_feedback, rank_in_week, elo_delta, submitted_at, judged_at")
    .eq("challenge_id", challenge.id)
    .eq("user_id", user.id)
    .maybeSingle();

  // Reference solution: gated until the learner has submitted.
  const referenceUrl = mySubmission ? challenge.reference_solution_url : null;

  return NextResponse.json({
    isPro,
    challenge: { ...challenge, reference_solution_url: referenceUrl },
    mySubmission,
  });
}
