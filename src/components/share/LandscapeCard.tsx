import { Hooded, Moon, LogoKasa, Wordmark } from "@/components/ui-samurai/primitives";

const CHAR_PATHS: Record<string, string> = {
  unrated: "/images/chars/ronin.png",
  bronze:  "/images/chars/ashigaru.png",
  silver:  "/images/chars/samurai.png",
  gold:    "/images/chars/daimyo.png",
  platinum:"/images/chars/shogan.png",
  diamond: "/images/chars/shogan.png",
};
import type { ShareCardProps } from "./StoryCard";

export default function LandscapeCard({ displayName, username, tier, tierLabel, tierJp, elo, wins, losses, streak }: ShareCardProps) {
  return (
    <div style={{ width: 960, height: 540, background: "#050307", position: "relative", overflow: "hidden", display: "grid", gridTemplateColumns: "1fr 1fr", flexShrink: 0 }}>
      {/* LEFT — figure side */}
      <div style={{ position: "relative", overflow: "hidden", borderRight: "1px solid #1c1530" }}>
        <div style={{ position: "absolute", top: -150, left: -150, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(91,33,182,0.55), transparent 70%)" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(180,150,240,0.10) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
        <div style={{ position: "absolute", top: 20, right: 30 }}><Moon size={240} /></div>
        <svg viewBox="0 0 480 200" preserveAspectRatio="none" style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: 180, opacity: 0.5 }}>
          <path d="M0 200 L80 100 L130 140 L200 60 L280 130 L340 90 L420 150 L480 110 L480 200 Z" fill="#15101f" />
          <path d="M0 200 L60 140 L140 170 L230 110 L320 160 L400 130 L480 170 L480 200 Z" fill="#0d0a16" />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Hooded width={260} height={340} />
        </div>
        <div style={{ position: "absolute", top: 24, left: 24, display: "flex", alignItems: "center", gap: 10 }}>
          <LogoKasa size={24} /><Wordmark size={16} />
        </div>
        <div style={{ position: "absolute", bottom: 20, left: 24 }}>
          <div style={{ fontSize: 28, color: "#f3eef8", lineHeight: 1, fontFamily: "Bebas Neue, Impact, system-ui" }}>THE BLADE<br/>RISES.</div>
          <div style={{ fontSize: 11, color: "#a78bfa", marginTop: 6, letterSpacing: "0.2em", fontFamily: "Noto Serif JP, serif" }}>刀 が 上 が る</div>
        </div>
      </div>

      {/* RIGHT — stats side */}
      <div style={{ padding: 32, position: "relative", display: "flex", flexDirection: "column" }}>
        <div style={{ position: "absolute", top: -100, right: -100, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(91,33,182,0.20), transparent 70%)" }} />

        {/* Avatar + name row */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, position: "relative" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", background: "#0d0a16", border: "2px solid rgba(167,139,250,0.4)", flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={CHAR_PATHS[tier] ?? CHAR_PATHS.unrated} alt="" width={72} height={72}
              style={{ objectFit: "contain", filter: "invert(1)", pointerEvents: "none" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: "#6a607a", letterSpacing: "0.28em", fontFamily: "JetBrains Mono, monospace" }}>@{username}</div>
            <div style={{ fontSize: 34, color: "#f3eef8", lineHeight: 0.95, marginTop: 4, fontFamily: "Bebas Neue, Impact, system-ui" }}>
              {displayName.toUpperCase().slice(0, -2)}<span style={{ color: "#8b5cf6" }}>{displayName.toUpperCase().slice(-2)}</span>
            </div>
          </div>
          <div style={{ padding: "4px 12px", borderRadius: 999, background: "rgba(124,58,237,0.15)", border: "1px solid rgba(167,139,250,0.4)", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: "#c4b5fd", fontFamily: "Noto Serif JP, serif" }}>{tierJp}</span>
            <span style={{ fontSize: 9, color: "#c4b5fd", letterSpacing: "0.22em", fontFamily: "Oswald, system-ui" }}>{tierLabel.toUpperCase()}</span>
          </div>
        </div>

        {/* ELO */}
        <div style={{ marginTop: 24, position: "relative" }}>
          <div style={{ fontSize: 10, color: "#a78bfa", letterSpacing: "0.3em", fontFamily: "JetBrains Mono, monospace" }}>ELO · 力</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 4 }}>
            <div style={{ fontSize: 88, color: "#f3eef8", lineHeight: 0.9, fontFamily: "Bebas Neue, Impact, system-ui" }}>{elo}</div>
            {streak > 0 && (
              <div>
                <div style={{ fontSize: 14, color: "#34d399", fontFamily: "JetBrains Mono, monospace" }}>🔥 {streak}W</div>
                <div style={{ fontSize: 9, color: "#6a607a", letterSpacing: "0.18em", fontFamily: "JetBrains Mono, monospace" }}>STREAK</div>
              </div>
            )}
          </div>
          <div style={{ marginTop: 12, height: 4, background: "#15101f", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ width: `${Math.min(100, ((elo % 300) / 300) * 100)}%`, height: "100%", background: "linear-gradient(90deg, #7c3aed, #c026d3)" }} />
          </div>
        </div>

        {/* Stats */}
        <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", border: "1px solid #1c1530", borderRadius: 10 }}>
          {[
            { l: "DUELS",  v: String(wins + losses), jp: "試合" },
            { l: "W / L",  v: `${wins}–${losses}`,   jp: "戦績" },
            { l: "STREAK", v: `${streak}W`,            jp: "連",  gold: true },
          ].map((s, i) => (
            <div key={s.l} style={{ padding: "10px 12px", borderLeft: i ? "1px solid #1c1530" : "none" }}>
              <div style={{ fontSize: 8, color: "#b8b0c8", letterSpacing: "0.28em", fontFamily: "Oswald, system-ui" }}>{s.l}</div>
              <div style={{ fontSize: 22, color: s.gold ? "#f5c451" : "#f3eef8", marginTop: 4, lineHeight: 1, fontFamily: "Bebas Neue, Impact, system-ui" }}>{s.v}</div>
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Footer */}
        <div style={{ paddingTop: 14, marginTop: 14, borderTop: "1px solid #1c1530", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 10, color: "#a78bfa", letterSpacing: "0.22em", fontFamily: "Oswald, system-ui" }}>CHALLENGE THE BLADE</div>
            <div style={{ fontSize: 11, color: "#f3eef8", marginTop: 2, fontFamily: "JetBrains Mono, monospace" }}>arena.novaretalent.com</div>
          </div>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 17.5L3 6l4-4 1.5 1.5"/><path d="M13 19l9-9"/><path d="M17.5 14.5l-3 3"/><path d="M3 3l1 11 8-8z"/></svg>
        </div>
      </div>
    </div>
  );
}
