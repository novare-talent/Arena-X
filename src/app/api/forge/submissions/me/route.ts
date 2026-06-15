import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("forge_submissions")
    .select("id, challenge_id, judge_status, overall_score, rubric_scores, judge_feedback, rank_in_week, elo_delta, submitted_at, judged_at, forge_challenges(week_number, title, track)")
    .eq("user_id", user.id)
    .order("submitted_at", { ascending: false });

  return NextResponse.json({ submissions: data ?? [] });
}
