import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import AdminSubmissionsClient from "@/components/admin/AdminSubmissionsClient";

export const metadata = { title: "Submissions — Admin" };

function getServiceClient() {
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export default async function AdminSubmissionsPage({ params }: { params: { slug: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const service = getServiceClient();

  const { data: hackathon } = await service
    .from("hackathons")
    .select("id, slug, title, status")
    .eq("slug", params.slug)
    .single();

  if (!hackathon) notFound();

  // Fetch submissions with full user info + registration (for team name)
  const { data: submissions } = await service
    .from("hackathon_submissions")
    .select(`
      id, title, description, project_url, demo_url, github_url, submitted_at, updated_at,
      profiles ( id, username, display_name, avatar_url ),
      hackathon_registrations ( team_name, teammate_ids )
    `)
    .eq("hackathon_id", hackathon.id)
    .order("submitted_at", { ascending: false });

  // Fetch emails via auth.users for each submitter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userIds = (submissions ?? []).map((s: any) => (s.profiles as { id: string } | null)?.id).filter(Boolean) as string[];
  const emailMap: Record<string, string> = {};
  for (const uid of userIds) {
    const { data: authUser } = await service.auth.admin.getUserById(uid);
    if (authUser?.user?.email) emailMap[uid] = authUser.user.email;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enriched = (submissions ?? []).map((s: any) => {
    const profile = s.profiles as { id: string; username: string; display_name: string | null; avatar_url: string | null } | null;
    const reg     = s.hackathon_registrations as { team_name: string | null; teammate_ids: string[] } | null;
    return {
      id:           s.id,
      title:        s.title,
      description:  s.description,
      project_url:  s.project_url,
      demo_url:     s.demo_url,
      github_url:   s.github_url,
      submitted_at: s.submitted_at,
      updated_at:   s.updated_at,
      name:         profile?.display_name ?? profile?.username ?? "Unknown",
      username:     profile?.username ?? "",
      email:        profile?.id ? (emailMap[profile.id] ?? "") : "",
      team_name:    reg?.team_name ?? null,
      avatar_url:   profile?.avatar_url ?? null,
    };
  });

  return (
    <AdminSubmissionsClient
      hackathon={hackathon}
      submissions={enriched}
      publicUrl={`/hackathons/${params.slug}`}
    />
  );
}
