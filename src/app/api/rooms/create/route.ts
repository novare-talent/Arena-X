import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/rooms/create
// Body: { title, mode, visibility, max_players, settings: { topics, difficulty, num_questions, time_limit_minutes } }
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    title = "Untitled Room",
    mode = "standard",
    visibility = "private",
    max_players = 8,
    settings = {},
  } = body;

  const { topics = ["arrays"], difficulty = "mixed", num_questions = 3, time_limit_minutes = 30 } = settings;

  // Pick problems matching the criteria
  // Use contains-any logic: match if topics array contains at least one selected topic
  let query = supabase
    .from("problems")
    .select("id, difficulty")
    .eq("track", "dsa")
    .eq("is_active", true);

  if (topics?.length) {
    // topics.cs.{tag} means "topics array contains tag" — OR across all selected topics
    const topicFilter = (topics as string[]).map(t => `topics.cs.{${t}}`).join(",");
    query = query.or(topicFilter);
  }

  if (difficulty !== "mixed") {
    const diffMap: Record<string, number[]> = { easy: [1], medium: [2, 3], hard: [4, 5] };
    if (diffMap[difficulty]) query = query.in("difficulty", diffMap[difficulty]);
  }

  const { data: allProblems, error: queryError } = await query;

  // DEBUG — remove after confirming
  console.log("[rooms/create] topics:", topics, "difficulty:", difficulty);
  console.log("[rooms/create] query error:", queryError);
  console.log("[rooms/create] problems matched:", allProblems?.length ?? 0, allProblems?.map(p => p.id));

  // Fallback: if topic filter returned nothing, use all active DSA problems
  let pool = allProblems ?? [];
  if (!pool.length) {
    const { data: fallback, error: fallbackError } = await supabase
      .from("problems").select("id, difficulty").eq("track", "dsa").eq("is_active", true);
    console.log("[rooms/create] fallback count:", fallback?.length ?? 0, "error:", fallbackError);
    pool = fallback ?? [];
  }
  if (!pool.length) {
    return NextResponse.json({ error: "No problems available", debug: { topics, difficulty, queryError } }, { status: 400 });
  }

  // Shuffle and pick num_questions
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, Math.min(num_questions, shuffled.length));

  // Create the room
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .insert({
      host_id: user.id,
      title,
      mode,
      visibility,
      max_players,
      settings: { topics, difficulty, num_questions, time_limit_minutes },
    })
    .select("id, code")
    .single();

  if (roomError) return NextResponse.json({ error: roomError.message }, { status: 500 });

  // Insert room problems
  const problemRows = picked.map((p, i) => ({
    room_id: room.id,
    problem_id: p.id,
    order_index: i,
  }));
  const { error: rpError } = await supabase.from("room_problems").insert(problemRows);
  if (rpError) {
    console.error("[rooms/create] room_problems insert failed:", rpError.message, rpError.code);
    return NextResponse.json({ error: "Failed to assign problems: " + rpError.message }, { status: 500 });
  }

  // Auto-join host as participant
  await supabase.from("room_participants").insert({
    room_id: room.id,
    user_id: user.id,
  });

  return NextResponse.json({ room_id: room.id, code: room.code });
}