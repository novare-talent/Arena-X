"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Eye, EyeOff, Zap, ArrowRight,
  Mail, Lock, XCircle, Loader2,
  Swords, Trophy, Star,
} from "lucide-react";

const MATCH_STATS = [
  { icon: Swords, label: "1v1 Live Battles", color: "#6366f1" },
  { icon: Trophy, label: "ELO Rating System", color: "#ffd700" },
  { icon: Star,   label: "Skill Tiers",       color: "#22d3ee" },
];

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const email    = fd.get("email") as string;
    const password = fd.get("password") as string;

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Surface a friendlier message for unverified emails
      if (error.message.toLowerCase().includes("email not confirmed")) {
        setError("Please verify your email first. Check your inbox for the ArenaX verification link.");
      } else if (error.message.toLowerCase().includes("invalid login")) {
        setError("Incorrect email or password.");
      } else {
        setError(error.message);
      }
      setLoading(false);
      return;
    }

    // Redirect client-side — avoids extra server round-trip
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen grid-bg relative flex lg:items-stretch overflow-hidden">
      <div className="orb orb-purple w-[500px] h-[500px] top-[-100px] left-[-100px] opacity-20" />
      <div className="orb orb-cyan w-96 h-96 bottom-0 right-0 opacity-15" />

      {/* ── Left hero panel ── */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative">
        <div className="radial-glow-top absolute inset-0 pointer-events-none" />

        <Link href="/" className="inline-flex items-center gap-2 z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#22d3ee] flex items-center justify-center shadow-lg">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">
            Arena<span className="text-[#6366f1]">X</span>
          </span>
        </Link>

        <div className="z-10 max-w-sm">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              Compete.<br />
              <span className="shimmer-text">Rank up.</span><br />
              Dominate.
            </h1>
            <p className="text-[#a1a1b5] text-base leading-relaxed mb-8">
              ArenaX is the competitive arena for engineers.
              Battle 1v1, climb the ELO ladder, and prove your skill tier.
            </p>
            <div className="space-y-3">
              {MATCH_STATS.map(({ icon: Icon, label, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <span className="text-sm text-[#c1c1d5] font-medium">{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Floating match card */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="z-10 absolute bottom-24 right-[-30px]"
        >
          <div className="bg-[#111118] border border-[#2a2a3a] rounded-2xl p-4 w-56 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-[#5a5a7a] font-medium">LIVE MATCH</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                <span className="text-xs text-[#22c55e]">Active</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-center">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6366f1] to-[#818cf8] mb-1" />
                <span className="text-xs text-white font-medium">You</span>
                <div className="text-xs text-[#ffd700] mt-0.5">★ Gold</div>
              </div>
              <div className="text-[#5a5a7a] font-bold text-sm">VS</div>
              <div className="text-center">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#22d3ee] to-[#0891b2] mb-1" />
                <span className="text-xs text-white font-medium">Rival</span>
                <div className="text-xs text-[#22d3ee] mt-0.5">◆ Plat</div>
              </div>
            </div>
            <div className="mt-3 bg-[#1a1a24] rounded-lg p-2">
              <div className="text-xs text-[#5a5a7a] mb-1">ELO at stake</div>
              <div className="text-sm font-bold text-white">+28 / -18</div>
            </div>
          </div>
        </motion.div>

        <div className="z-10 border-t border-[#2a2a3a] pt-6">
          <p className="text-sm text-[#5a5a7a] italic">
            &quot;The best engineers practice under pressure.&quot;
          </p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#22d3ee] flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">
                Arena<span className="text-[#6366f1]">X</span>
              </span>
            </Link>
          </div>

          <div className="gradient-border rounded-2xl">
            <div className="bg-[#0d0d15] rounded-2xl p-8">
              <div className="mb-7">
                <h2 className="text-xl font-semibold text-white">Welcome back</h2>
                <p className="text-[#5a5a7a] text-sm mt-1">Sign in to continue to your arena</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[#a1a1b5]">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a7a]" />
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-[#111118] border border-[#2a2a3a] text-white placeholder-[#5a5a7a] text-sm focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-[#a1a1b5]">Password</label>
                    <Link href="/auth/forgot-password"
                      className="text-xs text-[#6366f1] hover:text-[#818cf8] transition-colors">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a7a]" />
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Your password"
                      autoComplete="current-password"
                      className="w-full pl-9 pr-10 py-2.5 rounded-lg bg-[#111118] border border-[#2a2a3a] text-white placeholder-[#5a5a7a] text-sm focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-all"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a5a7a] hover:text-[#a1a1b5] transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                    >
                      <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-400">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 btn-glow transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Signing in…</>
                  ) : (
                    <>Enter the Arena<ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#2a2a3a]" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-[#0d0d15] px-3 text-xs text-[#5a5a7a]">New here?</span>
                </div>
              </div>

              <Link href="/signup"
                className="block w-full py-2.5 rounded-xl text-center text-sm font-medium text-[#818cf8] border border-[#2a2a3a] hover:border-[#6366f1]/40 hover:bg-[#6366f1]/5 transition-all">
                Create a free account
              </Link>
            </div>
          </div>

          <p className="text-center text-xs text-[#5a5a7a] mt-6">
            Trusted by engineers at IITs, NITs, and top startups
          </p>
        </motion.div>
      </div>
    </div>
  );
}