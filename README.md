# Pastebin Lite

A production-ready, minimal, and secure **Pastebin Lite** web application built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Prisma**, **Neon PostgreSQL**, and **Vitest**.

Users can create text or code pastes, generate cryptographically secure shareable URLs, and optionally configure **time-based expiration** and **maximum view-count limits**.

---

## Features

- **Create & Share Pastes**: Clean monospace editor with character counter (`100,000` char limit), client/server validation, loading/error states, and one-click copyable URLs.
- **Time-Based Expiry**: Optional preset durations (5m, 1h, 24h, 7d, 30d) or custom duration in seconds, calculated using server-side UTC timestamps. Pastes are rejected as soon as `now >= expiresAt`.
- **View-Count Limits**: Optional maximum view limit enforced atomically at the database level so concurrent requests never exceed `maxViews`.
- **Safe Rendering**: Paste content is always rendered as plain text inside `<pre><code>` (never executed as HTML), preventing XSS.
- **Cryptographically Secure IDs**: 12-character URL-safe `base64url` IDs generated with `node:crypto` (`randomBytes(9)`, 72 bits of entropy).
- **Automated Test Suite**: Comprehensive Vitest unit, service-boundary, and API integration tests covering validation, expiry boundaries, concurrency, and database error handling.

---

## Technology Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict mode) |
| UI & Styling | React 19, Tailwind CSS 3, Lucide Icons |
| Validation | Zod |
| Database | PostgreSQL (Neon serverless) |
| ORM & Migrations | Prisma 6 |
| Testing | Vitest 3 |
| Deployment | Vercel |

---

## Architecture & Project Structure

```text
pastebin-lite/
├── prisma/
│   ├── schema.prisma                     # PostgreSQL Paste model & indexes
│   └── migrations/
│       ├── migration_lock.toml
│       └── 20261117000000_init/
│           └── migration.sql             # Initial DDL + CHECK constraints
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── health/route.ts           # GET /api/health (DB check)
│   │   │   └── pastes/
│   │   │       ├── route.ts              # POST /api/pastes
│   │   │       └── [id]/route.ts         # GET /api/pastes/[id]
│   │   ├── p/[id]/page.tsx               # Dynamic SSR paste viewer page
│   │   ├── globals.css
│   │   ├── layout.tsx                    # App shell & navigation
│   │   ├── not-found.tsx
│   │   └── page.tsx                      # Home page (PasteCreator)
│   ├── components/
│   │   ├── CopyButton.tsx
│   │   ├── PasteCreator.tsx
│   │   ├── PasteUnavailable.tsx
│   │   └── PasteViewer.tsx
│   └── lib/
│       ├── id.ts                         # Secure ID generator & validator
│       ├── paste-service.ts              # Core business logic & atomic updates
│       ├── prisma.ts                     # Singleton PrismaClient
│       ├── url.ts                        # Shareable URL builder
│       └── validation.ts                 # Zod schemas & constants
├── tests/
│   ├── api/pastes.test.ts                # REST API tests (all 14 scenarios)
│   ├── mocks/prisma.ts                   # Concurrency-accurate in-memory mock
│   ├── service/paste-service.test.ts     # Boundary & race-condition tests
│   └── unit/validation.test.ts           # ID & schema unit tests
├── .env.example
├── vercel.json
└── vitest.config.ts
```

---

## Database Schema

Defined in `prisma/schema.prisma`:

- `id` (`VARCHAR(32)`, Primary Key): 12-char `base64url` random ID.
- `content` (`TEXT`, Not Null): Paste text body (enforced non-empty via `CHECK` constraint).
- `createdAt` (`TIMESTAMPTZ(3)`, Default `now()`): Creation timestamp.
- `expiresAt` (`TIMESTAMPTZ(3)`, Nullable, Indexed): Server-computed expiration timestamp.
- `maxViews` (`INTEGER`, Nullable): Optional view cap (`>= 1`).
- `viewCount` (`INTEGER`, Default `0`): Current successful view count (`0 <= viewCount <= maxViews`).

---

## API Documentation

### `POST /api/pastes`

Creates a new paste.

**Request Body (JSON):**

```json
{
  "content": "console.log('Hello, world!');",
  "expiresInSeconds": 3600,
  "maxViews": 5
}
```

- `content` (required, string): Non-empty text, max `100,000` characters.
- `expiresInSeconds` (optional, integer | null): `1` to `31,536,000` (1 year).
- `maxViews` (optional, integer | null): `1` to `1,000,000`.

**Responses:**
- `201 Created`: `{ "id", "url", "createdAt", "expiresAt", "maxViews" }`
- `400 Bad Request`: Invalid JSON or validation failure.
- `500 Internal Server Error`: Unexpected server/database error.

### `GET /api/pastes/[id]`

Retrieves a paste and atomically increments its `viewCount`. Sets `Cache-Control: no-store`.

**Responses:**
- `200 OK`: `{ "id", "content", "createdAt", "expiresAt", "maxViews", "viewCount", "remainingViews" }`
- `400 Bad Request`: Malformed paste ID.
- `404 Not Found`: Paste does not exist.
- `410 Gone`: Paste has expired (`now >= expiresAt`) or reached `maxViews`.
- `500 Internal Server Error`: Unexpected server/database error.

---

## Important Implementation Decisions & Trade-offs

1. **Creator's Initial Response Does Not Count as a View**:
   - `POST /api/pastes` initializes `viewCount` to `0`. Only actual retrievals via `GET /api/pastes/[id]` or visiting `/p/[id]` count toward `maxViews`. This ensures a paste with `maxViews = 1` ("burn after reading") can still be opened once by the recipient.
2. **Atomic Conditional View Increment (No Race Conditions)**:
   - `consumePasteView()` performs a conditional `updateMany` filtering on `viewCount < maxViews` and `(expiresAt IS NULL OR expiresAt > now)`. PostgreSQL row-level locking guarantees that concurrent requests near the limit cannot exceed `maxViews`.
3. **Server Component Rendering at `/p/[id]`**:
   - `/p/[id]` is a dynamic Server Component (`force-dynamic`) that calls `consumePasteView()` directly on the server, preventing double-counting from React Strict Mode client fetches and rendering the paste without a loading flash.

---

## Local Setup & Running

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set `DATABASE_URL` (Neon pooled URL) and `DIRECT_URL` (Neon direct URL) in `.env`.

### 3. Run Database Migrations

```bash
npx prisma migrate deploy
npx prisma generate
```

*(For local development with a fresh database, you can also run `npx prisma migrate dev`.)*

### 4. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Run Automated Tests

```bash
npm test
```

### 6. Production Build

```bash
npm run build
npm start
```

---

## Deployment (Vercel + Neon PostgreSQL)

1. **Create a Neon PostgreSQL database** at [neon.tech](https://neon.tech) and copy both the **Pooled** connection string (`DATABASE_URL`) and **Direct** connection string (`DIRECT_URL`).
2. **Push the repository to GitHub**.
3. **Import the project in Vercel** and configure the following **Environment Variables**:
   - `DATABASE_URL`: Neon pooled connection string (`?sslmode=require`)
   - `DIRECT_URL`: Neon direct connection string (`?sslmode=require`)
   - `NEXT_PUBLIC_APP_URL`: Your production Vercel URL (e.g., `https://pastebin-lite.vercel.app`)
4. **Deploy**: `vercel.json` automatically runs `npx prisma generate && npx prisma migrate deploy && npm run build` during deployment.
5. **Verify**: Visit `/api/health` on your deployed domain; it should return `{"status":"ok"}`.
