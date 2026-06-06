"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { updateProfile } from "@/app/profile/actions";
import type { Database } from "@/types/database";
import Link from "next/link";
import Image from "next/image";
import {
  User, Mail, Building2, Globe, Github as GithubIcon, BookOpen,
  Zap, Trophy, Swords, Copy,
  CheckCircle2, XCircle, Loader2, Edit3, Save, X,
  Shield, Minus,
} from "lucide-react";
import {
  Kabuto, dbTierToKabuto, TIER_LABELS,
} from "@/components/ui-samurai/primitives";
import type { KabutoTier } from "@/components/ui-samurai/primitives";

interface RecentMatch {
  id: string; track: string; result: "win" | "loss" | "draw";
  eloDelta: number | null; endReason: string | null;
  endedAt: string | null; problemTitle: string | null;
  opponentName: string; opponentUsername: string | null;
}

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Rating  = Database["public"]["Tables"]["user_ratings"]["Row"];

const BLUR_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

const CP   = "'Copperplate Gothic 32 BC','Copperplate Gothic Bold','Copperplate',var(--font-cinzel,Cinzel),serif";
const BODY = "'DM Sans',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";

const TIER_PATH: {
  dbTiers: string[]; kabutoTier: KabutoTier; charImg: string;
  label: string; jp: string; color: string; elo: string;
}[] = [
  { dbTiers: ["unrated"],             kabutoTier: "ronin",    charImg: "/images/chars/ronin.png",    label: "Rōnin",   jp: "浪人", color: "#6a607a", elo: "< 900"    },
  { dbTiers: ["bronze"],              kabutoTier: "ashigaru", charImg: "/images/chars/ashigaru.png", label: "Ashigaru",jp: "足軽", color: "#8b5cf6", elo: "900–1099"  },
  { dbTiers: ["silver"],              kabutoTier: "samurai",  charImg: "/images/chars/samurai.png",  label: "Samurai", jp: "侍",   color: "#a78bfa", elo: "1100–1299" },
  { dbTiers: ["gold"],                kabutoTier: "daimyo",   charImg: "/images/chars/daimyo.png",   label: "Daimyō",  jp: "大名", color: "#c026d3", elo: "1300–1499" },
  { dbTiers: ["platinum", "diamond"], kabutoTier: "shogun",   charImg: "/images/chars/shogan.png",   label: "Shōgun",  jp: "将軍", color: "#f5c451", elo: "1500+"     },
];

const TRACK_LABELS: Record<string, string> = {
  dsa:      "DSA",
  backend:  "Backend",
  ml:       "ML / Data Science",
  frontend: "Frontend",
  ai_llm:   "AI / LLM",
  security: "Cybersecurity",
};

const EXPERIENCE_OPTIONS = [
  { value: "student", label: "Student"   },
  { value: "0-1yr",   label: "0–1 year"  },
  { value: "1-3yr",   label: "1–3 years" },
  { value: "3+yr",    label: "3+ years"  },
];

const COUNTRIES = [
  "India", "USA", "UK", "Canada", "Australia", "Germany",
  "Singapore", "UAE", "Other",
];

interface ReferralEntry {
  username: string | null;
  display_name: string | null;
  joined_at: string;
  verified: boolean;
  qualified: boolean;
  reward_granted: boolean;
}

interface ReferralGrant {
  tier: number;
  amount_usd: number;
  api_key: string;
  label: string;
  fulfilled_at: string;
}

const REFERRAL_TIERS: { count: number; total: number }[] = [
  { count:  20, total:  10 },
  { count:  75, total:  25 },
  { count: 100, total:  50 },
  { count: 300, total: 100 },
  { count: 500, total: 200 },
];

/* ── Shared section card styles ── */
const SCARD: React.CSSProperties = { background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 12, marginBottom: 10, overflow: "hidden" };
const SCARD_HD: React.CSSProperties = { padding: "12px 18px", borderBottom: "1px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "space-between" };
const SCARD_BODY: React.CSSProperties = { padding: "14px 18px" };
const SCARD_TITLE: React.CSSProperties = { fontFamily: BODY, fontSize: 12, fontWeight: 600, color: "#bbb", letterSpacing: "0.05em" };
const FORM_INPUT: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #2a2a2a", background: "#161616", color: "#bbb", fontFamily: BODY, fontSize: 11, outline: "none" };

function tierToCharImage(tier: string): string {
  if (tier === "bronze")                          return "/images/chars/ashigaru.png";
  if (tier === "silver")                          return "/images/chars/samurai.png";
  if (tier === "gold")                            return "/images/chars/daimyo.png";
  if (tier === "platinum" || tier === "diamond")  return "/images/chars/shogan.png";
  return "/images/chars/ronin.png";
}

function tierProgress(tier: string, elo: number): number {
  if (tier === "unrated")  return Math.min(100, (elo / 900) * 100);
  if (tier === "bronze")   return Math.min(100, ((elo - 900) / 200) * 100);
  if (tier === "silver")   return Math.min(100, ((elo - 1100) / 200) * 100);
  if (tier === "gold")     return Math.min(100, ((elo - 1300) / 200) * 100);
  return Math.min(100, ((elo - 1500) / 200) * 100);
}

const NEXT_TIER_LABEL: Record<string, string> = {
  unrated: "A-900", bronze: "S-1100", silver: "D-1300", gold: "SH-1500",
};

export default function ProfileClient({
  profile, email, ratings, recentMatches, isScout = false, referrals = [], referralGrants = [],
}: {
  profile: Profile;
  email: string;
  ratings: Rating[];
  recentMatches: RecentMatch[];
  isScout?: boolean;
  referrals?: ReferralEntry[];
  referralGrants?: ReferralGrant[];
}) {
  const [editing, setEditing]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [copied, setCopied]     = useState(false);
  const [copiedKeyTier, setCopiedKeyTier] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  /* ── Referral maths ── */
  const qualifiedCount = referrals.filter(r => r.qualified).length;
  const verifiedCount  = referrals.filter(r => r.verified).length;
  const earnedTotal    = REFERRAL_TIERS.reduce((sum, t) => sum + (qualifiedCount >= t.count ? (t.total - sum) : 0), 0);
  const nextTier       = REFERRAL_TIERS.find(t => qualifiedCount < t.count) ?? null;
  const prevCount      = nextTier ? (REFERRAL_TIERS[REFERRAL_TIERS.indexOf(nextTier) - 1]?.count ?? 0) : 500;
  const prevTotal      = nextTier ? (REFERRAL_TIERS[REFERRAL_TIERS.indexOf(nextTier) - 1]?.total ?? 0) : 200;
  const nextDelta      = nextTier ? nextTier.total - prevTotal : 0;
  const progressPct    = nextTier
    ? Math.max(2, Math.round(((qualifiedCount - prevCount) / (nextTier.count - prevCount)) * 100))
    : 100;

  function copyKey(tier: number, key: string) {
    navigator.clipboard.writeText(key);
    setCopiedKeyTier(tier);
    setTimeout(() => setCopiedKeyTier(null), 2000);
  }

  const [form, setForm] = useState({
    username:         profile.username,
    display_name:     profile.display_name,
    bio:              profile.bio ?? "",
    college:          profile.college ?? "",
    country:          profile.country ?? "India",
    github_username:  profile.github_username ?? "",
    experience_level: profile.experience_level ?? "",
  });

  const dsaRating    = ratings.find((r) => r.track === "dsa");
  const totalMatches = ratings.reduce((s, r) => s + r.matches_played, 0);
  const totalWins    = ratings.reduce((s, r) => s + r.wins, 0);
  const totalLosses  = ratings.reduce((s, r) => s + r.losses, 0);
  const winRate      = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;
  const bestStreak   = Math.max(0, ...ratings.map((r) => r.best_streak));
  const tier         = dsaRating?.tier ?? "unrated";
  const elo          = dsaRating?.elo ?? 800;
  const tierInfo     = TIER_LABELS[tier] ?? TIER_LABELS.unrated;
  const charImage    = tierToCharImage(tier);
  const rankFill     = tierProgress(tier, elo);
  const nextTierLabel = NEXT_TIER_LABEL[tier] ?? "MAX";

  void isScout; // reserved for future display

  function copyReferral() {
    navigator.clipboard.writeText(`${window.location.origin}/invite/${profile.referral_code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateProfile(fd);
      if (result.error) { setError(result.error); }
      else { setSuccess(true); setEditing(false); setTimeout(() => setSuccess(false), 3000); }
    });
  }

  function cancelEdit() {
    setEditing(false);
    setError(null);
    setForm({
      username:         profile.username,
      display_name:     profile.display_name,
      bio:              profile.bio ?? "",
      college:          profile.college ?? "",
      country:          profile.country ?? "India",
      github_username:  profile.github_username ?? "",
      experience_level: profile.experience_level ?? "",
    });
  }

  return (
    <div style={{ background: "#111111", minHeight: "100vh" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "62px 32px 48px" }}>

        {/* Eyebrow */}
        <div style={{ fontFamily: BODY, fontSize: 10, letterSpacing: "0.18em", color: "#777", textTransform: "uppercase", marginBottom: 8 }}>
          Warrior Profile
        </div>

        {/* ── PROFILE HEADER ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <div style={{
            background: "#f6f3ee", borderRadius: 12, padding: "20px 24px",
            display: "grid", gridTemplateColumns: "110px 1fr auto", gap: 18,
            alignItems: "center", marginBottom: 10, position: "relative", overflow: "hidden",
          }}>
            {/* Background image */}
            <Image
              src="/images/banners/profile-pic-bg2.png" alt="" fill
              style={{ objectFit: "cover", objectPosition: "left center", pointerEvents: "none", userSelect: "none" }}
              draggable={false} placeholder="blur" blurDataURL={BLUR_URL} priority
              sizes="(max-width: 768px) 100vw, 1100px"
            />

            {/* Avatar */}
            <div style={{
              width: 110, height: 110, borderRadius: "50%",
              background: "#111", overflow: "hidden",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "2px solid rgba(0,0,0,0.15)", flexShrink: 0,
              position: "relative", zIndex: 1, marginLeft: 24,
            }}>
              <Image
                src={charImage} alt="" width={110} height={110}
                style={{ objectFit: "contain", pointerEvents: "none", userSelect: "none" }}
                draggable={false} placeholder="blur" blurDataURL={BLUR_URL}
              />
            </div>

            {/* Center: name + handle + stats */}
            <div style={{ position: "relative", zIndex: 1, paddingLeft: 56 }}>
              <div style={{ fontFamily: CP, fontSize: 36, fontWeight: 700, color: "#111", lineHeight: 1, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                {profile.display_name.toUpperCase()}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: "#888", marginTop: 2, marginBottom: 8 }}>
                @{profile.username}
              </div>
              <div style={{ display: "flex", gap: 14 }}>
                {[
                  { v: String(elo),             l: "ELO"      },
                  { v: `${totalWins}-${totalLosses}`, l: "W/L"  },
                  { v: `${winRate}%`,           l: "Win rate" },
                  { v: `${bestStreak}W`,        l: "Streak"   },
                  { v: String(totalMatches),    l: "Duels"    },
                ].map(s => (
                  <div key={s.l} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 500, color: "#111" }}>{s.v}</span>
                    <span style={{ fontFamily: BODY, fontSize: 7, letterSpacing: "0.14em", color: "#888", textTransform: "uppercase" }}>{s.l}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: college + email + rank bar + buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", minWidth: 200, position: "relative", zIndex: 1 }}>
              {profile.college && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: BODY, fontSize: 11, color: "#555" }}>
                  <Building2 size={11} color="#555" />
                  {profile.college}
                </div>
              )}
              <div style={{ fontFamily: MONO, fontSize: 9, color: "#888", letterSpacing: "0.04em" }}>{email}</div>
              <div style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontFamily: BODY, fontSize: 8, color: "#888", letterSpacing: "0.06em" }}>{elo} {tierInfo.label}</span>
                  <span style={{ fontFamily: BODY, fontSize: 8, color: "#888", letterSpacing: "0.06em" }}>{nextTierLabel}</span>
                </div>
                <div style={{ height: 5, background: "#ddd", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${rankFill}%`, height: "100%", background: "#6c2bd9", borderRadius: 3 }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                <button
                  onClick={() => setEditing(true)}
                  style={{ fontFamily: BODY, fontSize: 10, padding: "5px 12px", borderRadius: 5, border: "1px solid #bbb", background: "transparent", color: "#111", cursor: "pointer", letterSpacing: "0.06em" }}
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── REFER AND EARN ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}>
          <div style={SCARD}>
            <div style={SCARD_HD}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Zap size={13} color="#777" />
                <span style={SCARD_TITLE}>Refer and Earn OpenAI Credits</span>
              </div>
              <span style={{ fontFamily: MONO, fontSize: 9, color: "#34d399", letterSpacing: "0.12em" }}>✦ NEWLY ADDED</span>
            </div>
            <div style={SCARD_BODY}>
              <div style={{ fontFamily: BODY, fontSize: 11, color: "#777", marginBottom: 8 }}>
                {nextTier
                  ? `Invite ${nextTier.count} friends → Enough credits worth $${nextTier.total}`
                  : `You've reached max tier · $${earnedTotal} earned`}
              </div>
              {/* Progress bar */}
              <div style={{ position: "relative", marginBottom: 10 }}>
                <div style={{ position: "absolute", right: 0, top: -14, fontFamily: MONO, fontSize: 9, color: "#777" }}>
                  {qualifiedCount}/{nextTier?.count ?? 500}
                </div>
                <div style={{ height: 5, background: "#2a2a2a", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${progressPct}%`, height: "100%", background: "#f43f5e", borderRadius: 3, transition: "width 0.4s" }} />
                </div>
              </div>
              {/* Referral stats */}
              <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                <span style={{ fontFamily: MONO, fontSize: 10, color: "#34d399" }}>
                  {qualifiedCount} qualified
                </span>
                <span style={{ fontFamily: MONO, fontSize: 10, color: "#888" }}>
                  {verifiedCount}/{referrals.length} joined
                </span>
                {earnedTotal > 0 && (
                  <span style={{ fontFamily: MONO, fontSize: 10, color: "#f5c451" }}>
                    ${earnedTotal} earned
                  </span>
                )}
                {nextTier && nextDelta > 0 && (
                  <span style={{ fontFamily: MONO, fontSize: 10, color: "#a78bfa" }}>
                    → +${nextDelta} next
                  </span>
                )}
              </div>
              {/* Copy link */}
              <button
                onClick={copyReferral}
                style={{
                  width: "100%", padding: 9, borderRadius: 7, border: "1px solid #2a2a2a",
                  background: copied ? "rgba(52,211,153,0.08)" : "#222222",
                  color: copied ? "#34d399" : "#bbb",
                  fontFamily: BODY, fontSize: 11, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  letterSpacing: "0.06em", transition: "all 0.15s",
                }}
              >
                {copied
                  ? <><CheckCircle2 size={13} />Copied!</>
                  : <><Copy size={13} />Copy Invite Link</>}
              </button>
              {/* Referral list */}
              {referrals.length > 0 && (
                <ul style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #2a2a2a", listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  {referrals.slice(0, 6).map((r, i) => (
                    <li key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: MONO, fontSize: 11, color: "#888", overflow: "hidden" }}>
                        <span title={r.qualified ? "Qualified" : r.verified ? "Verified, awaiting first match" : "Unverified"}
                          style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: r.qualified ? "#34d399" : r.verified ? "#8b5cf6" : "#3a3348" }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.display_name ?? (r.username ? `@${r.username}` : "—")}
                        </span>
                      </span>
                      <span style={{ fontFamily: BODY, fontSize: 9, color: "#555", flexShrink: 0 }}>
                        {new Date(r.joined_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                    </li>
                  ))}
                  {referrals.length > 6 && (
                    <li style={{ fontFamily: BODY, fontSize: 9, color: "#555", paddingTop: 4 }}>
                      + {referrals.length - 6} more
                    </li>
                  )}
                </ul>
              )}
              {/* OpenAI keys earned */}
              {referralGrants.length > 0 && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #2a2a2a" }}>
                  <p style={{ fontFamily: BODY, fontSize: 9, color: "#f5c451", letterSpacing: "0.22em", marginBottom: 8 }}>
                    ★ OPENAI KEYS EARNED ({referralGrants.length})
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {referralGrants.map(g => {
                      const justCopied = copiedKeyTier === g.tier;
                      return (
                        <div key={g.tier} style={{ padding: 8, borderRadius: 6, background: "rgba(245,196,81,0.05)", border: "1px solid rgba(245,196,81,0.25)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                            <span style={{ fontFamily: BODY, fontSize: 9, color: "#f5c451", letterSpacing: "0.16em" }}>TIER {g.tier} · +${g.amount_usd}</span>
                            <span style={{ fontFamily: MONO, fontSize: 9, color: "#555" }}>
                              {new Date(g.fulfilled_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <input readOnly value={g.api_key} onFocus={e => e.currentTarget.select()}
                              style={{ flex: 1, minWidth: 0, fontFamily: MONO, fontSize: 10, padding: "4px 8px", borderRadius: 4, outline: "none", background: "rgba(0,0,0,0.35)", color: "#f3eef8", border: "1px solid #2a2a2a" }} />
                            <button onClick={() => copyKey(g.tier, g.api_key)}
                              style={{ fontFamily: BODY, fontSize: 9, padding: "4px 10px", borderRadius: 4, flexShrink: 0, cursor: "pointer", letterSpacing: "0.14em", background: justCopied ? "rgba(52,211,153,0.14)" : "rgba(245,196,81,0.14)", border: `1px solid ${justCopied ? "rgba(52,211,153,0.4)" : "rgba(245,196,81,0.4)"}`, color: justCopied ? "#34d399" : "#f5c451" }}>
                              {justCopied ? "COPIED" : "COPY"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── RANK PATH ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.08 }}>
          <div style={SCARD}>
            <div style={SCARD_HD}>
              <span style={SCARD_TITLE}>Rank Path</span>
            </div>
            <div style={SCARD_BODY}>
              <div style={{ display: "flex", gap: 8 }}>
                {TIER_PATH.map(t => {
                  const isActive = t.dbTiers.includes(tier);
                  return (
                    <div key={t.kabutoTier} style={{
                      flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                      gap: 6, padding: "12px 6px", borderRadius: 10,
                      background: isActive ? `rgba(108,43,217,0.06)` : "#222222",
                      border: `1px solid ${isActive ? "rgba(108,43,217,0.5)" : "#2a2a2a"}`,
                      position: "relative",
                    }}>
                      {isActive && (
                        <div style={{
                          position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
                          background: "#6c2bd9", color: "#fff", borderRadius: 99,
                          fontFamily: BODY, fontSize: 7, padding: "2px 6px", letterSpacing: "0.1em", whiteSpace: "nowrap",
                        }}>YOU</div>
                      )}
                      <div style={{ width: 68, height: 68, borderRadius: "50%", background: "#fff", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Image
                          src={t.charImg} alt={t.label} width={68} height={68}
                          style={{ objectFit: "cover", filter: "invert(1)", pointerEvents: "none", userSelect: "none" }}
                          draggable={false} placeholder="blur" blurDataURL={BLUR_URL} priority
                        />
                      </div>
                      <div style={{ fontFamily: CP, fontSize: 10, color: "#bbb", letterSpacing: "0.06em", textAlign: "center", textTransform: "uppercase" }}>{t.label}</div>
                      <div style={{ fontFamily: "'Noto Serif JP',serif", fontSize: 9, color: "#777" }}>{t.jp}</div>
                      <div style={{ fontFamily: MONO, fontSize: 8, color: "#555" }}>{t.elo}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── PER-TRACK RATINGS ── */}
        {ratings.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}>
            <div style={SCARD}>
              <div style={SCARD_HD}><span style={SCARD_TITLE}>Track Ratings</span></div>
              <div style={{ ...SCARD_BODY, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                {ratings.map(r => {
                  const tInfo = TIER_LABELS[r.tier] ?? TIER_LABELS.unrated;
                  const kt    = dbTierToKabuto(r.tier);
                  return (
                    <div key={r.id} style={{ background: "#222222", border: "1px solid #2a2a2a", borderRadius: 10, padding: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <span style={{ fontFamily: BODY, fontSize: 10, color: "#777", letterSpacing: "0.18em" }}>
                          {(TRACK_LABELS[r.track] ?? r.track).toUpperCase()}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Kabuto size={20} tier={kt} glow={false} />
                          <span style={{ fontFamily: BODY, fontSize: 9, padding: "2px 6px", borderRadius: 4, background: `${tInfo.color}15`, color: tInfo.color, border: `1px solid ${tInfo.color}30`, letterSpacing: "0.1em" }}>
                            {tInfo.label.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <p style={{ fontFamily: CP, fontSize: 24, color: "#fff" }}>{r.elo}</p>
                      <p style={{ fontFamily: BODY, fontSize: 9, marginTop: 2, letterSpacing: "0.12em" }}>
                        <span style={{ color: "#34d399" }}>{r.wins}W</span>{" "}
                        <span style={{ color: "#f43f5e" }}>{r.losses}L</span>{" "}
                        <span style={{ color: "#555" }}>· {r.matches_played} matches</span>
                      </p>
                      <div style={{ marginTop: 10, height: 2, background: "#2a2a2a", borderRadius: 1, overflow: "hidden" }}>
                        <div style={{ width: `${Math.min(100, ((r.elo - 600) / (2400 - 600)) * 100)}%`, height: "100%", background: tInfo.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── PROFILE DETAILS ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.12 }}>
          <div style={SCARD}>
            <div style={SCARD_HD}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <User size={13} color="#777" />
                <span style={SCARD_TITLE}>Profile details</span>
              </div>
              {!editing ? (
                <button onClick={() => setEditing(true)}
                  style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: BODY, fontSize: 10, padding: "4px 12px", borderRadius: 5, border: "1px solid #2a2a2a", background: "transparent", color: "#bbb", cursor: "pointer", letterSpacing: "0.06em" }}>
                  <Edit3 size={11} />Edit
                </button>
              ) : (
                <button onClick={cancelEdit}
                  style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: BODY, fontSize: 10, padding: "4px 12px", borderRadius: 5, border: "1px solid #2a2a2a", background: "transparent", color: "#777", cursor: "pointer", letterSpacing: "0.06em" }}>
                  <X size={11} />Cancel
                </button>
              )}
            </div>

            <AnimatePresence>
              {success && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "rgba(52,211,153,0.08)", borderBottom: "1px solid rgba(52,211,153,0.2)" }}>
                  <CheckCircle2 size={14} color="#34d399" />
                  <span style={{ fontFamily: BODY, fontSize: 11, color: "#34d399" }}>Profile saved</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Username"     name="username"     icon={User}        value={form.username}         onChange={v => setForm(f => ({ ...f, username: v }))}         editing={editing} placeholder="your_handle"          hint="3–20 chars, letters/numbers/_" />
                <Field label="Display Name" name="display_name" icon={User}        value={form.display_name}     onChange={v => setForm(f => ({ ...f, display_name: v }))}     editing={editing} placeholder="Your name" />
              </div>

              {/* Email */}
              <div>
                <div style={{ fontFamily: BODY, fontSize: 9, letterSpacing: "0.14em", color: "#777", textTransform: "uppercase", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                  Email <span style={{ fontFamily: MONO, fontSize: 8, color: "#34d399", letterSpacing: "0.1em" }}>✓ VERIFIED</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 6, background: "#161616", border: "1px solid #2a2a2a" }}>
                  <Mail size={13} color="#555" />
                  <span style={{ fontFamily: BODY, fontSize: 11, color: "#777" }}>{email}</span>
                </div>
              </div>

              {/* Bio */}
              <div>
                <div style={{ fontFamily: BODY, fontSize: 9, letterSpacing: "0.14em", color: "#777", textTransform: "uppercase", marginBottom: 4 }}>Bio</div>
                {editing ? (
                  <>
                    <textarea name="bio" rows={3} value={form.bio}
                      onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                      placeholder="Tell the arena about yourself..." maxLength={200}
                      style={{ ...FORM_INPUT, minHeight: 64, resize: "none" }} />
                    <p style={{ fontFamily: BODY, fontSize: 10, color: "#555", textAlign: "right", marginTop: 2 }}>{form.bio.length}/200</p>
                  </>
                ) : (
                  <div style={{ ...FORM_INPUT, minHeight: 64 }}>
                    {form.bio || <span style={{ color: "#444", fontStyle: "italic" }}>No bio yet</span>}
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="College / Company" name="college"  icon={Building2} value={form.college}         onChange={v => setForm(f => ({ ...f, college: v }))}         editing={editing} placeholder="IIT Bombay, Google, etc." />
                {/* Country select */}
                <div>
                  <div style={{ fontFamily: BODY, fontSize: 9, letterSpacing: "0.14em", color: "#777", textTransform: "uppercase", marginBottom: 4 }}>Country</div>
                  {editing ? (
                    <div style={{ position: "relative" }}>
                      <Globe size={13} color="#555" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                      <select name="country" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                        style={{ ...FORM_INPUT, paddingLeft: 30, appearance: "none" as const }}>
                        {COUNTRIES.map(c => <option key={c} value={c} style={{ background: "#161616" }}>{c}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div style={{ ...FORM_INPUT, display: "flex", alignItems: "center", gap: 8 }}>
                      <Globe size={13} color="#555" />{form.country || "—"}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="GitHub" name="github_username" icon={GithubIcon} value={form.github_username} onChange={v => setForm(f => ({ ...f, github_username: v }))} editing={editing} placeholder="your-github" prefix="github.com/" />
                {/* Experience */}
                <div>
                  <div style={{ fontFamily: BODY, fontSize: 9, letterSpacing: "0.14em", color: "#777", textTransform: "uppercase", marginBottom: 4 }}>Experience Level</div>
                  {editing ? (
                    <div style={{ position: "relative" }}>
                      <BookOpen size={13} color="#555" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                      <select name="experience_level" value={form.experience_level} onChange={e => setForm(f => ({ ...f, experience_level: e.target.value }))}
                        style={{ ...FORM_INPUT, paddingLeft: 30, appearance: "none" as const }}>
                        <option value="" style={{ background: "#161616" }}>Select level</option>
                        {EXPERIENCE_OPTIONS.map(o => <option key={o.value} value={o.value} style={{ background: "#161616" }}>{o.label}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div style={{ ...FORM_INPUT, display: "flex", alignItems: "center", gap: 8 }}>
                      <BookOpen size={13} color="#555" />{EXPERIENCE_OPTIONS.find(o => o.value === form.experience_level)?.label ?? "—"}
                    </div>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: 12, borderRadius: 8, background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)" }}>
                    <XCircle size={14} color="#f43f5e" />
                    <p style={{ fontFamily: BODY, fontSize: 11, color: "#f43f5e" }}>{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {editing && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                    <button type="submit" disabled={isPending}
                      style={{ width: "100%", padding: "10px 0", borderRadius: 8, border: "1px solid rgba(108,43,217,0.5)", background: "#6c2bd9", color: "#fff", fontFamily: BODY, fontSize: 12, letterSpacing: "0.12em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: isPending ? 0.7 : 1 }}>
                      {isPending
                        ? <><Loader2 size={14} className="animate-spin" />Saving…</>
                        : <><Save size={14} />Save Changes</>}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>
        </motion.div>

        {/* ── RECENT MATCHES ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.15 }}>
          <div style={SCARD}>
            <div style={SCARD_HD}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Shield size={13} color="#777" />
                <span style={SCARD_TITLE}>Recent Matches</span>
              </div>
            </div>
            {recentMatches.length === 0 ? (
              <div style={{ ...SCARD_BODY, textAlign: "center", padding: "32px 18px" }}>
                <p style={{ fontFamily: BODY, fontSize: 11, color: "#555", letterSpacing: "0.12em" }}>No matches yet</p>
              </div>
            ) : (
              <div style={{ ...SCARD_BODY, display: "flex", flexDirection: "column", gap: 8 }}>
                {recentMatches.map(m => {
                  const delta        = m.eloDelta;
                  const ResultIcon   = m.result === "win" ? Trophy : m.result === "loss" ? Swords : Minus;
                  const resultColor  = m.result === "win" ? "#34d399" : m.result === "loss" ? "#f43f5e" : "#f5c451";
                  const date         = m.endedAt
                    ? new Date(m.endedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                    : "";
                  return (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 8, background: "#222222", border: "1px solid #2a2a2a" }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: `${resultColor}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <ResultIcon size={14} color={resultColor} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: BODY, fontSize: 12, fontWeight: 500, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {m.problemTitle ?? "—"}
                        </p>
                        <p style={{ fontFamily: BODY, fontSize: 10, color: "#777", marginTop: 1 }}>
                          vs{" "}
                          {m.opponentUsername
                            ? <Link href={`/profile/${m.opponentUsername}`} style={{ color: "#888", textDecoration: "none" }}>@{m.opponentUsername}</Link>
                            : m.opponentName}
                          {" · "}{date}
                        </p>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        {delta !== null
                          ? <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: delta >= 0 ? "#34d399" : "#f43f5e" }}>{delta > 0 ? `+${delta}` : delta}</span>
                          : <span style={{ fontFamily: MONO, fontSize: 13, color: "#555" }}>—</span>}
                        <p style={{ fontFamily: BODY, fontSize: 9, color: "#555", marginTop: 2, textTransform: "uppercase" as const }}>{m.track}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* ── ACCOUNT INFO ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.18 }}>
          <div style={SCARD}>
            <div style={SCARD_HD}><span style={SCARD_TITLE}>Account Info</span></div>
            <div style={{ padding: "0 18px" }}>
              <InfoRow label="Member Since" value={new Date(profile.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })} />
              <InfoRow label="Subscription"  value={profile.is_pro ? "Pro Plan" : "Free Plan"} highlight={!!profile.is_pro} />
              <InfoRow label="Onboarding"    value={profile.onboarding_completed ? "Complete" : "Pending"} highlight={!!profile.onboarding_completed} />
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}

/* ── Sub-components ── */

function Field({ label, name, icon: Icon, value, onChange, editing, placeholder, hint, prefix }: {
  label: string; name: string; icon: React.ElementType; value: string;
  onChange: (v: string) => void; editing: boolean;
  placeholder?: string; hint?: string; prefix?: string;
}) {
  const BODY = "'DM Sans',system-ui,sans-serif";
  const INPUT: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #2a2a2a", background: "#161616", color: "#bbb", fontFamily: BODY, fontSize: 11, outline: "none" };
  return (
    <div>
      <div style={{ fontFamily: BODY, fontSize: 9, letterSpacing: "0.14em", color: "#777", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      {editing ? (
        <>
          <div style={{ position: "relative" }}>
            <Icon size={13} color="#555" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
            <input name={name} type="text" value={value} onChange={e => onChange(e.target.value)}
              placeholder={placeholder}
              style={{ ...INPUT, paddingLeft: 30 }} />
          </div>
          {hint && <p style={{ fontFamily: BODY, fontSize: 9, color: "#555", marginTop: 2 }}>{hint}</p>}
        </>
      ) : (
        <div style={{ ...INPUT, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon size={13} color="#555" style={{ flexShrink: 0 }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {value
              ? (prefix ? `${prefix}${value}` : value)
              : <span style={{ color: "#444", fontStyle: "italic" }}>Not set</span>}
          </span>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #2a2a2a" }}>
      <span style={{ fontFamily: "'DM Sans',system-ui,sans-serif", fontSize: 11, color: "#777" }}>{label}</span>
      <span style={{ fontFamily: "'DM Sans',system-ui,sans-serif", fontSize: 11, color: highlight ? "#34d399" : "#bbb" }}>{value}</span>
    </div>
  );
}