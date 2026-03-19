import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfileClient from "@/components/profile/ProfileClient";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const { data: ratings } = await supabase
    .from("user_ratings")
    .select("*")
    .eq("user_id", user.id);

  return (
    <ProfileClient
      profile={profile}
      email={user.email ?? ""}
      ratings={ratings ?? []}
    />
  );
}