import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PracticeArena from "@/components/arena/PracticeArena";
import { PROBLEM_PUBLIC_COLUMNS } from "@/lib/problemColumns";

export default async function PracticePage({ params }: { params: { matchId: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: match } = await supabase
    .from("matches")
    .select(`*, problems(${PROBLEM_PUBLIC_COLUMNS})`)
    .eq("id", params.matchId)
    .single();

  if (!match || (match.player_one_id !== user.id && match.player_two_id !== user.id)) {
    redirect("/arena");
  }

  return (
    <PracticeArena
      matchId={params.matchId}
      problem={match.problems}
    />
  );
}