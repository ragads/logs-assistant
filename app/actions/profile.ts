"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionResult = { ok: boolean; error?: string };

export async function updateName(formData: FormData): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { ok: false, error: "Name must be at least 2 characters." };
  if (!/^[A-Za-z ]+$/.test(name)) return { ok: false, error: "Use letters and spaces only." };

  const { error } = await supabase.from("profiles").update({ name }).eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}

/**
 * Soft-deletes the user's app data (profile, projects, conversations) and, if a
 * service role key is configured, hard-deletes the auth user. The session is
 * cleared so the caller can redirect to /account-deleted.
 */
export async function deleteAccount(): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const now = new Date().toISOString();
  await supabase.from("projects").update({ deleted_at: now }).eq("user_id", user.id);
  await supabase.from("conversations").update({ deleted_at: now }).eq("user_id", user.id);
  await supabase.from("profiles").update({ deleted_at: now }).eq("id", user.id);

  const admin = createAdminClient();
  if (admin) {
    await admin.auth.admin.deleteUser(user.id);
  }

  await supabase.auth.signOut();
  return { ok: true };
}
