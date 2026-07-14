import { Database, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CreateProjectModal } from "@/components/create-project-modal";
import { ProjectCard } from "@/components/project-card";
import { getProjects } from "@/lib/projects";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const projects = await getProjects();

  return (
    <AppShell title="Projects" subtitle="Connect Supabase projects and inspect their logs from one place.">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="rounded-lg border border-line bg-white px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-slate-500">
            <Database size={15} />
            Connected
          </div>
          <div className="mt-1 text-lg font-semibold text-ink">
            {projects.length} {projects.length === 1 ? "project" : "projects"}
          </div>
        </div>
        {projects.length > 0 && <CreateProjectModal />}
      </div>

      {projects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <section className="flex min-h-[420px] flex-col items-center justify-center rounded-lg border border-dashed border-line bg-white p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-mint text-pine">
            <Plus size={22} />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-ink">Create your first project</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
            Add a Supabase URL and service role key to start browsing logs.
          </p>
          <div className="mt-5">
            <CreateProjectModal />
          </div>
        </section>
      )}
    </AppShell>
  );
}
