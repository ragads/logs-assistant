import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Database, CalendarClock } from "lucide-react";
import { AiChatLauncher } from "@/components/ai-chat-launcher";
import { AppShell } from "@/components/app-shell";
import { EditConfigurationButton } from "@/components/edit-configuration-button";
import { LogsTable } from "@/components/logs-table";
import { getProject } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";
import type { Conversation } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProjectOverviewPage({ params }: { params: { id: string } }) {
  const project = await getProject(params.id);
  if (!project) notFound();

  const supabase = createClient();
  const { data: conversationRows } = await supabase
    .from("conversations")
    .select("id, title, created_at")
    .eq("project_id", project.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const conversations: Conversation[] = (conversationRows ?? []).map((c) => ({
    id: c.id as string,
    title: c.title as string | null,
    createdAt: c.created_at as string
  }));

  const created = new Date(project.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });

  return (
    <AppShell title={project.name} subtitle={project.url}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/dashboard"
          className="focus-ring inline-flex h-10 w-fit items-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:bg-slate-50"
        >
          <ArrowLeft size={17} />
          Back to projects
        </Link>
        <EditConfigurationButton project={project} />
      </div>

      <div className="grid gap-4">
        <div className="grid items-start gap-3 sm:grid-cols-2">
          <Stat icon={Database} label="Project URL" value={project.url} />
          <Stat icon={CalendarClock} label="Connected on" value={created} />
        </div>
        <LogsTable projectId={project.id} />
      </div>

      <AiChatLauncher projectId={project.id} conversations={conversations} />
    </AppShell>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Database; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-slate-500">
        <Icon size={15} />
        {label}
      </div>
      <div className="mt-2 truncate text-base font-semibold text-ink">{value}</div>
    </div>
  );
}
