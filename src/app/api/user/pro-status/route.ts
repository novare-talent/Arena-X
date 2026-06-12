import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ isPro: false });

    const { data } = await supabase
      .from("profiles")
      .select("is_pro, pro_expires_at")
      .eq("id", user.id)
      .single();

    const now   = new Date();
    const isPro = !!(
      data?.is_pro &&
      (!data.pro_expires_at || new Date(data.pro_expires_at) > now)
    );

    return NextResponse.json({ isPro });
  } catch {
    return NextResponse.json({ isPro: false });
  }
}
