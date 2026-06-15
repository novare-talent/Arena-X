import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus, Users, Send, Settings } from "lucide-react";

export const metadata = { title: "Admin — ArenaX" };

const STATUS_COLORS: Record<string, string> = {
  draft: "#5a5a7a", upcoming: "#6366f1", active: "#22c55e", judging: "#f59e0b", ended: "#3a3a5a",
};

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: hackathons } = await supabase
    .from("hackathons")
    .select("id, slug, title, status, starts_at, ends_at")
    .order("created_at", { ascending: false });

  // Count registrations + submissions per hackathon
  const ids = (hackathons ?? []).map((h) => h.id);
  const [{ data: regCounts }, { data: subCounts }] = await Promise.all([
    ids.length
      ? supabase.from("hackathon_registrations").select("hackathon_id").in("hackathon_id", ids)
      : Promise.resolve({ data: [] }),
    ids.length
      ? supabase.from("hackathon_submissions").select("hackathon_id").in("hackathon_id", ids)
      : Promise.resolve({ data: [] }),
  ]);

  const regMap: Record<string, number> = {};
  const subMap: Record<string, number> = {};
  for (const r of regCounts ?? []) regMap[r.hackathon_id] = (regMap[r.hackathon_id] ?? 0) + 1;
  for (const s of subCounts ?? []) subMap[s.hackathon_id] = (subMap[s.hackathon_id] ?? 0) + 1;

  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-20 pb-16 px-4">
      <div className="max-w-5xl mx-auto">

        <div className="flex items-center justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Settings className="w-4 h-4 text-[#6366f1]" />
              <span className="text-xs font-semibold text-[#5a5a7a] uppercase tracking-wider">Admin Panel</span>
            </div>
            <h1 className="text-3xl font-bold text-white">Hackathons</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/forge"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#34d399] border border-[#1e3a2e] hover:bg-[#0e2a1e] transition-all">
              Forge Weekly →
            </Link>
            <Link href="/admin/referrals"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#a78bfa] border border-[#2a2438] hover:bg-[#1a1326] transition-all">
              Referrals →
            </Link>
            <Link href="/admin/hackathons/new"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white text-sm transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>
              <Plus className="w-4 h-4" />New Hackathon
            </Link>
          </div>
        </div>

        {(hackathons ?? []).length === 0 ? (
          <div className="text-center py-24 text-[#5a5a7a]">No hackathons yet. Create one!</div>
        ) : (
          <div className="space-y-3">
            {(hackathons ?? []).map((h) => (
              <div key={h.id} className="bg-[#0d0d15] border border-[#1e1e2e] rounded-2xl p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-white truncate">{h.title}</h3>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                        style={{ color: STATUS_COLORS[h.status], borderColor: `${STATUS_COLORS[h.status]}40`, background: `${STATUS_COLORS[h.status]}15` }}>
                        {h.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#5a5a7a]">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{regMap[h.id] ?? 0} registered</span>
                      <span className="flex items-center gap-1"><Send className="w-3 h-3" />{subMap[h.id] ?? 0} submissions</span>
                      <span className="font-mono">/hackathons/{h.slug}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/admin/hackathons/${h.slug}/submissions`}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#818cf8] bg-[#6366f1]/10 border border-[#6366f1]/20 hover:bg-[#6366f1]/20 transition-all">
                    Submissions
                  </Link>
                  <Link href={`/admin/hackathons/${h.slug}/edit`}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#a1a1b5] bg-[#111118] border border-[#2a2a3a] hover:border-[#3a3a4a] transition-all">
                    Edit
                  </Link>
                  <Link href={`/hackathons/${h.slug}`} target="_blank"
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#5a5a7a] bg-[#111118] border border-[#2a2a3a] hover:border-[#3a3a4a] transition-all">
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
