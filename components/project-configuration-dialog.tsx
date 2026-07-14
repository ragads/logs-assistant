"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X } from "lucide-react";
import { updateProject } from "@/app/actions/projects";
import type { Project } from "@/lib/types";

export function ProjectConfigurationDialog({
  project,
  open,
  onClose
}: {
  project: Project;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiDb, setAiDb] = useState(project.aiDbAccess);

  if (!open) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const result = await updateProject(project.id, new FormData(event.currentTarget));
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Could not save configuration.");
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 px-4" onClick={onClose}>
      <section
        className="w-full max-w-lg rounded-lg border border-line bg-white shadow-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink">Edit project configuration</h2>
            <p className="mt-1 text-sm text-slate-500">{project.name}</p>
          </div>
          <button
            aria-label="Close edit configuration"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="grid gap-4 p-5">
          <Field label="Project name" name="name" defaultValue={project.name} required />
          <Field label="Supabase Project URL" name="supabase_url" defaultValue={project.url} type="url" required />
          <Field
            label="Supabase Access Token"
            name="access_token"
            placeholder="Enter a new token to replace the saved one"
            type="password"
          />
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800">
            Leave the access token blank to keep the existing saved token.
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-cloud/60 p-4">
            <input
              type="checkbox"
              name="ai_db_access"
              checked={aiDb}
              onChange={(e) => setAiDb(e.target.checked)}
              className="sr-only"
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
                Lets the assistant run read-only <code>SELECT</code> queries for data-grounded answers.
              </span>
            </span>
          </label>
          {error && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="focus-ring h-10 rounded-md border border-line px-4 text-sm font-semibold text-ink hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              disabled={loading}
              className="focus-ring h-10 rounded-md bg-pine px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save configuration"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-ink">
      {label}
      <input className="focus-ring h-10 rounded-md border border-line px-3 text-sm text-ink placeholder:text-slate-400" {...props} />
    </label>
  );
}
