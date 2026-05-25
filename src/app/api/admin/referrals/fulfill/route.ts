import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * Admin endpoint: deliver a pending referral_grant by attaching the
 * OpenAI API key the admin just generated.
 *
 * Body: { grant_id: string, openai_api_key: string, key_label?: string }
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { grant_id, openai_api_key, key_label } = await request.json().catch(() => ({}));
  if (!grant_id || typeof grant_id !== "string") {
    return NextResponse.json({ error: "grant_id required" }, { status: 400 });
  }
  const key = (openai_api_key ?? "").toString().trim();
  if (!key.startsWith("sk-") || key.length < 20) {
    return NextResponse.json({ error: "Looks like that isn't a valid OpenAI key (expected sk-…)." }, { status: 400 });
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { error } = await service
    .from("referral_grants")
    .update({
      status:          "delivered",
      openai_api_key:  key,
      key_label:       (key_label ?? "").toString().trim() || null,
      fulfilled_at:    new Date().toISOString(),
      fulfilled_by:    user.id,
    })
    .eq("id", grant_id)
    .eq("status", "pending");  // guard: don't overwrite an already-fulfilled grant

  if (error) {
    console.error("[admin/referrals/fulfill]", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}