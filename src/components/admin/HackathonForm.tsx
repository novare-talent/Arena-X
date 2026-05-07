"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Plus, Trash2, Trophy } from "lucide-react";

interface Prize { place: string; amount: string; label: string }

interface HackathonFormData {
  id?: string;
  slug: string; title: string; tagline: string; description: string;
  banner_url: string; status: string;
  registration_deadline: string; starts_at: string; ends_at: string;
  prizes: Prize[]; tags: string;
  max_team_size: number; allow_solo: boolean; allow_teams: boolean;
  problem_statement: string;
}

const STATUS_OPTIONS = ["draft", "upcoming", "active", "judging", "ended"];

export default function HackathonForm({ initial }: { initial?: Partial<HackathonFormData> }) {
  const router = useRouter();
  const isEdit = !!initial?.id;

  const [form, setForm] = useState<HackathonFormData>({
    slug:                  initial?.slug ?? "",
    title:                 initial?.title ?? "",
    tagline:               initial?.tagline ?? "",
    description:           initial?.description ?? "",
    banner_url:            initial?.banner_url ?? "",
    status:                initial?.status ?? "draft",
    registration_deadline: initial?.registration_deadline ?? "",
    starts_at:             initial?.starts_at ?? "",
    ends_at:               initial?.ends_at ?? "",
    prizes:                initial?.prizes ?? [{ place: "1st", amount: "₹10,000", label: "" }],
    tags:                  initial?.tags ?? "",
    max_team_size:         initial?.max_team_size ?? 1,
    allow_solo:            initial?.allow_solo ?? true,
    allow_teams:           initial?.allow_teams ?? false,
    problem_statement:     initial?.problem_statement ?? "",
  });

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const set = <K extends keyof HackathonFormData>(k: K, v: HackathonFormData[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  function addPrize() {
    setForm((f) => ({ ...f, prizes: [...f.prizes, { place: "", amount: "", label: "" }] }));
  }
  function removePrize(i: number) {
    setForm((f) => ({ ...f, prizes: f.prizes.filter((_, idx) => idx !== i) }));
  }
  function setPrize(i: number, field: keyof Prize, val: string) {
    setForm((f) => {
      const next = [...f.prizes];
      next[i] = { ...next[i], [field]: val };
      return { ...f, prizes: next };
    });
  }

  async function handleSave() {
    if (!form.slug || !form.title) { setError("Slug and title are required"); return; }
    setLoading(true); setError(null);

    const payload = {
      ...form,
      tags:          form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      prizes:        form.prizes.filter((p) => p.place && p.amount),
      registration_deadline: form.registration_deadline || null,
      starts_at:     form.starts_at || null,
      ends_at:       form.ends_at || null,
      banner_url:    form.banner_url || null,
      problem_statement: form.problem_statement || null,
    };

    const res = await fetch(isEdit ? `/api/admin/hackathons/${form.slug}` : "/api/admin/hackathons", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed to save"); setLoading(false); return; }
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-20 pb-16 px-4">
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center gap-3 mb-8">
          <Trophy className="w-5 h-5 text-[#6366f1]" />
          <h1 className="text-2xl font-bold text-white">{isEdit ? "Edit Hackathon" : "New Hackathon"}</h1>
        </div>

        <div className="space-y-6">

          {/* Basic info */}
          <Card title="Basic Info">
            <Row label="Title *">
              <Input value={form.title} onChange={(v) => { set("title", v); if (!isEdit) set("slug", v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")); }} placeholder="Build the Future Hackathon" />
            </Row>
            <Row label="Slug *">
              <Input value={form.slug} onChange={(v) => set("slug", v)} placeholder="build-the-future-2025" mono />
            </Row>
            <Row label="Tagline">
              <Input value={form.tagline} onChange={(v) => set("tagline", v)} placeholder="Short one-liner shown on the card" />
            </Row>
            <Row label="Status">
              <select value={form.status} onChange={(e) => set("status", e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#111118] border border-[#2a2a3a] text-white text-sm focus:outline-none focus:border-[#6366f1] transition-colors">
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Row>
            <Row label="Banner URL">
              <Input value={form.banner_url} onChange={(v) => set("banner_url", v)} placeholder="https://..." />
            </Row>
            <Row label="Tags (comma-separated)">
              <Input value={form.tags} onChange={(v) => set("tags", v)} placeholder="AI, Web, Mobile" />
            </Row>
          </Card>

          {/* Timeline */}
          <Card title="Timeline">
            {[
              { label: "Registration deadline", key: "registration_deadline" as const },
              { label: "Starts at",             key: "starts_at"             as const },
              { label: "Ends at",               key: "ends_at"               as const },
            ].map(({ label, key }) => (
              <Row key={key} label={label}>
                <input type="datetime-local" value={form[key]} onChange={(e) => set(key, e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#111118] border border-[#2a2a3a] text-white text-sm focus:outline-none focus:border-[#6366f1] transition-colors" />
              </Row>
            ))}
          </Card>

          {/* Team settings */}
          <Card title="Team Settings">
            <div className="flex gap-6 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.allow_solo} onChange={(e) => set("allow_solo", e.target.checked)} className="accent-[#6366f1]" />
                <span className="text-sm text-white">Allow solo</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.allow_teams} onChange={(e) => set("allow_teams", e.target.checked)} className="accent-[#6366f1]" />
                <span className="text-sm text-white">Allow teams</span>
              </label>
            </div>
            {form.allow_teams && (
              <Row label="Max team size">
                <input type="number" min={2} max={10} value={form.max_team_size} onChange={(e) => set("max_team_size", Number(e.target.value))}
                  className="w-32 px-3 py-2.5 rounded-xl bg-[#111118] border border-[#2a2a3a] text-white text-sm focus:outline-none focus:border-[#6366f1] transition-colors" />
              </Row>
            )}
          </Card>

          {/* Prizes */}
          <Card title="Prizes">
            <div className="space-y-3">
              {form.prizes.map((p, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input value={p.place}  onChange={(v) => setPrize(i, "place",  v)} placeholder="1st" />
                  <Input value={p.amount} onChange={(v) => setPrize(i, "amount", v)} placeholder="₹10,000" />
                  <Input value={p.label}  onChange={(v) => setPrize(i, "label",  v)} placeholder="Note (optional)" />
                  <button onClick={() => removePrize(i)} className="text-[#5a5a7a] hover:text-red-400 transition-colors shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button onClick={addPrize} className="flex items-center gap-1.5 text-sm text-[#6366f1] hover:text-[#818cf8] transition-colors">
                <Plus className="w-3.5 h-3.5" />Add prize
              </button>
            </div>
          </Card>

          {/* Description */}
          <Card title="Description (Markdown)">
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={8}
              placeholder="Describe the hackathon — use **markdown** for formatting..."
              className="w-full px-3 py-2.5 rounded-xl bg-[#111118] border border-[#2a2a3a] text-white text-sm font-mono focus:outline-none focus:border-[#6366f1] transition-colors resize-y" />
          </Card>

          {/* Problem statement */}
          <Card title="Problem Statement (Markdown — revealed at start)">
            <textarea value={form.problem_statement} onChange={(e) => set("problem_statement", e.target.value)} rows={8}
              placeholder="Hidden until the hackathon goes live..."
              className="w-full px-3 py-2.5 rounded-xl bg-[#111118] border border-[#2a2a3a] text-white text-sm font-mono focus:outline-none focus:border-[#6366f1] transition-colors resize-y" />
          </Card>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3">
            <button onClick={() => router.push("/admin")}
              className="px-6 py-3 rounded-xl font-semibold text-[#a1a1b5] border border-[#2a2a3a] hover:border-[#3a3a4a] transition-all">
              Cancel
            </button>
            <button onClick={handleSave} disabled={loading}
              className="flex-1 py-3 rounded-xl font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : isEdit ? "Save changes" : "Create hackathon"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-[#0d0d15] border border-[#1e1e2e] rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-[#5a5a7a] uppercase tracking-wider mb-4">{title}</h3>
      <div className="space-y-4">{children}</div>
    </motion.div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#5a5a7a] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, mono }: { value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className={`w-full px-3 py-2.5 rounded-xl bg-[#111118] border border-[#2a2a3a] text-white text-sm focus:outline-none focus:border-[#6366f1] transition-colors ${mono ? "font-mono" : ""}`} />
  );
}
