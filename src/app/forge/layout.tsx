import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Navbar from "@/components/layout/Navbar";

export const metadata = { title: "Forge Weekly — ArenaX" };

export default async function ForgeLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen" style={{ background: "var(--ink-1, #111)" }}>
      <Navbar user={user} />
      <main className="pt-16">{children}</main>
    </div>
  );
}
