"use client";

import { useState } from "react";
import { CheckCircle2, Zap } from "lucide-react";

const MONO = "'JetBrains Mono',monospace";
const CP   = "'Copperplate Gothic 32 BC','Copperplate Gothic Bold','Copperplate',Cinzel,serif";
const BODY = "'DM Sans',system-ui,sans-serif";

type View = "choice" | "coupon" | "payment" | "success";

interface Props {
  onSuccess: () => void;
  onSkip?:   () => void;
  mode:      "slide" | "modal";
}

const PRO_FEATURES = [
  "AI Prompting Track — Modules 2, 3 & 4",
  "Prompt Battle — Revision Mode",
  "Detailed AI judge feedback & scores",
  "Early access to upcoming tracks",
];

export default function UpgradeProModal({ onSuccess, onSkip, mode }: Props) {
  const [view,    setView]    = useState<View>("choice");
  const [coupon,  setCoupon]  = useState("");
  const [phone,   setPhone]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  function reset(next: View) {
    setError(null);
    setCoupon("");
    setPhone("");
    setView(next);
  }

  async function applyCoupon() {
    if (!coupon.trim()) { setError("Enter a coupon code"); return; }
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/payments/apply-coupon", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ code: coupon }),
      });
      const json = await res.json();
      if (json.success) { setView("success"); }
      else              { setError(json.message ?? "Invalid code"); }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function startPayment() {
    const cleaned = phone.replace(/\s/g, "");
    if (!/^\d{10}$/.test(cleaned)) { setError("Enter a valid 10-digit phone number"); return; }
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/payments/create-link", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ phone: cleaned }),
      });
      const json = await res.json();
      if (json.payment_url) {
        window.location.href = json.payment_url;
        // keep loading=true; page will navigate away
      } else {
        setError(json.error ?? "Failed to create payment link");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  /* ── Shared styles ── */
  const wrap: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: mode === "slide" ? 0 : "24px",
    width: "100%", height: "100%",
  };

  const card: React.CSSProperties = {
    background:    "#0f0f0f",
    border:        "1px solid #2a2a2a",
    borderRadius:  16,
    padding:       "36px 32px",
    width:         mode === "slide" ? 440 : "100%",
    maxWidth:      mode === "slide" ? 440 : 480,
    display:       "flex",
    flexDirection: "column",
    gap:           20,
  };

  const inputStyle: React.CSSProperties = {
    width:        "100%",
    padding:      "10px 14px",
    borderRadius: 8,
    border:       "1px solid #333",
    background:   "#1a1a1a",
    color:        "#fff",
    fontFamily:   MONO,
    fontSize:     13,
    outline:      "none",
    letterSpacing: "0.04em",
    boxSizing:    "border-box",
  };

  const btnGold: React.CSSProperties = {
    width:          "100%",
    padding:        "11px 0",
    borderRadius:   8,
    border:         "none",
    background:     loading ? "#c9a13e" : "#f5c451",
    color:          "#111",
    fontFamily:     CP,
    fontSize:       12,
    letterSpacing:  "0.18em",
    fontWeight:     700,
    cursor:         loading ? "not-allowed" : "pointer",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    gap:            6,
  };

  const btnOutline: React.CSSProperties = {
    width:         "100%",
    padding:       "11px 0",
    borderRadius:  8,
    border:        "1px solid #333",
    background:    "transparent",
    color:         "#999",
    fontFamily:    CP,
    fontSize:      11,
    letterSpacing: "0.16em",
    cursor:        "pointer",
  };

  const backBtn: React.CSSProperties = {
    background:    "none",
    border:        "none",
    color:         "#666",
    cursor:        "pointer",
    fontFamily:    MONO,
    fontSize:      9,
    letterSpacing: "0.16em",
    padding:       "0 0 12px",
    display:       "block",
  };

  /* ── Success ── */
  if (view === "success") {
    return (
      <div style={wrap}>
        <div style={{ ...card, alignItems: "center", textAlign: "center" }}>
          <CheckCircle2 size={44} color="#34d399" />
          <div>
            <div style={{ fontFamily: CP, fontSize: 24, color: "#fff", letterSpacing: "0.06em", marginBottom: 6 }}>
              YOU&apos;RE NOW PRO
            </div>
            <div style={{ fontFamily: BODY, fontSize: 12, color: "#666" }}>
              1 year of full Pro access unlocked. Welcome to the elite.
            </div>
          </div>
          <button onClick={onSuccess} style={btnGold}>
            ENTER THE ARENA →
          </button>
        </div>
      </div>
    );
  }

  /* ── Coupon ── */
  if (view === "coupon") {
    return (
      <div style={wrap}>
        <div style={card}>
          <div>
            <button style={backBtn} onClick={() => reset("choice")}>← BACK</button>
            <div style={{ fontFamily: CP, fontSize: 20, color: "#fff", letterSpacing: "0.06em" }}>
              ENTER COUPON CODE
            </div>
            <div style={{ fontFamily: BODY, fontSize: 11, color: "#666", marginTop: 4 }}>
              Got a code? Enter it below to unlock Pro for free.
            </div>
          </div>
          <input
            style={inputStyle}
            placeholder="YOUR CODE HERE"
            value={coupon}
            onChange={e => { setCoupon(e.target.value.toUpperCase()); setError(null); }}
            onKeyDown={e => e.key === "Enter" && !loading && applyCoupon()}
            autoFocus
          />
          {error && (
            <div style={{ fontFamily: BODY, fontSize: 11, color: "#f87171", marginTop: -8 }}>{error}</div>
          )}
          <button onClick={applyCoupon} disabled={loading} style={btnGold}>
            {loading ? "APPLYING…" : "APPLY CODE"}
          </button>
          {onSkip && (
            <button onClick={onSkip} style={{ ...btnOutline }}>
              SKIP FOR NOW
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ── Payment ── */
  if (view === "payment") {
    return (
      <div style={wrap}>
        <div style={card}>
          <div>
            <button style={backBtn} onClick={() => reset("choice")}>← BACK</button>
            <div style={{ fontFamily: CP, fontSize: 20, color: "#fff", letterSpacing: "0.06em" }}>
              PAY ₹499 FOR PRO
            </div>
            <div style={{ fontFamily: BODY, fontSize: 11, color: "#666", marginTop: 4 }}>
              1 year of full Pro access. We&apos;ll send you to our secure payment page.
            </div>
          </div>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: "#666", letterSpacing: "0.14em", marginBottom: 6 }}>
              MOBILE NUMBER
            </div>
            <input
              style={inputStyle}
              placeholder="10-digit mobile number"
              value={phone}
              onChange={e => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setError(null); }}
              onKeyDown={e => e.key === "Enter" && !loading && startPayment()}
              type="tel"
              autoFocus
            />
          </div>
          {error && (
            <div style={{ fontFamily: BODY, fontSize: 11, color: "#f87171", marginTop: -8 }}>{error}</div>
          )}
          <button onClick={startPayment} disabled={loading} style={btnGold}>
            {loading ? "REDIRECTING TO PAYMENT…" : "PAY ₹499 →"}
          </button>
          {onSkip && (
            <button onClick={onSkip} style={{ ...btnOutline }}>
              SKIP FOR NOW
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ── Choice (default) ── */
  return (
    <div style={wrap}>
      <div style={card}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
              <Zap size={14} color="#f5c451" fill="#f5c451" />
              <span style={{ fontFamily: MONO, fontSize: 9, color: "#f5c451", letterSpacing: "0.2em" }}>
                UPGRADE TO PRO
              </span>
            </div>
            <div style={{ fontFamily: CP, fontSize: 26, color: "#fff", letterSpacing: "0.06em", lineHeight: 1.05 }}>
              UNLOCK THE<br />FULL ARENA
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontFamily: CP, fontSize: 30, color: "#f5c451", lineHeight: 1 }}>₹499</div>
            <div style={{ fontFamily: BODY, fontSize: 10, color: "#666" }}>/ year</div>
          </div>
        </div>

        {/* Feature list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {PRO_FEATURES.map(f => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <CheckCircle2 size={13} color="#34d399" />
              <span style={{ fontFamily: BODY, fontSize: 12, color: "#bbb" }}>{f}</span>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={() => reset("payment")} style={btnGold}>
            PAY ₹499 →
          </button>
          <button onClick={() => reset("coupon")} style={btnOutline}>
            I HAVE A COUPON CODE
          </button>
          {onSkip && (
            <button onClick={onSkip} style={{
              background: "none", border: "none", color: "#555",
              cursor: "pointer", fontFamily: MONO, fontSize: 9,
              letterSpacing: "0.16em", padding: "4px 0",
            }}>
              SKIP FOR NOW →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
