import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LearnHub from "@/components/learn/LearnHub";
import { PRO_FEATURES_FREE } from "@/lib/featureFlags";

export const metadata = { title: "Learn — ArenaX" };

export default async function LearnPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, is_pro")
    .eq("id", user.id)
    .single();

  return <LearnHub isPro={(profile?.is_pro ?? false) || PRO_FEATURES_FREE} />;
}
