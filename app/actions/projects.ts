"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { encryptSecret } from "@/lib/crypto";
import { refFromUrl } from "@/lib/logs";

export type ActionResult = { ok: boolean; error?: string };

const TOKENS_URL = "supabase.com/dashboard/account/tokens";

/** Strip quotes, a stray "Bearer " prefix, and ALL whitespace (PATs have none). */
function sanitizeToken(raw: string): string {
  return raw
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/^Bearer\s+/i, "")
    .replace(/\s+/g, "");
}

/** Verify the access token can read this project via the Management API. */
async function verifyToken(url: string, token: string): Promise<{ ok: boolean; error?: string }> {
  const ref = refFromUrl(url);
  if (!ref) return { ok: false, error: "Enter a valid Supabase project URL (https://<ref>.supabase.co)." };

  // A Personal Access Token starts with `sbp_`. Project API keys (anon/service
  // role are JWTs `eyJ...`; publishable keys are `sb_...`) are NOT accepted by
  // the Management API — catch that early with a clear message.
  const looksLikeApiKey = token.startsWith("eyJ") || token.startsWith("sb_") || token.startsWith("sbs_");
  if (looksLikeApiKey) {
    return {
      ok: false,
      error: `That looks like a project API key, not a Personal Access Token. Create one at ${TOKENS_URL} (it starts with "sbp_").`
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    // List projects: a valid PAT returns 200; then confirm this ref is included.
    const res = await fetch("https://api.supabase.com/v1/projects", {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
      cache: "no-store"
    });
    clearTimeout(timeout);

    if (res.status === 401) {
      const detail = (await res.text().catch(() => "")).slice(0, 200);
      return {
        ok: false,
        error: `Invalid access token (Supabase said 401${detail ? `: ${detail}` : ""}). Make sure it's a Personal Access Token from ${TOKENS_URL} and hasn't been revoked.`
      };
    }
    if (res.status === 403) return { ok: false, error: "This token isn't allowed to list projects." };
    if (res.status === 429) return { ok: false, error: "Supabase rate limit hit — try again shortly." };
    if (!res.ok) return { ok: false, error: `Supabase API returned ${res.status}.` };

    const projects = (await res.json().catch(() => null)) as Array<{ id?: string; ref?: string }> | null;
    const found = Array.isArray(projects) && projects.some((p) => p.id === ref || p.ref === ref);
    if (!found) {
      return {
        ok: false,
        error: "Token is valid, but this project isn't in the account that owns the token. Check the project URL."
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not reach the Supabase Management API." };
  }
}

export async function createProject(formData: FormData): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const name = String(formData.get("name") ?? "").trim();
  const url = String(formData.get("supabase_url") ?? "").trim();
  const accessToken = sanitizeToken(String(formData.get("access_token") ?? ""));

  if (name.length < 2) return { ok: false, error: "Project name must be at least 2 characters." };
  if (accessToken.length < 10) return { ok: false, error: "Enter a valid Supabase access token." };

  const check = await verifyToken(url, accessToken);
  if (!check.ok) return { ok: false, error: check.error };

  const { error } = await supabase.from("projects").insert({
    user_id: user.id,
    name,
    supabase_url: url,
    management_token_encrypted: encryptSecret(accessToken),
    ai_db_access: formData.get("ai_db_access") === "on"
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateProject(id: string, formData: FormData): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const name = String(formData.get("name") ?? "").trim();
  const url = String(formData.get("supabase_url") ?? "").trim();
  const accessToken = sanitizeToken(String(formData.get("access_token") ?? ""));

  if (name.length < 2) return { ok: false, error: "Project name must be at least 2 characters." };
  if (!refFromUrl(url)) return { ok: false, error: "Enter a valid Supabase project URL." };

  const patch: Record<string, unknown> = {
    name,
    supabase_url: url,
    ai_db_access: formData.get("ai_db_access") === "on"
  };
  if (accessToken) {
    const check = await verifyToken(url, accessToken);
    if (!check.ok) return { ok: false, error: check.error };
    patch.management_token_encrypted = encryptSecret(accessToken);
  }

  const { error } = await supabase.from("projects").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${id}`);
  return { ok: true };
}

/** Soft delete: set deleted_at. Row is retained in the database. */
export async function deleteProject(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const { error } = await supabase
    .from("projects")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  return { ok: true };
}
