import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const CP   = "'Copperplate Gothic 32 BC','Copperplate Gothic Bold','Copperplate',var(--font-cinzel,Cinzel),serif";
const BODY = "'DM Sans',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";

const TIER_COLORS: Record<string, string> = {
  unrated: "#777", bronze: "#a86b3b", silver: "#bbb", gold: "#f5c542", platinum: "#a78bfa", diamond: "#60a5fa",
};

export default async function ForgeLeaderboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: top }, { data: me }, { data: activeChallenge }] = await Promise.all([
    supabase
      .from("user_ratings")
      .select("user_id, elo, tier, peak_elo, matches_played, profiles(username, display_name, college, country)")
      .eq("track", "forge")
      .order("elo", { ascending: false })
      .limit(100),
    supabase
      .from("user_ratings")
      .select("user_id, elo, tier, peak_elo, matches_played")
      .eq("user_id", user.id)
      .eq("track", "forge")
      .maybeSingle(),
    supabase
      .from("forge_challenges")
      .select("id, week_number, title")
      .eq("status", "active")
      .maybeSingle(),
  ]);

  let myRank: number | null = null;
  if (me) {
    const { count } = await supabase
      .from("user_ratings")
      .select("user_id", { count: "exact", head: true })
      .eq("track", "forge")
      .gt("elo", me.elo);
    myRank = (count ?? 0) + 1;
  }

  let thisWeekLeaders: { user_id: string; overall_score: number; display_name: string; username: string }[] = [];
  if (activeChallenge) {
    const { data: leaders } = await supabase
      .from("forge_submissions")
      .select("user_id, overall_score, profiles(username, display_name)")
      .eq("challenge_id", activeChallenge.id)
      .eq("judge_status", "scored")
      .order("overall_score", { ascending: false })
      .limit(5);
    thisWeekLeaders = (leaders ?? []).map((l) => {
      const p = l.profiles as unknown as { username: string; display_name: string } | null;
      return {
        user_id: l.user_id,
        overall_score: l.overall_score ?? 0,
        display_name: p?.display_name ?? "—",
        username: p?.username ?? "—",
      };
    });
  }

  const entries = (top ?? []).map((r, i) => {
    const p = r.profiles as unknown as { username: string; display_name: string; college: string | null; country: string | null } | null;
    return {
      rank: i + 1,
      user_id: r.user_id,
      username: p?.username ?? "—",
      display_name: p?.display_name ?? "—",
      college: p?.college ?? null,
      country: p?.country ?? null,
      elo: r.elo,
      tier: r.tier as string,
      peak_elo: r.peak_elo,
      weeks_played: r.matches_played,
    };
  });

  return (
    <div style={{ background: "#111", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 32px 60px" }}>

        <Link href="/forge" style={{ display: "inline-block", color: "#777", fontFamily: BODY, fontSize: 11, textDecoration: "none", letterSpacing: "0.08em", marginBottom: 18 }}>
          ← BACK TO FORGE
        </Link>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: BODY, fontSize: 10, letterSpacing: "0.2em", color: "#777", textTransform: "uppercase", marginBottom: 6 }}>
              Forge Track
            </div>
            <div style={{ fontFamily: CP, fontSize: 40, fontWeight: 700, color: "#fff", lineHeight: 1, textTransform: "uppercase", letterSpacing: "0.03em" }}>
              LEADERBOARD
            </div>
          </div>
          {me && (
            <div style={{ display: "flex", gap: 18, fontFamily: MONO, fontSize: 11, color: "#999" }}>
              <span>RANK <span style={{ color: "#fff" }}>#{myRank}</span></span>
              <span>ELO <span style={{ color: "#fff" }}>{me.elo}</span></span>
              <span>WEEKS <span style={{ color: "#fff" }}>{me.matches_played}</span></span>
            </div>
          )}
        </div>

        {activeChallenge && thisWeekLeaders.length > 0 && (
          <div style={{ marginBottom: 24, padding: "14px 18px", border: "1px solid #2a2a2a", borderRadius: 12, background: "#1a1a1a" }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: "#666", letterSpacing: "0.18em", marginBottom: 10 }}>
              THIS WEEK · #{activeChallenge.week_number} {activeChallenge.title.toUpperCase()}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {thisWeekLeaders.map((l, i) => (
                <div key={l.user_id} style={{ display: "flex", justifyContent: "space-between", fontFamily: BODY, fontSize: 12, color: "#ccc" }}>
                  <span>#{i + 1} {l.display_name}</span>
                  <span style={{ color: "#34d399", fontFamily: MONO }}>{l.overall_score?.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ border: "1px solid #2a2a2a", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 100px 80px 80px 80px", padding: "10px 16px", borderBottom: "1px solid #2a2a2a", background: "#181818", fontFamily: MONO, fontSize: 10, color: "#666", letterSpacing: "0.18em" }}>
            <span>RANK</span><span>PLAYER</span><span>TIER</span><span>ELO</span><span>PEAK</span><span>WEEKS</span>
          </div>
          {entries.length === 0 && (
            <div style={{ padding: "40px 16px", textAlign: "center", color: "#666", fontFamily: BODY, fontSize: 12 }}>
              No Forge players yet. Be the first to submit and claim the top.
            </div>
          )}
          {entries.map((e) => (
            <div key={e.user_id} style={{ display: "grid", gridTemplateColumns: "60px 1fr 100px 80px 80px 80px", padding: "12px 16px", borderBottom: "1px solid #1f1f1f", background: e.user_id === user.id ? "#1f1a0e" : "transparent", fontFamily: BODY, fontSize: 12, color: "#ddd" }}>
              <span style={{ fontFamily: MONO, color: e.rank <= 3 ? "#f5c542" : "#888" }}>#{e.rank}</span>
              <span>
                <div>{e.display_name}</div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: "#666", marginTop: 2 }}>@{e.username}{e.college ? ` · ${e.college}` : ""}</div>
              </span>
              <span style={{ fontFamily: MONO, color: TIER_COLORS[e.tier] ?? "#888", textTransform: "uppercase", fontSize: 11, letterSpacing: "0.06em" }}>{e.tier}</span>
              <span style={{ fontFamily: MONO, color: "#fff" }}>{e.elo}</span>
              <span style={{ fontFamily: MONO, color: "#888" }}>{e.peak_elo}</span>
              <span style={{ fontFamily: MONO, color: "#888" }}>{e.weeks_played}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
