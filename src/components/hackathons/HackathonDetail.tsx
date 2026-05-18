"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Trophy, Calendar, Users, Globe, Github, Play,
  CheckCircle2, Clock, Send, Loader2, ExternalLink, Lock, HardDrive,
} from "lucide-react";
import HackathonCover from "@/components/hackathons/HackathonCover";

// ── Types ──────────────────────────────────────────────────────────────
interface Prize { place: string; amount: string; label?: string }

interface Hackathon {
  id: string; slug: string; title: string; tagline: string | null;
  description: string | null; banner_url: string | null; status: string;
  registration_deadline: string | null; starts_at: string | null; ends_at: string | null;
  prizes: Prize[]; tags: string[]; max_team_size: number;
  allow_solo: boolean; allow_teams: boolean; problem_statement: string | null;
}

interface Registration {
  id: string; team_name: string | null; teammate_ids: string[];
}

interface Submission {
  id: string; title: string | null; description: string | null;
  project_url: string | null; demo_url: string | null; github_url: string | null; drive_url: string | null;
  submitted_at: string;
  profiles: { display_name: string | null; username: string; avatar_url: string | null } | null;
}

interface Props {
  hackathon: Hackathon;
  userId: string | null;
  myRegistration: Registration | null;
  mySubmission: Submission | null;
  submissions: Submission[];
  participantCount: number;
}

const STATUS_COLORS: Record<string, string> = {
  upcoming: "#6366f1", active: "#22c55e", judging: "#f59e0b", ended: "#5a5a7a",
};
const STATUS_LABELS: Record<string, string> = {
  upcoming: "Registering", active: "Live", judging: "Judging", ended: "Ended",
};
const PLACE_COLORS: Record<string, string> = {
  "1st": "#ffd700", "2nd": "#c0c0c0", "3rd": "#cd7f32",
};

function fmtDate(d: string | null) {
  if (!d) return "TBA";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtShort(d: string | null) {
  if (!d) return "TBA";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

type Tab = "overview" | "register" | "problem" | "submissions";

export default function HackathonDetail({ hackathon: h, userId, myRegistration, mySubmission, submissions, participantCount }: Props) {
  const statusColor = STATUS_COLORS[h.status] ?? "#5a5a7a";
  const canRegister = (h.status === "upcoming" || h.status === "active") && userId;
  const canSubmit   = h.status === "active" && myRegistration && userId;
  const problemVisible = h.status === "active" || h.status === "judging" || h.status === "ended";

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview",    label: "Overview" },
    { id: "register",    label: myRegistration ? "Registered ✓" : "Register" },
    { id: "problem",     label: "Problem" },
    { id: "submissions", label: `Submissions (${submissions.length})` },
  ];

  const [activeTab, setActiveTab] = useState<Tab>("overview");

  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-20 pb-16">

      {/* Banner */}
      <div className="relative h-52 md:h-64 overflow-hidden bg-gradient-to-br from-[#6366f1]/20 to-[#22d3ee]/10">
        <HackathonCover bannerUrl={h.banner_url} title={h.title} imgClassName="w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: statusColor }} />
            <span className="text-xs font-semibold" style={{ color: statusColor }}>{STATUS_LABELS[h.status]}</span>
            {h.tags.map((t) => (
              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-[#6366f1]/10 text-[#818cf8] border border-[#6366f1]/20">{t}</span>
            ))}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white">{h.title}</h1>
          {h.tagline && <p className="text-[#a1a1b5] mt-1">{h.tagline}</p>}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-6">

        {/* Stats row */}
        <div className="flex flex-wrap gap-4 mb-6 text-sm text-[#5a5a7a]">
          <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />
            {fmtShort(h.starts_at)} → {fmtShort(h.ends_at)}
          </span>
          <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{participantCount} registered</span>
          {h.prizes[0] && (
            <span className="flex items-center gap-1.5 text-[#ffd700]"><Trophy className="w-4 h-4" />{h.prizes[0].amount} top prize</span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[#1e1e2e] mb-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all -mb-px ${
                activeTab === tab.id
                  ? "text-white border-[#6366f1]"
                  : "text-[#5a5a7a] border-transparent hover:text-[#a1a1b5]"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

            {/* ── Overview ── */}
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  {/* Description */}
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{h.description ?? "No description yet."}</ReactMarkdown>
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                  {/* Timeline */}
                  <div className="bg-[#0d0d15] border border-[#1e1e2e] rounded-2xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-[#5a5a7a] uppercase tracking-wider">Timeline</p>
                    {[
                      { label: "Registrations close", date: h.registration_deadline },
                      { label: "Hackathon starts",    date: h.starts_at },
                      { label: "Hackathon ends",      date: h.ends_at },
                    ].map(({ label, date }) => (
                      <div key={label} className="flex items-start gap-2">
                        <Clock className="w-3.5 h-3.5 text-[#5a5a7a] mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-[#5a5a7a]">{label}</p>
                          <p className="text-sm text-white font-medium">{fmtDate(date)}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Prizes */}
                  {h.prizes.length > 0 && (
                    <div className="bg-[#0d0d15] border border-[#1e1e2e] rounded-2xl p-4 space-y-2">
                      <p className="text-xs font-semibold text-[#5a5a7a] uppercase tracking-wider mb-3">Prizes</p>
                      {h.prizes.map((p, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-sm font-bold" style={{ color: PLACE_COLORS[p.place] ?? "#a1a1b5" }}>
                            {p.place} Place
                          </span>
                          <span className="text-sm font-bold text-white">{p.amount}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Team info */}
                  <div className="bg-[#0d0d15] border border-[#1e1e2e] rounded-2xl p-4">
                    <p className="text-xs font-semibold text-[#5a5a7a] uppercase tracking-wider mb-2">Team</p>
                    <p className="text-sm text-[#a1a1b5]">
                      {h.allow_solo && h.allow_teams
                        ? `Solo or teams (max ${h.max_team_size})`
                        : h.allow_teams
                        ? `Teams of up to ${h.max_team_size}`
                        : "Solo only"}
                    </p>
                  </div>

                  {/* CTA */}
                  {canRegister && !myRegistration && (
                    <button onClick={() => setActiveTab("register")}
                      className="w-full py-3 rounded-xl font-semibold text-white transition-all"
                      style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>
                      Register Now
                    </button>
                  )}
                  {myRegistration && canSubmit && (
                    <button onClick={() => setActiveTab("register")}
                      className="w-full py-3 rounded-xl font-semibold text-white border border-[#6366f1]/40 hover:border-[#6366f1] transition-all">
                      Submit Project
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── Register / Submit ── */}
            {activeTab === "register" && (
              <RegisterTab
                hackathon={h} userId={userId}
                myRegistration={myRegistration} mySubmission={mySubmission}
                canRegister={!!canRegister} canSubmit={!!canSubmit}
              />
            )}

            {/* ── Problem ── */}
            {activeTab === "problem" && (
              <div>
                {problemVisible
                  ? <div className="prose prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{h.problem_statement ?? "Problem statement will be published here."}</ReactMarkdown>
                    </div>
                  : <div className="text-center py-24">
                      <Lock className="w-10 h-10 text-[#2a2a3a] mx-auto mb-3" />
                      <p className="text-[#5a5a7a]">Problem statement will be revealed when the hackathon starts.</p>
                    </div>
                }
              </div>
            )}

            {/* ── Submissions ── */}
            {activeTab === "submissions" && (
              <SubmissionsTab submissions={submissions} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Register / Submit tab ───────────────────────────────────────────────
function RegisterTab({ hackathon: h, userId, myRegistration, mySubmission, canRegister, canSubmit }:
  { hackathon: Hackathon; userId: string | null; myRegistration: Registration | null;
    mySubmission: Submission | null; canRegister: boolean; canSubmit: boolean }) {

  const [teamName,   setTeamName]   = useState(myRegistration?.team_name ?? "");
  const [teammates,  setTeammates]  = useState<string[]>([""]);
  const [regLoading, setRegLoading] = useState(false);
  const [regDone,    setRegDone]    = useState(!!myRegistration);
  const [regError,   setRegError]   = useState<string | null>(null);

  const [subTitle,   setSubTitle]   = useState(mySubmission?.title ?? "");
  const [subDesc,    setSubDesc]    = useState(mySubmission?.description ?? "");
  const [subProject, setSubProject] = useState(mySubmission?.project_url ?? "");
  const [subDemo,    setSubDemo]    = useState(mySubmission?.demo_url ?? "");
  const [subGithub,  setSubGithub]  = useState(mySubmission?.github_url ?? "");
  const [subDrive,   setSubDrive]   = useState(mySubmission?.drive_url ?? "");
  const [subLoading, setSubLoading] = useState(false);
  const [subDone,    setSubDone]    = useState(!!mySubmission);
  const [subError,   setSubError]   = useState<string | null>(null);

  async function handleRegister() {
    if (!userId) return;
    setRegLoading(true); setRegError(null);
    const res  = await fetch(`/api/hackathons/${h.slug}/register`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team_name: teamName || null, teammates: teammates.filter(Boolean) }),
    });
    const data = await res.json();
    if (!res.ok) { setRegError(data.error ?? "Registration failed"); }
    else { setRegDone(true); }
    setRegLoading(false);
  }

  async function handleSubmit() {
    if (!userId) return;
    setSubLoading(true); setSubError(null);
    const res  = await fetch(`/api/hackathons/${h.slug}/submit`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: subTitle, description: subDesc, project_url: subProject, demo_url: subDemo, github_url: subGithub, drive_url: subDrive }),
    });
    const data = await res.json();
    if (!res.ok) { setSubError(data.error ?? "Submission failed"); }
    else { setSubDone(true); }
    setSubLoading(false);
  }

  if (!userId) {
    return (
      <div className="text-center py-16">
        <p className="text-[#5a5a7a] mb-4">Sign in to register for this hackathon.</p>
        <a href="/login" className="px-6 py-2.5 rounded-xl font-semibold text-white text-sm"
          style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>Sign in</a>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-8">

      {/* Registration block */}
      <div className="bg-[#0d0d15] border border-[#1e1e2e] rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">
          {regDone ? "You're registered!" : "Register for this hackathon"}
        </h3>

        {regDone ? (
          <div className="flex items-center gap-2 text-[#22c55e]">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">Registration confirmed{myRegistration?.team_name ? ` — Team: ${myRegistration.team_name}` : ""}</span>
          </div>
        ) : canRegister ? (
          <div className="space-y-4">
            {h.allow_teams && (
              <>
                <div>
                  <label className="block text-xs font-medium text-[#5a5a7a] mb-1.5">Team name (optional)</label>
                  <input value={teamName} onChange={(e) => setTeamName(e.target.value)}
                    placeholder="My Awesome Team"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#111118] border border-[#2a2a3a] text-white text-sm focus:outline-none focus:border-[#6366f1] transition-colors" />
                </div>
                {Array.from({ length: Math.min(h.max_team_size - 1, teammates.length + (teammates.at(-1) ? 1 : 0)) }).map((_, i) => (
                  <div key={i}>
                    <label className="block text-xs font-medium text-[#5a5a7a] mb-1.5">Teammate {i + 1} username</label>
                    <input value={teammates[i] ?? ""} onChange={(e) => {
                        const next = [...teammates]; next[i] = e.target.value; setTeammates(next);
                      }}
                      placeholder="username"
                      className="w-full px-3 py-2.5 rounded-xl bg-[#111118] border border-[#2a2a3a] text-white text-sm focus:outline-none focus:border-[#6366f1] transition-colors" />
                  </div>
                ))}
              </>
            )}
            {regError && <p className="text-xs text-red-400">{regError}</p>}
            <button onClick={handleRegister} disabled={regLoading}
              className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>
              {regLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Registering…</> : "Register"}
            </button>
          </div>
        ) : (
          <p className="text-sm text-[#5a5a7a]">Registrations are closed.</p>
        )}
      </div>

      {/* Submission block */}
      {(regDone || myRegistration) && (
        <div className="bg-[#0d0d15] border border-[#1e1e2e] rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-1">
            {subDone ? "Submission received!" : "Submit your project"}
          </h3>
          {subDone && mySubmission && (
            <p className="text-xs text-[#5a5a7a] mb-4">Last updated: {new Date(mySubmission.submitted_at).toLocaleString("en-IN")}</p>
          )}

          {canSubmit || subDone ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#5a5a7a] mb-1.5">Project title <span className="text-[#3a3a5a]">(optional)</span></label>
                <input value={subTitle} onChange={(e) => setSubTitle(e.target.value)}
                  placeholder="My Awesome Project"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#111118] border border-[#2a2a3a] text-white text-sm focus:outline-none focus:border-[#6366f1] transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5a5a7a] mb-1.5">Description</label>
                <textarea value={subDesc} onChange={(e) => setSubDesc(e.target.value)} rows={4}
                  placeholder="What did you build? What problem does it solve?"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#111118] border border-[#2a2a3a] text-white text-sm focus:outline-none focus:border-[#6366f1] transition-colors resize-none" />
              </div>
              {[
                { label: "Project / Live URL", value: subProject, set: setSubProject, icon: Globe,     ph: "https://myproject.com" },
                { label: "Demo video URL",     value: subDemo,    set: setSubDemo,    icon: Play,      ph: "https://youtube.com/..." },
                { label: "GitHub repository",  value: subGithub,  set: setSubGithub,  icon: Github,    ph: "https://github.com/..." },
                { label: "Google Drive link",  value: subDrive,   set: setSubDrive,   icon: HardDrive, ph: "https://drive.google.com/..." },
              ].map(({ label, value, set, icon: Icon, ph }) => (
                <div key={label}>
                  <label className="block text-xs font-medium text-[#5a5a7a] mb-1.5">{label}</label>
                  <div className="relative">
                    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5a5a7a]" />
                    <input value={value} onChange={(e) => set(e.target.value)} placeholder={ph}
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-[#111118] border border-[#2a2a3a] text-white text-sm focus:outline-none focus:border-[#6366f1] transition-colors" />
                  </div>
                </div>
              ))}
              {subError && <p className="text-xs text-red-400">{subError}</p>}
              {canSubmit && (
                <button onClick={handleSubmit}
                  disabled={subLoading || ![subTitle, subDesc, subProject, subDemo, subGithub, subDrive].some((v) => v.trim())}
                  className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}>
                  {subLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</> : <><Send className="w-4 h-4" />{subDone ? "Update submission" : "Submit project"}</>}
                </button>
              )}
              {subDone && !canSubmit && (
                <div className="flex items-center gap-2 text-[#22c55e]">
                  <CheckCircle2 className="w-4 h-4" /><span className="text-sm">Submission locked — hackathon ended.</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-[#5a5a7a]">Submissions open when the hackathon is live.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Submissions gallery tab ─────────────────────────────────────────────
function SubmissionsTab({ submissions }: { submissions: Submission[] }) {
  if (submissions.length === 0) {
    return (
      <div className="text-center py-20">
        <Send className="w-10 h-10 text-[#2a2a3a] mx-auto mb-3" />
        <p className="text-[#5a5a7a]">No submissions yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {submissions.map((s) => (
        <div key={s.id} className="bg-[#0d0d15] border border-[#1e1e2e] rounded-2xl p-5 hover:border-[#2a2a3a] transition-all">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-bold text-white">{s.title || "Untitled submission"}</h3>
            <div className="flex gap-2 shrink-0">
              {s.github_url  && <a href={s.github_url}  target="_blank" rel="noreferrer" className="text-[#5a5a7a] hover:text-white transition-colors"><Github  className="w-4 h-4" /></a>}
              {s.demo_url    && <a href={s.demo_url}    target="_blank" rel="noreferrer" className="text-[#5a5a7a] hover:text-white transition-colors"><Play    className="w-4 h-4" /></a>}
              {s.drive_url   && <a href={s.drive_url}   target="_blank" rel="noreferrer" className="text-[#5a5a7a] hover:text-white transition-colors"><HardDrive className="w-4 h-4" /></a>}
              {s.project_url && <a href={s.project_url} target="_blank" rel="noreferrer" className="text-[#5a5a7a] hover:text-[#6366f1] transition-colors"><ExternalLink className="w-4 h-4" /></a>}
            </div>
          </div>
          {s.description && <p className="text-sm text-[#5a5a7a] line-clamp-3 mb-3">{s.description}</p>}
          <div className="flex items-center gap-2 text-xs text-[#3a3a5a]">
            <span>by {s.profiles?.display_name ?? s.profiles?.username ?? "Unknown"}</span>
            <span>·</span>
            <span>{new Date(s.submitted_at).toLocaleDateString("en-IN")}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
