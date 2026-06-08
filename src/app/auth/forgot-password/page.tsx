"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, ArrowLeft, Loader2, XCircle } from "lucide-react";
import Image from "next/image";
import loginBgImg from "../../../../public/images/login-bg.png";
import logoImg     from "../../../../public/images/logo.png";

const BODY = "'DM Sans',system-ui,sans-serif";
const CP   = "'Copperplate Gothic 32 BC','Copperplate Gothic Bold','Copperplate',Cinzel,serif";
const MONO = "'JetBrains Mono',monospace";

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

export default function ForgotPasswordPage() {
  const [email,      setEmail]      = useState("");
  const [sent,       setSent]       = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [isPending,  startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
      });
      if (error) setError(error.message);
      else setSent(true);
    });
  }

  return (
    <div style={{ minHeight: "100vh", position: "relative", fontFamily: BODY }}>
      {/* Full-screen background */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
        <Image src={loginBgImg} alt="" fill
          style={{ objectFit: "cover", objectPosition: "center", pointerEvents: "none", userSelect: "none" }}
          placeholder="blur" priority draggable={false} />
      </div>

      {/* Right panel */}
      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", padding: "40px 64px 40px 40px" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 28, alignSelf: "stretch" }}>
          <Image src={logoImg} alt="ArenaX" height={24} width={67}
            style={{ display: "block", pointerEvents: "none", userSelect: "none" }} draggable={false} placeholder="blur" />
        </div>

        {/* Glass card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
          style={{ width: 400, background: "rgba(240,246,252,0.06)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.28)", borderRadius: 16, padding: 32 }}
        >
          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div key="sent" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: "center" }}>
                <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, borderRadius: 14, marginBottom: 16, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                  <CheckCircle2 width={28} height={28} style={{ color: "#22c55e" }} />
                </div>
                <div style={{ fontFamily: CP, fontSize: 22, fontWeight: 700, color: "#0d1117", letterSpacing: "0.04em", marginBottom: 8 }}>Check your email</div>
                <p style={{ fontFamily: BODY, fontSize: 13, color: "#374151", marginBottom: 6, lineHeight: 1.6 }}>
                  We sent a password reset link to
                </p>
                <p style={{ fontFamily: MONO, fontSize: 12, color: "#1a56db", fontWeight: 600, marginBottom: 24 }}>{email}</p>
                <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: BODY, fontSize: 13, color: "#374151", textDecoration: "none", fontWeight: 500 }}>
                  <ArrowLeft width={14} height={14} /> Back to login
                </Link>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {/* Icon + heading */}
                <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 10, marginBottom: 14, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                </div>
                <div style={{ fontFamily: CP, fontSize: 22, fontWeight: 700, color: "#0d1117", letterSpacing: "0.04em", marginBottom: 6 }}>Reset your password</div>
                <p style={{ fontFamily: BODY, fontSize: 13, color: "#374151", marginBottom: 24, lineHeight: 1.5 }}>
                  Enter your email and we&apos;ll send you a reset link.
                </p>

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <label style={{ fontFamily: BODY, fontSize: 12, fontWeight: 700, color: "#0d1117" }}>Email address</label>
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px", borderRadius: 7, background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.25)", fontFamily: BODY, fontSize: 12, color: "#fda4af", lineHeight: 1.5 }}>
                        <XCircle width={14} height={14} style={{ flexShrink: 0, marginTop: 1 }} />
                        <span>{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button type="submit" disabled={isPending}
                    style={{ width: "100%", height: 42, borderRadius: 8, border: "none", background: "#238636", color: "#fff", fontFamily: BODY, fontSize: 13, fontWeight: 600, cursor: isPending ? "default" : "pointer", opacity: isPending ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, letterSpacing: "0.02em", transition: "background .15s" }}
                    onMouseEnter={e => { if (!isPending) e.currentTarget.style.background = "#2ea043"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "#238636"; }}
                  >
                    {isPending ? <><Loader2 width={14} height={14} className="animate-spin" />Sending…</> : "Send reset link"}
                  </button>
                </form>

                <div style={{ marginTop: 20, textAlign: "center" }}>
                  <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: BODY, fontSize: 13, color: "#6b7280", textDecoration: "none" }}>
                    <ArrowLeft width={14} height={14} /> Back to login
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer */}
        <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 16, alignSelf: "stretch" }}>
          {["Privacy", "Terms", "Support"].map(l => (
            <Link key={l} href="#" style={{ fontFamily: BODY, fontSize: 11, color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>{l}</Link>
          ))}
        </div>
      </div>
    </div>
  );
}
