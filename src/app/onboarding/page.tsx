import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import OnboardingClient from "@/components/onboarding/OnboardingClient";

export const metadata = { title: "Welcome to Arena X" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, college, country, onboarding_completed")
    .eq("id", user.id)
    .single();

  // Already onboarded — go to dashboard
  if (profile?.onboarding_completed) redirect("/dashboard");

  return (
    <OnboardingClient
      userId={user.id}
      username={profile?.username ?? ""}
      displayName={profile?.display_name ?? ""}
      college={profile?.college ?? ""}
      country={profile?.country ?? ""}
    />
  );
}