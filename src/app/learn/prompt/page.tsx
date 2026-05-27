import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PromptLearnClient from "@/components/learn/PromptLearnClient";
import { PRO_FEATURES_FREE } from "@/lib/featureFlags";

export const metadata = { title: "AI Prompting Track — ArenaX" };

export default async function PromptLearnPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_pro")
    .eq("id", user.id)
    .single();

  const isPro = (profile?.is_pro ?? false) || PRO_FEATURES_FREE;

  // Fetch modules + exercises
  const { data: modules } = await supabase
    .from("prompt_modules")
    .select(`
      id, title, description, sort_order, is_free,
      prompt_exercises (
        id, title, guide_markdown, sort_order,
        prompt_tasks ( id, goal, input_material, domain, difficulty )
      )
    `)
    .order("sort_order");

  // Fetch user's exercise progress
  const { data: progressRows } = await supabase
    .from("prompt_exercise_progress")
    .select("exercise_id, best_score, completed")
    .eq("user_id", user.id);

  const progressMap: Record<string, { best_score: number; completed: boolean }> = {};
  for (const row of progressRows ?? []) {
    progressMap[row.exercise_id] = { best_score: row.best_score, completed: row.completed };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedModules = (modules ?? []) as any;

  return (
    <PromptLearnClient
      modules={typedModules}
      progressMap={progressMap}
      isPro={isPro}
      userId={user.id}
    />
  );
}
