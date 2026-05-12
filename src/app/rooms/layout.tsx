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
    <div className="min-h-screen" style={{ background: "var(--ink-1)" }}>
      <Navbar user={user} />
      {children}
    </div>
  );
}