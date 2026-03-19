import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Zap, Swords, Trophy, ArrowRight } from "lucide-react";

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();

  const { data: referrer } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("referral_code", code.toUpperCase())
    .maybeSingle();

  return (
    <div className="min-h-screen grid-bg relative flex items-center justify-center px-4">
      <div className="orb orb-purple w-96 h-96 top-0 left-1/3 opacity-30" />
      <div className="orb orb-cyan w-72 h-72 bottom-0 right-1/3 opacity-20" />

      <div className="w-full max-w-md text-center relative z-10">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#22d3ee] flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">Arena<span className="text-[#6366f1]">X</span></span>
        </Link>

        <div className="gradient-border rounded-2xl">
          <div className="bg-[#0d0d15] rounded-2xl p-8">
            {referrer ? (
              <>
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#6366f1]/20 to-[#22d3ee]/10 border border-[#6366f1]/30 flex items-center justify-center mb-4">
                  <span className="text-2xl font-bold text-white">{referrer.display_name[0]?.toUpperCase()}</span>
                </div>
                <p className="text-[#5a5a7a] text-sm mb-1">You were invited by</p>
                <p className="text-xl font-bold text-white mb-1">{referrer.display_name}</p>
                <p className="text-[#6366f1] text-sm mb-6">@{referrer.username}</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto rounded-2xl bg-[#6366f1]/15 border border-[#6366f1]/30 flex items-center justify-center mb-4">
                  <Swords className="w-8 h-8 text-[#818cf8]" />
                </div>
                <p className="text-[#5a5a7a] text-sm mb-6">You&apos;ve been invited to join</p>
              </>
            )}

            <h1 className="text-2xl font-bold text-white mb-2">Join ArenaX</h1>
            <p className="text-[#5a5a7a] text-sm mb-8">
              Compete in 1v1 coding battles, climb the ELO leaderboard, and prove your skills.
            </p>

            {/* Feature highlights */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { icon: Swords, label: "1v1 Matches", color: "#6366f1" },
                { icon: Trophy, label: "ELO Ranking", color: "#ffd700" },
                { icon: Zap,    label: "Live Arena",  color: "#22d3ee" },
              ].map(({ icon: Icon, label, color }) => (
                <div key={label} className="bg-[#111118] border border-[#2a2a3a] rounded-xl p-3 text-center">
                  <Icon className="w-5 h-5 mx-auto mb-1" style={{ color }} />
                  <p className="text-xs text-[#a1a1b5]">{label}</p>
                </div>
              ))}
            </div>

            <Link
              href={`/signup?ref=${code.toUpperCase()}`}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-white text-sm btn-glow"
              style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
            >
              Create your account <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/login"
              className="block mt-3 text-sm text-[#5a5a7a] hover:text-[#a1a1b5] transition-colors"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}