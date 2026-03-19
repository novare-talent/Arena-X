"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { updateProfile } from "@/app/profile/actions";
import type { Database } from "@/types/database";
import {
  User, Mail, Building2, Globe, Github as GithubIcon, BookOpen,
  Zap, Trophy, Swords, TrendingUp, Copy,
  CheckCircle2, XCircle, Loader2, Edit3, Save, X,
  Flame, Shield,
} from "lucide-react";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Rating  = Database["public"]["Tables"]["user_ratings"]["Row"];

const TIER_CONFIG = {
  unrated:  { label: "Unrated",  color: "#6b7280", icon: "◌" },
  bronze:   { label: "Bronze",   color: "#cd7f32", icon: "⬡" },
  silver:   { label: "Silver",   color: "#c0c0c0", icon: "⬡" },
  gold:     { label: "Gold",     color: "#ffd700", icon: "★" },
  platinum: { label: "Platinum", color: "#00d4ff", icon: "◆" },
  diamond:  { label: "Diamond",  color: "#b9f2ff", icon: "◈" },
} as const;

const TRACK_LABELS: Record<string, string> = {
  dsa: "DSA",
  backend: "Backend",
  ml: "ML / Data Science",
  frontend: "Frontend",
  ai_llm: "AI / LLM",
  security: "Cybersecurity",
};

const EXPERIENCE_OPTIONS = [
  { value: "student", label: "Student" },
  { value: "0-1yr",  label: "0–1 year" },
  { value: "1-3yr",  label: "1–3 years" },
  { value: "3+yr",   label: "3+ years" },
];

const COUNTRIES = [
  "India", "USA", "UK", "Canada", "Australia", "Germany",
  "Singapore", "UAE", "Other",
];

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-[#111118] border border-[#2a2a3a] rounded-xl p-4 hover:border-[#2a2a3a] transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[#5a5a7a] font-medium">{label}</span>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}

export default function ProfileClient({
  profile,
  email,
  ratings,
}: {
  profile: Profile;
  email: string;
  ratings: Rating[];
}) {
  const [editing, setEditing]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [copied, setCopied]     = useState(false);
  const [isPending, startTransition] = useTransition();

  // Local form state (prefilled from profile)
  const [form, setForm] = useState({
    username:         profile.username,
    display_name:     profile.display_name,
    bio:              profile.bio ?? "",
    college:          profile.college ?? "",
    country:          profile.country ?? "India",
    github_username:  profile.github_username ?? "",
    experience_level: profile.experience_level ?? "",
  });

  const dsaRating = ratings.find((r) => r.track === "dsa");
  const totalMatches = ratings.reduce((s, r) => s + r.matches_played, 0);
  const totalWins    = ratings.reduce((s, r) => s + r.wins, 0);
  const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;
  const bestStreak   = Math.max(0, ...ratings.map((r) => r.best_streak));
  const tier = dsaRating?.tier ?? "unrated";
  const tierCfg = TIER_CONFIG[tier];

  function copyReferral() {
    navigator.clipboard.writeText(
      `${window.location.origin}/signup?ref=${profile.referral_code}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateProfile(fd);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setEditing(false);
        setTimeout(() => setSuccess(false), 3000);
      }
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
    <div className="min-h-screen grid-bg relative">
      <div className="orb orb-purple w-80 h-80 top-0 right-0 opacity-15 pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* ── Header / Avatar card ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="bg-[#111118] border border-[#2a2a3a] rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Avatar */}
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#6366f1] to-[#22d3ee] flex items-center justify-center text-3xl font-bold text-white shadow-lg"
                  style={{ boxShadow: "0 0 30px rgba(99,102,241,0.3)" }}>
                  {profile.display_name[0]?.toUpperCase()}
                </div>
                {/* Tier badge overlay */}
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                  style={{ background: "#0d0d15", border: `2px solid ${tierCfg.color}`, color: tierCfg.color }}>
                  {tierCfg.icon}
                </div>
              </div>

              {/* Name + info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-white">{profile.display_name}</h1>
                  {profile.is_pro && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{ background: "linear-gradient(135deg,#6366f1,#22d3ee)", color: "#fff" }}>
                      PRO
                    </span>
                  )}
                </div>
                <p className="text-[#5a5a7a] text-sm">@{profile.username}</p>
                {profile.college && (
                  <p className="text-[#a1a1b5] text-sm mt-1 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    {profile.college}
                  </p>
                )}
                <p className="text-[#5a5a7a] text-xs mt-1">{email}</p>
              </div>

              {/* Tier badge */}
              <div className="flex flex-col items-center gap-1 px-5 py-3 rounded-xl border shrink-0"
                style={{ background: `${tierCfg.color}10`, borderColor: `${tierCfg.color}30` }}>
                <span className="text-2xl" style={{ color: tierCfg.color }}>{tierCfg.icon}</span>
                <span className="text-xs font-bold" style={{ color: tierCfg.color }}>{tierCfg.label}</span>
                <span className="text-xs text-[#5a5a7a]">{dsaRating?.elo ?? 800} ELO</span>
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-[#a1a1b5] text-sm mt-4 leading-relaxed border-t border-[#2a2a3a] pt-4">
                {profile.bio}
              </p>
            )}

            {/* Referral code */}
            <div className="mt-4 flex items-center gap-2 p-3 rounded-lg border border-[#2a2a3a] bg-[#0d0d15]">
              <Zap className="w-4 h-4 text-[#6366f1] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#5a5a7a]">Your referral code</p>
                <p className="text-sm font-mono font-bold text-[#818cf8]">{profile.referral_code}</p>
              </div>
              <button
                onClick={copyReferral}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ background: copied ? "rgba(34,197,94,0.1)" : "rgba(99,102,241,0.1)",
                         border: `1px solid ${copied ? "rgba(34,197,94,0.3)" : "rgba(99,102,241,0.2)"}`,
                         color: copied ? "#22c55e" : "#818cf8" }}
              >
                {copied ? <><CheckCircle2 className="w-3.5 h-3.5" />Copied!</> : <><Copy className="w-3.5 h-3.5" />Copy link</>}
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Stats row ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          <StatCard label="Matches"   value={totalMatches} icon={Swords}    color="#6366f1" />
          <StatCard label="Wins"      value={totalWins}    icon={Trophy}    color="#22c55e" />
          <StatCard label="Win Rate"  value={`${winRate}%`} icon={TrendingUp} color="#22d3ee" />
          <StatCard label="Best Streak" value={bestStreak} icon={Flame}    color="#f59e0b" />
        </motion.div>

        {/* ── Per-track ratings ─────────────────────────────────── */}
        {ratings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <h2 className="text-xs font-semibold text-[#5a5a7a] uppercase tracking-widest mb-3">Track Ratings</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ratings.map((r) => {
                const t = TIER_CONFIG[r.tier];
                return (
                  <div key={r.id} className="bg-[#111118] border border-[#2a2a3a] rounded-xl p-4 hover:border-[#6366f1]/20 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-[#a1a1b5]">
                        {TRACK_LABELS[r.track] ?? r.track}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: `${t.color}15`, color: t.color, border: `1px solid ${t.color}30` }}>
                        {t.label}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-white mb-1">{r.elo}</p>
                    <p className="text-xs text-[#5a5a7a]">
                      {r.wins}W · {r.losses}L · {r.matches_played} matches
                    </p>
                    {/* ELO bar */}
                    <div className="mt-3 h-1.5 bg-[#2a2a3a] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, ((r.elo - 600) / (2400 - 600)) * 100)}%`,
                          background: `linear-gradient(90deg, #6366f1, ${t.color})`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── Edit profile form ─────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <div className="bg-[#111118] border border-[#2a2a3a] rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a3a]">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#6366f1]" />
                <h2 className="text-sm font-semibold text-white">Profile Details</h2>
              </div>
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#818cf8] border border-[#2a2a3a] hover:border-[#6366f1]/40 hover:bg-[#6366f1]/5 transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit profile
                </button>
              ) : (
                <button
                  onClick={cancelEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#5a5a7a] border border-[#2a2a3a] hover:border-red-500/30 hover:text-red-400 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
              )}
            </div>

            {/* Success banner */}
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 px-6 py-3 bg-green-500/10 border-b border-green-500/20"
                >
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-400">Profile updated successfully!</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Row: username + display name */}
              <div className="grid sm:grid-cols-2 gap-4">
                <Field
                  label="Username"
                  name="username"
                  icon={User}
                  value={form.username}
                  onChange={(v) => setForm((f) => ({ ...f, username: v }))}
                  editing={editing}
                  placeholder="your_handle"
                  hint="Letters, numbers, underscores only"
                />
                <Field
                  label="Display Name"
                  name="display_name"
                  icon={User}
                  value={form.display_name}
                  onChange={(v) => setForm((f) => ({ ...f, display_name: v }))}
                  editing={editing}
                  placeholder="Your public name"
                />
              </div>

              {/* Email (read-only) */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#5a5a7a] uppercase tracking-wide">Email</label>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#0a0a0f] border border-[#1a1a24]">
                  <Mail className="w-4 h-4 text-[#5a5a7a]" />
                  <span className="text-sm text-[#5a5a7a]">{email}</span>
                  <span className="ml-auto text-xs text-[#5a5a7a] bg-[#1a1a24] px-2 py-0.5 rounded">Verified</span>
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#5a5a7a] uppercase tracking-wide">Bio</label>
                {editing ? (
                  <textarea
                    name="bio"
                    rows={3}
                    value={form.bio}
                    onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                    placeholder="Tell the community about yourself..."
                    maxLength={200}
                    className="w-full px-3 py-2.5 rounded-lg bg-[#0d0d15] border border-[#2a2a3a] text-white placeholder-[#5a5a7a] text-sm resize-none focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-all"
                  />
                ) : (
                  <p className="text-sm text-[#a1a1b5] bg-[#0a0a0f] border border-[#1a1a24] px-3 py-2.5 rounded-lg min-h-[64px]">
                    {form.bio || <span className="text-[#5a5a7a] italic">No bio yet</span>}
                  </p>
                )}
                {editing && (
                  <p className="text-xs text-[#5a5a7a] text-right">{form.bio.length}/200</p>
                )}
              </div>

              {/* Row: college + country */}
              <div className="grid sm:grid-cols-2 gap-4">
                <Field
                  label="College / Company"
                  name="college"
                  icon={Building2}
                  value={form.college}
                  onChange={(v) => setForm((f) => ({ ...f, college: v }))}
                  editing={editing}
                  placeholder="IIT Bombay, Google, etc."
                />
                {/* Country select */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#5a5a7a] uppercase tracking-wide">Country</label>
                  {editing ? (
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a7a]" />
                      <select
                        name="country"
                        value={form.country}
                        onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                        className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-[#0d0d15] border border-[#2a2a3a] text-white text-sm focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-all appearance-none"
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c} value={c} className="bg-[#0d0d15]">{c}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#0a0a0f] border border-[#1a1a24]">
                      <Globe className="w-4 h-4 text-[#5a5a7a]" />
                      <span className="text-sm text-[#a1a1b5]">{form.country || "—"}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Row: github + experience */}
              <div className="grid sm:grid-cols-2 gap-4">
                <Field
                  label="GitHub Username"
                  name="github_username"
                  icon={GithubIcon}
                  value={form.github_username}
                  onChange={(v) => setForm((f) => ({ ...f, github_username: v }))}
                  editing={editing}
                  placeholder="your-github"
                  prefix="github.com/"
                />
                {/* Experience select */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#5a5a7a] uppercase tracking-wide">Experience Level</label>
                  {editing ? (
                    <div className="relative">
                      <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a7a]" />
                      <select
                        name="experience_level"
                        value={form.experience_level}
                        onChange={(e) => setForm((f) => ({ ...f, experience_level: e.target.value }))}
                        className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-[#0d0d15] border border-[#2a2a3a] text-white text-sm focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-all appearance-none"
                      >
                        <option value="" className="bg-[#0d0d15]">Select level</option>
                        {EXPERIENCE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value} className="bg-[#0d0d15]">{o.label}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#0a0a0f] border border-[#1a1a24]">
                      <BookOpen className="w-4 h-4 text-[#5a5a7a]" />
                      <span className="text-sm text-[#a1a1b5]">
                        {EXPERIENCE_OPTIONS.find((o) => o.value === form.experience_level)?.label ?? "—"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                  >
                    <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <p className="text-sm text-red-400">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Save button */}
              <AnimatePresence>
                {editing && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <button
                      type="submit"
                      disabled={isPending}
                      className="w-full py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 btn-glow disabled:opacity-70 transition-all"
                      style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
                    >
                      {isPending ? (
                        <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
                      ) : (
                        <><Save className="w-4 h-4" />Save Changes</>
                      )}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>
        </motion.div>

        {/* ── Account info ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="bg-[#111118] border border-[#2a2a3a] rounded-2xl p-6">
            <h2 className="text-xs font-semibold text-[#5a5a7a] uppercase tracking-widest mb-4 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" />
              Account Info
            </h2>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <InfoRow label="Member since" value={new Date(profile.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })} />
              <InfoRow label="Pro status" value={profile.is_pro ? "Active ✓" : "Free tier"} highlight={profile.is_pro} />
              <InfoRow label="Intake completed" value={profile.intake_completed ? "Yes ✓" : "Not yet"} highlight={profile.intake_completed} />
              <InfoRow label="Onboarding" value={profile.onboarding_completed ? "Done ✓" : "Pending"} highlight={profile.onboarding_completed} />
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}

// ── Helper sub-components ─────────────────────────────────────────

function Field({
  label, name, icon: Icon, value, onChange, editing, placeholder, hint, prefix,
}: {
  label: string;
  name: string;
  icon: React.ElementType;
  value: string;
  onChange: (v: string) => void;
  editing: boolean;
  placeholder?: string;
  hint?: string;
  prefix?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-[#5a5a7a] uppercase tracking-wide">{label}</label>
      {editing ? (
        <>
          <div className="relative">
            <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a7a]" />
            <input
              name={name}
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-[#0d0d15] border border-[#2a2a3a] text-white placeholder-[#5a5a7a] text-sm focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-all"
            />
          </div>
          {hint && <p className="text-xs text-[#5a5a7a]">{hint}</p>}
        </>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#0a0a0f] border border-[#1a1a24]">
          <Icon className="w-4 h-4 text-[#5a5a7a] shrink-0" />
          <span className="text-sm text-[#a1a1b5] truncate">
            {value ? (prefix ? `${prefix}${value}` : value) : <span className="text-[#5a5a7a] italic">Not set</span>}
          </span>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#1a1a24] last:border-0">
      <span className="text-[#5a5a7a]">{label}</span>
      <span className={highlight ? "text-[#22c55e] font-medium" : "text-[#a1a1b5]"}>{value}</span>
    </div>
  );
}