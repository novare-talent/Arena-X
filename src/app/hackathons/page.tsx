import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image, { type StaticImageData } from "next/image";
import hackathonImg from "@/../public/images/banners/hackathon.png";
import iaidoDuelImg from "@/../public/images/banners/iaido-duel.png";
import kotodamaImg  from "@/../public/images/banners/kotodama.png";
import soloTrainImg from "@/../public/images/banners/solo-train.png";
import privateDojo  from "@/../public/images/banners/private-dojo.png";

const FALLBACKS: StaticImageData[] = [hackathonImg, iaidoDuelImg, kotodamaImg, soloTrainImg, privateDojo];

export const metadata = { title: "Tournaments — ArenaX" };

const CP   = "'Copperplate Gothic 32 BC','Copperplate Gothic Bold','Copperplate',var(--font-cinzel,Cinzel),serif";
const BODY = "'DM Sans',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";

const STATUS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  upcoming: { label: "Upcoming",    color: "#f5c451",  bg: "rgba(245,196,81,0.08)",  border: "rgba(245,196,81,0.3)" },
  active:   { label: "● Open",      color: "#34d399",  bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.3)" },
  judging:  { label: "Judging",     color: "#f59e0b",  bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.3)" },
  ended:    { label: "Ended",       color: "#777",     bg: "transparent",             border: "#2a2a2a" },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TournamentCard({ h, registered, fallback }: { h: any; registered: boolean; fallback: StaticImageData }) {
  const cfg    = STATUS[h.status] ?? STATUS.ended;
  const prizes: Array<{ place: string; amount: string }> = h.prizes ?? [];
  const top    = prizes[0];

  const dateLabel = h.status === "upcoming"
    ? `Starts ${fmtDate(h.starts_at)}`
    : h.status === "active"
    ? `Ends ${fmtDate(h.ends_at)}`
    : h.status === "judging"
    ? "Under judging"
    : `Ended ${fmtDate(h.ends_at)}`;

  const isActive = h.status === "active" || h.status === "upcoming";
  const btnText = registered ? "View →" : h.status === "active" ? "Register →" : h.status === "upcoming" ? "Notify Me" : "Results →";
  const btnGold = h.status === "active" && !registered;

  return (
    <Link href={`/hackathons/${h.slug}`}
      className="t-card-hover"
      style={{
        display: "block", textDecoration: "none",
        background: "#1a1a1a",
        border: `1px solid ${isActive ? "rgba(245,196,81,0.4)" : "#2a2a2a"}`,
        borderRadius: 12, overflow: "hidden",
      }}>
      <div className="t-card-img" style={{ position: "relative", aspectRatio: "16/9", background: "#111" }}>
        {h.banner_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={h.banner_url} alt={h.title} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", pointerEvents: "none", userSelect: "none", display: "block" }} draggable={false} />
        ) : (
          <Image src={fallback} alt={h.title} fill
            style={{ objectFit: "cover", objectPosition: "center", pointerEvents: "none", userSelect: "none" }}
            draggable={false} placeholder="blur"
          />
        )}
      </div>
      <div style={{ padding: "14px 16px" }}>
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontFamily: CP, fontSize: 17, color: "#fff", letterSpacing: "0.04em", textTransform: "uppercase", lineHeight: 1.1 }}>
            {h.title}
          </div>
          <span style={{ fontFamily: BODY, fontSize: 8, letterSpacing: "0.18em", padding: "3px 8px", borderRadius: 10, textTransform: "uppercase", border: `1px solid ${cfg.border}`, color: cfg.color, background: cfg.bg, whiteSpace: "nowrap", marginLeft: 8, flexShrink: 0 }}>
            {cfg.label}
          </span>
        </div>

        {/* Tagline */}
        {h.tagline && (
          <div style={{ fontFamily: BODY, fontSize: 10, color: "#777", lineHeight: 1.5, marginBottom: 10 }}>
            {h.tagline}
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          {[
            { v: dateLabel,                  l: "Date" },
            { v: `${h.max_team_size ?? 1}p`, l: "Team size" },
          ].map(s => (
            <div key={s.l} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <span style={{ fontFamily: MONO, fontSize: 12, color: "#bbb" }}>{s.v}</span>
              <span style={{ fontFamily: BODY, fontSize: 8, letterSpacing: "0.12em", color: "#777", textTransform: "uppercase" }}>{s.l}</span>
            </div>
          ))}
          {registered && (
            <span style={{ fontFamily: BODY, fontSize: 8, letterSpacing: "0.14em", padding: "2px 8px", borderRadius: 4, background: "rgba(52,211,153,0.12)", color: "#34d399", border: "1px solid rgba(52,211,153,0.3)", alignSelf: "flex-end" }}>
              REGISTERED
            </span>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontFamily: MONO, fontSize: 11, color: "#f5c451", display: "flex", alignItems: "center", gap: 4 }}>
            {top ? `🏆 ${top.amount}` : ""}
          </div>
          <span style={{
            fontFamily: BODY, fontSize: 10, fontWeight: 500, padding: "6px 14px", borderRadius: 6,
            background: btnGold ? "#f5c451" : registered ? "#fff" : "transparent",
            color: (btnGold || registered) ? "#111" : "#bbb",
            border: (btnGold || registered) ? "none" : "1px solid #2a2a2a",
            cursor: "pointer",
          }}>
            {btnText}
          </span>
        </div>
      </div>
    </Link>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PastRow({ h, rank }: { h: any; rank: number }) {
  const rankColors = ["#f5c451", "#aaa", "#cd7f32"];
  const color = rankColors[rank - 1] ?? "#777";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderBottom: "1px solid #2a2a2a" }}>
      <div style={{ fontFamily: CP, fontSize: 18, width: 24, flexShrink: 0, color }}>{rank}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: BODY, fontSize: 12, fontWeight: 500, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {h.title}
        </div>
        <div style={{ fontFamily: BODY, fontSize: 10, color: "#777", marginTop: 1 }}>
          {fmtDate(h.ends_at)} · Ended
        </div>
      </div>
    </div>
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

  const all      = hackathons ?? [];
  const active   = all.filter((h) => h.status === "active");
  const upcoming = all.filter((h) => h.status === "upcoming");
  const past     = all.filter((h) => h.status === "judging" || h.status === "ended");
  const current  = [...active, ...upcoming];
  const featured = active[0] ?? upcoming[0] ?? null;
  const myRegList = all.filter((h) => registeredSet.has(h.id));

  return (
    <div style={{ background: "#111111", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "70px 32px 60px" }}>

        {/* ── Page header ── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: BODY, fontSize: 10, letterSpacing: "0.2em", color: "#777", textTransform: "uppercase", marginBottom: 6 }}>
            Shōgun Wars
          </div>
          <div style={{ fontFamily: CP, fontSize: 48, fontWeight: 700, color: "#fff", lineHeight: 1, textTransform: "uppercase", letterSpacing: "0.03em" }}>
            TOURNAMENTS
          </div>
          <div style={{ fontFamily: BODY, fontSize: 12, color: "#777", marginTop: 6 }}>
            Compete in team hackathons and climb to Shōgun. Glory awaits.
          </div>
        </div>

        {/* ── Hero featured tournament ── */}
        {featured && (
          <Link href={`/hackathons/${featured.slug}`}
            style={{ display: "block", textDecoration: "none", borderRadius: 14, overflow: "hidden", position: "relative", height: 240, marginBottom: 28, background: "#111", cursor: "pointer" }}>
            <div style={{ position: "absolute", inset: 0 }}>
              {featured.banner_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={featured.banner_url} alt={featured.title} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", pointerEvents: "none", userSelect: "none", display: "block" }} draggable={false} />
              ) : (
                <Image src={hackathonImg} alt={featured.title} fill
                  style={{ objectFit: "cover", objectPosition: "center", pointerEvents: "none", userSelect: "none" }}
                  draggable={false} placeholder="blur" priority
                />
              )}
            </div>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.32) 60%, transparent 100%)" }} />
            <div style={{ position: "absolute", inset: 0, padding: "28px 32px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: BODY, fontSize: 9, letterSpacing: "0.2em", color: "#f5c451", border: "1px solid rgba(245,196,81,0.3)", padding: "4px 12px", borderRadius: 20, background: "rgba(245,196,81,0.08)", width: "fit-content" }}>
                <span className="ax-pulse-gold" style={{ width: 6, height: 6, borderRadius: "50%", background: "#f5c451", display: "inline-block" }} />
                {featured.status === "active" ? "REGISTRATION OPEN" : "COMING SOON"}
              </div>
              <div>
                <div style={{ fontFamily: BODY, fontSize: 10, letterSpacing: "0.2em", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 4 }}>
                  Featured Tournament
                </div>
                <div style={{ fontFamily: CP, fontSize: 40, color: "#fff", lineHeight: 1, letterSpacing: "0.03em", textTransform: "uppercase" }}>
                  {featured.title.toUpperCase()}
                </div>
                <div style={{ fontFamily: BODY, fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 6, display: "flex", alignItems: "center", gap: 16 }}>
                  {featured.starts_at && <span>📅 {fmtDate(featured.starts_at)} – {fmtDate(featured.ends_at)}</span>}
                  {(featured.prizes as Array<{place: string; amount: string}> | null)?.[0] && (
                    <span>🏆 {((featured.prizes as Array<{place: string; amount: string}>)[0]).amount} prize pool</span>
                  )}
                </div>
              </div>
            </div>
            <button style={{ position: "absolute", right: 32, bottom: 28, fontFamily: BODY, fontSize: 12, fontWeight: 600, padding: "10px 24px", borderRadius: 8, background: "#f5c451", color: "#111", border: "none", cursor: "pointer" }}>
              {registeredSet.has(featured.id) ? "View Tournament →" : "Register Now →"}
            </button>
          </Link>
        )}

        {/* ── No hackathons empty state ── */}
        {all.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontFamily: BODY, fontSize: 12, color: "#555" }}>No tournaments yet. Check back soon.</div>
          </div>
        )}

        {/* ── Active & Upcoming tournaments ── */}
        {current.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: BODY, fontSize: 12, color: "#bbb", marginBottom: 12, display: "flex", alignItems: "center", gap: 4 }}>
              Active Tournaments <span style={{ color: "#777" }}>→</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {current.map((h, i) => (
                <TournamentCard key={h.id} h={h} registered={registeredSet.has(h.id)} fallback={FALLBACKS[i % FALLBACKS.length]} />
              ))}
            </div>
          </div>
        )}

        {/* ── Bottom 2-col: Past Champions + Your History ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

          {/* Past Champions */}
          <div>
            <div style={{ fontFamily: BODY, fontSize: 12, color: "#bbb", marginBottom: 12, display: "flex", alignItems: "center", gap: 4 }}>
              Past Tournaments <span style={{ color: "#777" }}>→</span>
            </div>
            <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 12, overflow: "hidden" }}>
              {past.length === 0 ? (
                <div style={{ padding: "28px 16px", textAlign: "center", fontFamily: BODY, fontSize: 12, color: "#555" }}>
                  No past tournaments yet.
                </div>
              ) : (
                past.slice(0, 4).map((h, i) => <PastRow key={h.id} h={h} rank={i + 1} />)
              )}
            </div>
          </div>

          {/* Your Tournament History */}
          <div>
            <div style={{ fontFamily: BODY, fontSize: 12, color: "#bbb", marginBottom: 12, display: "flex", alignItems: "center", gap: 4 }}>
              Your Tournament History <span style={{ color: "#777" }}>→</span>
            </div>
            <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #2a2a2a" }}>
                <div style={{ fontFamily: BODY, fontSize: 11, fontWeight: 600, color: "#bbb", letterSpacing: "0.06em" }}>
                  YOUR RECORDS
                </div>
              </div>
              {myRegList.length === 0 ? (
                <div style={{ padding: "28px 16px", textAlign: "center" }}>
                  <div style={{ fontFamily: BODY, fontSize: 12, color: "#555" }}>
                    You haven&apos;t joined a tournament yet.
                  </div>
                  <div style={{ fontFamily: BODY, fontSize: 11, color: "#777", marginTop: 6 }}>
                    {featured ? `Register for ${featured.title} to begin.` : "Check back when registrations open."}
                  </div>
                </div>
              ) : (
                myRegList.map((h) => {
                  const cfg = STATUS[h.status] ?? STATUS.ended;
                  return (
                    <Link key={h.id} href={`/hackathons/${h.slug}`}
                      style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderBottom: "1px solid #2a2a2a", textDecoration: "none" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: BODY, fontSize: 12, fontWeight: 500, color: "#fff" }}>{h.title}</div>
                        <div style={{ fontFamily: BODY, fontSize: 10, color: "#777", marginTop: 1 }}>{cfg.label} · {fmtDate(h.starts_at)}</div>
                      </div>
                      <span style={{ fontFamily: BODY, fontSize: 8, letterSpacing: "0.16em", padding: "3px 8px", borderRadius: 10, border: `1px solid ${cfg.border}`, color: cfg.color, background: cfg.bg }}>
                        REGISTERED
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Past section if there are more */}
        {past.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <div style={{ fontFamily: BODY, fontSize: 12, color: "#bbb", marginBottom: 12, display: "flex", alignItems: "center", gap: 4 }}>
              More Past Tournaments <span style={{ color: "#777" }}>→</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {past.map((h, i) => (
                <TournamentCard key={h.id} h={h} registered={registeredSet.has(h.id)} fallback={FALLBACKS[(i + 1) % FALLBACKS.length]} />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
