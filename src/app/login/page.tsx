"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, XCircle, Loader2 } from "lucide-react";
import { LogoKasa, Wordmark, Kabuto, Crest } from "@/components/ui-samurai/primitives";

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
    <div className="min-h-screen overflow-hidden" style={{ background: "var(--ink-1)", display: "grid", gridTemplateColumns: "1fr 1fr" }}>

      {/* ── LEFT — atmospheric art panel ── */}
      <div className="relative hidden lg:flex flex-col" style={{ borderRight: "1px solid var(--ink-4)", overflow: "hidden" }}>
        {/* Atmosphere */}
        <div className="ax-aura" style={{ width: 600, height: 600, background: "var(--violet-700)", top: -150, left: -150, opacity: 0.28 }} />
        <div className="ax-aura" style={{ width: 400, height: 400, background: "var(--orchid)", bottom: -100, right: -100, opacity: 0.16 }} />
        <div className="ax-dotgrid" style={{ position: "absolute", inset: 0, opacity: 0.5 }} />

        {/* Vertical kanji rail */}
        <div className="font-jp" style={{
          position: "absolute", left: 24, top: 80,
          writingMode: "vertical-rl", textOrientation: "upright",
          fontSize: 20, color: "var(--violet-300)", opacity: 0.35,
          letterSpacing: "0.5em",
        }}>戻 り て 来 し 者</div>

        {/* Header */}
        <div className="relative flex items-center justify-between p-10">
          <div className="flex items-center gap-3">
            <LogoKasa size={30} />
            <Wordmark size={18} />
          </div>
          <span className="font-cond text-[10px]" style={{ color: "var(--smoke)", letterSpacing: "0.25em" }}>S01 · 始</span>
        </div>

        {/* Center figure */}
        <div className="relative flex-1 flex items-center justify-center">
          {/* Moon */}
          <div style={{ position: "absolute" }}>
            <svg viewBox="0 0 300 300" width={340} height={340}>
              <defs>
                <radialGradient id="moonLogin" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="transparent" />
                </radialGradient>
              </defs>
              <circle cx="150" cy="150" r="140" fill="url(#moonLogin)" />
              <circle cx="150" cy="150" r="100" fill="none" stroke="#a78bfa" strokeOpacity="0.22" strokeWidth="0.6" />
              <circle cx="150" cy="150" r="100" fill="none" stroke="#a78bfa" strokeOpacity="0.10" strokeWidth="0.6" strokeDasharray="2 6" />
            </svg>
          </div>

          {/* Kabuto hero */}
          <div style={{ position: "relative", zIndex: 2 }}>
            <Kabuto size={220} tier="samurai" glow={true} />
          </div>

          {/* Floating scout card */}
          <div className="ax-card-glass ax-ticks" style={{
            position: "absolute", right: 32, bottom: 80,
            padding: "14px 18px", width: 220,
          }}>
            <div className="font-cond text-[9px]" style={{ color: "var(--smoke)", letterSpacing: "0.25em" }}>SCOUTING · 偵察</div>
            <div className="font-display text-2xl mt-1" style={{ color: "var(--bone)" }}>HANZŌ_07</div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="font-cond text-[11px]" style={{ color: "var(--violet-300)", letterSpacing: "0.1em" }}>ELO 1847</span>
              <span style={{ width: 1, height: 10, background: "var(--ink-4)", display: "inline-block" }} />
              <span className="font-cond text-[11px]" style={{ color: "var(--violet-300)", letterSpacing: "0.1em" }}>23W · 7L</span>
            </div>
            <div className="flex gap-1 mt-2">
              {["W","W","W","L","W","W","L","W"].map((r, i) => (
                <span key={i} style={{
                  width: 16, height: 16, borderRadius: 3, fontSize: 9,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font-mono, monospace)",
                  background: r === "W" ? "rgba(52,211,153,0.15)" : "rgba(244,63,94,0.15)",
                  color: r === "W" ? "#6ee7b7" : "#fda4af",
                  border: `1px solid ${r === "W" ? "rgba(52,211,153,0.3)" : "rgba(244,63,94,0.3)"}`,
                }}>{r}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Mountain silhouette */}
        <svg viewBox="0 0 600 180" preserveAspectRatio="none" style={{
          position: "absolute", bottom: 60, left: 0, right: 0, width: "100%", height: 140, opacity: 0.5,
        }}>
          <path d="M0 180 L80 90 L140 130 L220 50 L300 120 L380 80 L460 140 L540 100 L600 130 L600 180 Z" fill="#15101f" />
          <path d="M0 180 L60 130 L160 160 L260 100 L360 150 L460 120 L560 155 L600 180 Z" fill="#0d0a16" />
        </svg>

        {/* Bottom text */}
        <div className="relative flex items-end justify-between p-10">
          <div>
            <div className="font-display text-4xl" style={{ color: "var(--bone)", lineHeight: 1 }}>
              RETURN<br/>TO THE DŌJŌ.
            </div>
            <div className="font-jp text-sm mt-2" style={{ color: "var(--violet-300)", letterSpacing: "0.15em" }}>道は待っている。</div>
          </div>
          <div className="text-right">
            <div className="font-cond text-[10px]" style={{ color: "var(--smoke)", letterSpacing: "0.22em" }}>WARRIORS ONLINE</div>
            <div className="font-display text-3xl mt-1" style={{ color: "var(--violet-300)" }}>2,481</div>
          </div>
        </div>
      </div>

      {/* ── RIGHT — form panel ── */}
      <div className="relative flex flex-col items-center justify-center px-8 py-12"
        style={{ background: "var(--ink-1)" }}>
        <div className="ax-aura" style={{ width: 400, height: 400, background: "var(--violet-700)", top: -150, right: -150, opacity: 0.10 }} />

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <LogoKasa size={32} />
          <Wordmark size={20} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-sm relative"
        >
          {/* Top corner link */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="font-cond text-[10px]" style={{ color: "var(--smoke)", letterSpacing: "0.25em" }}>NEW WARRIOR?</div>
              <Link href="/signup" className="font-cond text-xs mt-0.5 inline-block"
                style={{ color: "var(--violet-300)", letterSpacing: "0.22em", borderBottom: "1px solid var(--violet-500)", paddingBottom: 1 }}>
                SWEAR THE OATH ⟶
              </Link>
            </div>
            <Crest size={28} color="var(--violet-400)" />
          </div>

          {/* Tabs */}
          <div className="flex gap-0 mb-8" style={{ borderBottom: "1px solid var(--ink-4)" }}>
            <div style={{ padding: "10px 0", marginRight: 28, borderBottom: "2px solid var(--violet-400)" }}>
              <span className="font-cond text-sm" style={{ color: "var(--bone)", letterSpacing: "0.22em" }}>SIGN IN</span>
            </div>
            <Link href="/signup" style={{ padding: "10px 0" }}>
              <span className="font-cond text-sm" style={{ color: "var(--smoke)", letterSpacing: "0.22em" }}>JOIN</span>
            </Link>
          </div>

          {/* Heading */}
          <div className="font-cond text-[10px] mb-3" style={{ color: "var(--violet-300)", letterSpacing: "0.3em" }}>RETURN · 還</div>
          <h1 className="font-display text-6xl mb-2" style={{ color: "var(--bone)", lineHeight: 0.92 }}>
            DRAW THE<br/><span style={{ color: "var(--violet-400)" }}>BLADE</span> AGAIN.
          </h1>
          <p className="text-sm mb-7" style={{ color: "var(--ash)", lineHeight: 1.6 }}>
            Your rank, your kata, your duels — all waiting in the dōjō.
          </p>

          {/* OAuth */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => handleOAuth("google")}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded text-xs font-cond transition-all"
              style={{
                background: "transparent",
                border: "1px solid var(--ink-4)",
                color: "var(--ash)",
                letterSpacing: "0.18em",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--violet-500)"; (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.06)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--ink-4)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <svg viewBox="0 0 24 24" width="14" height="14">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#a78bfa"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#a78bfa"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#a78bfa"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#a78bfa"/>
              </svg>
              GOOGLE
            </button>
            <button
              type="button"
              onClick={() => handleOAuth("github")}
              className="w-12 flex items-center justify-center py-3 rounded text-xs transition-all"
              style={{ background: "transparent", border: "1px solid var(--ink-4)", color: "var(--ash)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--violet-500)"; (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.06)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--ink-4)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="#a78bfa"><path d="M12 0a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58v-2c-3.34.73-4.04-1.61-4.04-1.61-.55-1.38-1.33-1.75-1.33-1.75-1.08-.74.08-.73.08-.73 1.2.08 1.83 1.24 1.83 1.24 1.07 1.83 2.81 1.3 3.5 1 .11-.77.42-1.3.76-1.6-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.17 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.3-1.55 3.3-1.23 3.3-1.23.66 1.65.25 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 12 0z"/></svg>
            </button>
          </div>

          <div className="ax-katana mb-6 font-cond text-[10px]" style={{ letterSpacing: "0.3em", color: "var(--smoke)" }}>OR · 又</div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="font-cond text-[10px] block mb-1.5" style={{ color: "var(--ash)", letterSpacing: "0.24em" }}>
                EMAIL · 名
              </label>
              <div className="ax-ticks" style={{
                background: "var(--ink-3)",
                border: "1px solid var(--ink-4)",
                borderRadius: "var(--r-sm)",
                height: 48,
                display: "flex", alignItems: "center", padding: "0 14px",
              }}>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="you@arena.x"
                  autoComplete="email"
                  className="flex-1 bg-transparent border-0 outline-none text-sm"
                  style={{ color: "var(--bone)", fontFamily: "var(--font-mono, monospace)" }}
                  onFocus={e => { const p = e.currentTarget.closest(".ax-ticks") as HTMLElement; if (p) { p.style.borderColor = "var(--violet-500)"; p.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.12)"; } }}
                  onBlur={e => { const p = e.currentTarget.closest(".ax-ticks") as HTMLElement; if (p) { p.style.borderColor = "var(--ink-4)"; p.style.boxShadow = "none"; } }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-cond text-[10px]" style={{ color: "var(--ash)", letterSpacing: "0.24em" }}>
                  PASSWORD · 鍵
                </label>
                <Link href="/auth/forgot-password" className="font-cond text-[10px]"
                  style={{ color: "var(--violet-300)", letterSpacing: "0.15em" }}>
                  FORGOTTEN THE WAY?
                </Link>
              </div>
              <div className="ax-ticks" style={{
                background: "var(--ink-3)",
                border: "1px solid var(--ink-4)",
                borderRadius: "var(--r-sm)",
                height: 48,
                display: "flex", alignItems: "center", padding: "0 14px", gap: 10,
              }}>
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Your password"
                  autoComplete="current-password"
                  className="flex-1 bg-transparent border-0 outline-none text-sm"
                  style={{ color: "var(--bone)", fontFamily: "var(--font-mono, monospace)" }}
                  onFocus={e => { const p = e.currentTarget.closest(".ax-ticks") as HTMLElement; if (p) { p.style.borderColor = "var(--violet-500)"; p.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.12)"; } }}
                  onBlur={e => { const p = e.currentTarget.closest(".ax-ticks") as HTMLElement; if (p) { p.style.borderColor = "var(--ink-4)"; p.style.boxShadow = "none"; } }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ color: "var(--smoke)" }}>
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-2 p-3 rounded text-sm"
                  style={{ background: "rgba(244,63,94,0.10)", border: "1px solid rgba(244,63,94,0.25)" }}
                >
                  <XCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--loss)" }} />
                  <p style={{ color: "#fda4af" }}>{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full font-cond text-sm btn-glow transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              style={{
                height: 52,
                background: "linear-gradient(180deg, var(--violet-500), var(--violet-700))",
                border: "1px solid rgba(196,181,253,0.35)",
                borderRadius: "var(--r-sm)",
                color: "var(--bone)",
                letterSpacing: "0.22em",
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />ENTERING…
                </span>
              ) : (
                "ENTER THE DŌJŌ ⟶"
              )}
            </button>
          </form>

          {/* Bottom signature */}
          <div className="flex items-center justify-between mt-8">
            <div className="font-cond text-[10px]" style={{ color: "var(--void)", letterSpacing: "0.25em" }}>ARENA-X · 侍</div>
            <div className="font-cond text-[10px]" style={{ color: "var(--void)", letterSpacing: "0.25em" }}>PRIVACY · TERMS</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
