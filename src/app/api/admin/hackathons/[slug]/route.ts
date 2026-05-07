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
  const { data: p } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!p?.is_admin) return null;
  return user;
}

export async function PATCH(request: Request, { params }: { params: { slug: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const service = getServiceClient();

  const { error } = await service.from("hackathons").update({
    title:                 body.title,
    tagline:               body.tagline || null,
    description:           body.description || null,
    banner_url:            body.banner_url || null,
    status:                body.status,
    registration_deadline: body.registration_deadline || null,
    starts_at:             body.starts_at || null,
    ends_at:               body.ends_at || null,
    prizes:                body.prizes ?? [],
    tags:                  body.tags ?? [],
    max_team_size:         body.max_team_size ?? 1,
    allow_solo:            body.allow_solo ?? true,
    allow_teams:           body.allow_teams ?? false,
    problem_statement:     body.problem_statement || null,
  }).eq("slug", params.slug);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
