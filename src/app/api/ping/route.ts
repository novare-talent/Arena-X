import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Lightweight keepalive — call from the client on app load to wake Supabase free-tier DB
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  await supabase.from("profiles").select("id").limit(1);
  return NextResponse.json({ ok: true });
}