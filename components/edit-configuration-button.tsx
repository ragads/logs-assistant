"use client";

import { useState } from "react";
import { Edit3 } from "lucide-react";
import { ProjectConfigurationDialog } from "@/components/project-configuration-dialog";
import type { Project } from "@/lib/types";

export function EditConfigurationButton({ project }: { project: Project }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:bg-slate-50"
      >
        <Edit3 size={17} />
        Edit configuration
      </button>
      <ProjectConfigurationDialog project={project} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
