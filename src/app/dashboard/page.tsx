import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/dashboard/DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: rating },
    { count: userCount },
    { count: matchCount },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("user_ratings").select("*").eq("user_id", user.id).eq("track", "dsa").single(),
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("matches").select("*", { count: "exact", head: true }).eq("status", "completed"),
  ]);

  if (!profile || !profile.onboarding_completed) redirect("/onboarding");

  return (
    <DashboardClient
      profile={profile}
      rating={rating}
      totalUsers={userCount ?? 0}
      totalMatches={matchCount ?? 0}
      isPro={profile.is_pro ?? false}
    />
  );
}