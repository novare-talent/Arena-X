import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return null;
  return user;
}

export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { slug, title, tagline, description, banner_url, status, registration_deadline,
    starts_at, ends_at, prizes, tags, max_team_size, allow_solo, allow_teams, problem_statement } = body;

  if (!slug || !title) return NextResponse.json({ error: "slug and title required" }, { status: 400 });

  const service = getServiceClient();
  const { data, error } = await service.from("hackathons").insert({
    slug, title, tagline: tagline || null, description: description || null,
    banner_url: banner_url || null, status: status ?? "draft",
    registration_deadline: registration_deadline || null,
    starts_at: starts_at || null, ends_at: ends_at || null,
    prizes: prizes ?? [], tags: tags ?? [], max_team_size: max_team_size ?? 1,
    allow_solo: allow_solo ?? true, allow_teams: allow_teams ?? false,
    problem_statement: problem_statement || null,
    created_by: user.id,
  }).select("id, slug").single();

  if (error) {
    console.error("[admin/hackathons POST]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
