"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image, { type StaticImageData } from "next/image";
import { TIER_LABELS } from "@/components/ui-samurai/primitives";
import roninImg    from "../../../public/images/chars/ronin.png";
import ashigaruImg from "../../../public/images/chars/ashigaru.png";
import samuraiImg  from "../../../public/images/chars/samurai.png";
import daimyoImg   from "../../../public/images/chars/daimyo.png";
import shoganImg   from "../../../public/images/chars/shogan.png";

const CP   = "'Copperplate Gothic 32 BC','Copperplate Gothic Bold','Copperplate',var(--font-cinzel,Cinzel),serif";
const BODY = "'DM Sans',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";
const JP   = "'Noto Serif JP',serif";

const CHAR_MAP: Record<string, StaticImageData> = {
  unrated: roninImg, bronze: ashigaruImg, silver: samuraiImg,
  gold: daimyoImg, platinum: shoganImg, diamond: shoganImg,
};
const RANK_COLORS = ["#f5c451", "#aaaaaa", "#cd7f32"];

function tierImg(tier: string): StaticImageData {
  return CHAR_MAP[tier] ?? roninImg;
}

interface Entry {
  rank: number; id: string; username: string; display_name: string;
  college: string | null; country: string | null; elo: number; tier: string;
  peak_elo: number; matches_played: number; wins: number; losses: number;
  win_rate: number; best_streak: number;
}
interface MyEntry {
  rank: number; username: string; display_name: string; elo: number; tier: string;
  matches_played: number; wins: number; losses: number; win_rate: number;
}
interface Props {
  entries: Entry[]; currentUserId: string; myEntry: MyEntry | null; scoutCutoff: number;
}

function TierChip({ tier }: { tier: string }) {
  const t = TIER_LABELS[tier] ?? TIER_LABELS.unrated;
  return (
    <span style={{
      fontFamily: JP, fontSize: 9, padding: "1px 6px", borderRadius: 10, whiteSpace: "nowrap",
      border: `1px solid ${t.color}50`, color: t.color, background: `${t.color}10`,
    }}>{t.jp}</span>
  );
}

function Avatar({ tier, size, style }: { tier: string; size: number; style?: React.CSSProperties }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", overflow: "hidden",
      flexShrink: 0, background: "#111", display: "flex", alignItems: "center", justifyContent: "center",
      ...style,
    }}>
      <Image src={tierImg(tier)} alt="" width={size} height={size}
        style={{ objectFit: "contain", filter: "invert(1)", pointerEvents: "none", userSelect: "none" }}
        draggable={false} placeholder="blur"
      />
    </div>
  );
}

const TABLE_COLS = "40px 1fr 80px 80px 80px 80px";

export default function LeaderboardClient({ entries, currentUserId, myEntry, scoutCutoff }: Props) {
  const [search, setSearch] = useState("");
  const [tab, setTab]       = useState<"all" | "week" | "month">("all");

  const top3 = entries.slice(0, 3);

  const filtered = entries.filter((e) =>
    search === "" ||
    e.username.toLowerCase().includes(search.toLowerCase()) ||
    e.display_name.toLowerCase().includes(search.toLowerCase()) ||
    (e.college ?? "").toLowerCase().includes(search.toLowerCase())
  );

  // week/month filtering requires match-timestamp data not present in the current query;
  // tabs are UI-ready but currently show the same all-time data
  void tab;

  const myInTable = entries.find((e) => e.id === currentUserId);

  return (
    <div style={{ background: "#111111", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "70px 32px 60px" }}>

        {/* ── Page header ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div style={{ fontFamily: BODY, fontSize: 10, letterSpacing: "0.2em", color: "#777", textTransform: "uppercase", marginBottom: 6 }}>
            Global Rankings
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28 }}>
            <div>
              <div style={{ fontFamily: CP, fontSize: 48, fontWeight: 700, color: "#fff", lineHeight: 1, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                LEADERBOARD
              </div>
              <div style={{ fontFamily: BODY, fontSize: 12, color: "#777", marginTop: 6 }}>
                The top warriors of the arena. Earn your place.
              </div>
            </div>
            <a href="/leaderboard/referrers"
              style={{ fontFamily: BODY, fontSize: 10, padding: "6px 14px", borderRadius: 6, border: "1px solid rgba(245,196,81,0.35)", background: "rgba(245,196,81,0.08)", color: "#f5c451", textDecoration: "none", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>
              ★ TOP REFERRERS →
            </a>
          </div>
        </motion.div>

        {/* ── 2-col layout ── */}
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16, alignItems: "start" }}>

          {/* ── LEFT: Podium + My Rank ── */}
          <div>
            {/* Podium card */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}>
              <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 12, overflow: "hidden", position: "sticky", top: 66 }}>
                <div style={{ padding: "14px 16px", borderBottom: "1px solid #2a2a2a" }}>
                  <div style={{ fontFamily: BODY, fontSize: 11, fontWeight: 600, color: "#bbb", letterSpacing: "0.08em" }}>TOP WARRIORS</div>
                </div>
                <div style={{ padding: 16 }}>
                  {top3.map((e, i) => {
                    const rankColor = RANK_COLORS[i];
                    const tInfo = TIER_LABELS[e.tier] ?? TIER_LABELS.unrated;
                    return (
                      <Link key={e.id} href={`/profile/${e.username}`}
                        style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < 2 ? "1px solid #2a2a2a" : "none", textDecoration: "none" }}>
                        <div style={{ fontFamily: CP, fontSize: 22, width: 28, textAlign: "center", flexShrink: 0, color: rankColor }}>{i + 1}</div>
                        <Avatar tier={e.tier} size={44} style={{ border: `2px solid ${rankColor}` }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: BODY, fontSize: 12, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {e.display_name}
                          </div>
                          <div style={{ fontFamily: MONO, fontSize: 9, color: "#777", marginTop: 1 }}>@{e.username}</div>
                          <div style={{ fontFamily: JP, fontSize: 10, color: "#777", marginTop: 2 }}>{tInfo.jp} {tInfo.label}</div>
                        </div>
                        <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: "#f5c451", flexShrink: 0 }}>{e.elo}</div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </motion.div>

            {/* My Rank card */}
            {myEntry && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
                <div style={{ marginTop: 12, background: "rgba(108,43,217,0.08)", border: "1px solid rgba(108,43,217,0.3)", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontFamily: BODY, fontSize: 9, letterSpacing: "0.2em", color: "#6c2bd9", textTransform: "uppercase", marginBottom: 8 }}>
                    Your Rank
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontFamily: CP, fontSize: myEntry.rank >= 100 ? 20 : myEntry.rank >= 10 ? 24 : 28, color: "#fff", minWidth: 36, flexShrink: 0, lineHeight: 1 }}>
                      {myEntry.rank}
                    </div>
                    <Avatar tier={myEntry.tier} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: BODY, fontSize: 12, fontWeight: 600, color: "#fff" }}>{myEntry.display_name}</div>
                      <div style={{ fontFamily: MONO, fontSize: 11, color: "#6c2bd9", marginTop: 1 }}>
                        {myEntry.elo} ELO · {(TIER_LABELS[myEntry.tier] ?? TIER_LABELS.unrated).label}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* ── RIGHT: Filter + Table ── */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.08 }}>

            {/* Filter row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              {(["all", "week", "month"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  style={{
                    fontFamily: BODY, fontSize: 11, padding: "6px 14px", borderRadius: 6,
                    border: `1px solid ${tab === t ? "#444" : "#2a2a2a"}`,
                    background: tab === t ? "#222222" : "transparent",
                    color: tab === t ? "#fff" : "#777",
                    cursor: "pointer",
                  }}>
                  {t === "all" ? "All Time" : t === "week" ? "This Week" : "This Month"}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <div style={{ position: "relative" }}>
                <svg viewBox="0 0 20 20" fill="none" stroke="#555" strokeWidth="1.5" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, pointerEvents: "none" }}>
                  <circle cx="9" cy="9" r="6" /><line x1="14" y1="14" x2="18" y2="18" />
                </svg>
                <input
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search warrior..."
                  style={{
                    fontFamily: BODY, fontSize: 11, padding: "7px 12px 7px 30px",
                    borderRadius: 6, border: "1px solid #2a2a2a", background: "#222222",
                    color: "#fff", width: 180, outline: "none",
                  }}
                />
              </div>
            </div>

            {/* Table card */}
            <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 12, overflow: "hidden" }}>

              {/* Table header */}
              <div style={{ display: "grid", gridTemplateColumns: TABLE_COLS, padding: "10px 16px", borderBottom: "1px solid #2a2a2a", alignItems: "center" }}>
                {["#", "Warrior", "ELO", "W", "L", "Win%"].map((h, i) => (
                  <div key={h} style={{ fontFamily: BODY, fontSize: 9, letterSpacing: "0.18em", color: "#777", textTransform: "uppercase", textAlign: i >= 2 ? "right" : "left" }}>
                    {h}
                  </div>
                ))}
              </div>

              {/* Rows */}
              {filtered.length === 0 ? (
                <div style={{ padding: "40px 16px", textAlign: "center", fontFamily: BODY, fontSize: 12, color: "#555" }}>
                  No warriors found
                </div>
              ) : (
                filtered.map((e) => {
                  const isMe = e.id === currentUserId;
                  const isTop = e.rank <= 3;
                  return (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}
                      onClick={() => window.location.href = `/profile/${e.username}`}
                      style={{
                        display: "grid", gridTemplateColumns: TABLE_COLS,
                        padding: "11px 16px", borderBottom: "1px solid #2a2a2a",
                        alignItems: "center", cursor: "pointer",
                        background: isMe ? "rgba(108,43,217,0.05)" : undefined,
                        borderColor: isMe ? "rgba(108,43,217,0.15)" : "#2a2a2a",
                        transition: "background .12s",
                      }}
                      onMouseEnter={(el) => { if (!isMe) (el.currentTarget as HTMLElement).style.background = "#222222"; }}
                      onMouseLeave={(el) => { (el.currentTarget as HTMLElement).style.background = isMe ? "rgba(108,43,217,0.05)" : ""; }}
                    >
                      {/* # */}
                      <div style={{ fontFamily: CP, fontSize: 14, color: isMe ? "#6c2bd9" : isTop ? "#f5c451" : "#777" }}>
                        {e.rank}
                      </div>

                      {/* Warrior */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <Avatar tier={e.tier} size={32} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontFamily: BODY, fontSize: 12, fontWeight: 500, color: isMe ? "#6c2bd9" : "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {e.display_name}{isMe ? " · You" : ""}
                            </span>
                            {scoutCutoff > 0 && e.rank <= scoutCutoff && (
                              <span style={{ fontFamily: BODY, fontSize: 8, padding: "1px 5px", borderRadius: 4, background: "rgba(245,196,81,0.14)", color: "#f5c451", border: "1px solid rgba(245,196,81,0.4)", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>★ SCOUT</span>
                            )}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                            <span style={{ fontFamily: MONO, fontSize: 9, color: "#777" }}>@{e.username}</span>
                            <TierChip tier={e.tier} />
                          </div>
                        </div>
                      </div>

                      {/* ELO */}
                      <div style={{ fontFamily: MONO, fontSize: 12, color: isMe ? "#6c2bd9" : "#f5c451", textAlign: "right" }}>{e.elo}</div>
                      {/* W */}
                      <div style={{ fontFamily: MONO, fontSize: 12, color: "#34d399", textAlign: "right" }}>{e.wins}</div>
                      {/* L */}
                      <div style={{ fontFamily: MONO, fontSize: 12, color: "#f43f5e", textAlign: "right" }}>{e.losses}</div>
                      {/* Win% */}
                      <div style={{ fontFamily: MONO, fontSize: 12, color: "#bbb", textAlign: "right" }}>{e.win_rate}%</div>
                    </motion.div>
                  );
                })
              )}

              {/* Ellipsis row (when showing top 100) */}
              {filtered.length >= 100 && (
                <div style={{ display: "grid", gridTemplateColumns: TABLE_COLS, padding: "11px 16px", alignItems: "center", opacity: 0.3 }}>
                  <div style={{ fontFamily: CP, fontSize: 14, color: "#777" }}>…</div>
                  <div style={{ fontFamily: BODY, fontSize: 11, color: "#777" }}>More warriors</div>
                </div>
              )}

              {/* My row pinned at bottom if outside top 100 */}
              {myEntry && !myInTable && (
                <div style={{
                  display: "grid", gridTemplateColumns: TABLE_COLS, padding: "11px 16px",
                  borderTop: "1px solid rgba(108,43,217,0.15)", alignItems: "center",
                  background: "rgba(108,43,217,0.05)",
                }}>
                  <div style={{ fontFamily: CP, fontSize: 14, color: "#6c2bd9" }}>{myEntry.rank}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <Avatar tier={myEntry.tier} size={32} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: BODY, fontSize: 12, fontWeight: 500, color: "#6c2bd9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {myEntry.display_name} · You
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                        <span style={{ fontFamily: MONO, fontSize: 9, color: "#777" }}>@{myEntry.username}</span>
                        <TierChip tier={myEntry.tier} />
                      </div>
                    </div>
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 12, color: "#6c2bd9", textAlign: "right" }}>{myEntry.elo}</div>
                  <div style={{ fontFamily: MONO, fontSize: 12, color: "#34d399", textAlign: "right" }}>{myEntry.wins}</div>
                  <div style={{ fontFamily: MONO, fontSize: 12, color: "#f43f5e", textAlign: "right" }}>{myEntry.losses}</div>
                  <div style={{ fontFamily: MONO, fontSize: 12, color: "#bbb", textAlign: "right" }}>{myEntry.win_rate}%</div>
                </div>
              )}
            </div>

            {/* Footer CTA */}
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10 }}>
              <span style={{ fontFamily: BODY, fontSize: 11, color: "#555", flex: 1, letterSpacing: "0.04em" }}>
                Play more matches to climb the ranks
              </span>
              <Link href="/battle" style={{ fontFamily: BODY, fontSize: 11, color: "#bbb", textDecoration: "none", display: "flex", alignItems: "center", gap: 4, letterSpacing: "0.06em" }}>
                Find a match →
              </Link>
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
