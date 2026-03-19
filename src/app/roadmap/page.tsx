import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import RoadmapClient from "@/components/roadmap/RoadmapClient";

export default async function RoadmapPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch user's roadmap progress
  const { data: progress } = await supabase
    .from("roadmap_progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("track", "dsa");

  // Fetch user's submissions to compute per-topic solve counts
  const { data: submissions } = await supabase
    .from("submissions")
    .select("problem_id, verdict, problems(topics)")
    .eq("user_id", user.id)
    .eq("verdict", "AC");

  // Build topic → solved count map from submissions
  const topicSolvedMap: Record<string, number> = {};
  for (const sub of (submissions ?? [])) {
    const prob = sub.problems as unknown as { topics: string[] } | null;
    if (!prob) continue;
    for (const topic of (prob.topics ?? [])) {
      topicSolvedMap[topic] = (topicSolvedMap[topic] ?? 0) + 1;
    }
  }

  const progressMap: Record<string, { problems_solved: number; problems_required: number; completed_at: string | null }> = {};
  for (const p of (progress ?? [])) {
    progressMap[p.topic] = {
      problems_solved:   p.problems_solved,
      problems_required: p.problems_required,
      completed_at:      p.completed_at,
    };
  }

  return <RoadmapClient progressMap={progressMap} topicSolvedMap={topicSolvedMap} />;
}