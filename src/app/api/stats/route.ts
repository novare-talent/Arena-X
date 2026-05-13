import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 60;

export async function GET() {
  const admin = createAdminClient();
  const [{ count: userCount }, { count: matchCount }] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("matches").select("*", { count: "exact", head: true }).eq("status", "completed"),
  ]);
  return NextResponse.json({ users: userCount ?? 0, matches: matchCount ?? 0 });
}
