"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Filter, RefreshCw, Search } from "lucide-react";
import type { LogEntry } from "@/lib/types";

const levelClass: Record<string, string> = {
  info: "bg-slate-100 text-slate-700",
  warn: "bg-amber-50 text-amber-700",
  error: "bg-rose-50 text-rose-700"
};

const SOURCE_OPTIONS = [
  { value: "all", label: "All sources" },
  { value: "api", label: "API / Edge" },
  { value: "postgres", label: "Postgres" },
  { value: "auth", label: "Auth" },
  { value: "functions", label: "Edge Functions" },
  { value: "storage", label: "Storage" },
  { value: "realtime", label: "Realtime" }
];

export function LogsTable({ projectId }: { projectId: string }) {
  const [level, setLevel] = useState("all");
  const [source, setSource] = useState("all");
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rawLogs, setRawLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Network fetch depends ONLY on source + date window. Level and search are
  // applied client-side (below), so they never trigger an API call — this is
  // what keeps us under the Management API rate limit.
  const load = useCallback(
    async (force = false) => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (source !== "all") params.set("source", source);
      if (from) params.set("from", new Date(from).toISOString());
      if (to) params.set("to", new Date(to).toISOString());
      if (force) params.set("refresh", "1");

      try {
        const res = await fetch(`/api/projects/${projectId}/logs?${params.toString()}`);
        const data = await res.json();
        if (!res.ok || data.error) {
          setError(data.error ?? "Could not load logs.");
          setRawLogs([]);
        } else {
          setRawLogs(data.logs ?? []);
        }
      } catch {
        setError("Could not reach the logs API.");
        setRawLogs([]);
      } finally {
        setLoading(false);
      }
    },
    [projectId, source, from, to]
  );

  // Fetch on mount and when source/date window changes (debounced).
  useEffect(() => {
    const t = setTimeout(() => load(), 350);
    return () => clearTimeout(t);
  }, [load]);

  // Client-side filtering — instant, no network.
  const logs = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rawLogs.filter((l) => {
      if (level !== "all" && l.level !== level) return false;
      if (needle && !`${l.source} ${l.message} ${l.level}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [rawLogs, level, query]);

  return (
    <section className="grid min-h-[480px] overflow-hidden rounded-lg border border-line bg-white lg:h-[calc(100vh-15rem)] lg:grid-cols-[280px_1fr]">
      <aside className="border-b border-line bg-slate-50/70 p-4 lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
          <Filter size={17} />
          Filters
        </div>

        <div className="grid gap-4">
          <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-normal text-slate-500">
            Search logs
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="focus-ring h-10 w-full rounded-md border border-line bg-white pl-10 pr-3 text-sm font-normal normal-case text-ink placeholder:text-slate-400"
                placeholder="Message, source, event"
              />
            </div>
          </label>

          <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-normal text-slate-500">
            From date and time
            <input
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="focus-ring h-10 w-full rounded-md border border-line bg-white px-3 text-sm font-normal normal-case text-slate-700"
              type="datetime-local"
            />
          </label>

          <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-normal text-slate-500">
            To date and time
            <input
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="focus-ring h-10 w-full rounded-md border border-line bg-white px-3 text-sm font-normal normal-case text-slate-700"
              type="datetime-local"
            />
          </label>

          <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-normal text-slate-500">
            Log source
            <select
              value={source}
              onChange={(event) => setSource(event.target.value)}
              className="focus-ring h-10 w-full rounded-md border border-line bg-white px-3 text-sm font-normal normal-case text-slate-700"
            >
              {SOURCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-normal text-slate-500">
            Log level
            <select
              value={level}
              onChange={(event) => setLevel(event.target.value)}
              className="focus-ring h-10 w-full rounded-md border border-line bg-white px-3 text-sm font-normal normal-case text-slate-700"
            >
              <option value="all">All levels</option>
              <option value="info">Info</option>
              <option value="warn">Warn</option>
              <option value="error">Error</option>
            </select>
          </label>

          <button
            onClick={() => load(true)}
            disabled={loading}
            className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md border border-teal-200 bg-mint px-3 text-sm font-semibold text-pine transition hover:bg-emerald-100 disabled:opacity-60"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">Log entries</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {loading ? "Loading..." : `${logs.length} entries in current view`}
            </p>
          </div>
        </div>

        {error ? (
          <div className="m-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
            {error}
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-normal text-slate-500 shadow-[0_1px_0_0_theme(colors.slate.200)]">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Level</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">{log.time}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-1 text-xs font-semibold ${levelClass[log.level] ?? levelClass.info}`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-ink">{log.source}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{log.event}</td>
                    <td className="px-4 py-3 text-slate-600">{log.message}</td>
                  </tr>
                ))}
                {!loading && logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                      No logs match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
