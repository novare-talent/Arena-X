import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { lockWeek } from "@/lib/forge/admin-helpers";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

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
  const force = body.force === true;

  const result = await lockWeek(weekNumber, { force });
  // Return 4xx if it was a user-fixable refusal (ordering / snapshot guard).
  if (!result.ok && result.error) return NextResponse.json(result, { status: 409 });
  return NextResponse.json(result);
}
