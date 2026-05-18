import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, description, project_url, demo_url, github_url, drive_url } = await request.json().catch(() => ({}));

  // Every field is optional, but a submission must have at least one filled.
  const hasContent = [title, description, project_url, demo_url, github_url, drive_url]
    .some((v) => typeof v === "string" && v.trim().length > 0);
  if (!hasContent) {
    return NextResponse.json({ error: "Add at least one detail before submitting." }, { status: 400 });
  }

  const service = getServiceClient();

  const { data: hackathon } = await service
    .from("hackathons")
    .select("id, status, ends_at")
    .eq("slug", params.slug)
    .single();

  if (!hackathon) return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
  if (hackathon.status !== "active") {
    return NextResponse.json({ error: "Submissions are closed" }, { status: 400 });
  }
  if (hackathon.ends_at && new Date(hackathon.ends_at) < new Date()) {
    return NextResponse.json({ error: "Hackathon has ended" }, { status: 400 });
  }

  // Must be registered
  const { data: reg } = await service
    .from("hackathon_registrations")
    .select("id")
    .eq("hackathon_id", hackathon.id)
    .eq("user_id", user.id)
    .single();

  if (!reg) return NextResponse.json({ error: "You must be registered to submit" }, { status: 403 });

  const { error } = await service.from("hackathon_submissions").upsert({
    hackathon_id: hackathon.id,
    user_id:      user.id,
    title:        title?.trim() || null,
    description:  description?.trim() || null,
    project_url:  project_url?.trim() || null,
    demo_url:     demo_url?.trim() || null,
    github_url:   github_url?.trim() || null,
    drive_url:    drive_url?.trim() || null,
    updated_at:   new Date().toISOString(),
  }, { onConflict: "hackathon_id,user_id" });

  if (error) {
    console.error("[hackathon/submit]", error);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
