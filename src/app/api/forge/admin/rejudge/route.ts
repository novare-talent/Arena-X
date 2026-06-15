import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { judgeSubmission } from "@/lib/forge/judge";
import { extractArtifactText } from "@/lib/forge/extract";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { submission_id } = await req.json();
  if (!submission_id) return NextResponse.json({ error: "submission_id required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("forge_submissions")
    .select("*, forge_challenges(*)")
    .eq("id", submission_id)
    .single();
  if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let bytes: ArrayBuffer | null = null;
  if (sub.artifact_url) {
    const { data: file, error: dlErr } = await admin.storage
      .from("forge-submissions").download(sub.artifact_url);
    if (dlErr) return NextResponse.json({ error: `download: ${dlErr.message}` }, { status: 500 });
    bytes = await file.arrayBuffer();
  }
  const artifactText = await extractArtifactText({
    format: sub.artifact_format, bytes, externalLink: sub.external_link, notes: sub.notes,
  });

  try {
    const result = await judgeSubmission(sub.forge_challenges, artifactText);
    await admin.from("forge_submissions").update({
      judge_status: "scored",
      judge_model: result.judge_model,
      rubric_scores: result.rubric_scores,
      overall_score: result.overall_score,
      judge_feedback: result.feedback,
      judge_error: null,
      judged_at: new Date().toISOString(),
    }).eq("id", sub.id);
    return NextResponse.json({ ok: true, overall_score: result.overall_score });
  } catch (err) {
    const msg = String(err).slice(0, 500);
    await admin.from("forge_submissions").update({
      judge_status: "failed", judge_error: msg, judged_at: new Date().toISOString(),
    }).eq("id", sub.id);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
