import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AgentLearnClient from "@/components/learn/AgentLearnClient";
import { PRO_FEATURES_FREE } from "@/lib/featureFlags";

export const metadata = { title: "Agentic Learning — ArenaX" };

export default async function AgentLearnPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_pro")
    .eq("id", user.id)
    .single();

  const isPro = (profile?.is_pro ?? false) || PRO_FEATURES_FREE;

  return <AgentLearnClient isPro={isPro} />;
}
