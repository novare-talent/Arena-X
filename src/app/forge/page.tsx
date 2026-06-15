import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PRO_FEATURES_FREE } from "@/lib/featureFlags";
import ForgeClient from "./ForgeClient";

export const dynamic = "force-dynamic";

export default async function ForgePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: weeks }, { data: profile }, { data: subs }] = await Promise.all([
    supabase
      .from("forge_challenges")
      .select("id, week_number, track, title, skill_forced, difficulty, is_pro_only, status, starts_at, closes_at, submission_formats")
      .order("week_number", { ascending: true }),
    supabase.from("profiles").select("is_pro, pro_expires_at").eq("id", user.id).single(),
    supabase
      .from("forge_submissions")
      .select("challenge_id, judge_status, overall_score, rank_in_week, elo_delta")
      .eq("user_id", user.id),
  ]);

  const now = new Date();
  const isPro = !!(profile?.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at) > now)) || PRO_FEATURES_FREE;

  const subsByChallenge = new Map<string, NonNullable<typeof subs>[number]>();
  for (const s of subs ?? []) subsByChallenge.set(s.challenge_id, s);

  const weeksWithSub = (weeks ?? []).map((w) => ({
    ...w,
    mySubmission: subsByChallenge.get(w.id) ?? null,
  }));

  return <ForgeClient weeks={weeksWithSub} isPro={isPro} />;
}
