import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Leaderboard" };

export default async function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return (
    <div className="min-h-screen bg-[#08080f]">
      <Navbar user={user} />
      <main className="pt-16">{children}</main>
    </div>
  );
}