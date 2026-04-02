import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Trophy, Clock, Lock } from "lucide-react";

export const metadata: Metadata = { title: "Contests — Arena X" };

export default async function ContestsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-[#08080f] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-3xl bg-[#6366f1]/10 border border-[#6366f1]/20 flex items-center justify-center mx-auto mb-6">
          <Trophy className="w-10 h-10 text-[#818cf8]" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Contests</h1>
        <p className="text-[#5a5a7a] mb-8">
          Weekly rated contests with prizes and leaderboard glory are coming soon. Stay sharp.
        </p>

        <div className="bg-[#0d0d15] border border-[#1e1e2e] rounded-2xl p-5 mb-8 text-left space-y-3">
          {[
            "Weekly rated contests",
            "Live leaderboard during contest",
            "ELO boost for top finishers",
            "Problem sets across all tracks",
          ].map(f => (
            <div key={f} className="flex items-center gap-3 text-sm text-[#5a5a7a]">
              <Lock className="w-4 h-4 text-[#3a3a5a] shrink-0" />
              {f}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-[#3a3a5a] mb-6">
          <Clock className="w-3.5 h-3.5" />
          Coming soon
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-[#a1a1b5] border border-[#2a2a3a] hover:border-[#3a3a4a] hover:text-white transition-all"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}