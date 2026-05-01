import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PromptBattle from "@/components/battle/PromptBattle";

export const metadata = { title: "Prompt Battle — ArenaX" };

export default async function PromptBattlePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, is_pro")
    .eq("id", user.id)
    .single();

  return (
    <PromptBattle
      userId={user.id}
      isPro={profile?.is_pro ?? false}
      displayName={profile?.display_name ?? "Challenger"}
    />
  );
}
