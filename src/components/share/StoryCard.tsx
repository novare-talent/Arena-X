const CHAR_PATHS: Record<string, string> = {
  unrated:  "/images/chars/ronin.png",
  bronze:   "/images/chars/ashigaru.png",
  silver:   "/images/chars/samurai.png",
  gold:     "/images/chars/daimyo.png",
  platinum: "/images/chars/shogan.png",
  diamond:  "/images/chars/shogan.png",
};

export interface ShareCardProps {
  displayName: string;
  username: string;
  tier: string;
  tierLabel: string;
  tierJp: string;
  tierColor: string;
  elo: number;
  wins: number;
  losses: number;
  streak: number;
  recentForm: ("W" | "L")[];
}

export default function StoryCard({ displayName, tier, tierLabel, tierJp, elo, wins, losses, streak }: ShareCardProps) {
  const totalDuels = wins + losses;
  const nameFontSize = displayName.length > 11 ? 52 : displayName.length > 8 ? 64 : displayName.length > 6 ? 74 : 84;
  const nameStr = displayName.length > 11 ? displayName.slice(0, 11).toUpperCase() : displayName.toUpperCase();

  return (
    <div style={{
      width: 540, height: 960,
      position: "relative", overflow: "hidden", flexShrink: 0,
    }}>

      {/* ── BACKGROUND (cherry blossom + grass template) ── */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/share-card-bg.png"
        alt=""
        width={540} height={960}
        style={{
          position: "absolute", top: 0, left: 0,
          width: "100%", height: "100%",
          objectFit: "cover",
          pointerEvents: "none", userSelect: "none",
          zIndex: 0,
        }}
      />

      {/* ── CHARACTER CIRCLE ──────────────────── */}
      {/* NOTE: no CSS transforms — html2canvas can't handle translateX(-50%) */}
      <div style={{
        position: "absolute",
        top: 115,
        left: 170,  /* (540 - 200) / 2 */
        zIndex: 2,
        width: 200, height: 200,
        borderRadius: "50%",
        background: "#080808",
        overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={CHAR_PATHS[tier] ?? CHAR_PATHS.unrated}
          alt="" width={200} height={200}
          style={{
            objectFit: "contain",
            filter: "invert(1)",
            pointerEvents: "none", userSelect: "none",
          }}
        />
      </div>

      {/* ── PLAYER NAME ───────────────────────── */}
      <div style={{
        position: "absolute",
        top: 346, left: 20, right: 20,
        zIndex: 2, textAlign: "center",
        fontFamily: "Bebas Neue, Impact, Arial Narrow, system-ui",
        fontSize: nameFontSize,
        lineHeight: 0.9,
        letterSpacing: "0.06em",
        color: "#0e0a06",
      }}>
        {nameStr}
      </div>

      {/* ── TIER LABEL ────────────────────────── */}
      <div style={{
        position: "absolute",
        top: 452, left: 0, right: 0,
        zIndex: 2, textAlign: "center",
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontStyle: "italic",
        fontSize: 22,
        color: "#3a2a16",
        letterSpacing: "0.06em",
      }}>
        {tierJp} · {tierLabel}
      </div>

      {/* ── ELO NUMBER ────────────────────────── */}
      <div style={{
        position: "absolute",
        top: 590, left: 0, right: 0,
        zIndex: 2, textAlign: "center",
        fontFamily: "Bebas Neue, Impact, Arial Narrow, system-ui",
        fontSize: 96,
        color: "#39ff14",
        lineHeight: 0.85,
        letterSpacing: "0.02em",
      }}>
        {elo}
      </div>

      {/* ── ELO RATING LABEL ──────────────────── */}
      <div style={{
        position: "absolute",
        top: 718, left: 0, right: 0,
        zIndex: 2, textAlign: "center",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        fontSize: 14,
        color: "#9ca3af",
        letterSpacing: "0.12em",
      }}>
        ELO Rating
      </div>

      {/* ── STATS DIVIDER ─────────────────────── */}
      <div style={{
        position: "absolute",
        top: 752, left: 48, right: 48,
        height: 1,
        background: "rgba(255,255,255,0.12)",
        zIndex: 2,
      }} />

      {/* ── STATS ROW ─────────────────────────── */}
      <div style={{
        position: "absolute",
        top: 752, left: 0, right: 0,
        zIndex: 2, display: "flex",
      }}>
        {/* Duel matches */}
        <div style={{ flex: 1, padding: "16px 8px 0", textAlign: "center" }}>
          <div style={{
            fontFamily: "Bebas Neue, Impact, Arial Narrow, system-ui",
            fontSize: 36, color: "#ffffff", lineHeight: 1,
          }}>
            {totalDuels}
          </div>
          <div style={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: 10, color: "#9ca3af",
            letterSpacing: "0.08em", marginTop: 4,
          }}>
            Duel match{totalDuels !== 1 ? "es" : ""}
          </div>
        </div>

        <div style={{ width: 1, background: "rgba(255,255,255,0.12)", margin: "10px 0" }} />

        {/* W / L */}
        <div style={{ flex: 1, padding: "16px 8px 0", textAlign: "center" }}>
          <div style={{
            fontFamily: "Bebas Neue, Impact, Arial Narrow, system-ui",
            fontSize: 36, lineHeight: 1,
          }}>
            <span style={{ color: "#4ade80" }}>{wins}</span>
            <span style={{ color: "#6b7280", fontSize: 28 }}>-</span>
            <span style={{ color: "#f87171" }}>{losses}</span>
          </div>
          <div style={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: 10, color: "#9ca3af",
            letterSpacing: "0.08em", marginTop: 4,
          }}>
            win/lose
          </div>
        </div>

        <div style={{ width: 1, background: "rgba(255,255,255,0.12)", margin: "10px 0" }} />

        {/* Streak */}
        <div style={{ flex: 1, padding: "16px 8px 0", textAlign: "center" }}>
          <div style={{
            fontFamily: "Bebas Neue, Impact, Arial Narrow, system-ui",
            fontSize: 36, color: "#ffffff", lineHeight: 1,
          }}>
            {streak > 0 ? `${streak}W` : "—"}
          </div>
          <div style={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: 10, color: "#9ca3af",
            letterSpacing: "0.08em", marginTop: 4,
          }}>
            Streak
          </div>
        </div>
      </div>

      {/* ── TAGLINE ───────────────────────────── */}
      <div style={{
        position: "absolute",
        bottom: 42, left: 0, right: 0,
        zIndex: 2, textAlign: "center",
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: 12,
        color: "rgba(255,255,255,0.30)",
        letterSpacing: "0.28em",
      }}>
        Commit&nbsp;&nbsp;Compete&nbsp;&nbsp;Conquer
      </div>

    </div>
  );
}
