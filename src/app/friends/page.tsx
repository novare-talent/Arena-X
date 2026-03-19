import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import FriendsClient from "@/components/friends/FriendsClient";

export default async function FriendsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, referral_code")
    .eq("id", user.id)
    .single();

  return (
    <FriendsClient
      currentUserId={user.id}
      currentUsername={profile?.username ?? ""}
      referralCode={profile?.referral_code ?? ""}
    />
  );
}