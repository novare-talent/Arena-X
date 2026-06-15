import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { closeAndJudgeWeek } from "@/lib/forge/admin-helpers";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const weekNumber = body.week_number != null ? Number(body.week_number) : undefined;
  if (weekNumber != null && (!Number.isFinite(weekNumber) || weekNumber < 1 || weekNumber > 40)) {
    return NextResponse.json({ error: "week_number must be 1..40 (or omitted to close the active week)" }, { status: 400 });
  }

  const result = await closeAndJudgeWeek(weekNumber);
  return NextResponse.json(result);
}
