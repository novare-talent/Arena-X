// ArenaX · Samurai SVG primitives

export type KabutoTier = "ronin" | "ashigaru" | "samurai" | "daimyo" | "shogun";

const KABUTO_COLORS: Record<KabutoTier, { fill: string; stroke: string; accent: string }> = {
  ronin:    { fill: "#1c1530", stroke: "#6a607a", accent: "#94a3b8" },
  ashigaru: { fill: "#1f1736", stroke: "#8b5cf6", accent: "#a78bfa" },
  samurai:  { fill: "#231a40", stroke: "#a78bfa", accent: "#c4b5fd" },
  daimyo:   { fill: "#2a1f4c", stroke: "#c026d3", accent: "#f0abfc" },
  shogun:   { fill: "#3a1f55", stroke: "#f5c451", accent: "#fef3c7" },
};

export function Kabuto({ size = 56, tier = "samurai" as KabutoTier, glow = true }: {
  size?: number;
  tier?: KabutoTier;
  glow?: boolean;
}) {
  const c = KABUTO_COLORS[tier] ?? KABUTO_COLORS.samurai;
  const gradId = `kg-${tier}-${size}`;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none">
      {glow && (
        <defs>
          <radialGradient id={gradId} cx="50%" cy="80%" r="60%">
            <stop offset="0%" stopColor={c.stroke} stopOpacity="0.5" />
            <stop offset="100%" stopColor={c.stroke} stopOpacity="0" />
          </radialGradient>
        </defs>
      )}
      {glow && <circle cx="50" cy="55" r="48" fill={`url(#${gradId})`} />}
      <path d="M22 60 Q22 32 50 28 Q78 32 78 60 Z" fill={c.fill} stroke={c.stroke} strokeWidth="1.2" />
      <path d="M30 35 L18 18 L26 30 Z" fill={c.accent} />
      <path d="M70 35 L82 18 L74 30 Z" fill={c.accent} />
      <circle cx="50" cy="42" r="3.5" fill={c.accent} />
      <path d="M28 60 L72 60 L70 78 Q50 88 30 78 Z" fill={c.fill} stroke={c.stroke} strokeWidth="1" opacity="0.9" />
      <rect x="36" y="65" width="10" height="2" fill={c.stroke} />
      <rect x="54" y="65" width="10" height="2" fill={c.stroke} />
    </svg>
  );
}

export function LogoKasa({ size = 48 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} fill="none">
      <defs>
        <linearGradient id="lk1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
      </defs>
      <path d="M6 36 Q32 12 58 36 Q32 42 6 36 Z" fill="url(#lk1)" />
      <line x1="32" y1="10" x2="32" y2="20" stroke="url(#lk1)" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M16 44 L48 60 M48 44 L16 60" stroke="#f3eef8" strokeWidth="3.2" strokeLinecap="square" />
    </svg>
  );
}

export function Wordmark({ size = 28, color = "#f3eef8" }: { size?: number; color?: string }) {
  return (
    <span
      className="font-display uppercase"
      style={{ fontSize: size, color, letterSpacing: "0.06em", lineHeight: 1 }}
    >
      ARENA<span style={{ color: "#8b5cf6" }}>X</span>
    </span>
  );
}

export function Crest({ size = 36, color = "#a78bfa" }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size}>
      <circle cx="24" cy="24" r="22" fill="none" stroke={color} strokeWidth="1" opacity="0.5" />
      <circle cx="24" cy="24" r="14" fill="none" stroke={color} strokeWidth="1" opacity="0.7" />
      <path d="M24 8 L28 20 L40 20 L30 28 L34 40 L24 32 L14 40 L18 28 L8 20 L20 20 Z" fill={color} opacity="0.85" />
    </svg>
  );
}

export function TierRing({ tier, children, size = 36 }: {
  tier: KabutoTier;
  children: React.ReactNode;
  size?: number;
}) {
  const strokeMap: Record<KabutoTier, string> = {
    ronin:    "conic-gradient(from 220deg, #6a607a, #3a3348, #6a607a)",
    ashigaru: "conic-gradient(from 220deg, #8b5cf6, #5b21b6, #8b5cf6)",
    samurai:  "conic-gradient(from 220deg, #a78bfa, #7c3aed, #c026d3, #a78bfa)",
    daimyo:   "conic-gradient(from 220deg, #c026d3, #7c3aed, #f0abfc, #c026d3)",
    shogun:   "conic-gradient(from 220deg, #f5c451, #d97706, #fef3c7, #f5c451)",
  };
  return (
    <div style={{ background: strokeMap[tier], padding: 2, borderRadius: "50%", display: "inline-block" }}>
      <div style={{ background: "#0d0a16", borderRadius: "50%", padding: 2, display: "flex", alignItems: "center", justifyContent: "center", width: size, height: size }}>
        {children}
      </div>
    </div>
  );
}

export function dbTierToKabuto(tier: string): KabutoTier {
  const map: Record<string, KabutoTier> = {
    unrated:  "ronin",
    bronze:   "ashigaru",
    silver:   "samurai",
    gold:     "daimyo",
    platinum: "shogun",
    diamond:  "shogun",
  };
  return map[tier] ?? "ronin";
}

export function Moon({ size = 280 }: { size?: number }) {
  return (
    <svg viewBox="0 0 300 300" width={size} height={size}>
      <defs>
        <radialGradient id="moonG2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.18" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <radialGradient id="moonG" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f3eef8" stopOpacity="0.10" />
          <stop offset="40%" stopColor="#a78bfa" stopOpacity="0.07" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <circle cx="150" cy="150" r="140" fill="url(#moonG2)" />
      <circle cx="150" cy="150" r="100" fill="url(#moonG)" />
      <circle cx="150" cy="150" r="100" fill="none" stroke="#a78bfa" strokeOpacity="0.22" strokeWidth="0.6" />
      <circle cx="150" cy="150" r="100" fill="none" stroke="#a78bfa" strokeOpacity="0.10" strokeWidth="0.6" strokeDasharray="2 6" />
    </svg>
  );
}

export function Hooded({ width = 320, height = 420 }: { width?: number; height?: number }) {
  return (
    <svg viewBox="0 0 320 420" width={width} height={height} fill="none">
      <defs>
        <linearGradient id="hoodBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#15101f" />
          <stop offset="60%" stopColor="#0a0814" />
          <stop offset="100%" stopColor="#050307" />
        </linearGradient>
        <radialGradient id="hoodEye" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e9d5ff" />
          <stop offset="40%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <path d="M30 420 L40 300 Q70 240 130 230 L190 230 Q250 240 280 300 L290 420 Z"
        fill="url(#hoodBody)" stroke="#7c3aed" strokeOpacity="0.18" strokeWidth="1" />
      <path d="M70 280 Q70 130 160 110 Q250 130 250 280 Q220 250 200 240 L120 240 Q100 250 70 280 Z"
        fill="url(#hoodBody)" stroke="#7c3aed" strokeOpacity="0.25" strokeWidth="1" />
      <path d="M100 240 Q105 175 160 165 Q215 175 220 240 Q200 230 180 228 L140 228 Q120 230 100 240 Z"
        fill="#020104" />
      <ellipse cx="160" cy="210" rx="22" ry="6" fill="url(#hoodEye)" opacity="0.95" />
      <ellipse cx="160" cy="210" rx="9" ry="2.5" fill="#fff" opacity="0.85" />
      <path d="M155 110 Q200 130 240 240" stroke="#7c3aed" strokeOpacity="0.5" strokeWidth="1" fill="none" />
    </svg>
  );
}

export const TIER_LABELS: Record<string, { label: string; jp: string; color: string }> = {
  unrated:  { label: "Rōnin",   jp: "浪人", color: "#6a607a" },
  bronze:   { label: "Ashigaru",jp: "足軽", color: "#8b5cf6" },
  silver:   { label: "Samurai", jp: "侍",   color: "#a78bfa" },
  gold:     { label: "Daimyō",  jp: "大名", color: "#c026d3" },
  platinum: { label: "Shōgun",  jp: "将軍", color: "#f5c451" },
  diamond:  { label: "Shōgun",  jp: "将軍", color: "#f5c451" },
};
