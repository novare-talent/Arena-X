import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/friends/notifications — returns pending friend requests + pending challenges count
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ count: 0 });

  const [{ count: reqCount }, { count: chalCount }] = await Promise.all([
    supabase
      .from("friendships")
      .select("*", { count: "exact", head: true })
      .eq("addressee_id", user.id)
      .eq("status", "pending"),
    supabase
      .from("challenges")
      .select("*", { count: "exact", head: true })
      .eq("challenged_id", user.id)
      .eq("status", "pending"),
  ]);

  return NextResponse.json({ count: (reqCount ?? 0) + (chalCount ?? 0) });
}