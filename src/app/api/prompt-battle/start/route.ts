import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch today's daily task first
  const today = new Date().toISOString().split("T")[0];
  const { data: dailyTask } = await supabase
    .from("prompt_tasks")
    .select("*")
    .eq("is_daily", true)
    .eq("daily_date", today)
    .single();

  // Pick 3 random tasks (excluding today's daily if present)
  const { data: allTasks } = await supabase
    .from("prompt_tasks")
    .select("*")
    .eq("is_active", true)
    .neq("is_daily", true);

  if (!allTasks || allTasks.length < 3) {
    return NextResponse.json({ error: "Not enough tasks in the bank" }, { status: 500 });
  }

  // Shuffle and pick 3, ensuring domain variety
  const shuffled = allTasks.sort(() => Math.random() - 0.5);
  const picked: typeof allTasks = [];
  const usedDomains = new Set<string>();

  for (const task of shuffled) {
    if (picked.length >= 3) break;
    if (!usedDomains.has(task.domain)) {
      picked.push(task);
      usedDomains.add(task.domain);
    }
  }

  // Fill up to 3 if domain uniqueness couldn't be satisfied
  for (const task of shuffled) {
    if (picked.length >= 3) break;
    if (!picked.find((p) => p.id === task.id)) {
      picked.push(task);
    }
  }

  const taskIds = picked.map((t) => t.id);

  // Create session
  const { data: session, error } = await supabase
    .from("prompt_sessions")
    .insert({
      user_id: user.id,
      model: "gpt-4o-mini",
      task_ids: taskIds,
    })
    .select("id")
    .single();

  if (error || !session) {
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }

  return NextResponse.json({
    session_id: session.id,
    tasks: picked,
    daily_task: dailyTask ?? null,
  });
}
