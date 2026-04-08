import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SoloArena from "@/components/arena/SoloArena";

export const metadata = { title: "Solo Mode — Arena X" };

export default async function SoloPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Pick a random DSA problem
  const { data: problems } = await supabase
    .from("problems")
    .select("id, title, description, difficulty, topics, test_cases, time_limit_ms")
    .eq("track", "dsa")
    .order("id");

  if (!problems || problems.length === 0) {
    redirect("/arena");
  }

  const problem = problems[Math.floor(Math.random() * problems.length)];

  return <SoloArena problem={problem} />;
}