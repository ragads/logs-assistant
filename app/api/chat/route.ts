import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType, type Tool } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import { getProjectWithSecret } from "@/lib/projects";
import { fetchProjectLogs } from "@/lib/logs";
import { runReadOnlyQuery } from "@/lib/db-query";

export const dynamic = "force-dynamic";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const MAX_TOOL_ROUNDS = 4;
const MAX_ROWS_TO_MODEL = 50;

const SYSTEM_PROMPT =
  "You are Logs Assistant, an AI that answers questions about a Supabase project's logs. " +
  "You are given a sample of recent log entries as context. Be concise and technical. " +
  "Reference concrete sources, events, timestamps, and error patterns when relevant. " +
  "If the logs don't contain the answer, say so rather than inventing details.";

const DB_PROMPT =
  " You also have a `run_sql` tool that runs READ-ONLY SELECT queries against the project's " +
  "Postgres database (executed as a read-only role). Use it to check schema, counts, or rows " +
  "when it helps you give specific, actionable fixes — e.g. confirm a table's columns, find " +
  "rows referenced in an error, or check data volume. Table references MUST be schema-qualified " +
  "(e.g. public.users). Prefer small queries with LIMIT. Combine log evidence with query results " +
  "to explain the root cause and recommend a concrete fix.";

function buildLogContext(logs: { time: string; level: string; source: string; message: string }[]): string {
  if (logs.length === 0) return "No logs available in the current window.";
  return logs
    .slice(0, 100)
    .map((l) => `[${l.time}] ${l.level.toUpperCase()} ${l.source} :: ${l.message}`)
    .join("\n");
}

const RUN_SQL_TOOL: Tool = {
  functionDeclarations: [
    {
      name: "run_sql",
      description:
        "Run a READ-ONLY SQL SELECT against the connected Postgres database to fetch real data " +
        "(schema, row counts, sample rows). Only SELECT is allowed; it runs as a read-only user. " +
        "All table references must be schema-qualified (e.g. public.users). Prefer LIMIT.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          query: {
            type: SchemaType.STRING,
            description: "A single read-only SELECT statement, schema-qualified."
          }
        },
        required: ["query"]
      }
    }
  ]
};

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured on the server." }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const projectId: string | undefined = body?.projectId;
  const message: string = (body?.message ?? "").toString().trim();
  let conversationId: string | undefined = body?.conversationId;

  if (!projectId || !message) {
    return NextResponse.json({ error: "projectId and message are required." }, { status: 400 });
  }

  const loaded = await getProjectWithSecret(projectId);
  if (!loaded) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const dbAccessEnabled = Boolean(loaded.project.aiDbAccess && loaded.accessToken);

  // Ensure a conversation exists.
  if (!conversationId) {
    const { data: convo, error: convoError } = await supabase
      .from("conversations")
      .insert({ project_id: projectId, user_id: user.id, title: message.slice(0, 60) })
      .select("id")
      .single();
    if (convoError || !convo) {
      return NextResponse.json({ error: convoError?.message ?? "Could not start conversation." }, { status: 500 });
    }
    conversationId = convo.id as string;
  }

  // Prior history (oldest first), mapped to Gemini turns.
  const { data: history } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(20);

  const geminiHistory = (history ?? [])
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  while (geminiHistory.length && geminiHistory[0].role === "model") geminiHistory.shift();

  // Persist the user's message.
  await supabase.from("messages").insert({ conversation_id: conversationId, role: "user", content: message });

  // Recent logs as grounding context.
  const { logs } = loaded.accessToken
    ? await fetchProjectLogs(loaded.project.url, loaded.accessToken, { limit: 100, source: "all" })
    : { logs: [] };
  const logContext = buildLogContext(logs);

  const prompt =
    `${SYSTEM_PROMPT}${dbAccessEnabled ? DB_PROMPT : ""}\n\n` +
    `Recent logs for project "${loaded.project.name}":\n${logContext}\n\n` +
    `User question: ${message}`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    tools: dbAccessEnabled ? [RUN_SQL_TOOL] : undefined
  });

  const started = Date.now();
  let replyText = "";
  let status: "success" | "error" = "success";
  let errorMessage: string | null = null;
  let totalTokens = 0;
  let promptTokens = 0;
  let completionTokens = 0;
  const executedQueries: { query: string; ok: boolean; error?: string }[] = [];

  try {
    const chat = model.startChat({ history: geminiHistory, tools: dbAccessEnabled ? [RUN_SQL_TOOL] : undefined });
    let result = await chat.sendMessage(prompt);

    const tally = (u: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } | undefined) => {
      if (!u) return;
      promptTokens += u.promptTokenCount ?? 0;
      completionTokens += u.candidatesTokenCount ?? 0;
      totalTokens += u.totalTokenCount ?? 0;
    };
    tally(result.response.usageMetadata);

    let rounds = 0;
    let calls = result.response.functionCalls();
    while (dbAccessEnabled && calls && calls.length > 0 && rounds < MAX_TOOL_ROUNDS) {
      const responses = [];
      for (const call of calls) {
        if (call.name === "run_sql") {
          const query = String((call.args as { query?: string })?.query ?? "");
          const r = await runReadOnlyQuery(loaded.project.url, loaded.accessToken!, query);
          executedQueries.push({ query, ok: !r.error, error: r.error });
          responses.push({
            functionResponse: {
              name: "run_sql",
              response: r.error ? { error: r.error } : { rows: r.rows.slice(0, MAX_ROWS_TO_MODEL) }
            }
          });
        } else {
          responses.push({ functionResponse: { name: call.name, response: { error: "Unknown tool." } } });
        }
      }
      result = await chat.sendMessage(responses);
      tally(result.response.usageMetadata);
      calls = result.response.functionCalls();
      rounds++;
    }

    replyText = result.response.text();
  } catch (err) {
    status = "error";
    errorMessage = err instanceof Error ? err.message : "Gemini request failed.";
    replyText = "Sorry — I couldn't generate a response. Please try again.";
  }
  const latencyMs = Date.now() - started;

  const { data: assistantMsg } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, role: "assistant", content: replyText })
    .select("id")
    .single();

  await supabase.from("ai_logs").insert({
    message_id: assistantMsg?.id ?? null,
    conversation_id: conversationId,
    project_id: projectId,
    user_id: user.id,
    model: MODEL,
    request_payload: { prompt, log_count: logs.length, db_access: dbAccessEnabled, executed_queries: executedQueries },
    prompt_text: message,
    response_text: replyText,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: totalTokens,
    latency_ms: latencyMs,
    status,
    error_message: errorMessage
  });

  if (status === "error") {
    return NextResponse.json({ error: errorMessage, conversationId }, { status: 502 });
  }
  return NextResponse.json({ conversationId, reply: replyText });
}
