"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Database, KeyRound, Link2, Loader2, Plus, ShieldCheck, Sparkles, X } from "lucide-react";
import { createProject } from "@/app/actions/projects";

export function CreateProjectModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiDb, setAiDb] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const result = await createProject(new FormData(event.currentTarget));
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      return;
    }
    setOpen(false);
    setAiDb(false);
    router.refresh();
  }

  function openModal() {
    setError(null);
    setAiDb(false);
    setOpen(true);
  }

  return (
    <>
      <button
        onClick={openModal}
        className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md bg-pine px-4 text-sm font-semibold text-white transition hover:bg-teal-800"
      >
        <Plus size={17} />
        Create New Project
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm"
          onClick={() => !loading && setOpen(false)}
        >
          {/* max-h + flex column: header and footer stay put, only the field list scrolls. */}
          <div
            className="flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-line bg-white shadow-panel"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line bg-cloud px-6 py-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-pine text-white">
                  <Database size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-ink">Connect a Supabase project</h2>
                  <p className="mt-0.5 text-sm text-slate-500">Browse its logs and ask AI about them.</p>
                </div>
              </div>
              <button
                aria-label="Close modal"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-md text-slate-400 transition hover:bg-white hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
              {/* Scrollable field list — the only part that moves. */}
              <div className="modal-scroll grid gap-5 overflow-y-auto px-6 py-5">
                <Field
                  icon={<Database size={15} />}
                  label="Project name"
                  name="name"
                  placeholder="Atlas Production"
                  required
                  hint="A friendly name shown on your dashboard."
                />
                <Field
                  icon={<Link2 size={15} />}
                  label="Supabase Project URL"
                  name="supabase_url"
                  placeholder="https://your-ref.supabase.co"
                  type="url"
                  required
                  hint="Found in Project Settings → Data API."
                />
                <Field
                  icon={<KeyRound size={15} />}
                  label="Supabase Access Token"
                  name="access_token"
                  placeholder="sbp_..."
                  type="password"
                  required
                  hint="Create one at supabase.com/dashboard/account/tokens — needed to read logs."
                />

                {/* AI DB access toggle */}
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-cloud/60 p-4">
                  <input
                    type="checkbox"
                    name="ai_db_access"
                    checked={aiDb}
                    onChange={(e) => setAiDb(e.target.checked)}
                    className="peer sr-only"
                  />
                  <span
                    className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition ${
                      aiDb ? "bg-pine" : "bg-slate-300"
                    }`}
                  >
                    <span className={`h-4 w-4 rounded-full bg-white shadow transition ${aiDb ? "translate-x-4" : ""}`} />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                      <Sparkles size={14} className="text-pine" />
                      Allow AI database access
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                        Read-only
                      </span>
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      Lets the assistant run read-only <code>SELECT</code> queries to give data-grounded answers.
                      Runs as a read-only role and is validated to block writes. Off by default.
                    </span>
                  </span>
                </label>

                {/* Security note */}
                <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs leading-5 text-emerald-800">
                  <ShieldCheck size={15} className="mt-0.5 shrink-0" />
                  <span>
                    Your token is verified against the project, then encrypted (AES-256-GCM) before it&apos;s stored.
                    It never reaches the browser.
                  </span>
                </div>
              </div>

              {/* Footer — stays visible while the fields scroll. */}
              <div className="shrink-0 border-t border-line bg-white px-6 py-4">
                {error && (
                  <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose">
                    {error}
                  </div>
                )}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="focus-ring h-10 rounded-md border border-line px-4 text-sm font-semibold text-ink transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={loading}
                    className="focus-ring inline-flex h-10 items-center gap-2 rounded-md bg-pine px-4 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    {loading ? "Verifying connection..." : "Save connection"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  icon,
  label,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon: React.ReactNode; label: string; hint?: string }) {
  return (
    <label className="grid gap-1.5">
      <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
        <span className="text-slate-400">{icon}</span>
        {label}
      </span>
      <input
        className="focus-ring h-10 rounded-md border border-line px-3 text-sm text-ink placeholder:text-slate-400"
        {...props}
      />
      {hint && <span className="text-xs leading-5 text-slate-500">{hint}</span>}
    </label>
  );
}
