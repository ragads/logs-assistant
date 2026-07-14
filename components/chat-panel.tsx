"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, Plus, Send, X } from "lucide-react";
import type { ChatMessage, Conversation } from "@/lib/types";

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Ask me anything about this project's logs — I'll use the recent entries as context. Try “summarize the errors” or “what happened around the last spike?”"
};

export function ChatPanel({
  projectId,
  conversations,
  className = "min-h-[620px]",
  onClose
}: {
  projectId: string;
  conversations: Conversation[];
  className?: string;
  onClose?: () => void;
}) {
  const [convos, setConvos] = useState<Conversation[]>(conversations);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the latest message / "Thinking…" indicator in view.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function openConversation(id: string) {
    setError(null);
    setConversationId(id);
    setMessages([]);
    setLoading(true);
    try {
      const res = await fetch(`/api/conversations/${id}/messages`);
      const data = await res.json();
      setMessages(data.messages?.length ? data.messages : [GREETING]);
    } catch {
      setError("Could not load conversation.");
      setMessages([GREETING]);
    } finally {
      setLoading(false);
    }
  }

  function newChat() {
    setConversationId(null);
    setMessages([GREETING]);
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = input.trim();
    if (!prompt || loading) return;

    setInput("");
    setError(null);
    setMessages((current) => [...current, { role: "user", content: prompt }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, conversationId, message: prompt })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The assistant is unavailable.");
        return;
      }
      setMessages((current) => [...current, { role: "assistant", content: data.reply }]);
      if (!conversationId && data.conversationId) {
        setConversationId(data.conversationId);
        setConvos((current) => [
          { id: data.conversationId, title: prompt.slice(0, 60), createdAt: new Date().toISOString() },
          ...current
        ]);
      }
    } catch {
      setError("Could not reach the assistant.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className={`flex overflow-hidden rounded-lg border border-line bg-white ${className}`}>
      {/* History sidebar */}
      <div className="flex w-40 shrink-0 flex-col border-r border-line bg-cloud/50 sm:w-56">
        <div className="p-2.5">
          <button
            onClick={newChat}
            className="focus-ring flex h-9 w-full items-center justify-center gap-2 rounded-md border border-line bg-white text-sm font-semibold text-ink transition hover:bg-slate-50"
          >
            <Plus size={16} />
            New chat
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3">
          <p className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">History</p>
          {convos.length === 0 ? (
            <p className="px-2 py-2 text-xs leading-5 text-slate-400">No conversations yet.</p>
          ) : (
            <div className="grid gap-0.5">
              {convos.map((item) => (
                <button
                  key={item.id}
                  onClick={() => openConversation(item.id)}
                  title={item.title || "Untitled conversation"}
                  className={`truncate rounded-md px-2.5 py-2 text-left text-xs font-medium transition ${
                    conversationId === item.id ? "bg-mint text-pine" : "text-slate-600 hover:bg-white hover:text-ink"
                  }`}
                >
                  {item.title || "Untitled conversation"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line p-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-mint text-pine">
              <Bot size={19} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink">AI log chat</h2>
              <p className="text-xs text-slate-500">Powered by Gemini</p>
            </div>
          </div>
          {onClose && (
            <button
              aria-label="Close AI chat"
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50 hover:text-ink"
            >
              <X size={17} />
            </button>
          )}
        </div>

        <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-6 ${
                message.role === "assistant" ? "bg-slate-50 text-slate-700" : "bg-pine text-white"
              }`}
            >
              {message.content}
            </div>
          ))}
          {loading && <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">Thinking…</div>}
          {error && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose">
              {error}
            </div>
          )}
        </div>

        <form onSubmit={submit} className="shrink-0 border-t border-line p-3">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="focus-ring h-10 min-w-0 flex-1 rounded-md border border-line px-3 text-sm placeholder:text-slate-400"
              placeholder="Ask about these logs"
            />
            <button
              aria-label="Send message"
              disabled={loading || !input.trim()}
              className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-pine text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send size={17} />
            </button>
          </div>
        </form>
      </div>
    </aside>
  );
}
