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
  let query = supabase
    .from("problems")
    .select("id, difficulty")
    .eq("track", "dsa")
    .eq("is_active", true);

  if (topics?.length) query = query.overlaps("topics", topics);

  if (difficulty !== "mixed") {
    const diffMap: Record<string, number[]> = {
      easy:   [1],
      medium: [2, 3],
      hard:   [4, 5],
    };
    if (diffMap[difficulty]) query = query.in("difficulty", diffMap[difficulty]);
  }

  const { data: allProblems } = await query;
  if (!allProblems?.length) {
    return NextResponse.json({ error: "No problems found for selected criteria" }, { status: 400 });
  }

  // Shuffle and pick num_questions
  const shuffled = [...allProblems].sort(() => Math.random() - 0.5);
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
  await supabase.from("room_problems").insert(problemRows);

  // Auto-join host as participant
  await supabase.from("room_participants").insert({
    room_id: room.id,
    user_id: user.id,
  });

  return NextResponse.json({ room_id: room.id, code: room.code });
}