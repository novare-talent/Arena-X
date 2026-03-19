"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const username = (formData.get("username") as string).trim().toLowerCase();
  const displayName = (formData.get("display_name") as string).trim();
  const bio = (formData.get("bio") as string).trim();
  const college = (formData.get("college") as string).trim();
  const country = (formData.get("country") as string).trim();
  const githubUsername = (formData.get("github_username") as string).trim();
  const experienceLevel = formData.get("experience_level") as string;

  // Validate username format
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return { error: "Username must be 3–20 characters: letters, numbers, underscores only." };
  }

  // Check username uniqueness (excluding current user)
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .neq("id", user.id)
    .single();

  if (existing) {
    return { error: "That username is already taken." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: any = {
    username,
    display_name: displayName,
    bio: bio || null,
    college: college || null,
    country: country || null,
    github_username: githubUsername || null,
    experience_level: experienceLevel || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { success: true };
}