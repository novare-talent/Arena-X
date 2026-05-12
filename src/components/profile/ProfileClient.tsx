"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { updateProfile } from "@/app/profile/actions";
import type { Database } from "@/types/database";
import Link from "next/link";
import {
  User, Mail, Building2, Globe, Github as GithubIcon, BookOpen,
  Zap, Trophy, Swords, TrendingUp, Copy,
  CheckCircle2, XCircle, Loader2, Edit3, Save, X,
  Flame, Shield, Minus,
} from "lucide-react";
import {
  Kabuto, Crest, TierRing, dbTierToKabuto, TIER_LABELS,
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

const TIER_PATH: {
  dbTiers: string[]; kabutoTier: KabutoTier; label: string; jp: string; color: string; elo: string;
}[] = [
  { dbTiers: ["unrated"],             kabutoTier: "ronin",    label: "Rōnin",   jp: "浪人", color: "#6a607a", elo: "< 1000"  },
  { dbTiers: ["bronze"],              kabutoTier: "ashigaru", label: "Ashigaru",jp: "足軽", color: "#8b5cf6", elo: "1000–1199" },
  { dbTiers: ["silver"],              kabutoTier: "samurai",  label: "Samurai", jp: "侍",   color: "#a78bfa", elo: "1200–1499" },
  { dbTiers: ["gold"],                kabutoTier: "daimyo",   label: "Daimyō",  jp: "大名", color: "#c026d3", elo: "1500–1799" },
  { dbTiers: ["platinum", "diamond"], kabutoTier: "shogun",   label: "Shōgun",  jp: "将軍", color: "#f5c451", elo: "1800+"    },
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

export default function ProfileClient({
  profile, email, ratings, recentMatches,
}: {
  profile: Profile;
  email: string;
  ratings: Rating[];
  recentMatches: RecentMatch[];
}) {
  const [editing, setEditing]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [copied, setCopied]     = useState(false);
  const [isPending, startTransition] = useTransition();

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
  const kabutoTier   = dbTierToKabuto(tier);
  const tierInfo     = TIER_LABELS[tier] ?? TIER_LABELS.unrated;

  function copyReferral() {
    navigator.clipboard.writeText(`${window.location.origin}/signup?ref=${profile.referral_code}`);
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
    <div className="min-h-screen" style={{ background: "var(--ink-1)", position: "relative", overflow: "hidden" }}>
      <div className="ax-aura pointer-events-none"
        style={{ width: 600, height: 400, background: "var(--violet-700)", top: 56, right: -100, opacity: 0.15 }} />

      <div className="max-w-4xl mx-auto px-4 pt-20 pb-12 space-y-4">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="ax-card ax-ticks relative overflow-hidden" style={{ padding: 0 }}>
          <div className="ax-dotgrid" style={{ position: "absolute", inset: 0, opacity: 0.2 }} />
          <div className="relative p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">

              {/* Kabuto avatar */}
              <div className="shrink-0">
                <TierRing tier={kabutoTier} size={88}>
                  <Kabuto size={72} tier={kabutoTier} glow={true} />
                </TierRing>
              </div>

              {/* Name block */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-cond text-[10px]"
                    style={{ color: "var(--violet-300)", letterSpacing: "0.3em" }}>WARRIOR PROFILE · 武士</span>
                  <Crest size={12} color="var(--violet-400)" />
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="font-display" style={{ fontSize: 34, color: "var(--bone)", lineHeight: 1 }}>
                    {profile.display_name.toUpperCase()}
                  </h1>
                  {profile.is_pro && (
                    <span className="px-2 py-0.5 rounded font-cond text-[9px]"
                      style={{ background: "linear-gradient(135deg, var(--violet-500), var(--orchid))", color: "#fff", letterSpacing: "0.15em" }}>
                      PRO
                    </span>
                  )}
                </div>
                <p className="font-mono text-xs mt-0.5" style={{ color: "var(--smoke)" }}>@{profile.username}</p>
                {profile.college && (
                  <p className="font-cond text-[10px] mt-1.5 flex items-center gap-1.5"
                    style={{ color: "var(--ash)", letterSpacing: "0.12em" }}>
                    <Building2 className="w-3 h-3" />
                    {profile.college.toUpperCase()}
                  </p>
                )}
                <p className="font-mono text-[10px] mt-0.5" style={{ color: "var(--void)" }}>{email}</p>
              </div>

              {/* Tier display */}
              <div className="ax-card-glass ax-ticks flex flex-col items-center gap-1 px-5 py-3 shrink-0"
                style={{ borderColor: `${tierInfo.color}40` }}>
                <div className="font-jp text-2xl" style={{ color: tierInfo.color }}>{tierInfo.jp}</div>
                <div className="font-display text-sm" style={{ color: tierInfo.color }}>{tierInfo.label.toUpperCase()}</div>
                <div className="font-mono text-xl font-bold mt-1" style={{ color: "var(--violet-200)" }}>{elo}</div>
                <div className="font-cond text-[8px]" style={{ color: "var(--smoke)", letterSpacing: "0.2em" }}>ELO · 力</div>
                <div className="mt-1" style={{ width: 80, height: 2, background: "var(--ink-4)", borderRadius: 1, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, ((elo % 300) / 300) * 100)}%`, height: "100%", background: tierInfo.color }} />
                </div>
              </div>
            </div>

            {profile.bio && (
              <p className="text-sm mt-4 pt-4 leading-relaxed"
                style={{ color: "var(--ash)", borderTop: "1px solid var(--ink-4)" }}>
                {profile.bio}
              </p>
            )}

            {/* Referral */}
            <div className="mt-4 flex items-center gap-2 p-3 rounded-lg"
              style={{ background: "var(--ink-3)", border: "1px solid var(--ink-4)" }}>
              <Zap className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--violet-400)" }} />
              <div className="flex-1 min-w-0">
                <p className="font-cond text-[9px]" style={{ color: "var(--smoke)", letterSpacing: "0.2em" }}>REFERRAL CODE</p>
                <p className="font-mono text-sm font-bold" style={{ color: "var(--violet-300)" }}>{profile.referral_code}</p>
              </div>
              <button onClick={copyReferral}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded font-cond text-[9px] transition-all"
                style={{
                  background: copied ? "rgba(52,211,153,0.1)" : "rgba(124,58,237,0.12)",
                  border: `1px solid ${copied ? "rgba(52,211,153,0.3)" : "rgba(139,92,246,0.3)"}`,
                  color: copied ? "var(--win)" : "var(--violet-300)",
                  letterSpacing: "0.15em",
                }}>
                {copied
                  ? <><CheckCircle2 className="w-3 h-3" />COPIED</>
                  : <><Copy className="w-3 h-3" />COPY</>}
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Tier Path ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="ax-card" style={{ padding: 20 }}>
          <div className="flex items-center gap-2 mb-4">
            <Crest size={13} color="var(--violet-400)" />
            <span className="font-cond text-[10px]" style={{ color: "var(--ash)", letterSpacing: "0.3em" }}>
              RANK PATH · 位階
            </span>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {TIER_PATH.map((t) => {
              const isActive = t.dbTiers.includes(tier);
              return (
                <div key={t.kabutoTier}
                  className="relative flex flex-col items-center gap-2 py-3 px-2 rounded-xl transition-all"
                  style={{
                    background: isActive ? `${t.color}14` : "var(--ink-3)",
                    border: `1px solid ${isActive ? t.color + "50" : "var(--ink-4)"}`,
                    boxShadow: isActive ? `0 0 20px ${t.color}20` : "none",
                  }}>
                  {isActive && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 font-cond text-[7px] px-2 py-0.5 rounded-full"
                      style={{ background: t.color, color: "#fff", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>
                      YOU
                    </div>
                  )}
                  <Kabuto size={40} tier={t.kabutoTier} glow={isActive} />
                  <div className="text-center">
                    <div className="font-jp text-sm leading-none" style={{ color: t.color }}>{t.jp}</div>
                    <div className="font-cond text-[8px] mt-1" style={{ color: isActive ? t.color : "var(--smoke)", letterSpacing: "0.1em" }}>
                      {t.label.toUpperCase()}
                    </div>
                    <div className="font-mono text-[8px] mt-0.5" style={{ color: "var(--void)" }}>{t.elo}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ── Stats row ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "DUELS · 試合",  value: String(totalMatches), accent: "var(--violet-200)", icon: Swords,     wl: false },
            { label: "W / L · 戦績",  value: "",                   accent: "var(--bone)",       icon: Trophy,     wl: true  },
            { label: "WIN RATE",       value: `${winRate}%`,        accent: "var(--win)",        icon: TrendingUp, wl: false },
            { label: "STREAK · 連",   value: `${bestStreak}W`,     accent: "#f5c451",           icon: Flame,      wl: false },
          ].map((s) => (
            <div key={s.label} className="ax-card p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-cond text-[9px]" style={{ color: "var(--ash)", letterSpacing: "0.22em" }}>{s.label}</span>
                <s.icon className="w-3 h-3" style={{ color: s.accent, opacity: 0.7 }} />
              </div>
              {s.wl ? (
                <div className="font-display text-3xl mt-1" style={{ lineHeight: 1 }}>
                  <span style={{ color: "var(--win)" }}>{totalWins}</span>
                  <span style={{ color: "var(--ash)", fontSize: "0.7em", margin: "0 4px" }}>–</span>
                  <span style={{ color: "var(--loss)" }}>{totalLosses}</span>
                </div>
              ) : (
                <div className="font-display text-3xl mt-1" style={{ color: s.accent, lineHeight: 1 }}>{s.value}</div>
              )}
            </div>
          ))}
        </motion.div>

        {/* ── Per-track ratings ── */}
        {ratings.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <div className="font-cond text-[10px] mb-3" style={{ color: "var(--ash)", letterSpacing: "0.3em" }}>
              TRACK RATINGS · 部門
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ratings.map((r) => {
                const tInfo = TIER_LABELS[r.tier] ?? TIER_LABELS.unrated;
                const kt    = dbTierToKabuto(r.tier);
                return (
                  <div key={r.id} className="ax-card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-cond text-[10px]" style={{ color: "var(--ash)", letterSpacing: "0.18em" }}>
                        {(TRACK_LABELS[r.track] ?? r.track).toUpperCase()}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Kabuto size={20} tier={kt} glow={false} />
                        <span className="font-cond text-[9px] px-2 py-0.5 rounded"
                          style={{ background: `${tInfo.color}15`, color: tInfo.color, border: `1px solid ${tInfo.color}30`, letterSpacing: "0.1em" }}>
                          {tInfo.label.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <p className="font-display text-2xl" style={{ color: "var(--bone)" }}>{r.elo}</p>
                    <p className="font-cond text-[9px] mt-0.5" style={{ letterSpacing: "0.12em" }}>
                      <span style={{ color: "var(--win)" }}>{r.wins}W</span>{" "}
                      <span style={{ color: "var(--loss)" }}>{r.losses}L</span>{" "}
                      <span style={{ color: "var(--smoke)" }}>· {r.matches_played} MATCHES</span>
                    </p>
                    <div className="mt-3" style={{ height: 2, background: "var(--ink-4)", borderRadius: 1, overflow: "hidden" }}>
                      <div style={{
                        width: `${Math.min(100, ((r.elo - 600) / (2400 - 600)) * 100)}%`,
                        height: "100%",
                        background: `linear-gradient(90deg, var(--violet-500), ${tInfo.color})`,
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── Edit Profile ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="ax-card overflow-hidden" style={{ padding: 0 }}>
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid var(--ink-4)" }}>
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5" style={{ color: "var(--violet-400)" }} />
                <span className="font-cond text-[10px]" style={{ color: "var(--ash)", letterSpacing: "0.25em" }}>
                  PROFILE DETAILS · 詳細
                </span>
              </div>
              {!editing ? (
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded font-cond text-[9px] transition-all"
                  style={{ border: "1px solid var(--ink-4)", color: "var(--violet-300)", letterSpacing: "0.15em" }}>
                  <Edit3 className="w-3 h-3" />EDIT
                </button>
              ) : (
                <button onClick={cancelEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded font-cond text-[9px] transition-all"
                  style={{ border: "1px solid var(--ink-4)", color: "var(--smoke)", letterSpacing: "0.15em" }}>
                  <X className="w-3 h-3" />CANCEL
                </button>
              )}
            </div>

            <AnimatePresence>
              {success && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 px-5 py-3"
                  style={{ background: "rgba(52,211,153,0.08)", borderBottom: "1px solid rgba(52,211,153,0.2)" }}>
                  <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "var(--win)" }} />
                  <span className="font-cond text-[10px]" style={{ color: "var(--win)", letterSpacing: "0.15em" }}>PROFILE SAVED</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Username" name="username" icon={User} value={form.username}
                  onChange={(v) => setForm((f) => ({ ...f, username: v }))}
                  editing={editing} placeholder="your_handle" hint="3–20 chars, letters/numbers/_" />
                <Field label="Display Name" name="display_name" icon={User} value={form.display_name}
                  onChange={(v) => setForm((f) => ({ ...f, display_name: v }))}
                  editing={editing} placeholder="Your name" />
              </div>

              <div className="space-y-1.5">
                <label className="font-cond text-[9px]" style={{ color: "var(--smoke)", letterSpacing: "0.22em" }}>EMAIL</label>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
                  style={{ background: "var(--ink-3)", border: "1px solid var(--ink-4)" }}>
                  <Mail className="w-3.5 h-3.5" style={{ color: "var(--smoke)" }} />
                  <span className="text-sm" style={{ color: "var(--smoke)" }}>{email}</span>
                  <span className="ml-auto font-cond text-[8px] px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(52,211,153,0.1)", color: "var(--win)", border: "1px solid rgba(52,211,153,0.2)", letterSpacing: "0.1em" }}>
                    VERIFIED
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-cond text-[9px]" style={{ color: "var(--smoke)", letterSpacing: "0.22em" }}>BIO</label>
                {editing ? (
                  <>
                    <textarea name="bio" rows={3} value={form.bio}
                      onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                      placeholder="Tell the arena about yourself..."
                      maxLength={200}
                      className="w-full px-3 py-2.5 rounded-lg text-sm resize-none focus:outline-none transition-all"
                      style={{ background: "var(--ink-3)", border: "1px solid var(--ink-4)", color: "var(--bone)" }}
                    />
                    <p className="text-xs text-right" style={{ color: "var(--smoke)" }}>{form.bio.length}/200</p>
                  </>
                ) : (
                  <p className="text-sm px-3 py-2.5 rounded-lg min-h-[64px]"
                    style={{ color: "var(--ash)", background: "var(--ink-3)", border: "1px solid var(--ink-4)" }}>
                    {form.bio || <span style={{ color: "var(--void)", fontStyle: "italic" }}>No bio yet</span>}
                  </p>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="College / Company" name="college" icon={Building2} value={form.college}
                  onChange={(v) => setForm((f) => ({ ...f, college: v }))}
                  editing={editing} placeholder="IIT Bombay, Google, etc." />
                <div className="space-y-1.5">
                  <label className="font-cond text-[9px]" style={{ color: "var(--smoke)", letterSpacing: "0.22em" }}>COUNTRY</label>
                  {editing ? (
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--smoke)" }} />
                      <select name="country" value={form.country}
                        onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                        className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm focus:outline-none appearance-none"
                        style={{ background: "var(--ink-3)", border: "1px solid var(--ink-4)", color: "var(--bone)" }}>
                        {COUNTRIES.map((c) => <option key={c} value={c} style={{ background: "var(--ink-2)" }}>{c}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
                      style={{ background: "var(--ink-3)", border: "1px solid var(--ink-4)" }}>
                      <Globe className="w-3.5 h-3.5" style={{ color: "var(--smoke)" }} />
                      <span className="text-sm" style={{ color: "var(--ash)" }}>{form.country || "—"}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="GitHub" name="github_username" icon={GithubIcon} value={form.github_username}
                  onChange={(v) => setForm((f) => ({ ...f, github_username: v }))}
                  editing={editing} placeholder="your-github" prefix="github.com/" />
                <div className="space-y-1.5">
                  <label className="font-cond text-[9px]" style={{ color: "var(--smoke)", letterSpacing: "0.22em" }}>EXPERIENCE LEVEL</label>
                  {editing ? (
                    <div className="relative">
                      <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--smoke)" }} />
                      <select name="experience_level" value={form.experience_level}
                        onChange={(e) => setForm((f) => ({ ...f, experience_level: e.target.value }))}
                        className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm focus:outline-none appearance-none"
                        style={{ background: "var(--ink-3)", border: "1px solid var(--ink-4)", color: "var(--bone)" }}>
                        <option value="" style={{ background: "var(--ink-2)" }}>Select level</option>
                        {EXPERIENCE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value} style={{ background: "var(--ink-2)" }}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
                      style={{ background: "var(--ink-3)", border: "1px solid var(--ink-4)" }}>
                      <BookOpen className="w-3.5 h-3.5" style={{ color: "var(--smoke)" }} />
                      <span className="text-sm" style={{ color: "var(--ash)" }}>
                        {EXPERIENCE_OPTIONS.find((o) => o.value === form.experience_level)?.label ?? "—"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-2 p-3 rounded-lg"
                    style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)" }}>
                    <XCircle className="w-3.5 h-3.5" style={{ color: "var(--loss)" }} />
                    <p className="text-sm" style={{ color: "var(--loss)" }}>{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {editing && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                    <button type="submit" disabled={isPending}
                      className="w-full py-3 rounded-xl font-cond text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-70"
                      style={{
                        background: "linear-gradient(180deg, var(--violet-500), var(--violet-700))",
                        color: "#fff", letterSpacing: "0.18em",
                        border: "1px solid rgba(196,181,253,0.3)",
                      }}>
                      {isPending
                        ? <><Loader2 className="w-4 h-4 animate-spin" />SAVING…</>
                        : <><Save className="w-3.5 h-3.5" />SAVE CHANGES</>}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>
        </motion.div>

        {/* ── Recent Matches ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="ax-card" style={{ padding: 0 }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--ink-4)" }}>
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" style={{ color: "var(--violet-400)" }} />
                <span className="font-cond text-[10px]" style={{ color: "var(--ash)", letterSpacing: "0.25em" }}>
                  RECENT MATCHES · 直近
                </span>
              </div>
            </div>
            {recentMatches.length === 0 ? (
              <p className="font-cond text-center py-8" style={{ color: "var(--void)", letterSpacing: "0.2em", fontSize: 11 }}>
                NO MATCHES YET · 未戦
              </p>
            ) : (
              <div className="p-4 space-y-2">
                {recentMatches.map((m) => {
                  const delta = m.eloDelta;
                  const ResultIcon  = m.result === "win" ? Trophy : m.result === "loss" ? Swords : Minus;
                  const resultColor = m.result === "win" ? "var(--win)" : m.result === "loss" ? "var(--loss)" : "#f5c451";
                  const date = m.endedAt
                    ? new Date(m.endedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                    : "";
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                      style={{ background: "var(--ink-3)", border: "1px solid var(--ink-4)" }}>
                      <ResultIcon className="w-3.5 h-3.5 shrink-0" style={{ color: resultColor }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: "var(--bone)" }}>
                          {m.problemTitle ?? "—"}
                        </p>
                        <p className="font-cond text-[9px] mt-0.5" style={{ color: "var(--smoke)", letterSpacing: "0.1em" }}>
                          vs{" "}
                          {m.opponentUsername
                            ? <Link href={`/profile/${m.opponentUsername}`} className="hover:text-white transition-colors">@{m.opponentUsername}</Link>
                            : m.opponentName}
                          {" · "}{date}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {delta !== null ? (
                          <span className="font-mono text-xs font-bold" style={{ color: delta >= 0 ? "var(--win)" : "var(--loss)" }}>
                            {delta > 0 ? `+${delta}` : delta}
                          </span>
                        ) : (
                          <span className="font-mono text-xs" style={{ color: "var(--void)" }}>—</span>
                        )}
                        <p className="font-cond text-[9px] uppercase mt-0.5" style={{ color: "var(--void)" }}>{m.track}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Account Info ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="ax-card p-5">
            <div className="font-cond text-[10px] mb-4" style={{ color: "var(--ash)", letterSpacing: "0.3em" }}>
              ACCOUNT INFO · 情報
            </div>
            <div className="space-y-0">
              <InfoRow label="MEMBER SINCE"
                value={new Date(profile.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })} />
              <InfoRow label="PRO STATUS"  value={profile.is_pro ? "Active ✓" : "Free Tier"} highlight={!!profile.is_pro} />
              <InfoRow label="ONBOARDING"  value={profile.onboarding_completed ? "Complete ✓" : "Pending"}  highlight={!!profile.onboarding_completed} />
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}

function Field({ label, name, icon: Icon, value, onChange, editing, placeholder, hint, prefix }: {
  label: string; name: string; icon: React.ElementType; value: string;
  onChange: (v: string) => void; editing: boolean;
  placeholder?: string; hint?: string; prefix?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="font-cond text-[9px]" style={{ color: "var(--smoke)", letterSpacing: "0.22em" }}>
        {label.toUpperCase()}
      </label>
      {editing ? (
        <>
          <div className="relative">
            <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--smoke)" }} />
            <input name={name} type="text" value={value} onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm focus:outline-none transition-all"
              style={{ background: "var(--ink-3)", border: "1px solid var(--ink-4)", color: "var(--bone)" }}
            />
          </div>
          {hint && <p className="text-xs" style={{ color: "var(--smoke)" }}>{hint}</p>}
        </>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
          style={{ background: "var(--ink-3)", border: "1px solid var(--ink-4)" }}>
          <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--smoke)" }} />
          <span className="text-sm truncate" style={{ color: "var(--ash)" }}>
            {value
              ? (prefix ? `${prefix}${value}` : value)
              : <span style={{ color: "var(--void)", fontStyle: "italic" }}>Not set</span>}
          </span>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid var(--ink-4)" }}>
      <span className="font-cond text-[9px]" style={{ color: "var(--smoke)", letterSpacing: "0.18em" }}>{label}</span>
      <span className="font-cond text-[9px]" style={{ color: highlight ? "var(--win)" : "var(--ash)", letterSpacing: "0.1em" }}>{value}</span>
    </div>
  );
}
