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

  const { team_name, teammates } = await request.json().catch(() => ({}));
  const service = getServiceClient();

  const { data: hackathon } = await service
    .from("hackathons")
    .select("id, status, allow_solo, allow_teams, max_team_size, registration_deadline")
    .eq("slug", params.slug)
    .single();

  if (!hackathon) return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
  if (hackathon.status !== "upcoming" && hackathon.status !== "active") {
    return NextResponse.json({ error: "Registrations are closed" }, { status: 400 });
  }
  if (hackathon.registration_deadline && new Date(hackathon.registration_deadline) < new Date()) {
    return NextResponse.json({ error: "Registration deadline has passed" }, { status: 400 });
  }

  // Resolve teammate usernames → IDs
  const teammateIds: string[] = [];
  if (hackathon.allow_teams && Array.isArray(teammates) && teammates.length > 0) {
    const validNames = teammates.filter((t: string) => typeof t === "string" && t.trim());
    if (validNames.length > hackathon.max_team_size - 1) {
      return NextResponse.json({ error: `Max team size is ${hackathon.max_team_size}` }, { status: 400 });
    }
    if (validNames.length > 0) {
      const { data: profiles } = await service
        .from("profiles")
        .select("id, username")
        .in("username", validNames);
      for (const p of profiles ?? []) teammateIds.push(p.id);
    }
  }

  const { error } = await service.from("hackathon_registrations").upsert({
    hackathon_id: hackathon.id,
    user_id:      user.id,
    team_name:    team_name || null,
    teammate_ids: teammateIds,
  }, { onConflict: "hackathon_id,user_id" });

  if (error) {
    console.error("[hackathon/register]", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
