# Pastebin Lite

A production-ready, ephemeral text- and code-sharing web application built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Prisma**, **Neon PostgreSQL**, and **Vitest**.

Users can create text pastes, generate cryptographically secure shareable URLs, and optionally configure **time-based expiration** and **maximum view-count limits**—with atomic database enforcement to prevent race conditions under concurrent traffic.

---

## Live Demo

- **Application:** [https://pastebin-lite-murex-iota.vercel.app/](https://pastebin-lite-murex-iota.vercel.app/)
- **Health Check:** [https://pastebin-lite-murex-iota.vercel.app/api/health](https://pastebin-lite-murex-iota.vercel.app/api/health)
- **Repository:** [https://github.com/MannemSumanaSri/pastebin-lite](https://github.com/MannemSumanaSri/pastebin-lite)

---

## Features

- **Create & Share Pastes:** Monospace editor with live character counter (`100,000` char limit), client/server validation, loading/error states, and one-click copyable URLs.
- **Time-Based Expiry:** Preset durations (`5m`, `1h`, `24h`, `7d`, `30d`) or custom duration in seconds, computed using server-side UTC timestamps. Access is rejected once `now >= expiresAt`.
- **View-Count Limits:** Optional maximum view cap enforced atomically at the database level so simultaneous requests never exceed `maxViews`.
- **XSS-Safe Rendering:** User-submitted content is always rendered strictly as plain text inside `<pre><code>`—never executed as HTML.
- **Cryptographically Secure IDs:** 12-character URL-safe `base64url` IDs generated with `node:crypto` (`randomBytes(9)`, 72 bits of entropy) to prevent enumeration.
- **Automated Test Suite:** 21 Vitest tests across 3 suites covering validation, expiry boundaries, concurrency near `maxViews`, HTTP status codes, and database error handling.

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
│   ├── schema.prisma                     # PostgreSQL Paste model, indexes & directUrl
│   └── migrations/
│       ├── migration_lock.toml
│       └── 20261117000000_init/
│           └── migration.sql             # Initial DDL + PostgreSQL CHECK constraints
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── health/route.ts           # GET /api/health (DB connectivity check)
│   │   │   └── pastes/
│   │   │       ├── route.ts              # POST /api/pastes
│   │   │       └── [id]/route.ts         # GET /api/pastes/[id]
│   │   ├── p/[id]/page.tsx               # Dynamic SSR paste viewer (force-dynamic)
│   │   ├── globals.css
│   │   ├── layout.tsx                    # App shell & navigation
│   │   ├── not-found.tsx
│   │   └── page.tsx                      # Home page (PasteCreator)
│   ├── components/
│   │   ├── CopyButton.tsx                # Clipboard copy with fallback
│   │   ├── PasteCreator.tsx              # Editor, expiry/view-limit form & URL card
│   │   ├── PasteUnavailable.tsx          # 400 / 404 / 410 / 500 error views
│   │   └── PasteViewer.tsx               # Safe plain-text <pre><code> viewer
│   └── lib/
│       ├── id.ts                         # Cryptographic ID generator & validator
│       ├── paste-service.ts              # Core business logic & atomic view updates
│       ├── prisma.ts                     # Singleton PrismaClient
│       ├── url.ts                        # Shareable URL builder
│       └── validation.ts                 # Zod schemas & size/limit constants
├── tests/
│   ├── api/pastes.test.ts                # REST API integration tests
│   ├── mocks/prisma.ts                   # Concurrency-accurate in-memory mock
│   ├── service/paste-service.test.ts     # Boundary & race-condition tests
│   └── unit/validation.test.ts           # ID & schema unit tests
├── .env.example
├── vercel.json
└── vitest.config.ts
