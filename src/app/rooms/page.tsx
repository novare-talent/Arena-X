import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import RoomsClient from "@/components/rooms/RoomsClient";

export default async function RoomsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", user.id)
    .single();

  return <RoomsClient userId={user.id} displayName={profile?.display_name ?? profile?.username ?? "Challenger"} />;
}