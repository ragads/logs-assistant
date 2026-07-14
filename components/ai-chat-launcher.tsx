"use client";

import { useEffect, useState } from "react";
import { Bot } from "lucide-react";
import { ChatPanel } from "@/components/chat-panel";
import type { Conversation } from "@/lib/types";

export function AiChatLauncher({
  projectId,
  conversations
}: {
  projectId: string;
  conversations: Conversation[];
}) {
  const [open, setOpen] = useState(false);

  // Lock page scroll while the chat overlay is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        aria-label="Open AI log chat"
        onClick={() => setOpen(true)}
        className="focus-ring fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-pine text-white shadow-panel transition hover:bg-teal-800"
      >
        <Bot size={22} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-ink/45 p-4 sm:p-6" onClick={() => setOpen(false)}>
          <div
            className="h-[min(720px,calc(100vh-3rem))] w-full max-w-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <ChatPanel
              projectId={projectId}
              conversations={conversations}
              className="h-full"
              onClose={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
