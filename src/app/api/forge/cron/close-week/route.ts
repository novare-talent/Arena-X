import { NextRequest, NextResponse } from "next/server";
import { closeAndJudgeWeek } from "@/lib/forge/admin-helpers";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function cronAuthed(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

// Cron Sun 21:30 IST: close the active week, judge every submission, apply Elo deltas.
export async function POST(req: NextRequest) {
  if (!cronAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await closeAndJudgeWeek();
  return NextResponse.json(result);
}

export const GET = POST;
