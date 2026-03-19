"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Mail, Zap, CheckCircle2, ArrowLeft, Loader2, XCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
      });
      if (error) {
        setError(error.message);
      } else {
        setSent(true);
      }
    });
  }

  return (
    <div className="min-h-screen grid-bg relative flex items-center justify-center px-4">
      <div className="orb orb-purple w-80 h-80 top-0 left-1/3 opacity-25" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
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
            <AnimatePresence mode="wait">
              {sent ? (
                <motion.div
                  key="sent"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                    style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                    <CheckCircle2 className="w-8 h-8 text-[#22c55e]" />
                  </div>
                  <h2 className="text-xl font-semibold text-white mb-2">Check your email</h2>
                  <p className="text-[#a1a1b5] text-sm mb-6">
                    We sent a password reset link to <span className="text-[#818cf8]">{email}</span>
                  </p>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-sm text-[#6366f1] hover:text-[#818cf8] transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to login
                  </Link>
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="mb-6">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
                      style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
                      <Mail className="w-6 h-6 text-[#818cf8]" />
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-1">Reset your password</h2>
                    <p className="text-[#5a5a7a] text-sm">
                      Enter your email and we&apos;ll send you a reset link.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-[#a1a1b5]">Email address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a7a]" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-[#111118] border border-[#2a2a3a] text-white placeholder-[#5a5a7a] text-sm focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-all"
                        />
                      </div>
                    </div>

                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                        >
                          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                          <p className="text-sm text-red-400">{error}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      type="submit"
                      disabled={isPending}
                      className="w-full py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 btn-glow disabled:opacity-70"
                      style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
                    >
                      {isPending ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                      ) : (
                        "Send reset link"
                      )}
                    </button>
                  </form>

                  <div className="mt-5 text-center">
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-1.5 text-sm text-[#5a5a7a] hover:text-[#a1a1b5] transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back to login
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}