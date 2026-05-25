import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * Admin endpoint: revoke a referral_grant (e.g. abuse detected). Marks
 * status='revoked' and stamps the reason. Does NOT touch the underlying
 * referrals rows — admin must separately revoke individual referrals if
 * a tier needs to be unwound.
 *
 * Body: { grant_id: string, reason?: string }
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { grant_id, reason } = await request.json().catch(() => ({}));
  if (!grant_id || typeof grant_id !== "string") {
    return NextResponse.json({ error: "grant_id required" }, { status: 400 });
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { error } = await service
    .from("referral_grants")
    .update({
      status:        "revoked",
      revoked_at:    new Date().toISOString(),
      revoke_reason: (reason ?? "").toString().trim() || null,
    })
    .eq("id", grant_id);

  if (error) {
    console.error("[admin/referrals/revoke]", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}