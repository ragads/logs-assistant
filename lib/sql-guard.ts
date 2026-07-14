/**
 * Application-level guard: allow only a single read-only SELECT statement.
 * This is the first of two layers — the query is ALSO executed as the
 * `supabase_read_only_user` role via the read-only Management API endpoint, so
 * writes are rejected by Postgres even if this guard is ever bypassed.
 */

// Whole-word blocklist. Note: "replace" is intentionally omitted — in Postgres
// REPLACE() is a read-only string function, and the read-only DB role blocks the
// actual data-modifying statements regardless.
const FORBIDDEN = [
  "insert", "update", "delete", "drop", "alter", "create", "truncate", "grant",
  "revoke", "comment", "copy", "call", "do", "vacuum", "analyze", "reindex",
  "refresh", "merge", "reset", "begin", "commit", "rollback",
  "savepoint", "listen", "notify", "lock", "prepare", "execute", "discard",
  "cluster", "attach", "detach", "pg_read_file", "pg_ls_dir",
  "pg_sleep", "dblink", "lo_import", "lo_export"
];

const MAX_LEN = 4000;
const DEFAULT_LIMIT = 200;

export type GuardResult = { ok: true; sql: string } | { ok: false; error: string };

export function validateReadOnlySql(input: string): GuardResult {
  if (!input || typeof input !== "string") return { ok: false, error: "Empty query." };
  let sql = input.trim();

  if (sql.length > MAX_LEN) return { ok: false, error: "Query is too long." };

  // Reject comments (could be used to smuggle statements).
  if (sql.includes("--") || sql.includes("/*")) {
    return { ok: false, error: "Comments are not allowed in queries." };
  }

  // Drop a single trailing semicolon; reject anything that chains statements.
  if (sql.endsWith(";")) sql = sql.slice(0, -1).trim();
  if (sql.includes(";")) return { ok: false, error: "Only a single statement is allowed." };

  // Must be a SELECT (optionally a CTE that resolves to SELECT).
  if (!/^(select|with)\b/i.test(sql)) {
    return { ok: false, error: "Only SELECT queries are allowed." };
  }

  // Whole-word scan for data-changing / dangerous keywords.
  const lower = sql.toLowerCase();
  for (const kw of FORBIDDEN) {
    if (new RegExp(`\\b${kw}\\b`).test(lower)) {
      return { ok: false, error: `Disallowed keyword: ${kw}.` };
    }
  }
  // `select ... into` creates a table.
  if (/\binto\b/.test(lower)) return { ok: false, error: "SELECT INTO is not allowed." };

  // Cap result size if the model didn't add a LIMIT.
  if (!/\blimit\b/i.test(lower)) sql = `${sql} limit ${DEFAULT_LIMIT}`;

  return { ok: true, sql };
}
