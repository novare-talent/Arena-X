"use client";

import { useState, useCallback } from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import React from "react";
import StoryCard from "./StoryCard";
import type { ShareCardProps } from "./StoryCard";

const SHARE_URL = "https://arena.novaretalent.com";

const LINKEDIN_ICON = (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="#0a66c2">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const CHANNELS = [
  { id: "twitter",   label: "Twitter / X",  icon: <span style={{ fontSize: 22, color: "#f3eef8", fontFamily: "serif", fontWeight: 700 }}>𝕏</span> },
  { id: "linkedin",  label: "LinkedIn",     icon: LINKEDIN_ICON },
  { id: "whatsapp",  label: "WhatsApp",     icon: <span style={{ fontSize: 22 }}>💬</span> },
  { id: "copy",      label: "Copy Link",    icon: <span style={{ fontSize: 22 }}>🔗</span> },
  { id: "download",  label: "Download PNG", icon: <span style={{ fontSize: 22 }}>⬇</span> },
  { id: "share",     label: "Share",        icon: <span style={{ fontSize: 22 }}>📤</span> },
];

function getShareText(props: ShareCardProps, channel: string) {
  const base = SHARE_URL;
  if (channel === "twitter")  return encodeURIComponent(`${props.tierLabel} rank · ${props.elo} ELO · ${props.streak > 0 ? `${props.streak}W streak 🔥` : `${props.wins}W-${props.losses}L`} on @ArenaX → ${base} #ArenaX #CompetitiveCoding`);
  if (channel === "linkedin") return encodeURIComponent(`Reached ${props.tierLabel} tier on ArenaX with ${props.elo} ELO and ${props.wins}W-${props.losses}L record. Competitive coding platform built for engineers. Challenge me at ${base}`);
  if (channel === "whatsapp") return encodeURIComponent(`I'm ranked ${props.tierLabel} on ArenaX 🗡️  ELO: ${props.elo} | ${props.wins}W-${props.losses}L${props.streak > 0 ? ` | ${props.streak}W streak 🔥` : ""} → ${base}`);
  return base;
}

async function captureCard(cardProps: ShareCardProps): Promise<Blob | null> {
  const [html2canvas, { createRoot }] = await Promise.all([
    import("html2canvas").then(m => m.default),
    import("react-dom/client"),
  ]);

  const w = 540, h = 960;
  const wrap = document.createElement("div");
  wrap.style.cssText = `position:fixed;top:0;left:-${w + 200}px;width:${w}px;height:${h}px;pointer-events:none;z-index:9999`;
  document.body.appendChild(wrap);

  const root = createRoot(wrap);
  root.render(React.createElement(StoryCard, cardProps));

  // Wait two rAF cycles for React to commit the tree
  await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));

  // Wait for every <img> in the card to finish loading (background + character)
  const imgs = Array.from(wrap.querySelectorAll("img")) as HTMLImageElement[];
  await Promise.all(
    imgs.map(img =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>(res => { img.onload = () => res(); img.onerror = () => res(); })
    )
  );

  // One extra rAF so the browser has painted the loaded images
  await new Promise<void>(r => requestAnimationFrame(() => r()));

  const el = wrap.firstElementChild as HTMLElement;
  const canvas = await html2canvas(el, {
    useCORS: true,
    allowTaint: false,
    backgroundColor: null,
    scale: 2,
    logging: false,
    width: w,
    height: h,
    imageTimeout: 15000,
  });

  root.unmount();
  document.body.removeChild(wrap);

  return new Promise(r => canvas.toBlob(r, "image/png"));
}

export interface ShareSheetProps extends ShareCardProps {
  open: boolean;
  onClose: () => void;
}

export default function ShareSheet({ open, onClose, ...cardProps }: ShareSheetProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [toast, setToast]     = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  const handleChannel = useCallback(async (channelId: string) => {
    if (channelId === "twitter") {
      window.open(`https://twitter.com/intent/tweet?text=${getShareText(cardProps, "twitter")}`, "_blank");
      return;
    }
    if (channelId === "linkedin") {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SHARE_URL)}&summary=${getShareText(cardProps, "linkedin")}`, "_blank");
      return;
    }
    if (channelId === "whatsapp") {
      window.open(`https://api.whatsapp.com/send?text=${getShareText(cardProps, "whatsapp")}`, "_blank");
      return;
    }
    if (channelId === "copy") {
      await navigator.clipboard.writeText(SHARE_URL);
      showToast("Link copied to clipboard!");
      return;
    }

    setLoading(channelId);
    try {
      const blob = await captureCard(cardProps);
      if (!blob) return;

      if (channelId === "download") {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement("a");
        a.href = url; a.download = `arenax-${cardProps.username}.png`; a.click();
        URL.revokeObjectURL(url);
        showToast("Card saved!");
        return;
      }

      if (channelId === "share") {
        if (!navigator.share) { showToast("Native sharing not supported on this device."); return; }
        const file = new File([blob], "arenax-rank.png", { type: "image/png" });
        await navigator.share({ files: [file], title: `${cardProps.displayName} on ArenaX`, text: `${cardProps.tierLabel} · ${cardProps.elo} ELO`, url: SHARE_URL });
        return;
      }
    } finally {
      setLoading(null);
    }
  }, [cardProps]);

  if (!open) return null;

  const SCALE = 0.38;
  const previewW = 540 * SCALE;
  const previewH = 960 * SCALE;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      {/* Dim overlay */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(5,3,7,0.78)", backdropFilter: "blur(4px)" }} onClick={onClose} />

      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.2 }}
        className="ax-card ax-ticks ax-share-grid"
        style={{ position: "relative", zIndex: 2, padding: 24, alignItems: "stretch", width: "100%", maxWidth: 720, maxHeight: "90vh", overflow: "auto" }}>

        {/* Close */}
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer", color: "var(--smoke)", padding: 4 }}>
          <X size={16} />
        </button>

        {/* LEFT — preview */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="font-cond" style={{ fontSize: 9, color: "var(--ash)", letterSpacing: "0.28em" }}>PREVIEW</div>

          <div style={{ width: previewW, height: previewH, overflow: "hidden", borderRadius: 10, border: "1px solid var(--ink-4)", boxShadow: "0 20px 60px -16px rgba(0,0,0,0.5)", flexShrink: 0, position: "relative" }}>
            <div style={{ transform: `scale(${SCALE})`, transformOrigin: "top left", width: 540, height: 960 }}>
              <StoryCard {...cardProps} />
            </div>
          </div>
        </div>

        {/* RIGHT — controls */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div className="font-cond" style={{ fontSize: 10, color: "var(--violet-300)", letterSpacing: "0.3em" }}>SHARE THE BLADE · 共</div>
          <h2 className="font-display" style={{ fontSize: 42, color: "var(--bone)", margin: "10px 0 0", lineHeight: 0.9 }}>
            CARRY YOUR<br/>RANK <span style={{ color: "var(--violet-400)" }}>OUTSIDE.</span>
          </h2>
          <p style={{ color: "var(--ash)", fontSize: 12, lineHeight: 1.55, marginTop: 12 }}>
            Drop your warrior card into a story or post. Every share brings a new blade to the dōjō.
          </p>

          <div style={{ flex: 1 }} />

          {/* Channel grid */}
          <div style={{ marginTop: 24 }}>
            <div className="font-cond" style={{ fontSize: 9, color: "var(--ash)", letterSpacing: "0.28em", marginBottom: 10 }}>SEND VIA · 送</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {CHANNELS.map(c => (
                <button key={c.id} onClick={() => handleChannel(c.id)} disabled={!!loading}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 72, padding: 8, gap: 6, background: "var(--ink-3)", border: "1px solid var(--ink-4)", borderRadius: 10, cursor: "pointer", opacity: loading && loading !== c.id ? 0.5 : 1, transition: "border-color .15s, background .15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,0.4)"; (e.currentTarget as HTMLElement).style.background = "var(--ink-4)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--ink-4)"; (e.currentTarget as HTMLElement).style.background = "var(--ink-3)"; }}>
                  {loading === c.id
                    ? <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid var(--violet-500)", borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
                    : c.icon
                  }
                  <span className="font-cond" style={{ fontSize: 8, color: "var(--ash)", letterSpacing: "0.12em" }}>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="font-mono" style={{ fontSize: 9, color: "var(--smoke)", marginTop: 16, textAlign: "center" }}>arena.novaretalent.com</div>
        </div>
      </motion.div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            style={{ position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)", background: "var(--ink-3)", border: "1px solid var(--violet-500)", borderRadius: 8, padding: "10px 20px", zIndex: 200 }}>
            <span className="font-cond" style={{ fontSize: 11, color: "var(--bone)", letterSpacing: "0.15em" }}>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
