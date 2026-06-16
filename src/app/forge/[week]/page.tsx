import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { PRO_FEATURES_FREE } from "@/lib/featureFlags";
import WeekClient from "./WeekClient";

export const dynamic = "force-dynamic";

export default async function WeekPage({ params }: { params: { week: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const week = parseInt(params.week, 10);
  if (!Number.isFinite(week) || week < 1 || week > 40) notFound();

  const { data: challenge } = await supabase
    .from("forge_challenges").select("*").eq("week_number", week).single();
  if (!challenge) notFound();

  const [{ data: profile }, { data: mySubmission }] = await Promise.all([
    supabase.from("profiles").select("is_pro, pro_expires_at").eq("id", user.id).single(),
    supabase
      .from("forge_submissions")
      .select("id, artifact_format, external_link, notes, judge_status, overall_score, rubric_scores, judge_feedback, rank_in_week, elo_delta, submitted_at, judged_at")
      .eq("challenge_id", challenge.id)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const now = new Date();
  const isPro = !!(profile?.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at) > now)) || PRO_FEATURES_FREE;

  // Gate the reference solution behind a submission.
  const safeChallenge = { ...challenge, reference_solution_url: mySubmission ? challenge.reference_solution_url : null };

  return <WeekClient challenge={safeChallenge} mySubmission={mySubmission} isPro={isPro} />;
}
