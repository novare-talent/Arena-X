import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Trophy, Users, ArrowRight, Zap, Clock } from "lucide-react";

export const metadata = { title: "Hackathons — ArenaX" };

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  upcoming: { label: "Registering",  color: "#6366f1", bg: "bg-[#6366f1]/15", dot: "bg-[#6366f1]" },
  active:   { label: "Live",         color: "#22c55e", bg: "bg-[#22c55e]/15", dot: "bg-[#22c55e]" },
  judging:  { label: "Judging",      color: "#f59e0b", bg: "bg-[#f59e0b]/15", dot: "bg-[#f59e0b]" },
  ended:    { label: "Ended",        color: "#5a5a7a", bg: "bg-[#5a5a7a]/15", dot: "bg-[#5a5a7a]" },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function PrizeTag({ prizes }: { prizes: Array<{ place: string; amount: string }> }) {
  const top = prizes[0];
  if (!top) return null;
  return (
    <span className="flex items-center gap-1 text-xs font-bold text-[#ffd700]">
      <Trophy className="w-3 h-3" />{top.amount}
    </span>
  );
}

export default async function HackathonsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: hackathons } = await supabase
    .from("hackathons")
    .select("id, slug, title, tagline, banner_url, status, starts_at, ends_at, registration_deadline, prizes, tags, max_team_size, allow_solo, allow_teams")
    .neq("status", "draft")
    .order("starts_at", { ascending: true });

  const { data: myRegs } = user
    ? await supabase.from("hackathon_registrations").select("hackathon_id").eq("user_id", user.id)
    : { data: [] };

  const registeredSet = new Set((myRegs ?? []).map((r) => r.hackathon_id));

  const active   = (hackathons ?? []).filter((h) => h.status === "active");
  const upcoming = (hackathons ?? []).filter((h) => h.status === "upcoming");
  const past     = (hackathons ?? []).filter((h) => h.status === "judging" || h.status === "ended");

  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-20 pb-16 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#6366f1]/10 border border-[#6366f1]/25 text-xs font-semibold text-[#818cf8] mb-4">
            <Zap className="w-3 h-3" />Build. Ship. Win.
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">Hackathons</h1>
          <p className="text-[#5a5a7a] max-w-lg mx-auto">
            Compete in real-world challenges, build projects, and get noticed by top companies.
          </p>
        </div>

        {hackathons?.length === 0 && (
          <div className="text-center py-24">
            <Trophy className="w-12 h-12 text-[#2a2a3a] mx-auto mb-4" />
            <p className="text-[#5a5a7a]">No hackathons yet. Check back soon.</p>
          </div>
        )}

        {/* Live now */}
        {active.length > 0 && (
          <Section title="Live Now" accent="#22c55e">
            {active.map((h) => (
              <HackathonCard key={h.id} h={h} registered={registeredSet.has(h.id)} />
            ))}
          </Section>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <Section title="Registrations Open" accent="#6366f1">
            {upcoming.map((h) => (
              <HackathonCard key={h.id} h={h} registered={registeredSet.has(h.id)} />
            ))}
          </Section>
        )}

        {/* Past */}
        {past.length > 0 && (
          <Section title="Past Hackathons" accent="#5a5a7a">
            {past.map((h) => (
              <HackathonCard key={h.id} h={h} registered={registeredSet.has(h.id)} />
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-1 h-5 rounded-full" style={{ background: accent }} />
        <h2 className="text-lg font-bold text-white">{title}</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {children}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HackathonCard({ h, registered }: { h: any; registered: boolean }) {
  const cfg  = STATUS_CONFIG[h.status] ?? STATUS_CONFIG.ended;
  const prizes: Array<{ place: string; amount: string }> = h.prizes ?? [];
  const tags: string[] = h.tags ?? [];

  const dateLabel = h.status === "upcoming"
    ? `Starts ${fmtDate(h.starts_at)}`
    : h.status === "active"
    ? `Ends ${fmtDate(h.ends_at)}`
    : h.status === "judging"
    ? "Under judging"
    : `Ended ${fmtDate(h.ends_at)}`;

  const teamLabel = h.allow_teams && h.allow_solo
    ? `Solo or teams up to ${h.max_team_size}`
    : h.allow_teams
    ? `Teams up to ${h.max_team_size}`
    : "Solo";

  return (
    <Link href={`/hackathons/${h.slug}`}
      className="group flex flex-col rounded-2xl border border-[#1e1e2e] bg-[#0d0d15] overflow-hidden hover:border-[#2a2a3a] hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5">

      {/* Banner */}
      <div className="relative h-36 bg-gradient-to-br from-[#6366f1]/20 to-[#22d3ee]/10 overflow-hidden shrink-0">
        {h.banner_url
          ? <img src={h.banner_url} alt={h.title} className="w-full h-full object-cover" />
          : <div className="absolute inset-0 flex items-center justify-center">
              <Trophy className="w-12 h-12 text-[#2a2a3a]" />
            </div>
        }
        {/* Status badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0d0d15]/90 backdrop-blur-sm border border-[#2a2a3a]">
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${h.status === "active" ? "animate-pulse" : ""}`} />
          <span className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
        </div>
        {registered && (
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-[#22c55e]/20 border border-[#22c55e]/30 text-xs font-semibold text-[#4ade80]">
            Registered
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4">
        <h3 className="font-bold text-white text-base mb-1 line-clamp-1 group-hover:text-[#818cf8] transition-colors">
          {h.title}
        </h3>
        {h.tagline && <p className="text-xs text-[#5a5a7a] mb-3 line-clamp-2">{h.tagline}</p>}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {tags.slice(0, 3).map((t: string) => (
              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-[#6366f1]/10 text-[#818cf8] border border-[#6366f1]/20">
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto pt-3 border-t border-[#1a1a2a] flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[11px] text-[#5a5a7a]">
              <Clock className="w-3 h-3" />{dateLabel}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#5a5a7a]">
              <Users className="w-3 h-3" />{teamLabel}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <PrizeTag prizes={prizes} />
            <span className="text-[10px] text-[#6366f1] flex items-center gap-0.5 group-hover:gap-1.5 transition-all">
              View <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
