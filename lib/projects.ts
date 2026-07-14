import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/types";

type ProjectRow = {
  id: string;
  name: string;
  supabase_url: string;
  ai_db_access: boolean | null;
  created_at: string;
  updated_at: string;
};

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    url: row.supabase_url,
    aiDbAccess: row.ai_db_access ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const PROJECT_COLS = "id, name, supabase_url, ai_db_access, created_at, updated_at";

/** All of the current user's non-deleted projects. */
export async function getProjects(): Promise<Project[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_COLS)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as ProjectRow[]).map(toProject);
}

/** A single project by id (RLS enforces ownership). Null if not found. */
export async function getProject(id: string): Promise<Project | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("projects")
    .select(PROJECT_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  return data ? toProject(data as ProjectRow) : null;
}

/**
 * Load a project together with its decrypted Supabase access token (PAT).
 * Server-only — used by log fetching and the chatbot. `accessToken` is null
 * when the project predates the token requirement (needs re-connect).
 */
export async function getProjectWithSecret(
  id: string
): Promise<{ project: Project; accessToken: string | null } | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("projects")
    .select(`${PROJECT_COLS}, management_token_encrypted`)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!data) return null;
  const encrypted = (data as { management_token_encrypted: string | null }).management_token_encrypted;
  const { decryptSecret } = await import("@/lib/crypto");
  return {
    project: toProject(data as ProjectRow),
    accessToken: encrypted ? decryptSecret(encrypted) : null
  };
}
