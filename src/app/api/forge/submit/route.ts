import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rateLimit";
import { PRO_FEATURES_FREE } from "@/lib/featureFlags";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ALLOWED_FORMATS = new Set(["zip", "pdf", "md", "code", "link"]);

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await rateLimit(`forge_submit:${user.id}`, 10, 60))) {
    return NextResponse.json({ error: "Too many submissions — slow down." }, { status: 429 });
  }

  const form = await req.formData();
  const challengeId = String(form.get("challenge_id") ?? "");
  const format = String(form.get("format") ?? "");
  const externalLink = (form.get("external_link") as string | null) || null;
  const notes = (form.get("notes") as string | null) || null;
  const file = form.get("file") as File | null;

  if (!challengeId) return NextResponse.json({ error: "challenge_id required" }, { status: 400 });
  if (!ALLOWED_FORMATS.has(format)) return NextResponse.json({ error: "invalid format" }, { status: 400 });

  const { data: challenge } = await supabase
    .from("forge_challenges")
    .select("id, week_number, status, is_pro_only, submission_formats, max_file_mb, closes_at")
    .eq("id", challengeId)
    .single();
  if (!challenge) return NextResponse.json({ error: "Challenge not found" }, { status: 404 });

  if (challenge.status !== "active") {
    return NextResponse.json({ error: "This week is not accepting submissions." }, { status: 403 });
  }
  if (challenge.closes_at && new Date(challenge.closes_at) < new Date()) {
    return NextResponse.json({ error: "Submission window closed." }, { status: 403 });
  }
  if (!(challenge.submission_formats as string[]).includes(format)) {
    return NextResponse.json({ error: `Format must be one of: ${(challenge.submission_formats as string[]).join(", ")}` }, { status: 400 });
  }

  // Pro gate
  if (challenge.is_pro_only && !PRO_FEATURES_FREE) {
    const { data: profile } = await supabase
      .from("profiles").select("is_pro, pro_expires_at").eq("id", user.id).single();
    const now = new Date();
    const isPro = !!(profile?.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at) > now));
    if (!isPro) return NextResponse.json({ error: "Pro subscription required for this week." }, { status: 403 });
  }

  // Already submitted? — reject (idempotency lives on the unique constraint anyway).
  const { data: existing } = await supabase
    .from("forge_submissions")
    .select("id").eq("challenge_id", challengeId).eq("user_id", user.id).maybeSingle();
  if (existing) return NextResponse.json({ error: "You have already submitted this week." }, { status: 409 });

  // Validate payload by format
  let artifactUrl: string | null = null;
  let artifactSize: number | null = null;

  if (format === "link") {
    if (!externalLink || !/^https?:\/\//i.test(externalLink)) {
      return NextResponse.json({ error: "external_link must be a valid URL" }, { status: 400 });
    }
  } else {
    if (!file) return NextResponse.json({ error: "file required for this format" }, { status: 400 });
    const maxBytes = (challenge.max_file_mb ?? 50) * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json({ error: `File exceeds ${challenge.max_file_mb}MB limit` }, { status: 413 });
    }
    artifactSize = file.size;

    const admin = createAdminClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || format;
    const path = `${user.id}/${challenge.week_number}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await admin.storage
      .from("forge-submissions")
      .upload(path, buf, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
    if (upErr) return NextResponse.json({ error: `Upload failed: ${upErr.message}` }, { status: 500 });
    artifactUrl = path;
  }

  const admin = createAdminClient();
  const { data: inserted, error: insErr } = await admin
    .from("forge_submissions")
    .insert({
      challenge_id: challengeId,
      user_id: user.id,
      artifact_url: artifactUrl,
      artifact_format: format,
      artifact_size_bytes: artifactSize,
      external_link: externalLink,
      notes,
      judge_status: "pending",
    })
    .select("id, submitted_at")
    .single();

  if (insErr) {
    if (insErr.code === "23505") {
      return NextResponse.json({ error: "Duplicate submission." }, { status: 409 });
    }
    return NextResponse.json({ error: `DB error: ${insErr.message}` }, { status: 500 });
  }

  return NextResponse.json({ id: inserted!.id, submitted_at: inserted!.submitted_at });
}
