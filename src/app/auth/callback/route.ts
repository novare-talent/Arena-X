import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ipHashFromHeaders, normalizeEmail } from "@/lib/referralAbuse";

/**
 * Consume the `arenax_ref` cookie (set by middleware when the user visits
 * /invite/<CODE> or any URL with ?ref=<CODE>) and write the referral
 * linkage. This is the OAuth-safe path — for email signups the trigger
 * already wrote the link from raw_user_meta_data.referral_code, but we
 * run this anyway as a redundant safety net and clear the cookie.
 *
 * Idempotent: skips if the user already has a referrer; the UPDATE/INSERT
 * are guarded by `referred_by IS NULL` and the `unique(referred_id)`
 * constraint on referrals.
 */
async function consumeReferralCookie(userId: string, userEmail: string, ipHash: string) {
  const cookieStore = cookies();
  const refCookie = cookieStore.get("arenax_ref");
  if (!refCookie?.value) return;

  const code = refCookie.value.toUpperCase();
  cookieStore.delete("arenax_ref");

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Resolve referrer
  const { data: referrer } = await service
    .from("profiles")
    .select("id")
    .eq("referral_code", code)
    .maybeSingle();
  if (!referrer || referrer.id === userId) return; // unknown code or direct-self-ref

  // Self-referral via email-root (john+1@gmail / john+2@gmail)
  const { data: refAuth } = await service.auth.admin.getUserById(referrer.id);
  const refEmail = refAuth?.user?.email ?? "";
  if (normalizeEmail(refEmail) === normalizeEmail(userEmail)) return;

  // IP throttle — 5 referred signups per day per IP hash
  if (ipHash) {
    const { data: withinLimit } = await service.rpc("bump_signup_throttle", { p_ip_hash: ipHash, p_limit: 5 });
    if (withinLimit === false) return;
  }

  // Link the profile only if not already linked (idempotent)
  await service.from("profiles")
    .update({ referred_by: referrer.id })
    .eq("id", userId)
    .is("referred_by", null);

  // Insert referrals row (unique(referred_id) makes this a no-op on retry)
  await service.from("referrals").upsert(
    { referrer_id: referrer.id, referred_id: userId },
    { onConflict: "referred_id", ignoreDuplicates: true },
  );
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Persist referral link if a cookie is still around — covers OAuth
        // signups (which don't carry raw_user_meta_data.referral_code) and
        // email-confirmation hops. Best-effort; never blocks login.
        try {
          await consumeReferralCookie(user.id, user.email ?? "", ipHashFromHeaders(request.headers));
        } catch (e) {
          console.error("[auth/callback] referral cookie consume failed:", e);
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", user.id)
          .single();
        if (!profile?.onboarding_completed) {
          return NextResponse.redirect(`${origin}/onboarding`);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`);
}