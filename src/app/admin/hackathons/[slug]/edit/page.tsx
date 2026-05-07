import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import HackathonForm from "@/components/admin/HackathonForm";

export const metadata = { title: "Edit Hackathon — Admin" };

export default async function EditHackathonPage({ params }: { params: { slug: string } }) {
  const supabase = await createClient();
  const { data: h } = await supabase
    .from("hackathons")
    .select("*")
    .eq("slug", params.slug)
    .single();

  if (!h) notFound();

  return (
    <HackathonForm initial={{
      ...h,
      tags: Array.isArray(h.tags) ? h.tags.join(", ") : "",
    }} />
  );
}
