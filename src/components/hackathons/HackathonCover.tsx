/**
 * Hackathon cover. Renders the uploaded banner when present, otherwise a
 * generated on-brand SVG cover (samurai-themed, deterministic per title) so
 * a missing banner never looks empty.
 */

const ACCENTS = ["#7c3aed", "#c026d3", "#2563eb", "#0891b2", "#d97706", "#dc2626"];

function pickAccent(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return ACCENTS[Math.abs(h) % ACCENTS.length];
}

export default function HackathonCover({
  bannerUrl,
  title,
  className = "",
  imgClassName = "w-full h-full object-cover",
}: {
  bannerUrl: string | null;
  title: string;
  className?: string;
  imgClassName?: string;
}) {
  if (bannerUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={bannerUrl} alt={title} className={imgClassName} />;
  }

  const seed = title || "arenax";
  const accent = pickAccent(seed);
  let sum = 0;
  for (let i = 0; i < seed.length; i++) sum += seed.charCodeAt(i);
  const uid = `hc-${sum}`;

  return (
    <svg
      viewBox="0 0 800 300"
      preserveAspectRatio="xMidYMid slice"
      className={`w-full h-full ${className}`}
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#15101f" />
          <stop offset="55%" stopColor="#0d0a16" />
          <stop offset="100%" stopColor="#08070d" />
        </linearGradient>
        <radialGradient id={`${uid}-glow`} cx="78%" cy="22%" r="60%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
        <pattern id={`${uid}-dots`} x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.5" fill="#ffffff" opacity="0.05" />
        </pattern>
      </defs>

      <rect width="800" height="300" fill={`url(#${uid}-bg)`} />
      <rect width="800" height="300" fill={`url(#${uid}-dots)`} />
      <rect width="800" height="300" fill={`url(#${uid}-glow)`} />

      {/* kanji watermark — 戦 (battle) */}
      <text
        x="610" y="250" textAnchor="middle"
        fontSize="320" fontWeight="700"
        fill={accent} opacity="0.12"
        fontFamily="var(--font-jp), 'Noto Serif JP', serif"
      >
        戦
      </text>

      {/* mountain silhouette */}
      <path d="M0 300 L150 170 L260 230 L400 130 L560 240 L680 175 L800 240 L800 300 Z" fill="#000" opacity="0.45" />
      <path d="M0 300 L120 215 L300 260 L470 200 L640 255 L800 210 L800 300 Z" fill="#000" opacity="0.6" />

      {/* katana accent stroke */}
      <g stroke={accent} strokeLinecap="round" opacity="0.9">
        <line x1="70" y1="232" x2="300" y2="92" strokeWidth="5" />
        <line x1="296" y1="96" x2="320" y2="84" strokeWidth="12" />
      </g>
      <circle cx="305" cy="93" r="9" fill="none" stroke={accent} strokeWidth="3" opacity="0.9" />

      {/* corner ticks */}
      <path d="M22 22 H64 M22 22 V64" stroke={accent} strokeWidth="3" fill="none" opacity="0.7" />
      <path d="M778 278 H736 M778 278 V236" stroke={accent} strokeWidth="3" fill="none" opacity="0.7" />
    </svg>
  );
}
