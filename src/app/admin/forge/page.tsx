import { createClient } from "@/lib/supabase/server";
import ForgeAdminClient from "./ForgeAdminClient";

export const metadata = { title: "Forge Admin — ArenaX" };
export const dynamic = "force-dynamic";

export default async function ForgeAdminPage() {
  const supabase = await createClient();
  const { data: weeks } = await supabase
    .from("forge_challenges")
    .select("id, week_number, track, title, status, starts_at, closes_at, is_pro_only")
    .order("week_number", { ascending: true });

  // Submission counts per challenge — useful pre-close to know how many will be judged.
  const challengeIds = (weeks ?? []).map((w) => w.id);
  const counts: Record<string, { total: number; scored: number; pending: number; failed: number }> = {};
  if (challengeIds.length) {
    const { data: subs } = await supabase
      .from("forge_submissions")
      .select("challenge_id, judge_status")
      .in("challenge_id", challengeIds);
    for (const s of subs ?? []) {
      counts[s.challenge_id] ??= { total: 0, scored: 0, pending: 0, failed: 0 };
      counts[s.challenge_id].total++;
      if (s.judge_status === "scored") counts[s.challenge_id].scored++;
      else if (s.judge_status === "failed") counts[s.challenge_id].failed++;
      else counts[s.challenge_id].pending++;
    }
  }

  return <ForgeAdminClient weeks={weeks ?? []} counts={counts} />;
}
