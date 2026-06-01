import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AgentLearnClient from "@/components/learn/AgentLearnClient";

export const metadata = { title: "Agentic Learning — ArenaX" };

export default async function AgentLearnPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <AgentLearnClient />;
}
