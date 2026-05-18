import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import HackathonDetail from "@/components/hackathons/HackathonDetail";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const supabase = await createClient();
  const { data } = await supabase.from("hackathons").select("title, tagline").eq("slug", params.slug).single();
  return { title: data ? `${data.title} — ArenaX Hackathons` : "Hackathon" };
}

export default async function HackathonPage({ params }: { params: { slug: string } }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: hackathon } = await supabase
    .from("hackathons")
    .select("*")
    .eq("slug", params.slug)
    .neq("status", "draft")
    .single();

  if (!hackathon) notFound();

  const [
    { data: myRegistration },
    { data: mySubmission },
    { data: submissions },
    { count: participantCount },
  ] = await Promise.all([
    user
      ? supabase.from("hackathon_registrations").select("id, team_name, teammate_ids").eq("hackathon_id", hackathon.id).eq("user_id", user.id).single()
      : Promise.resolve({ data: null }),
    user
      ? supabase.from("hackathon_submissions").select("id, title, description, project_url, demo_url, github_url, drive_url, submitted_at").eq("hackathon_id", hackathon.id).eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("hackathon_submissions")
      .select("id, title, description, project_url, demo_url, github_url, drive_url, submitted_at, profiles(display_name, username, avatar_url)")
      .eq("hackathon_id", hackathon.id)
      .order("submitted_at", { ascending: false }),
    admin.from("hackathon_registrations").select("*", { count: "exact", head: true }).eq("hackathon_id", hackathon.id),
  ]);

  return (
    <HackathonDetail
      hackathon={hackathon}
      userId={user?.id ?? null}
      myRegistration={myRegistration ?? null}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mySubmission={(mySubmission ?? null) as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      submissions={(submissions ?? []) as any}
      participantCount={participantCount ?? 0}
    />
  );
}
