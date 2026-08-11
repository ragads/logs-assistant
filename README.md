# Logs Assistant

Logs Assistant is a Next.js web application for inspecting Supabase project logs and asking Gemini-powered questions about those logs.

It provides:

- Email/password authentication with Supabase Auth
- A dashboard for connecting multiple Supabase projects
- Secure, server-side storage of Supabase Personal Access Tokens
- Supabase platform log browsing with filters
- Optional read-only database access for AI-assisted investigation
- Gemini chat grounded in recent project logs
- Persistent conversations and messages
- AI request/token/latency audit logging
- Soft deletion for projects and conversations

## Tech Stack

- **Next.js 14** — App Router, Server Components, Route Handlers, Server Actions
- **React 18**
- **TypeScript**
- **Tailwind CSS**
- **Supabase** — authentication and the application's database
- **Supabase Management API** — project logs and optional read-only SQL queries
- **Google Gemini** — AI log analysis
- **Zod** — validation
- **Lucide React** — icons

## Architecture

```text
Browser
   │
   ▼
Next.js App
   ├── Supabase Auth ───────────────► App Supabase project
   │
   ├── Project management ──────────► App Supabase database
   │
   ├── Log viewer ──────────────────► Supabase Management API
   │                                    │
   │                                    └── Connected Supabase project
   │
   └── AI chat ─────────────────────► Gemini API
          │
          └── Optional read-only SQL ► Supabase Management API
```

The application does **not** copy platform logs into its own database. Logs are fetched from the connected Supabase project when needed.

## Prerequisites

Install the following before running the project:

- Node.js 18+ (Node.js 20 LTS is recommended)
- npm
- A Supabase project for the Logs Assistant application's own database/auth
- A Google Gemini API key

For projects you want to connect to Logs Assistant, you also need a Supabase Personal Access Token (PAT) with access to that project.

> **Important:** The current implementation uses a Supabase **Personal Access Token** (`sbp_...`) for the Management API. It does not use a project `anon`, `service_role`, or publishable API key for project connection.

## Getting Started

### 1. Clone or extract the project

```bash
git clone <your-repository-url>
cd logs-assistant-main
```

If you are using the supplied ZIP, extract it and enter the `logs-assistant-main` directory.

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-app-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Server-only
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key

# Server-only AES-256 key, base64 encoded.
# It must decode to exactly 32 bytes.
ENCRYPTION_KEY=your-base64-32-byte-key

# Optional
GEMINI_MODEL=gemini-2.5-flash
```

Generate a suitable encryption key with:

```bash
openssl rand -base64 32
```

Do **not** commit `.env.local` or any secret keys to source control.

### 4. Configure the application's Supabase database

The application's Supabase database needs these tables:

- `profiles`
- `projects`
- `conversations`
- `messages`
- `ai_logs`

Enable Row Level Security (RLS) on these tables and ensure users can only access their own records.

The expected high-level schema is:

#### `profiles`

| Column | Type |
|---|---|
| `id` | uuid, primary key, references `auth.users.id` |
| `name` | text |
| `email` | text |
| `created_at` | timestamptz |
| `updated_at` | timestamptz |
| `deleted_at` | timestamptz, nullable |

#### `projects`

| Column | Type |
|---|---|
| `id` | uuid, primary key |
| `user_id` | uuid |
| `name` | text |
| `supabase_url` | text |
| `management_token_encrypted` | text |
| `ai_db_access` | boolean |
| `status` | text, optional |
| `created_at` | timestamptz |
| `updated_at` | timestamptz |
| `deleted_at` | timestamptz, nullable |

`management_token_encrypted` contains the encrypted Supabase PAT. The plaintext token is never sent to the browser.

#### `conversations`

| Column | Type |
|---|---|
| `id` | uuid, primary key |
| `project_id` | uuid |
| `user_id` | uuid |
| `title` | text |
| `created_at` | timestamptz |
| `updated_at` | timestamptz |
| `deleted_at` | timestamptz, nullable |

#### `messages`

| Column | Type |
|---|---|
| `id` | uuid, primary key |
| `conversation_id` | uuid |
| `role` | text (`user`, `assistant`, or `system`) |
| `content` | text |
| `created_at` | timestamptz |
| `deleted_at` | timestamptz, nullable |

#### `ai_logs`

| Column | Type |
|---|---|
| `id` | uuid, primary key |
| `message_id` | uuid |
| `conversation_id` | uuid |
| `project_id` | uuid |
| `user_id` | uuid |
| `model` | text |
| `request_payload` | jsonb |
| `prompt_text` | text |
| `response_text` | text |
| `prompt_tokens` | int4 |
| `completion_tokens` | int4 |
| `total_tokens` | int4 |
| `latency_ms` | int4 |
| `status` | text |
| `error_message` | text |
| `created_at` | timestamptz |
| `deleted_at` | timestamptz, nullable |

Also configure the application's Supabase Auth settings for email/password sign-up and login.

### 5. Start the development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Available Scripts

```bash
npm run dev       # Start the development server
npm run build     # Create a production build
npm run start     # Start the production server
npm run lint      # Run ESLint
npm run typecheck # Run TypeScript checks
```

## Connecting a Supabase Project

From the dashboard:

1. Sign in.
2. Select **Create New Project**.
3. Enter a project name.
4. Enter the Supabase project URL, for example:
   `https://abcdefghijkl.supabase.co`
5. Enter a Supabase Personal Access Token.
6. Optionally enable AI database access.
7. Save the project.

The application validates the PAT against the Supabase Management API before saving it.

A PAT normally starts with:

```text
sbp_
```

Project API keys such as `anon`, `service_role`, `sb_...`, or JWT-style `eyJ...` keys are not accepted by the project connection flow.

## Log Viewer

The project log page retrieves real Supabase platform logs through the Supabase Management API.

Supported log sources include:

- API / Edge
- Postgres
- Auth
- Edge Functions
- Storage
- Realtime

The default **All** view currently combines API, Postgres, and Auth logs to reduce Management API calls.

The log service also:

- Normalizes timestamps
- Infers `info`, `warn`, and `error` levels
- Supports text search
- Supports level filtering
- Limits the Management API query window to 24 hours
- Uses a short server-side cache to absorb repeated requests

## AI Chat

The AI assistant is available from a project's log view.

A typical request flow is:

1. The authenticated user sends a question.
2. The server loads the connected project and decrypts its PAT.
3. Recent project logs are fetched server-side.
4. Relevant log context is included in the Gemini prompt.
5. Gemini generates an answer.
6. If AI database access is enabled, Gemini can request read-only SQL queries.
7. SQL queries are validated before execution.
8. The assistant response and AI usage information are persisted.

The chatbot is instructed to avoid inventing information when the logs do not support an answer.

### Read-only database access

When enabled, Gemini receives a `run_sql` tool.

The query layer applies two protections:

1. SQL is checked by the application's read-only SQL guard.
2. The query is executed through Supabase's read-only database endpoint.

Queries should use schema-qualified table names, such as:

```sql
SELECT *
FROM public.users
LIMIT 20;
```

Write operations must not be allowed through this path.

## Security

Sensitive project credentials are handled server-side.

### Encryption

PATs are encrypted with AES-256-GCM in `lib/crypto.ts`.

The encryption key:

- Comes from `ENCRYPTION_KEY`
- Must decode from base64 to exactly 32 bytes
- Is never stored in the database
- Must remain server-side

### Authentication

Supabase Auth manages user sessions. Server-side clients use the authenticated session from request cookies.

### Row Level Security

RLS should enforce ownership of:

- Projects
- Conversations
- Messages
- AI logs
- Profiles

All normal reads should also exclude rows where `deleted_at` is set.

### Secrets

Never expose these variables to the browser:

```text
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
ENCRYPTION_KEY
```

The connected-project PAT is also never exposed to client-side code.

## Soft Delete

Project and conversation-related records use a `deleted_at` timestamp rather than immediate physical deletion.

Normal queries use:

```sql
WHERE deleted_at IS NULL
```

This keeps records available for auditing/recovery and allows a future hard-purge process if required.

## Important Project Files

```text
app/
  account-deleted/       Account deletion confirmation page
  actions/               Server Actions
  api/
    chat/                Gemini chat endpoint
    conversations/       Conversation endpoints
    projects/            Project/log endpoints
  dashboard/             Project dashboard and log view
  login/                 Login page
  settings/              Profile/settings page
  signup/                Registration page

components/
  ai-chat-launcher.tsx
  chat-panel.tsx
  logs-table.tsx
  project-card.tsx
  project-configuration-dialog.tsx
  ...

lib/
  crypto.ts              AES-256-GCM encryption/decryption
  db-query.ts            Read-only SQL execution
  logs.ts                Supabase platform log fetching
  projects.ts            Project data access
  sql-guard.ts            SQL safety validation
  supabase/               Supabase browser/server/admin clients
  types.ts               Shared TypeScript types

middleware.ts             Supabase session middleware
PROJECT_SPEC.md            Original project specification
package.json              Dependencies and scripts
```

## Main Routes

| Route | Purpose |
|---|---|
| `/` | Landing/home page |
| `/login` | User login |
| `/signup` | User registration |
| `/dashboard` | Connected projects |
| `/dashboard/[id]` | Project logs and AI chat |
| `/settings` | Profile/settings |
| `/account-deleted` | Account deletion confirmation |

## API Endpoints

| Endpoint | Purpose |
|---|---|
| `POST /api/chat` | Ask Gemini about project logs |
| `/api/projects/[id]/logs` | Fetch project logs |
| `/api/conversations/[id]/messages` | Work with conversation messages |
| `/api/projects` | Project-related API operations |

Exact request/response behavior is implemented in the corresponding Route Handlers under `app/api`.

## Troubleshooting

### `GEMINI_API_KEY is not configured`

Make sure `GEMINI_API_KEY` exists in `.env.local` and restart the development server.

### `ENCRYPTION_KEY must be 32 bytes`

Generate a new key:

```bash
openssl rand -base64 32
```

Copy the resulting value into `ENCRYPTION_KEY`.

### Invalid Supabase access token

Make sure you are using a Supabase **Personal Access Token**, not a project's anon/service-role API key.

The token should normally start with:

```text
sbp_
```

### No logs are displayed

Check:

1. The Supabase project URL is correct.
2. The PAT has access to that project.
3. The PAT has not been revoked.
4. The selected time range is within the supported 24-hour Management API window.
5. The selected log source contains data.

### AI database access fails

Check that:

- AI DB access is enabled for the project.
- The PAT has the required permissions.
- The SQL uses schema-qualified table names.
- The query is read-only.
- The connected project is reachable through the Supabase Management API.

## Production Checklist

Before deploying to production:

- [ ] Configure all environment variables in the hosting provider.
- [ ] Never commit secrets to Git.
- [ ] Verify Supabase RLS policies.
- [ ] Verify Auth redirect URLs.
- [ ] Use a strong, randomly generated `ENCRYPTION_KEY`.
- [ ] Restrict database access to read-only operations.
- [ ] Review Gemini usage and rate limits.
- [ ] Add application-level rate limiting where appropriate.
- [ ] Monitor Management API and Gemini failures.
- [ ] Configure backups for the application's Supabase database.
- [ ] Consider a scheduled hard-purge policy for old soft-deleted records.
- [ ] Review retention requirements for `ai_logs`, especially because they can contain prompts, responses, and query/log context.

## License

Add the project's intended license here before publishing the repository.
