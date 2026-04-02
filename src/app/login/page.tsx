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

  async function handleOAuth(provider: "google" | "github") {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
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
            <p className="text-base font-semibold tracking-widest uppercase mb-5 inline-flex items-center gap-2">
              <span className="w-6 h-px bg-gradient-to-r from-transparent to-[#6366f1]" />
              <span style={{ background: "linear-gradient(90deg, #818cf8, #22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                A product by Novare Talent
              </span>
              <span className="w-6 h-px bg-gradient-to-l from-transparent to-[#22d3ee]" />
            </p>
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
              <span className="text-2xl font-bold text-white relative">
                Arena<span className="text-[#6366f1]">X</span>
                <span className="absolute -top-2 -right-8 text-[9px] font-bold px-1 py-0.5 rounded bg-[#6366f1] text-white leading-none tracking-wide">BETA</span>
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

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#2a2a3a]" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-[#0d0d15] px-3 text-xs text-[#5a5a7a]">or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleOAuth("google")}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-[#a1a1b5] border border-[#2a2a3a] hover:border-[#3a3a4a] hover:text-white hover:bg-[#1a1a24] transition-all"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Google
                </button>
                <button
                  type="button"
                  onClick={() => handleOAuth("github")}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-[#a1a1b5] border border-[#2a2a3a] hover:border-[#3a3a4a] hover:text-white hover:bg-[#1a1a24] transition-all"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
                  GitHub
                </button>
              </div>

              <div className="relative my-5">
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