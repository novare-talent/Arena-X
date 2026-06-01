import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Cached 5 min: these are landing-page vanity counters, not live data, so
// we don't need a full count(*) on every request against the shared Free PG.
export const revalidate = 300;

export async function GET() {
  const admin = createAdminClient();
  // "estimated" = exact while the table is small, cheap planner estimate at
  // scale — avoids full sequential scans competing with the duel write path.
  const [{ count: userCount }, { count: matchCount }] = await Promise.all([
    admin.from("profiles").select("*", { count: "estimated", head: true }),
    admin.from("matches").select("*", { count: "estimated", head: true }).eq("status", "completed"),
  ]);
  return NextResponse.json({ users: userCount ?? 0, matches: matchCount ?? 0 });
}
