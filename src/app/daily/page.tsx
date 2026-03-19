import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DailyClient from "@/components/daily/DailyClient";

export default async function DailyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = new Date().toISOString().split("T")[0];

  // Fetch today's challenge (with problem)
  const { data: todayChallenge } = await supabase
    .from("daily_challenges")
    .select("*, problems(*)")
    .eq("user_id", user.id)
    .eq("date", today)
    .single();

  // Fetch last 90 days for heatmap
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];
  const { data: history } = await supabase
    .from("daily_challenges")
    .select("date, solved, streak_count")
    .eq("user_id", user.id)
    .gte("date", ninetyDaysAgo)
    .order("date", { ascending: false });

  // Current streak = today's streak_count if solved, else yesterday's
  const currentStreak = todayChallenge?.solved
    ? (todayChallenge?.streak_count ?? 0)
    : ((history ?? []).find((h) => h.date !== today && h.solved)?.streak_count ?? 0);

  return (
    <DailyClient
      todayChallenge={todayChallenge}
      history={history ?? []}
      currentStreak={currentStreak}
      today={today}
    />
  );
}