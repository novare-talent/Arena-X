"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, XCircle, Loader2 } from "lucide-react";
import Image from "next/image";
import loginBgImg from "../../../public/images/login-bg.png";
import logoImg     from "../../../public/images/logo.png";

const BODY = "'DM Sans',system-ui,sans-serif";
const CP   = "'Copperplate Gothic 32 BC','Copperplate Gothic Bold','Copperplate',Cinzel,serif";

const inputStyle: React.CSSProperties = {
  width: "100%", height: 40, padding: "0 12px",
  borderRadius: 7, border: "1px solid rgba(0,0,0,0.18)",
  background: "rgba(255,255,255,0.5)",
  color: "#0d1117", fontFamily: BODY, fontSize: 13,
  outline: "none", transition: "border-color .15s, box-shadow .15s",
};
function onFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "#388bfd";
  e.currentTarget.style.boxShadow   = "0 0 0 3px rgba(56,139,253,0.15)";
}
function onBlur(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "rgba(0,0,0,0.18)";
  e.currentTarget.style.boxShadow   = "none";
}

export default function LoginPage() {
  const router = useRouter();
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd       = new FormData(e.currentTarget);
    const email    = fd.get("email")    as string;
    const password = fd.get("password") as string;
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
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
    router.push("/dashboard");
    router.refresh();
  }

  async function handleOAuth(provider: "google" | "github") {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div style={{ minHeight: "100vh", position: "relative", fontFamily: BODY }}>
      {/* ── Full-screen background ── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
        <Image src={loginBgImg} alt="" fill
          style={{ objectFit: "cover", objectPosition: "center", pointerEvents: "none", userSelect: "none" }}
          placeholder="blur" priority draggable={false} />
      </div>

      {/* ── Right panel ── */}
      <div className="ax-auth-shell" style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 28, alignSelf: "stretch" }}>
          <Image src={logoImg} alt="ArenaX" height={24} width={67}
            style={{ display: "block", pointerEvents: "none", userSelect: "none" }}
            draggable={false} placeholder="blur" />
        </div>

        {/* Glass card */}
        <motion.div
          className="ax-auth-card"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
          style={{
            width: "100%", maxWidth: 400,
            background: "rgba(240,246,252,0.06)",
            backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.28)",
            borderRadius: 16,
          }}
        >
          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid rgba(0,0,0,0.12)", marginBottom: 28 }}>
            <button style={{ fontFamily: BODY, fontSize: 13, fontWeight: 700, padding: "10px 0", marginRight: 24, color: "#0d1117", background: "none", border: "none", borderBottom: "2px solid #0d1117", marginBottom: -1, cursor: "default" }}>
              Sign in
            </button>
            <Link href="/signup" style={{ fontFamily: BODY, fontSize: 13, fontWeight: 700, padding: "10px 0", color: "#374151", textDecoration: "none", borderBottom: "2px solid transparent", marginBottom: -1 }}>
              Create account
            </Link>
          </div>

          {/* Heading */}
          <div style={{ fontFamily: CP, fontSize: 26, fontWeight: 700, color: "#0d1117", letterSpacing: "0.04em", marginBottom: 6, lineHeight: 1.2 }}>Welcome back</div>
          <div style={{ fontFamily: BODY, fontSize: 13, color: "#374151", marginBottom: 24, lineHeight: 1.5, fontWeight: 500 }}>Sign in to continue to ArenaX</div>

          {/* OAuth */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            {(["google", "github"] as const).map(p => (
              <button key={p} type="button" onClick={() => handleOAuth(p)}
                style={{ width: "100%", height: 44, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: BODY, fontSize: 13, fontWeight: 500, borderRadius: 8, border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.08)", color: "#0d1117", cursor: "pointer", transition: "background .15s, border-color .15s" }}
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
              {/* Email */}
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={{ fontFamily: BODY, fontSize: 12, fontWeight: 700, color: "#0d1117" }}>Email</label>
                <input name="email" type="email" required placeholder="you@example.com" autoComplete="email"
                  style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>

              {/* Password */}
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <label style={{ fontFamily: BODY, fontSize: 12, fontWeight: 700, color: "#0d1117" }}>Password</label>
                  <Link href="/auth/forgot-password" style={{ fontFamily: BODY, fontSize: 11, color: "#1a56db", textDecoration: "none", fontWeight: 600 }}>Forgot password?</Link>
                </div>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input name="password" type={showPw ? "text" : "password"} required placeholder="••••••••" autoComplete="current-password"
                    style={{ ...inputStyle, padding: "0 36px 0 12px" }}
                    onFocus={onFocus} onBlur={onBlur} />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    style={{ position: "absolute", right: 10, background: "none", border: "none", cursor: "pointer", color: "#6b7280", padding: 0, display: "flex", alignItems: "center" }}>
                    {showPw ? <EyeOff width={14} height={14} /> : <Eye width={14} height={14} />}
                  </button>
                </div>
              </div>
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

            <button type="submit" disabled={loading}
              style={{ width: "100%", height: 42, borderRadius: 8, border: "none", background: "#238636", color: "#fff", fontFamily: BODY, fontSize: 13, fontWeight: 600, cursor: loading ? "default" : "pointer", opacity: loading ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, letterSpacing: "0.02em", transition: "background .15s" }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "#2ea043"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#238636"; }}
            >
              {loading ? <><Loader2 width={14} height={14} className="animate-spin" />Signing in…</> : "Sign in"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 20, fontFamily: BODY, fontSize: 12, color: "#374151", fontWeight: 500 }}>
            New to ArenaX?{" "}
            <Link href="/signup" style={{ color: "#1a56db", fontWeight: 700, textDecoration: "none" }}>Create an account</Link>
          </div>
        </motion.div>

        {/* Footer links */}
        <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 16, alignSelf: "stretch" }}>
          {["Privacy", "Terms", "Support"].map(l => (
            <Link key={l} href="#" style={{ fontFamily: BODY, fontSize: 11, color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>
              {l}
            </Link>
          ))}
        </div>
      </div>
    </div>
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
