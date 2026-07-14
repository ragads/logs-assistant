import type { LogEntry } from "@/lib/types";

const MGMT_API = "https://api.supabase.com";

// Friendly source key -> Logflare source table used in the SQL FROM clause.
export const LOG_SOURCES: Record<string, { table: string; label: string }> = {
  api: { table: "edge_logs", label: "API / Edge" },
  postgres: { table: "postgres_logs", label: "Postgres" },
  auth: { table: "auth_logs", label: "Auth" },
  functions: { table: "function_edge_logs", label: "Edge Functions" },
  storage: { table: "storage_logs", label: "Storage" },
  realtime: { table: "realtime_logs", label: "Realtime" }
};

// Sources merged when the user asks for "all". Kept small to stay well under
// the Management API rate limit (each source is a separate API call). Other
// sources remain available individually via the source dropdown.
const ALL_SOURCES = ["api", "postgres", "auth"];

// Short-lived server-side cache to absorb bursts (StrictMode double-mounts,
// rapid refreshes, the chat route reusing recent logs).
const CACHE_TTL_MS = 10_000;
const cache = new Map<string, { at: number; logs: LogEntry[] }>();

export type LogFilters = {
  from?: string | null; // ISO
  to?: string | null; // ISO
  level?: string | null;
  q?: string | null;
  source?: string | null; // key of LOG_SOURCES or "all"
  limit?: number;
  noCache?: boolean; // bypass cache read (manual refresh)
};

/** Extract the project ref (subdomain) from a Supabase project URL. */
export function refFromUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname; // e.g. abcd.supabase.co
    const ref = host.split(".")[0];
    return ref && host.endsWith("supabase.co") ? ref : null;
  } catch {
    return null;
  }
}

/** Parse Logflare/ClickHouse timestamps (micros, ms, seconds, or ISO string). */
function parseTimestamp(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "number") {
    let ms = value;
    if (value > 1e15) ms = value / 1000; // microseconds
    else if (value < 1e12) ms = value * 1000; // seconds
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  const s = String(value);
  // "2026-07-12 10:00:00.000000" (UTC, no tz) -> ISO
  const normalized = /^\d{4}-\d{2}-\d{2} /.test(s) ? s.replace(" ", "T") + "Z" : s;
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function toDisplayTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleString([], { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/** Best-effort level inference from the log line + source. */
function inferLevel(message: string, sourceKey: string): "info" | "warn" | "error" {
  const m = message.toLowerCase();
  const status = message.match(/\b(\d{3})\b/);
  if (status) {
    const code = Number(status[1]);
    if (code >= 500) return "error";
    if (code >= 400) return "warn";
  }
  if (/\b(error|fatal|panic|exception|failed|denied)\b/.test(m)) return "error";
  if (/\b(warn|warning|timeout|retry|deprecat)\b/.test(m)) return "warn";
  if (sourceKey === "postgres" && /\bLOG\b/.test(message)) return "info";
  return "info";
}

function windowIso(filters: LogFilters): { start: string; end: string } {
  // Management API allows at most a 24h window.
  const now = Date.now();
  const end = filters.to ? new Date(filters.to).getTime() : now;
  let start = filters.from ? new Date(filters.from).getTime() : end - 24 * 60 * 60 * 1000;
  const maxSpan = 24 * 60 * 60 * 1000;
  if (end - start > maxSpan) start = end - maxSpan;
  if (start >= end) start = end - maxSpan;
  return { start: new Date(start).toISOString(), end: new Date(end).toISOString() };
}

async function queryOneSource(
  ref: string,
  token: string,
  sourceKey: string,
  filters: LogFilters,
  perSourceLimit: number,
  win: { start: string; end: string }
): Promise<LogEntry[]> {
  const table = LOG_SOURCES[sourceKey].table;
  const cacheKey = `${ref}|${sourceKey}|${win.start}|${win.end}|${perSourceLimit}`;

  if (!filters.noCache) {
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.logs;
  }

  const sql = `select id, timestamp, event_message from ${table} order by timestamp desc limit ${perSourceLimit}`;
  const params = new URLSearchParams({
    sql,
    iso_timestamp_start: win.start,
    iso_timestamp_end: win.end
  });
  const url = `${MGMT_API}/v1/projects/${ref}/analytics/endpoints/logs.all?${params.toString()}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
  });
  if (!res.ok) {
    // Source may be disabled/empty for this project — skip it silently.
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { result?: Record<string, unknown>[] };
  const rows = json.result ?? [];
  const mapped = rows.map((row, i) => {
    const timestamp = parseTimestamp(row.timestamp);
    const message = String(row.event_message ?? "");
    return {
      id: String(row.id ?? `${sourceKey}-${i}`),
      timestamp,
      time: toDisplayTime(timestamp),
      level: inferLevel(message, sourceKey),
      source: LOG_SOURCES[sourceKey].label,
      event: "",
      message
    } as LogEntry;
  });
  cache.set(cacheKey, { at: Date.now(), logs: mapped });
  return mapped;
}

/**
 * Fetch REAL Supabase platform logs via the Management API. `token` is a
 * Supabase access token (PAT). Returns { logs } or { error }.
 */
export async function fetchProjectLogs(
  projectUrl: string,
  token: string,
  filters: LogFilters = {}
): Promise<{ logs: LogEntry[]; error?: string }> {
  const ref = refFromUrl(projectUrl);
  if (!ref) return { logs: [], error: "Invalid Supabase project URL." };

  const limit = Math.min(Math.max(filters.limit ?? 200, 1), 1000);
  const win = windowIso(filters);
  const sourceKey = filters.source && filters.source !== "all" ? filters.source : "all";
  const sources = sourceKey === "all" ? ALL_SOURCES : [sourceKey];
  const perSourceLimit = Math.max(Math.ceil(limit / sources.length), 25);

  const settled = await Promise.allSettled(
    sources.map((s) => queryOneSource(ref, token, s, filters, perSourceLimit, win))
  );

  const fulfilled = settled.filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<LogEntry[]>[];

  // If every source failed, surface the first error (e.g. bad token, 401).
  if (fulfilled.length === 0) {
    const first = settled.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
    const msg = first ? String(first.reason?.message ?? first.reason) : "No logs returned.";
    let friendly = msg;
    if (msg.startsWith("401")) friendly = "Unauthorized — check the Supabase access token.";
    else if (msg.startsWith("403")) friendly = "Access token lacks permission for this project.";
    else if (msg.startsWith("429")) friendly = "Supabase rate limit hit — try again shortly.";
    return { logs: [], error: friendly };
  }

  let logs = fulfilled.flatMap((r) => r.value);

  // Client-side refinements.
  if (filters.q) {
    const needle = filters.q.toLowerCase();
    logs = logs.filter((l) => `${l.source} ${l.message} ${l.level}`.toLowerCase().includes(needle));
  }
  if (filters.level && filters.level !== "all") {
    logs = logs.filter((l) => l.level === filters.level);
  }

  logs.sort((a, b) => (b.timestamp ?? "").localeCompare(a.timestamp ?? ""));
  return { logs: logs.slice(0, limit) };
}
