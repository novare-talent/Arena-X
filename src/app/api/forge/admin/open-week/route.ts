import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { openWeek } from "@/lib/forge/admin-helpers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const weekNumber = Number(body.week_number);
  if (!Number.isFinite(weekNumber) || weekNumber < 1 || weekNumber > 40) {
    return NextResponse.json({ error: "week_number must be 1..40" }, { status: 400 });
  }

  // Optional: admin can pass a short test window (minutes from now).
  const closeMinutes = Number(body.close_in_minutes);
  const forceCloseInMinutes = Number.isFinite(closeMinutes) && closeMinutes > 0 ? closeMinutes : undefined;

  // Optional: admin can pass an exact deadline instead of the default
  // (end of the calendar week it's opened in).
  let closesAt: string | undefined;
  if (typeof body.closes_at === "string" && body.closes_at) {
    const d = new Date(body.closes_at);
    if (Number.isNaN(d.getTime()) || d.getTime() <= Date.now()) {
      return NextResponse.json({ error: "closes_at must be a valid future date" }, { status: 400 });
    }
    closesAt = d.toISOString();
  }

  // startNow=true so the window begins from the admin's click, not from
  // the week's calendar-scheduled Monday (which could be weeks away).
  const result = await openWeek(weekNumber, { startNow: true, forceCloseInMinutes, closesAt });
  return NextResponse.json(result);
}
