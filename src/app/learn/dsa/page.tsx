import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DSALearnClient from "@/components/learn/DSALearnClient";

export const metadata = { title: "DSA Track — ArenaX" };

export default async function DSALearnPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: playlists } = await supabase
    .from("learn_playlists")
    .select("*, learn_lessons(*)")
    .eq("track", "dsa")
    .eq("is_active", true)
    .order("sort_order");

  // Fetch user progress
  const { data: progress } = await supabase
    .from("learn_progress")
    .select("lesson_id, completed")
    .eq("user_id", user.id);

  const completedSet = new Set((progress ?? []).filter((p) => p.completed).map((p) => p.lesson_id));

  return (
    <DSALearnClient
      playlists={playlists ?? []}
      completedLessons={Array.from(completedSet)}
      userId={user.id}
    />
  );
}
