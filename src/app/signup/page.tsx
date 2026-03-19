"use client";

import { useState, useTransition, useEffect, useRef, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signUp } from "@/app/auth/actions";
import {
  Eye, EyeOff, Zap, Shield, Trophy, ArrowRight,
  User, Mail, Lock, CheckCircle2, XCircle, Loader2, Inbox,
} from "lucide-react";

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
];

export default function SignupPage() {
  return <Suspense><SignupForm /></Suspense>;
}

function SignupForm() {
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref") ?? "";

  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Real-time username availability check
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (username.length < 3) {
      setUsernameStatus(username.length === 0 ? "idle" : "invalid");
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setUsernameStatus("invalid");
      return;
    }

    setUsernameStatus("checking");
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`);
      const { available } = await res.json();
      setUsernameStatus(available ? "available" : "taken");
    }, 500);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [username]);

  const passwordStrength = PASSWORD_RULES.filter((r) => r.test(password)).length;
  const strengthLabel = ["", "Weak", "Medium", "Strong"][passwordStrength];
  const strengthColor = ["", "#ef4444", "#f59e0b", "#22c55e"][passwordStrength];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    if (formData.get("password") !== formData.get("confirmPassword")) {
      setError("Passwords do not match.");
      return;
    }

    const email = formData.get("email") as string;

    startTransition(async () => {
      const result = await signUp(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        // Show inline success state — redirect happens server-side but
        // we also show it here so the user definitely sees it
        setSubmittedEmail(email);
      }
    });
  }

  // ── Success / Verify email state ──────────────────────────────
  if (submittedEmail) {
    return (
      <div className="min-h-screen grid-bg relative flex items-center justify-center px-4">
        <div className="orb orb-purple w-80 h-80 top-0 left-1/3 opacity-30" />
        <div className="orb orb-cyan w-64 h-64 bottom-0 right-1/3 opacity-25" />

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-md text-center"
        >
          {/* Logo */}
          <Link href="/" className="inline-flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#22d3ee] flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Arena<span className="text-[#6366f1]">X</span></span>
          </Link>

          <div className="gradient-border rounded-2xl">
            <div className="bg-[#0d0d15] rounded-2xl p-10">
              {/* Animated mail icon */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="inline-flex items-center justify-center w-24 h-24 rounded-3xl mb-6 mx-auto"
                style={{
                  background: "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(34,211,238,0.10))",
                  border: "1px solid rgba(99,102,241,0.35)",
                  boxShadow: "0 0 40px rgba(99,102,241,0.2)",
                }}
              >
                <Inbox className="w-12 h-12 text-[#818cf8]" />
              </motion.div>

              <h1 className="text-2xl font-bold text-white mb-2">
                Account created! 🎉
              </h1>
              <p className="text-[#a1a1b5] text-sm mb-2">
                One last step — verify your email to activate your account.
              </p>
              <p className="text-[#6366f1] font-semibold text-sm mb-8">
                {submittedEmail}
              </p>

              {/* Steps */}
              <div className="space-y-3 mb-8 text-left">
                {[
                  { step: "1", text: "Open the email we just sent you" },
                  { step: "2", text: 'Click "Verify my email"' },
                  { step: "3", text: "You'll be logged in and ready to compete!" },
                ].map(({ step, text }) => (
                  <div key={step} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-xs text-[#818cf8]"
                      style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)" }}>
                      {step}
                    </div>
                    <span className="text-sm text-[#a1a1b5]">{text}</span>
                  </div>
                ))}
              </div>

              {/* Note */}
              <div className="flex items-start gap-2 p-3 rounded-xl text-left mb-6"
                style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
                <span className="text-amber-400 text-sm shrink-0">⚠</span>
                <p className="text-xs text-amber-300">
                  Check your <strong>spam / junk folder</strong> if you don&apos;t see it within a minute.
                </p>
              </div>

              <Link
                href="/login"
                className="block w-full py-2.5 rounded-xl text-center text-sm font-medium text-[#818cf8] border border-[#2a2a3a] hover:border-[#6366f1]/40 hover:bg-[#6366f1]/5 transition-all"
              >
                Back to login
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Signup form ───────────────────────────────────────────────
  return (
    <div className="min-h-screen grid-bg relative flex items-center justify-center px-4 py-12">
      {/* Background glows */}
      <div className="orb orb-purple w-96 h-96 top-0 left-1/4 opacity-40" />
      <div className="orb orb-cyan w-72 h-72 bottom-0 right-1/4 opacity-30" />
      <div className="radial-glow-top absolute inset-0 pointer-events-none" />

      {/* Floating tier icons */}
      <motion.div
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-16 left-12 hidden lg:block"
      >
        <div className="w-12 h-12 rounded-xl bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.2)] flex items-center justify-center">
          <Trophy className="w-6 h-6 text-[#ffd700]" />
        </div>
      </motion.div>
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-20 left-20 hidden lg:block"
      >
        <div className="w-10 h-10 rounded-xl bg-[rgba(34,211,238,0.08)] border border-[rgba(34,211,238,0.15)] flex items-center justify-center">
          <Zap className="w-5 h-5 text-[#22d3ee]" />
        </div>
      </motion.div>
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute top-24 right-16 hidden lg:block"
      >
        <div className="w-11 h-11 rounded-xl bg-[rgba(99,102,241,0.08)] border border-[rgba(99,102,241,0.15)] flex items-center justify-center">
          <Shield className="w-5 h-5 text-[#818cf8]" />
        </div>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md relative"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#22d3ee] flex items-center justify-center shadow-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">
              Arena<span className="text-[#6366f1]">X</span>
            </span>
          </Link>
          <p className="text-[#a1a1b5] text-sm mt-2">Create your account. Start competing.</p>
        </div>

        {/* Form card */}
        <div className="gradient-border rounded-2xl">
          <div className="bg-[#0d0d15] rounded-2xl p-8">
            <h1 className="text-xl font-semibold text-white mb-6">Join the Arena</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#a1a1b5]">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a7a]" />
                  <input
                    name="username"
                    type="text"
                    required
                    placeholder="your_handle"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={`w-full pl-9 pr-9 py-2.5 rounded-lg bg-[#111118] border text-white placeholder-[#5a5a7a] text-sm focus:outline-none focus:ring-1 transition-all ${
                      usernameStatus === "available"
                        ? "border-[#22c55e] focus:border-[#22c55e] focus:ring-[#22c55e]/20"
                        : usernameStatus === "taken" || usernameStatus === "invalid"
                        ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/20"
                        : "border-[#2a2a3a] focus:border-[#6366f1] focus:ring-[#6366f1]/30"
                    }`}
                  />
                  {/* Status icon */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {usernameStatus === "checking" && <Loader2 className="w-4 h-4 text-[#5a5a7a] animate-spin" />}
                    {usernameStatus === "available" && <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />}
                    {usernameStatus === "taken" && <XCircle className="w-4 h-4 text-red-400" />}
                  </div>
                </div>
                {usernameStatus === "available" && (
                  <p className="text-xs text-[#22c55e]">@{username} is available</p>
                )}
                {usernameStatus === "taken" && (
                  <p className="text-xs text-red-400">@{username} is already taken</p>
                )}
                {usernameStatus === "invalid" && username.length > 0 && (
                  <p className="text-xs text-red-400">Letters, numbers, underscores only. 3–20 chars.</p>
                )}
                {usernameStatus === "idle" && (
                  <p className="text-xs text-[#5a5a7a]">Letters, numbers, underscores. 3–20 chars.</p>
                )}
              </div>

              {/* Display name */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#a1a1b5]">Display Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a7a]" />
                  <input
                    name="displayName"
                    type="text"
                    required
                    placeholder="How you appear to others"
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-[#111118] border border-[#2a2a3a] text-white placeholder-[#5a5a7a] text-sm focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#a1a1b5]">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a7a]" />
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-[#111118] border border-[#2a2a3a] text-white placeholder-[#5a5a7a] text-sm focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#a1a1b5]">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a7a]" />
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 rounded-lg bg-[#111118] border border-[#2a2a3a] text-white placeholder-[#5a5a7a] text-sm focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a5a7a] hover:text-[#a1a1b5] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password strength */}
                {password.length > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2">
                    <div className="flex gap-1">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-1 flex-1 rounded-full transition-all duration-300"
                          style={{ background: i <= passwordStrength ? strengthColor : "#2a2a3a" }}
                        />
                      ))}
                    </div>
                    {strengthLabel && (
                      <p className="text-xs" style={{ color: strengthColor }}>{strengthLabel} password</p>
                    )}
                    <div className="space-y-1">
                      {PASSWORD_RULES.map((rule) => {
                        const passed = rule.test(password);
                        return (
                          <div key={rule.label} className="flex items-center gap-1.5">
                            {passed
                              ? <CheckCircle2 className="w-3 h-3 text-[#22c55e]" />
                              : <XCircle className="w-3 h-3 text-[#5a5a7a]" />}
                            <span className={`text-xs ${passed ? "text-[#22c55e]" : "text-[#5a5a7a]"}`}>{rule.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#a1a1b5]">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a7a]" />
                  <input
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Repeat your password"
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-[#111118] border border-[#2a2a3a] text-white placeholder-[#5a5a7a] text-sm focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-all"
                  />
                </div>
              </div>

              {/* Hidden referral code — populated from ?ref= URL param */}
              <input type="hidden" name="referralCode" value={referralCode} />

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                  >
                    <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <p className="text-sm text-red-400">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <button
                type="submit"
                disabled={isPending || usernameStatus === "taken" || usernameStatus === "checking" || usernameStatus === "invalid"}
                className="w-full py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 btn-glow transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
              >
                {isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Creating account…</>
                ) : (
                  <>Enter the Arena<ArrowRight className="w-4 h-4" /></>
                )}
              </button>

              <p className="text-xs text-[#5a5a7a] text-center">
                By signing up, you agree to our{" "}
                <Link href="/terms" className="text-[#6366f1] hover:underline">Terms</Link>
                {" "}and{" "}
                <Link href="/privacy" className="text-[#6366f1] hover:underline">Privacy Policy</Link>.
              </p>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#2a2a3a]" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#0d0d15] px-3 text-xs text-[#5a5a7a]">Already have an account?</span>
              </div>
            </div>

            <Link
              href="/login"
              className="block w-full py-2.5 rounded-xl text-center text-sm font-medium text-[#818cf8] border border-[#2a2a3a] hover:border-[#6366f1]/40 hover:bg-[#6366f1]/5 transition-all"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Social proof */}
        <div className="flex items-center justify-center gap-6 mt-6">
          {[
            { label: "500+", sub: "Beta users" },
            { label: "1v1", sub: "Live matches" },
            { label: "ELO", sub: "Skill rating" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-base font-bold text-white">{stat.label}</div>
              <div className="text-xs text-[#5a5a7a]">{stat.sub}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}