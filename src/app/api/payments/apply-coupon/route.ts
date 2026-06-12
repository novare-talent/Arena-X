import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const VALID_COUPON = "BITCOINBHARAT";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const code = String(body.code ?? "").trim();

    if (!code) {
      return NextResponse.json({ success: false, message: "Enter a coupon code" }, { status: 400 });
    }

    if (code.toUpperCase() !== VALID_COUPON) {
      return NextResponse.json({ success: false, message: "Invalid coupon code" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: profile } = await admin
      .from("profiles")
      .select("is_pro")
      .eq("id", user.id)
      .single();

    if (profile?.is_pro) {
      return NextResponse.json({ success: false, message: "You are already a Pro member" }, { status: 400 });
    }

    const proExpiresAt = new Date();
    proExpiresAt.setFullYear(proExpiresAt.getFullYear() + 1);

    const { error } = await admin
      .from("profiles")
      .update({ is_pro: true, pro_expires_at: proExpiresAt.toISOString() })
      .eq("id", user.id);

    if (error) {
      console.error("apply-coupon update error:", error);
      return NextResponse.json({ success: false, message: "Failed to apply coupon" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Coupon applied! Welcome to Pro." });
  } catch (e) {
    console.error("apply-coupon error:", e);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
