import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await supabase
    .from("matchmaking_queue")
    .update({ status: "cancelled" })
    .eq("user_id", user.id)
    .eq("status", "waiting");

  return NextResponse.json({ status: "cancelled" });
}