import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Custom Rooms" };

export default async function RoomsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar user={user} />
      {children}
    </div>
  );
}