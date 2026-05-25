"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ipHashFromHeaders, normalizeEmail } from "@/lib/referralAbuse";

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/** Resolve the app's origin from the live request, falling back to env. */
function appOrigin() {
  const h = headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_APP_URL ?? "";
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();

  const email       = formData.get("email") as string;
  const password    = formData.get("password") as string;
  const username    = formData.get("username") as string;
  const displayName = formData.get("displayName") as string;
  let   refCode     = ((formData.get("referralCode") as string | null) ?? "").trim().toUpperCase();

  // Username format validation
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return { error: "Username must be 3–20 characters: letters, numbers, underscores only." };
  }

  // Username uniqueness check (profiles are publicly readable)
  const { data: existing } = await supabase
    .from("profiles")
    .select("username")
    .eq("username", username.toLowerCase())
    .maybeSingle();

  if (existing) {
    return { error: `Username "@${username}" is already taken. Please choose a different one.` };
  }

  // ── Anti-abuse on the referral path only — never blocks the signup itself ──
  if (refCode) {
    const service = serviceClient();
    const ipHash  = ipHashFromHeaders(headers());

    // (a) Self-referral via email-root match (john+1@…, john+2@…)
    const { data: referrer } = await service
      .from("profiles")
      .select("id")
      .eq("referral_code", refCode)
      .maybeSingle();
    if (referrer) {
      const { data: refAuth } = await service.auth.admin.getUserById(referrer.id);
      const refEmail = refAuth?.user?.email ?? "";
      if (normalizeEmail(refEmail) === normalizeEmail(email)) {
        refCode = "";
      }
    } else {
      refCode = "";  // unknown code → drop silently
    }

    // (b) IP throttle — 5 referred signups per day per IP hash
    if (refCode && ipHash) {
      const { data: withinLimit } = await service.rpc("bump_signup_throttle", { p_ip_hash: ipHash, p_limit: 5 });
      if (withinLimit === false) refCode = "";
    }
  }

  // Push referral_code into raw_user_meta_data so handle_new_user() can
  // resolve and link it atomically (no setTimeout race). OAuth signups
  // can't reach this path → handled by the cookie consumer in /auth/callback.
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${appOrigin()}/auth/callback`,
      data: {
        username,
        display_name: displayName || username,
        ...(refCode ? { referral_code: refCode } : {}),
      },
    },
  });

  if (error) return { error: error.message };

  redirect(`/auth/verify-email?email=${encodeURIComponent(email)}`);
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function resendVerification(email: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${appOrigin()}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}