import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/dashboard/DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // No profile or onboarding not complete → go to onboarding
  if (!profile || !profile.onboarding_completed) {
    redirect("/onboarding");
  }

  // Fetch DSA rating
  const { data: rating } = await supabase
    .from("user_ratings")
    .select("*")
    .eq("user_id", user.id)
    .eq("track", "dsa")
    .single();

  return <DashboardClient profile={profile} rating={rating} />;
}