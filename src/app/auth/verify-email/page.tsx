"use client";

import { useState, useTransition, Suspense } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { resendVerification } from "@/app/auth/actions";
import { Mail, Zap, CheckCircle2, RefreshCw, ArrowLeft } from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleResend() {
    if (!email) return;
    setError(null);
    startTransition(async () => {
      const result = await resendVerification(email);
      if (result?.error) {
        setError(result.error);
      } else {
        setResent(true);
        setTimeout(() => setResent(false), 5000);
      }
    });
  }

  return (
    <div className="min-h-screen grid-bg relative flex items-center justify-center px-4">
      <div className="orb orb-purple w-80 h-80 top-0 left-1/3 opacity-30" />
      <div className="orb orb-cyan w-64 h-64 bottom-0 right-1/3 opacity-25" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
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
          <div className="bg-[#0d0d15] rounded-2xl p-8 text-center">
            {/* Animated envelope */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6"
              style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(34,211,238,0.08))", border: "1px solid rgba(99,102,241,0.25)" }}
            >
              <Mail className="w-10 h-10 text-[#818cf8]" />
            </motion.div>

            <h1 className="text-2xl font-bold text-white mb-2">Check your inbox</h1>
            <p className="text-[#a1a1b5] text-sm mb-1">
              We sent a verification link to
            </p>
            {email && (
              <p className="text-[#818cf8] font-medium text-sm mb-6">{email}</p>
            )}
            {!email && (
              <p className="text-[#5a5a7a] text-sm mb-6">your email address</p>
            )}

            {/* Steps */}
            <div className="space-y-3 mb-8 text-left">
              {[
                "Open the email from ArenaX",
                'Click "Verify my email"',
                "You'll be logged in automatically",
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#6366f1]/20 border border-[#6366f1]/30 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-[#818cf8]">{i + 1}</span>
                  </div>
                  <span className="text-sm text-[#a1a1b5]">{step}</span>
                </div>
              ))}
            </div>

            {/* Resent confirmation */}
            {resent && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 mb-4"
              >
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400">Verification email resent!</span>
              </motion.div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Resend button */}
            <button
              onClick={handleResend}
              disabled={isPending || !email}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-[#818cf8] border border-[#2a2a3a] hover:border-[#6366f1]/40 hover:bg-[#6366f1]/5 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`} />
              {isPending ? "Sending…" : "Resend verification email"}
            </button>

            <div className="mt-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm text-[#5a5a7a] hover:text-[#a1a1b5] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to login
              </Link>
            </div>

            <p className="text-xs text-[#5a5a7a] mt-6">
              Didn&apos;t receive it? Check your spam folder, or make sure the email address is correct.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}