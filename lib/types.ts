export type Project = {
  id: string;
  name: string;
  url: string; // supabase_url
  aiDbAccess: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LogEntry = {
  id: string;
  time: string; // display HH:MM:SS
  timestamp: string | null; // ISO
  level: "info" | "warn" | "error" | string;
  source: string;
  event: string;
  message: string;
};

export type ChatMessage = {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
};

export type Conversation = {
  id: string;
  title: string | null;
  createdAt: string;
};
