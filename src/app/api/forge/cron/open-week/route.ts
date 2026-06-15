import { NextRequest, NextResponse } from "next/server";
import { currentActiveWeek } from "@/lib/forge/schedule";
import { openWeek } from "@/lib/forge/admin-helpers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function cronAuthed(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

// Cron Mon 00:00 IST: flip the calendar-current scheduled week to 'active'.
export async function POST(req: NextRequest) {
  if (!cronAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const targetWeek = currentActiveWeek();
  if (!targetWeek) {
    return NextResponse.json({ ok: true, skipped: "no scheduled week for current date" });
  }
  const result = await openWeek(targetWeek);
  return NextResponse.json(result);
}

export const GET = POST;
