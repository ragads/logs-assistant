# Logs Assistant — Project Specification

A **Next.js + Supabase** web application that lets users connect their own Supabase
projects, browse the projects' logs, filter them, and ask an **AI chatbot (Google Gemini)**
questions about those logs.

---

## 1. Tech Stack

| Layer          | Choice                                                        |
| -------------- | ------------------------------------------------------------ |
| Frontend       | Next.js (App Router) + React + TypeScript                    |
| Styling        | Tailwind CSS (+ shadcn/ui recommended)                       |
| Backend / DB   | Supabase (Postgres + Auth + Row Level Security)              |
| Auth           | Supabase Auth (email/password)                               |
| AI / Chatbot   | Google Gemini API (`gemini-1.5-flash` / `gemini-1.5-pro`)    |
| Log source     | The **user's own** Supabase project (via URL + service role key) |
| Hosting        | Vercel (frontend) + Supabase Cloud (backend)                 |

---

## 2. Pages & Routes

| Route             | Auth        | Description                                                        |
| ----------------- | ----------- | ----------------------------------------------------------------- |
| `/login`          | Public      | Email + password login.                                           |
| `/signup`         | Public      | Name, email, password, confirm password — with validation.        |
| `/dashboard`      | Protected   | Lists user's projects. Empty state → "Create new project".        |
| `/dashboard/[id]` | Protected   | Logs view for a project: filters (date/time) + Gemini chatbot.    |
| `/settings`       | Protected   | Profile & account settings.                                       |

Unauthenticated access to a protected route redirects to `/login`.

---

## 3. Feature Details

### 3.1 Signup
Fields: **name, email, password, confirm password**. Validation rules:

| Field            | Rules                                                                     |
| ---------------- | ------------------------------------------------------------------------- |
| Name             | Required, min 2 chars, letters/spaces only.                               |
| Email            | Required, valid email format, unique.                                     |
| Password         | Required, min 8 chars, ≥1 uppercase, ≥1 lowercase, ≥1 number, ≥1 symbol.  |
| Confirm password | Required, must exactly match password.                                    |

- Client-side validation (e.g. `react-hook-form` + `zod`) **and** server-side enforcement.
- On success: create `auth.users` entry + a `profiles` row (name stored there).

### 3.2 Login
- Email + password via Supabase Auth.
- Inline validation + friendly error messages ("Invalid email or password").
- Session persisted; redirect to `/dashboard`.

### 3.3 Dashboard — Projects
- Fetches the current user's non-deleted `projects`.
- **Empty state:** prominent "Create New Project" CTA.
- **Create Project modal/form:**
  - Project name
  - Supabase **Project URL** (validated as URL)
  - Supabase **Service Role Key** (validated non-empty; encrypted before storage)
  - On submit: verify connectivity to the target Supabase project before saving.
- Each project card is clickable → opens the project logs view.

> ⚠️ **Security:** the service role key is highly sensitive. Store it **encrypted at rest**
> (e.g. `pgsodium`/Vault or app-level AES-256 with a server-only key). Never expose it to
> the browser — all log queries run server-side (Route Handlers / Server Actions).

### 3.4 Project Logs View (`/dashboard/[id]`)
- Server-side connects to the user's Supabase project using the stored URL + service role key.
- Displays log entries in a table/list.
- **Filters:** date range and time (start date/time → end date/time), plus optional
  level/search filters.
- Pagination or infinite scroll.

### 3.5 AI Chatbot (Gemini)
- Chat panel within the project logs view.
- User asks natural-language questions about the logs.
- Backend: relevant/filtered logs are passed as context to the Gemini API; response streamed back.
- Conversation history persisted (`conversations` + `messages`).
- Runs server-side (Gemini key never exposed to client).

### 3.6 Soft Delete
- Deleting a **project** (or conversation/message) performs a **soft delete**:
  sets `deleted_at = now()` — the row is **not** physically removed.
- All list/read queries filter `WHERE deleted_at IS NULL`.
- Enables recovery/audit; optional scheduled hard-purge later.

### 3.7 Settings
- Update profile name.
- Change password.
- (Optional) delete account.

---

## 4. Data Model (Logs Assistant's own Supabase DB)

> Logs themselves live in the **user's** Supabase project and are fetched on demand — they
> are **not** copied into our DB. We store users, their project connections, and chat history.

### `profiles`
Extends `auth.users` (1:1). Stores app-level user info.

| Column       | Type          | Notes                                  |
| ------------ | ------------- | -------------------------------------- |
| id           | uuid (PK)     | FK → `auth.users.id`.                  |
| name         | text          | Required.                              |
| email        | text          | Unique, mirrors auth email.            |
| created_at   | timestamptz   | default `now()`.                       |
| updated_at   | timestamptz   | default `now()`.                       |
| deleted_at   | timestamptz   | nullable — soft delete.                |

### `projects`
A connection to one of the user's external Supabase projects.

| Column                     | Type        | Notes                                        |
| -------------------------- | ----------- | -------------------------------------------- |
| id                         | uuid (PK)   | default `gen_random_uuid()`.                 |
| user_id                    | uuid (FK)   | → `profiles.id`.                             |
| name                       | text        | Required.                                    |
| supabase_url               | text        | Target project URL.                          |
| service_role_key_encrypted | text        | Encrypted service role key (never plaintext).|
| status                     | text        | e.g. `active` / `error`.                     |
| created_at                 | timestamptz | default `now()`.                             |
| updated_at                 | timestamptz | default `now()`.                             |
| deleted_at                 | timestamptz | nullable — soft delete.                      |

### `conversations`
A chat thread scoped to a project.

| Column        | Type        | Notes                          |
| ------------- | ----------- | ------------------------------ |
| id            | uuid (PK)   |                                |
| project_id    | uuid (FK)   | → `projects.id`.               |
| user_id       | uuid (FK)   | → `profiles.id`.               |
| title         | text        | Auto/first-message derived.    |
| created_at    | timestamptz | default `now()`.               |
| updated_at    | timestamptz | default `now()`.               |
| deleted_at    | timestamptz | nullable — soft delete.        |

### `messages`
Individual chat messages within a conversation (the human-readable chat transcript).

| Column           | Type        | Notes                                    |
| ---------------- | ----------- | ---------------------------------------- |
| id               | uuid (PK)   |                                          |
| conversation_id  | uuid (FK)   | → `conversations.id`.                    |
| role             | text        | `user` \| `assistant` \| `system`.       |
| content          | text        | Message body.                            |
| created_at       | timestamptz | default `now()`.                         |
| deleted_at       | timestamptz | nullable — soft delete.                  |

### `ai_logs`
Full audit of every Gemini call — **what we sent, what came back, and token usage**.
One row per AI request/response round-trip (usually tied to one assistant `message`).

| Column            | Type        | Notes                                                       |
| ----------------- | ----------- | ----------------------------------------------------------- |
| id                | uuid (PK)   |                                                             |
| message_id        | uuid (FK)   | → `messages.id` (the assistant reply this produced).        |
| conversation_id   | uuid (FK)   | → `conversations.id`.                                       |
| project_id        | uuid (FK)   | → `projects.id` (which project's logs were discussed).      |
| user_id           | uuid (FK)   | → `profiles.id`.                                             |
| model             | text        | e.g. `gemini-1.5-flash`.                                     |
| request_payload   | jsonb       | Full request body sent to Gemini (messages, log context, params). |
| prompt_text       | text        | Flattened prompt / question sent to the model.              |
| response_text     | text        | Raw text the model returned.                                |
| prompt_tokens     | int4        | Input/prompt token count.                                   |
| completion_tokens | int4        | Output/completion token count.                              |
| total_tokens      | int4        | `prompt_tokens + completion_tokens`.                        |
| latency_ms        | int4        | Round-trip time in milliseconds.                            |
| status            | text        | `success` \| `error` \| `filtered`.                         |
| error_message     | text        | Populated on failure; null otherwise.                       |
| created_at        | timestamptz | default `now()`.                                            |
| deleted_at        | timestamptz | nullable — soft delete.                                     |

> This gives you a complete, queryable record of AI usage — useful for **cost/token
> tracking, debugging bad answers, rate-limiting, and analytics**.

### Relationships
- `auth.users` **1—1** `profiles`
- `profiles` **1—many** `projects`
- `profiles` **1—many** `conversations`
- `projects` **1—many** `conversations`
- `conversations` **1—many** `messages`
- `messages` **1—1** `ai_logs` (each assistant reply has one AI log)
- `projects` / `conversations` / `profiles` **1—many** `ai_logs`

### Row Level Security (RLS)
- Enable RLS on all tables.
- Policy: a user can only see/modify rows where `user_id = auth.uid()`
  (and `deleted_at IS NULL` for reads).
- `messages` scoped via their parent `conversation`'s `user_id`.

---

## 5. Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=          # Logs Assistant's own project
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=         # server-only
GEMINI_API_KEY=                    # server-only
ENCRYPTION_KEY=                    # server-only, for encrypting stored service role keys
```

---

## 6. High-Level Flow

1. User signs up → `profiles` row created.
2. User logs in → lands on `/dashboard`.
3. No projects → "Create New Project" (URL + service role key, encrypted & saved).
4. Click a project → app connects to that Supabase project server-side, fetches logs.
5. User filters logs by date/time.
6. User chats with Gemini about the logs; history saved.
7. Delete a project/conversation → soft delete (`deleted_at` set).

---

## 7. Suggested Build Order

1. Scaffold Next.js + Tailwind + Supabase client.
2. Auth: signup (with validation) + login + protected routing.
3. `profiles` table + RLS + trigger to create profile on signup.
4. Dashboard + projects CRUD (create with encrypted key, soft delete).
5. Project logs view + date/time filters.
6. Gemini chatbot + conversation/message persistence.
7. Settings page.
8. Polish, error handling, deploy.
