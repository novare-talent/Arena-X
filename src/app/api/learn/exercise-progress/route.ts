import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { exercise_id, best_score, completed } = await req.json();
  if (!exercise_id) return NextResponse.json({ error: "Missing exercise_id" }, { status: 400 });

  const { error } = await supabase
    .from("prompt_exercise_progress")
    .upsert(
      {
        user_id: user.id,
        exercise_id,
        best_score: best_score ?? 0,
        completed: completed ?? false,
        completed_at: completed ? new Date().toISOString() : null,
      },
      { onConflict: "user_id,exercise_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
