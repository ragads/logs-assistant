"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Database, Edit3, MoreHorizontal, Trash2, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { ProjectConfigurationDialog } from "@/components/project-configuration-dialog";
import { deleteProject } from "@/app/actions/projects";
import type { Project } from "@/lib/types";

export function ProjectCard({ project }: { project: Project }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    setError(null);
    setDeleting(true);
    const result = await deleteProject(project.id);
    setDeleting(false);
    if (!result.ok) {
      setError(result.error ?? "Could not delete project.");
      return;
    }
    setDeleteOpen(false);
    router.refresh();
  }

  const created = new Date(project.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });

  return (
    <article className="group relative rounded-lg border border-line bg-white p-5 shadow-sm transition hover:border-teal-200 hover:shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/dashboard/${project.id}`} className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-mint text-pine">
            <Database size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-normal text-ink">{project.name}</h2>
            <p className="mt-1 max-w-[14rem] truncate text-sm text-slate-500">{project.url}</p>
          </div>
        </Link>
        <button
          aria-expanded={menuOpen}
          aria-label={`Open ${project.name} menu`}
          onClick={() => setMenuOpen((current) => !current)}
          className="focus-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-50 hover:text-ink"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      {menuOpen && (
        <div className="absolute right-5 top-14 z-20 w-48 overflow-hidden rounded-md border border-line bg-white py-1 shadow-panel">
          <MenuLink href={`/dashboard/${project.id}`} icon={ArrowUpRight} label="View logs" />
          <MenuButton
            icon={Edit3}
            label="Edit connection"
            onClick={() => {
              setMenuOpen(false);
              setEditOpen(true);
            }}
          />
          <MenuButton
            danger
            icon={Trash2}
            label="Delete"
            onClick={() => {
              setMenuOpen(false);
              setDeleteOpen(true);
            }}
          />
        </div>
      )}

      <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
        <span className="text-xs font-medium text-slate-500">Added {created}</span>
        <Link href={`/dashboard/${project.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-pine">
          Open logs
          <ArrowUpRight size={14} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>

      <ProjectConfigurationDialog project={project} open={editOpen} onClose={() => setEditOpen(false)} />

      {deleteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 px-4"
          onClick={() => setDeleteOpen(false)}
        >
          <section
            className="w-full max-w-md rounded-lg border border-line bg-white shadow-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line p-5">
              <div>
                <h2 className="text-base font-semibold text-ink">Delete project?</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {project.name} will be removed from your dashboard. This is a soft delete — the record is
                  retained and can be recovered.
                </p>
              </div>
              <button
                aria-label="Close delete confirmation"
                onClick={() => setDeleteOpen(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50 hover:text-ink"
              >
                <X size={17} />
              </button>
            </div>
            {error && (
              <div className="mx-5 mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-3 p-5">
              <button
                onClick={() => setDeleteOpen(false)}
                className="focus-ring h-10 rounded-md border border-line px-4 text-sm font-semibold text-ink hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="focus-ring h-10 rounded-md bg-rose px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Yes, delete project"}
              </button>
            </div>
          </section>
        </div>
      )}
    </article>
  );
}

function MenuButton({
  icon: Icon,
  label,
  onClick,
  danger = false
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium transition ${
        danger ? "text-rose hover:bg-rose-50" : "text-slate-700 hover:bg-slate-50 hover:text-ink"
      }`}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}

function MenuLink({ icon: Icon, label, href }: { icon: LucideIcon; label: string; href: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-ink">
      <Icon size={15} />
      {label}
    </Link>
  );
}
