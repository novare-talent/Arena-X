import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import BattleHub from "@/components/battle/BattleHub";

export const metadata = { title: "Battle Hub — ArenaX" };

export default async function BattlePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single();

  const { data: rating } = await supabase
    .from("user_ratings")
    .select("elo, tier, wins, losses")
    .eq("user_id", user.id)
    .eq("track", "dsa")
    .single();

  return <BattleHub profile={profile} rating={rating} />;
}