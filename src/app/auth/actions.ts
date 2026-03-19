"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();

  const email       = formData.get("email") as string;
  const password    = formData.get("password") as string;
  const username    = formData.get("username") as string;
  const displayName = formData.get("displayName") as string;
  const refCode     = (formData.get("referralCode") as string | null) ?? "";

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

  // Resolve referral code if present
  let referrerId: string | null = null;
  if (refCode) {
    const { data: referrer } = await supabase
      .from("profiles")
      .select("id")
      .eq("referral_code", refCode.toUpperCase())
      .maybeSingle();
    referrerId = referrer?.id ?? null;
  }

  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      data: {
        username,
        display_name: displayName || username,
      },
    },
  });

  if (error) return { error: error.message };

  // Record referral after account creation (service role bypasses RLS)
  if (referrerId && signUpData.user) {
    const service = getServiceClient();
    // Wait briefly for the DB trigger to create the profile row
    await new Promise((r) => setTimeout(r, 1500));
    await Promise.all([
      service.from("profiles").update({ referred_by: referrerId }).eq("id", signUpData.user.id),
      service.from("referrals").upsert({ referrer_id: referrerId, referred_id: signUpData.user.id }, { onConflict: "referred_id", ignoreDuplicates: true }),
    ]);
  }

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
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}