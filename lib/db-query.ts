import { refFromUrl } from "@/lib/logs";
import { validateReadOnlySql } from "@/lib/sql-guard";

const MGMT_API = "https://api.supabase.com";

export type QueryResult = { rows: Record<string, unknown>[]; error?: string };

/**
 * Run a read-only SELECT against a connected project's Postgres.
 * Two-layer safety: (1) validateReadOnlySql guard, then (2) executed via the
 * read-only Management API endpoint as the supabase_read_only_user role.
 */
export async function runReadOnlyQuery(
  projectUrl: string,
  token: string,
  rawSql: string
): Promise<QueryResult> {
  const ref = refFromUrl(projectUrl);
  if (!ref) return { rows: [], error: "Invalid Supabase project URL." };

  const guard = validateReadOnlySql(rawSql);
  if (!guard.ok) return { rows: [], error: guard.error };

  let res: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    res = await fetch(`${MGMT_API}/v1/projects/${ref}/database/query/read-only`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query: guard.sql }),
      signal: controller.signal,
      cache: "no-store"
    });
    clearTimeout(timeout);
  } catch {
    return { rows: [], error: "Could not reach the database query endpoint." };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 401) return { rows: [], error: "Unauthorized — check the access token." };
    if (res.status === 403) return { rows: [], error: "Access token lacks permission for this project." };
    if (res.status === 429) return { rows: [], error: "Rate limited — try again shortly." };
    return { rows: [], error: `Query failed (${res.status}): ${body.slice(0, 300)}` };
  }

  const data = (await res.json().catch(() => null)) as unknown;
  const rows = Array.isArray(data)
    ? (data as Record<string, unknown>[])
    : ((data as { result?: Record<string, unknown>[]; rows?: Record<string, unknown>[] })?.result ??
        (data as { rows?: Record<string, unknown>[] })?.rows ??
        []);
  return { rows };
}
