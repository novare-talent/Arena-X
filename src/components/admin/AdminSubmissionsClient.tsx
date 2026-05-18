"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, ExternalLink, Github, Play, Globe, Copy, Check, ArrowLeft, Search, HardDrive } from "lucide-react";

interface Submission {
  id: string; title: string | null; description: string | null;
  project_url: string | null; demo_url: string | null; github_url: string | null; drive_url: string | null;
  submitted_at: string; updated_at: string;
  name: string; username: string; email: string;
  team_name: string | null; avatar_url: string | null;
}

interface Props {
  hackathon: { slug: string; title: string; status: string };
  submissions: Submission[];
  publicUrl: string;
}

export default function AdminSubmissionsClient({ hackathon, submissions, publicUrl }: Props) {
  const [search,  setSearch]  = useState("");
  const [copied,  setCopied]  = useState(false);

  const filtered = submissions.filter((s) =>
    [s.name, s.username, s.email, s.title, s.team_name].some(
      (v) => v?.toLowerCase().includes(search.toLowerCase())
    )
  );

  function downloadCSV() {
    const headers = ["Name", "Username", "Email", "Team", "Project Title", "Description", "Project URL", "Demo URL", "GitHub URL", "Drive URL", "Submitted At"];
    const rows = filtered.map((s) => [
      s.name, s.username, s.email, s.team_name ?? "",
      s.title ?? "", s.description ?? "",
      s.project_url ?? "", s.demo_url ?? "", s.github_url ?? "", s.drive_url ?? "",
      new Date(s.submitted_at).toLocaleString("en-IN"),
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`));

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `${hackathon.slug}-submissions.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function copyPublicLink() {
    navigator.clipboard.writeText(window.location.origin + publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-20 pb-16 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <Link href="/admin" className="flex items-center gap-1.5 text-xs text-[#5a5a7a] hover:text-white mb-2 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />Back to admin
            </Link>
            <h1 className="text-2xl font-bold text-white">{hackathon.title}</h1>
            <p className="text-sm text-[#5a5a7a] mt-0.5">{submissions.length} submission{submissions.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Public page link */}
            <button onClick={copyPublicLink}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#818cf8] bg-[#6366f1]/10 border border-[#6366f1]/20 hover:bg-[#6366f1]/20 transition-all">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy public link"}
            </button>
            <Link href={publicUrl} target="_blank"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#5a5a7a] bg-[#111118] border border-[#2a2a3a] hover:border-[#3a3a4a] transition-all">
              <ExternalLink className="w-3.5 h-3.5" />Public page
            </Link>
            <button onClick={downloadCSV}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}>
              <Download className="w-3.5 h-3.5" />Download CSV ({filtered.length})
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a7a]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, team, or project…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0d0d15] border border-[#1e1e2e] text-white text-sm focus:outline-none focus:border-[#6366f1] transition-colors" />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 text-[#5a5a7a]">
            {submissions.length === 0 ? "No submissions yet." : "No results match your search."}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((s, i) => (
              <div key={s.id} className="bg-[#0d0d15] border border-[#1e1e2e] rounded-2xl p-5 hover:border-[#2a2a3a] transition-all">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    {/* Row 1: rank + title */}
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs font-bold text-[#3a3a5a] w-6 text-right shrink-0">#{i + 1}</span>
                      <h3 className="font-bold text-white truncate">{s.title || "Untitled submission"}</h3>
                    </div>

                    {/* Row 2: submitter info */}
                    <div className="flex items-center gap-3 ml-9 flex-wrap">
                      <span className="text-sm text-[#a1a1b5] font-medium">{s.name}</span>
                      {s.email && <span className="text-xs text-[#5a5a7a]">{s.email}</span>}
                      {s.team_name && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#6366f1]/10 text-[#818cf8] border border-[#6366f1]/20">
                          Team: {s.team_name}
                        </span>
                      )}
                      <span className="text-xs text-[#3a3a5a]">
                        {new Date(s.submitted_at).toLocaleString("en-IN")}
                      </span>
                    </div>

                    {/* Description */}
                    {s.description && (
                      <p className="ml-9 mt-2 text-sm text-[#5a5a7a] line-clamp-2">{s.description}</p>
                    )}
                  </div>

                  {/* Links */}
                  <div className="flex items-center gap-2 shrink-0">
                    {s.github_url  && (
                      <a href={s.github_url}  target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#5a5a7a] bg-[#111118] border border-[#2a2a3a] hover:border-[#3a3a4a] hover:text-white transition-all">
                        <Github  className="w-3.5 h-3.5" />GitHub
                      </a>
                    )}
                    {s.demo_url    && (
                      <a href={s.demo_url}    target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#5a5a7a] bg-[#111118] border border-[#2a2a3a] hover:border-[#3a3a4a] hover:text-white transition-all">
                        <Play    className="w-3.5 h-3.5" />Demo
                      </a>
                    )}
                    {s.drive_url   && (
                      <a href={s.drive_url}   target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#5a5a7a] bg-[#111118] border border-[#2a2a3a] hover:border-[#3a3a4a] hover:text-white transition-all">
                        <HardDrive className="w-3.5 h-3.5" />Drive
                      </a>
                    )}
                    {s.project_url && (
                      <a href={s.project_url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all hover:opacity-90"
                        style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>
                        <Globe   className="w-3.5 h-3.5" />Project
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
