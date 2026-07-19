"use client";

import { useState, useTransition, useEffect, useRef, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signUp } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import Image from "next/image";
import loginBgImg from "../../../public/images/login-bg.png";
import logoImg     from "../../../public/images/logo.png";

const BODY = "'DM Sans',system-ui,sans-serif";
const CP   = "'Copperplate Gothic 32 BC','Copperplate Gothic Bold','Copperplate',Cinzel,serif";
const MONO = "'JetBrains Mono',monospace";

const inputBase: React.CSSProperties = {
  width: "100%", height: 40, padding: "0 12px",
  borderRadius: 7, border: "1px solid rgba(0,0,0,0.18)",
  background: "rgba(255,255,255,0.5)",
  color: "#0d1117", fontFamily: BODY, fontSize: 13,
  outline: "none", transition: "border-color .15s, box-shadow .15s",
};
function foc(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "#388bfd";
  e.currentTarget.style.boxShadow   = "0 0 0 3px rgba(56,139,253,0.15)";
}
function blr(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "rgba(0,0,0,0.18)";
  e.currentTarget.style.boxShadow   = "none";
}

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";
const PASSWORD_RULES = [
  { label: "At least 8 characters",  test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter",    test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number",              test: (p: string) => /[0-9]/.test(p) },
];

export default function SignupPage() {
  return <Suspense><SignupForm /></Suspense>;
}

function SignupForm() {
  const searchParams  = useSearchParams();
  const referralCode  = searchParams.get("ref") ?? "";

  const [showPw,          setShowPw]          = useState(false);
  const [password,        setPassword]        = useState("");
  const [username,        setUsername]        = useState("");
  const [usernameStatus,  setUsernameStatus]  = useState<UsernameStatus>("idle");
  const [error,           setError]           = useState<string | null>(null);
  const [submittedEmail,  setSubmittedEmail]  = useState<string | null>(null);
  const [isPending,       startTransition]    = useTransition();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  /* ── Username availability ── */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (username.length < 3) { setUsernameStatus(username.length === 0 ? "idle" : "invalid"); return; }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) { setUsernameStatus("invalid"); return; }
    setUsernameStatus("checking");
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`);
        const { available } = await res.json();
        setUsernameStatus(available ? "available" : "taken");
      } catch { setUsernameStatus("idle"); }
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [username]);

  const passwordStrength = PASSWORD_RULES.filter(r => r.test(password)).length;
  const strengthLabel    = ["", "Weak", "Medium", "Strong"][passwordStrength];
  const strengthColor    = ["", "#ef4444", "#f59e0b", "#22c55e"][passwordStrength];

  async function handleOAuth(provider: "google" | "github") {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}/auth/callback` } });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    if (formData.get("password") !== formData.get("confirmPassword")) { setError("Passwords do not match."); return; }
    const email = formData.get("email") as string;
    startTransition(async () => {
      const result = await signUp(formData);
      if (result?.error) setError(result.error);
      else setSubmittedEmail(email);
    });
  }

  /* ── Shell layout reused by both states ── */
  const Shell = ({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) => (
    <div style={{ minHeight: "100vh", position: "relative", fontFamily: BODY }}>
      <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
        <Image src={loginBgImg} alt="" fill style={{ objectFit: "cover", objectPosition: "center", pointerEvents: "none", userSelect: "none" }} placeholder="blur" priority draggable={false} />
      </div>
      <div className="ax-auth-shell" style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 28, alignSelf: "stretch" }}>
          <Image src={logoImg} alt="ArenaX" height={24} width={67} style={{ display: "block", pointerEvents: "none", userSelect: "none" }} draggable={false} placeholder="blur" />
        </div>
        <motion.div className="ax-auth-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
          style={{ width: "100%", maxWidth: wide ? 440 : 400, background: "rgba(240,246,252,0.06)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.28)", borderRadius: 16, maxHeight: "90vh", overflowY: "auto" }}>
          {children}
        </motion.div>
        <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 16, alignSelf: "stretch" }}>
          {["Privacy", "Terms", "Support"].map(l => (
            <Link key={l} href="#" style={{ fontFamily: BODY, fontSize: 11, color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>{l}</Link>
          ))}
        </div>
      </div>
    </div>
  );

  /* ── Success / Verify email state ── */
  if (submittedEmail) {
    return (
      <Shell>
        <div style={{ textAlign: "center" }}>
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 72, height: 72, borderRadius: 20, marginBottom: 20, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
          </motion.div>
          <div style={{ fontFamily: CP, fontSize: 22, fontWeight: 700, color: "#0d1117", marginBottom: 8, letterSpacing: "0.03em" }}>Account created!</div>
          <p style={{ fontFamily: BODY, fontSize: 13, color: "#374151", marginBottom: 6, lineHeight: 1.6 }}>
            One last step — verify your email to activate your account.
          </p>
          <p style={{ fontFamily: MONO, fontSize: 12, color: "#1a56db", marginBottom: 24, fontWeight: 600 }}>{submittedEmail}</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20, textAlign: "left" }}>
            {[
              "Open the email we just sent you",
              'Click "Verify my email"',
              "You’ll be logged in and ready to compete!",
            ].map((text, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: BODY, fontWeight: 700, fontSize: 12, color: "#818cf8", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)" }}>{i + 1}</div>
                <span style={{ fontFamily: BODY, fontSize: 12, color: "#374151" }}>{text}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px", borderRadius: 8, marginBottom: 20, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", textAlign: "left" }}>
            <span style={{ color: "#f59e0b", flexShrink: 0 }}>⚠</span>
            <p style={{ fontFamily: BODY, fontSize: 11, color: "#92400e", lineHeight: 1.5 }}>
              Check your <strong>spam / junk folder</strong> if you don&apos;t see it within a minute.
            </p>
          </div>

          <Link href="/login" style={{ display: "block", width: "100%", padding: "10px 0", borderRadius: 8, textAlign: "center", fontFamily: BODY, fontSize: 13, fontWeight: 600, color: "#374151", border: "1px solid rgba(0,0,0,0.15)", textDecoration: "none", background: "rgba(255,255,255,0.3)" }}>
            Back to login
          </Link>
        </div>
      </Shell>
    );
  }

  /* ── Sign up form ── */
  const inputBorder = (status: UsernameStatus): string => {
    if (status === "available") return "1px solid #22c55e";
    if (status === "taken" || status === "invalid") return "1px solid rgba(239,68,68,0.6)";
    return "1px solid rgba(0,0,0,0.18)";
  };

  return (
    <Shell>
      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(0,0,0,0.12)", marginBottom: 28 }}>
        <Link href="/login" style={{ fontFamily: BODY, fontSize: 13, fontWeight: 700, padding: "10px 0", marginRight: 24, color: "#374151", textDecoration: "none", borderBottom: "2px solid transparent", marginBottom: -1 }}>
          Sign in
        </Link>
        <button style={{ fontFamily: BODY, fontSize: 13, fontWeight: 700, padding: "10px 0", color: "#0d1117", background: "none", border: "none", borderBottom: "2px solid #0d1117", marginBottom: -1, cursor: "default" }}>
          Create account
        </button>
      </div>

      {/* Heading */}
      <div style={{ fontFamily: CP, fontSize: 26, fontWeight: 700, color: "#0d1117", letterSpacing: "0.04em", marginBottom: 6, lineHeight: 1.2 }}>Join ArenaX</div>
      <div style={{ fontFamily: BODY, fontSize: 13, color: "#374151", marginBottom: 24, lineHeight: 1.5, fontWeight: 500 }}>Create your account and enter the arena</div>

      {/* OAuth */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {(["google", "github"] as const).map(p => (
          <button key={p} type="button" onClick={() => handleOAuth(p)}
            style={{ width: "100%", height: 44, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: BODY, fontSize: 13, fontWeight: 500, borderRadius: 8, border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.08)", color: "#0d1117", cursor: "pointer", transition: "background .15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,0,0,0.06)"; e.currentTarget.style.borderColor = "rgba(0,0,0,0.22)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; }}
          >
            {p === "google" ? <GoogleIcon /> : <GitHubIcon />}
            Continue with {p === "google" ? "Google" : "GitHub"}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.12)" }} />
        <span style={{ fontFamily: BODY, fontSize: 12, color: "#6b7280" }}>or</span>
        <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.12)" }} />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>

          {/* Username + Display Name row */}
          <div className="ax-auth-2col">
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontFamily: BODY, fontSize: 12, fontWeight: 700, color: "#0d1117" }}>Username</label>
              <div style={{ position: "relative" }}>
                <input name="username" type="text" required placeholder="your_handle" autoComplete="username"
                  value={username} onChange={e => setUsername(e.target.value)}
                  style={{ ...inputBase, border: inputBorder(usernameStatus), paddingRight: usernameStatus !== "idle" ? 32 : 12 }}
                  onFocus={foc} onBlur={blr} />
                {usernameStatus !== "idle" && (
                  <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
                    {usernameStatus === "checking"  && <Loader2 width={14} height={14} style={{ color: "#6b7280", animation: "spin 1s linear infinite" }} />}
                    {usernameStatus === "available" && <CheckCircle2 width={14} height={14} style={{ color: "#22c55e" }} />}
                    {usernameStatus === "taken"     && <XCircle width={14} height={14} style={{ color: "#ef4444" }} />}
                  </div>
                )}
              </div>
              {usernameStatus === "available" && <p style={{ fontFamily: BODY, fontSize: 11, color: "#22c55e" }}>@{username} is available</p>}
              {usernameStatus === "taken"     && <p style={{ fontFamily: BODY, fontSize: 11, color: "#ef4444" }}>@{username} is taken</p>}
              {usernameStatus === "invalid" && username.length > 0 && <p style={{ fontFamily: BODY, fontSize: 11, color: "#ef4444" }}>3–20 chars, letters/numbers/_</p>}
              {usernameStatus === "idle"      && <p style={{ fontFamily: BODY, fontSize: 11, color: "#6b7280" }}>Letters, numbers, _. 3–20 chars.</p>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontFamily: BODY, fontSize: 12, fontWeight: 700, color: "#0d1117" }}>Display Name</label>
              <input name="displayName" type="text" required placeholder="Your name"
                style={inputBase} onFocus={foc} onBlur={blr} />
            </div>
          </div>

          {/* Email */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontFamily: BODY, fontSize: 12, fontWeight: 700, color: "#0d1117" }}>Email</label>
            <input name="email" type="email" required placeholder="you@example.com" autoComplete="email"
              style={inputBase} onFocus={foc} onBlur={blr} />
          </div>

          {/* Password */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontFamily: BODY, fontSize: 12, fontWeight: 700, color: "#0d1117" }}>Password</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input name="password" type={showPw ? "text" : "password"} required placeholder="At least 8 characters" autoComplete="new-password"
                value={password} onChange={e => setPassword(e.target.value)}
                style={{ ...inputBase, padding: "0 36px 0 12px" }} onFocus={foc} onBlur={blr} />
              <button type="button" onClick={() => setShowPw(!showPw)}
                style={{ position: "absolute", right: 10, background: "none", border: "none", cursor: "pointer", color: "#6b7280", padding: 0, display: "flex", alignItems: "center" }}>
                {showPw ? <EyeOff width={14} height={14} /> : <Eye width={14} height={14} />}
              </button>
            </div>
            {password.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", gap: 4 }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{ height: 3, flex: 1, borderRadius: 2, background: i <= passwordStrength ? strengthColor : "rgba(0,0,0,0.15)", transition: "background .3s" }} />
                  ))}
                </div>
                {strengthLabel && <p style={{ fontFamily: BODY, fontSize: 11, color: strengthColor }}>{strengthLabel} password</p>}
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {PASSWORD_RULES.map(rule => {
                    const ok = rule.test(password);
                    return (
                      <div key={rule.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {ok ? <CheckCircle2 width={11} height={11} style={{ color: "#22c55e" }} /> : <XCircle width={11} height={11} style={{ color: "#9ca3af" }} />}
                        <span style={{ fontFamily: BODY, fontSize: 11, color: ok ? "#22c55e" : "#6b7280" }}>{rule.label}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>

          {/* Confirm password */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontFamily: BODY, fontSize: 12, fontWeight: 700, color: "#0d1117" }}>Confirm Password</label>
            <input name="confirmPassword" type={showPw ? "text" : "password"} required placeholder="Repeat your password" autoComplete="new-password"
              style={inputBase} onFocus={foc} onBlur={blr} />
          </div>

          {/* Referral code (visible only when no ?ref= param) */}
          {!referralCode && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontFamily: BODY, fontSize: 12, fontWeight: 700, color: "#0d1117" }}>
                Referral Code <span style={{ color: "#6b7280", fontWeight: 400 }}>(optional)</span>
              </label>
              <input name="referralCode" type="text" placeholder="Enter code if you have one"
                style={inputBase} onFocus={foc} onBlur={blr} />
            </div>
          )}
          {referralCode && <input type="hidden" name="referralCode" value={referralCode} />}
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px", borderRadius: 7, marginBottom: 16, background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.25)", fontFamily: BODY, fontSize: 12, color: "#fda4af", lineHeight: 1.5 }}>
              <XCircle width={14} height={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <button type="submit"
          disabled={isPending || usernameStatus === "taken" || usernameStatus === "checking" || usernameStatus === "invalid"}
          style={{ width: "100%", height: 42, borderRadius: 8, border: "none", background: "#238636", color: "#fff", fontFamily: BODY, fontSize: 13, fontWeight: 600, cursor: isPending ? "default" : "pointer", opacity: (isPending || usernameStatus === "taken" || usernameStatus === "checking" || usernameStatus === "invalid") ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, letterSpacing: "0.02em", transition: "background .15s" }}
          onMouseEnter={e => { if (!isPending) e.currentTarget.style.background = "#2ea043"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#238636"; }}
        >
          {isPending ? <><Loader2 width={14} height={14} className="animate-spin" />Creating account…</> : "Create account"}
        </button>

        <p style={{ fontFamily: BODY, fontSize: 11, color: "#6b7280", textAlign: "center", marginTop: 12, lineHeight: 1.5 }}>
          By creating an account you agree to our{" "}
          <Link href="/terms"   style={{ color: "#374151" }}>Terms</Link> and{" "}
          <Link href="/privacy" style={{ color: "#374151" }}>Privacy Policy</Link>
        </p>
      </form>

      <div style={{ textAlign: "center", marginTop: 20, fontFamily: BODY, fontSize: 12, color: "#374151", fontWeight: 500 }}>
        Already have an account?{" "}
        <Link href="/login" style={{ color: "#1a56db", fontWeight: 700, textDecoration: "none" }}>Sign in</Link>
      </div>
    </Shell>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#0d1117" style={{ flexShrink: 0 }}>
      <path d="M12 0a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58v-2c-3.34.73-4.04-1.61-4.04-1.61-.55-1.38-1.33-1.75-1.33-1.75-1.08-.74.08-.73.08-.73 1.2.08 1.83 1.24 1.83 1.24 1.07 1.83 2.81 1.3 3.5 1 .11-.77.42-1.3.76-1.6-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.17 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.3-1.55 3.3-1.23 3.3-1.23.66 1.65.25 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 12 0z"/>
    </svg>
  );
}
