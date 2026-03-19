import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username") ?? "";

  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return NextResponse.json({ available: false, reason: "invalid" });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("username")
    .eq("username", username.toLowerCase())
    .maybeSingle();

  return NextResponse.json({ available: !data });
}