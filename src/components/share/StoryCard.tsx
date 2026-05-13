import { Kabuto, Crest, Moon, LogoKasa, Wordmark } from "@/components/ui-samurai/primitives";
import type { KabutoTier } from "@/components/ui-samurai/primitives";

export interface ShareCardProps {
  displayName: string;
  username: string;
  tier: KabutoTier;
  tierLabel: string;
  tierJp: string;
  tierColor: string;
  elo: number;
  wins: number;
  losses: number;
  streak: number;
  recentForm: ("W" | "L")[];
}

export default function StoryCard({ displayName, username, tier, tierLabel, tierJp, elo, wins, losses, streak, recentForm }: ShareCardProps) {
  const form = recentForm.slice(-12);

  return (
    <div style={{ width: 540, height: 960, background: "#050307", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", flexShrink: 0 }}>
      {/* Atmosphere — solid gradients (no blur for html2canvas compat) */}
      <div style={{ position: "absolute", top: -250, left: -200, width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(91,33,182,0.55), transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -150, right: -150, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(192,38,211,0.35), transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(180,150,240,0.12) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />

      {/* Moon top-right */}
      <div style={{ position: "absolute", top: -40, right: -40, opacity: 0.7, zIndex: 1 }}><Moon size={320} /></div>

      {/* Mountains */}
      <svg viewBox="0 0 540 220" preserveAspectRatio="none" style={{ position: "absolute", bottom: 80, left: 0, width: "100%", height: 240, opacity: 0.5, zIndex: 1 }}>
        <path d="M0 220 L100 100 L180 150 L260 60 L340 130 L420 90 L500 140 L540 110 L540 220 Z" fill="#15101f" />
        <path d="M0 220 L80 150 L180 180 L300 110 L400 160 L500 130 L540 160 L540 220 Z" fill="#0d0a16" />
      </svg>

      {/* Kanji rail */}
      <div style={{ position: "absolute", left: 16, top: 80, writingMode: "vertical-rl", textOrientation: "upright", fontSize: 18, color: "#a78bfa", opacity: 0.35, letterSpacing: "0.5em", fontFamily: "Noto Serif JP, serif", zIndex: 2 }}>道 を 進 む 者</div>

      {/* Top brand bar */}
      <div style={{ padding: "36px 36px 0", position: "relative", zIndex: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><LogoKasa size={26} /><Wordmark size={18} /></div>
        <span style={{ fontSize: 9, color: "#6a607a", letterSpacing: "0.3em", fontFamily: "JetBrains Mono, monospace" }}>侍 S01</span>
      </div>

      {/* Avatar + name + rank */}
      <div style={{ position: "relative", zIndex: 3, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 36px 0", textAlign: "center" }}>
        {/* Ring-wrapped kabuto */}
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.5), transparent 70%)" }} />
          <div style={{ background: "conic-gradient(from 220deg, #a78bfa, #7c3aed, #c026d3, #a78bfa)", padding: 4, borderRadius: "50%", display: "inline-block" }}>
            <div style={{ background: "#0d0a16", borderRadius: "50%", padding: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ background: "#0d0a16", borderRadius: "50%", padding: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Kabuto size={150} tier={tier} glow={false} />
              </div>
            </div>
          </div>
        </div>

        {/* Rank chip */}
        <div style={{ marginTop: 22, padding: "6px 18px", borderRadius: 999, background: "rgba(124,58,237,0.15)", border: "1px solid rgba(167,139,250,0.4)", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16, color: "#c4b5fd", fontFamily: "Noto Serif JP, serif" }}>{tierJp}</span>
          <span style={{ fontSize: 11, color: "#c4b5fd", letterSpacing: "0.32em", fontFamily: "Oswald, system-ui" }}>{tierLabel.toUpperCase()} · TIER</span>
        </div>

        {/* Name */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 11, color: "#6a607a", letterSpacing: "0.3em", fontFamily: "JetBrains Mono, monospace" }}>@{username}</div>
          <div style={{ fontSize: 72, color: "#f3eef8", margin: "8px 0 0", lineHeight: 0.92, fontFamily: "Bebas Neue, Impact, system-ui" }}>
            {displayName.toUpperCase().slice(0, -2)}<span style={{ color: "#8b5cf6" }}>{displayName.toUpperCase().slice(-2)}</span>
          </div>
        </div>

        {/* ELO badge */}
        <div style={{ marginTop: 26, padding: "16px 32px", background: "linear-gradient(180deg, rgba(124,58,237,0.20), rgba(13,10,22,0.5))", border: "1px solid rgba(167,139,250,0.35)", borderRadius: 14, position: "relative", overflow: "hidden" }}>
          <div style={{ fontSize: 10, color: "#a78bfa", letterSpacing: "0.3em", fontFamily: "JetBrains Mono, monospace" }}>ELO · 力</div>
          <div style={{ fontSize: 86, color: "#f3eef8", lineHeight: 1, marginTop: 2, display: "flex", alignItems: "baseline", gap: 10, justifyContent: "center", fontFamily: "Bebas Neue, Impact, system-ui" }}>
            {elo}
            {streak > 0 && <span style={{ fontSize: 16, color: "#34d399", fontFamily: "JetBrains Mono, monospace" }}>+{streak * 20} pts</span>}
          </div>
          <div style={{ fontSize: 9, color: "#6a607a", letterSpacing: "0.22em", marginTop: 2, fontFamily: "JetBrains Mono, monospace" }}>
            {streak > 0 ? `${streak}W STREAK · CLIMBING` : "RANKED"}
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ position: "relative", zIndex: 3, margin: "32px 36px 0", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", border: "1px solid #1c1530", borderRadius: 14, background: "rgba(8,7,13,0.8)" }}>
        {/* Duels */}
        <div style={{ padding: "14px 8px", textAlign: "center" }}>
          <div style={{ fontSize: 9, color: "#b8b0c8", letterSpacing: "0.28em", fontFamily: "Oswald, system-ui" }}>DUELS</div>
          <div style={{ fontSize: 28, color: "#f3eef8", marginTop: 6, lineHeight: 1, fontFamily: "Bebas Neue, Impact, system-ui" }}>{wins + losses}</div>
          <div style={{ fontSize: 11, color: "#a78bfa", marginTop: 2, fontFamily: "Noto Serif JP, serif" }}>試合</div>
        </div>
        {/* W / L */}
        <div style={{ padding: "14px 8px", textAlign: "center", borderLeft: "1px solid #1c1530" }}>
          <div style={{ fontSize: 9, color: "#b8b0c8", letterSpacing: "0.28em", fontFamily: "Oswald, system-ui" }}>W / L</div>
          <div style={{ fontSize: 28, marginTop: 6, lineHeight: 1, fontFamily: "Bebas Neue, Impact, system-ui" }}>
            <span style={{ color: "#34d399" }}>{wins}</span>
            <span style={{ color: "#6a607a", fontSize: 20 }}> – </span>
            <span style={{ color: "#f87171" }}>{losses}</span>
          </div>
          <div style={{ fontSize: 11, color: "#a78bfa", marginTop: 2, fontFamily: "Noto Serif JP, serif" }}>戦績</div>
        </div>
        {/* Streak */}
        <div style={{ padding: "14px 8px", textAlign: "center", borderLeft: "1px solid #1c1530" }}>
          <div style={{ fontSize: 9, color: "#b8b0c8", letterSpacing: "0.28em", fontFamily: "Oswald, system-ui" }}>STREAK</div>
          {streak > 0 ? (
            <div style={{ marginTop: 4, display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <div style={{ padding: "3px 10px", borderRadius: 999, background: "rgba(245,196,81,0.18)", border: "1px solid rgba(245,196,81,0.5)", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 13 }}>🔥</span>
                <span style={{ fontSize: 20, color: "#f5c451", fontFamily: "Bebas Neue, Impact, system-ui", lineHeight: 1 }}>{streak}W</span>
              </div>
              <div style={{ fontSize: 8, color: "#f5c451", letterSpacing: "0.2em", fontFamily: "Oswald, system-ui", opacity: 0.8 }}>HOT STREAK</div>
            </div>
          ) : (
            <div style={{ fontSize: 28, color: "#6a607a", marginTop: 6, lineHeight: 1, fontFamily: "Bebas Neue, Impact, system-ui" }}>—</div>
          )}
          <div style={{ fontSize: 11, color: "#a78bfa", marginTop: 2, fontFamily: "Noto Serif JP, serif" }}>連</div>
        </div>
      </div>

      {/* Recent form */}
      {form.length > 0 && (
        <div style={{ position: "relative", zIndex: 3, padding: "20px 36px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 9, color: "#b8b0c8", letterSpacing: "0.3em", fontFamily: "Oswald, system-ui" }}>RECENT FORM · 形</span>
            <div style={{ flex: 1, height: 1, background: "#1c1530" }} />
          </div>
          <div style={{ display: "flex", gap: 4, justifyContent: "space-between" }}>
            {form.map((r, i) => (
              <div key={i} style={{ flex: 1, height: 26, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontFamily: "JetBrains Mono, monospace", background: r === "W" ? "rgba(52,211,153,0.16)" : "rgba(244,63,94,0.16)", color: r === "W" ? "#6ee7b7" : "#fda4af", border: "1px solid " + (r === "W" ? "rgba(52,211,153,0.35)" : "rgba(244,63,94,0.35)") }}>{r}</div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom CTA */}
      <div style={{ padding: "28px 36px 36px", position: "relative", zIndex: 3, borderTop: "1px solid #1c1530", marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: "#a78bfa", letterSpacing: "0.22em", fontFamily: "Oswald, system-ui" }}>CHALLENGE THE BLADE</div>
            <div style={{ fontSize: 12, color: "#f3eef8", marginTop: 4, letterSpacing: "0.1em", fontFamily: "JetBrains Mono, monospace" }}>arena.novaretalent.com</div>
          </div>
          <Crest size={36} color="#8b5cf6" />
        </div>
        <div style={{ fontSize: 12, color: "#a78bfa", letterSpacing: "0.3em", textAlign: "center", marginTop: 14, opacity: 0.7, fontFamily: "Noto Serif JP, serif" }}>道 を 行 く 者 · 武 士 の 心</div>
      </div>
    </div>
  );
}
