# Contributing to roadmap-maker

Thank you for your interest in contributing. This document explains how to set up the project locally, understand the codebase, and submit high-quality contributions.

---

## Development setup

### Prerequisites

- [Bun](https://bun.sh) >= 1.1
- [Docker](https://docker.com) (required for tests and team mode)
- Git

### Steps

```bash
# 1. Fork and clone the repository
git clone https://github.com/Slashgear/roadmap-maker.git
cd roadmap-maker

# 2. Install all dependencies
bun install

# 3. Start the Vite dev server (static mode)
bun run dev
# → http://localhost:5173
```

To develop the team mode locally:

```bash
# 1. Start PostgreSQL
docker compose up -d

# 2. Build the team frontend and start the server
bun run build:team
DATABASE_URL=postgres://roadmaps:roadmaps@localhost:5432/roadmaps \
  AUTH_TOKEN=dev \
  bun run server:team
# → http://localhost:8080 — sign in with "dev"
```

---

## Testing

### Stack

| Layer              | Tool                                 | Description                                                   |
| ------------------ | ------------------------------------ | ------------------------------------------------------------- |
| Unit / integration | [Vitest](https://vitest.dev)         | Tests all REST API endpoints end-to-end through Hono handlers |
| E2E                | [Playwright](https://playwright.dev) | Full browser tests against the team app (Chromium)            |

The unit tests talk to a **real PostgreSQL** database — no mocks, no in-memory shim. This ensures the SQL queries, optimistic locking, and HTTP responses all behave exactly as in production.

### Running unit tests

Requires a running PostgreSQL instance (the docker compose service is the easiest way):

```bash
# 1. Start PostgreSQL (if not already running)
docker compose up -d

# 2. Run all tests
DATABASE_URL=postgres://roadmaps:roadmaps@localhost:5432/roadmaps bun run test

# Watch mode (reruns on file change)
DATABASE_URL=postgres://roadmaps:roadmaps@localhost:5432/roadmaps bun run test:watch
```

Each test creates a fresh app instance and truncates all tables before running — tests are fully isolated from each other.

### Running E2E tests

Playwright tests spin up the full team server and run a Chromium browser against it. They also require PostgreSQL.

```bash
# 1. Start PostgreSQL (if not already running)
docker compose up -d

# 2. Build the team frontend (required once, or after frontend changes)
bun run build:team

# 3. Run E2E tests
DATABASE_URL=postgres://roadmaps:roadmaps@localhost:5432/roadmaps bun run test:e2e

# Interactive UI mode
DATABASE_URL=postgres://roadmaps:roadmaps@localhost:5432/roadmaps bun run test:e2e:ui
```

### Writing tests

Unit tests live in `server/api/openapi.test.ts`. Each test suite uses `beforeEach` to call `createTestApp()`, which:

1. Connects to the test database (`createTestSql` from `server/__mocks__/pg-setup.ts`)
2. Applies the schema (`applySchema`) — idempotent, safe to run repeatedly
3. Truncates all tables for isolation
4. Returns a fresh Hono app wired to that connection

Follow the existing pattern: test HTTP responses only (status codes, body shape) — do not assert against the database directly.

---

## Project structure

```
roadmap-maker/
├── client/
│   ├── index.html
│   └── src/
│       ├── App.tsx           # Static mode app — localStorage CRUD
│       ├── AppTeam.tsx       # Team mode app — API + SSE
│       ├── main.tsx          # Entrypoint — renders App or AppTeam based on __APP_MODE__
│       ├── types.ts          # Shared TypeScript interfaces + constants
│       ├── schemas.ts        # Zod schemas for JSON import validation
│       ├── api/
│       │   ├── client.ts     # Typed fetch wrapper (credentials: include)
│       │   └── sse.ts        # SSEManager — typed EventSource wrapper
│       └── components/
│           ├── GanttChart.tsx
│           ├── Modal.tsx
│           ├── TaskModal.tsx
│           ├── SectionModal.tsx
│           └── RoadmapModal.tsx
├── server/
│   ├── index.ts              # Hono server — static serving + optional /api routes
│   ├── db/
│   │   ├── init.ts           # PostgreSQL schema — applySchema() + createSql()
│   │   ├── roadmaps.ts       # Roadmap queries
│   │   ├── sections.ts       # Section queries
│   │   └── tasks.ts          # Task queries + DbResult type
│   ├── middleware/
│   │   └── auth.ts           # Session cookie middleware
│   ├── __mocks__/
│   │   └── pg-setup.ts       # createTestSql() — test database helper
│   └── api/
│       ├── openapi.ts        # API factory + all REST routes + OpenAPI spec + Swagger UI
│       └── openapi.test.ts   # Vitest tests for all endpoints
├── e2e/                      # Playwright test files
├── examples/                 # Example roadmap JSON files
├── docker-compose.yml        # Local PostgreSQL + optional app services
├── Dockerfile                # Static mode image
├── Dockerfile.team           # Team mode image (PostgreSQL)
├── vite.config.ts            # Vite config — injects __APP_MODE__ and __APP_VERSION__
├── vitest.config.ts          # Vitest config — runs server/**/*.test.ts
└── package.json
```

---

## Available scripts

| Command               | Description                                                                 |
| --------------------- | --------------------------------------------------------------------------- |
| `bun run dev`         | Vite dev server on :5173 (static mode)                                      |
| `bun run build`       | Production build → `./public`                                               |
| `bun run build:team`  | Team build → `./public-team`                                                |
| `bun run server`      | Start Hono server (static mode)                                             |
| `bun run server:team` | Start Hono server (PostgreSQL mode, requires `AUTH_TOKEN` + `DATABASE_URL`) |
| `bun run test`        | Run Vitest tests (requires `DATABASE_URL`)                                  |
| `bun run test:watch`  | Run Vitest in watch mode                                                    |
| `bun run test:e2e`    | Run Playwright E2E tests                                                    |
| `bun run test:e2e:ui` | Run Playwright in interactive UI mode                                       |
| `bun run lint`        | Oxlint on `client/`                                                         |
| `bun run fmt`         | Auto-format with oxfmt                                                      |
| `bun run fmt:check`   | Check formatting (no writes)                                                |
| `bun run typecheck`   | TypeScript type check                                                       |

---

## Pre-commit checklist

Always run these before committing:

```bash
bun run fmt:check   # or: bun run fmt  (to auto-fix)
bun run lint
bunx tsc --noEmit
DATABASE_URL=postgres://roadmaps:roadmaps@localhost:5432/roadmaps bun run test
```

All four must pass.

---

## Architecture notes

### Two build modes

`vite.config.ts` injects `__APP_MODE__` (`'static'` or `'team'`) at build time via `VITE_APP_MODE` env var. `main.tsx` dynamically imports either `App` or `AppTeam` based on this constant — Vite tree-shakes the unused module from each bundle.

### Optimistic locking (team mode)

Every entity (`Roadmap`, `Section`, `Task`) has a `version: number` field. PUT endpoints require the client to send the current version. If the version doesn't match the DB, the server returns:

```json
HTTP 409 { "conflict": true, "current": { ...server entity... } }
```

The SSE stream then delivers the authoritative state to all clients.

### SSE event types

`GET /api/roadmaps/:slug/events` emits named `message` events with JSON payloads:

| Type                                | Payload                        |
| ----------------------------------- | ------------------------------ |
| `init`                              | Full `Roadmap` on connect      |
| `roadmap_updated`                   | Roadmap metadata (no sections) |
| `roadmap_deleted`                   | _(no payload)_                 |
| `section_added` / `section_updated` | `Section`                      |
| `section_deleted`                   | `{ id }`                       |
| `task_added` / `task_updated`       | `Task`                         |
| `task_deleted`                      | `{ id, sectionId }`            |

### API documentation

The full OpenAPI 3.0 spec is served at `/api/openapi.json`. Interactive Swagger UI is at `/api/docs` (team mode only).

---

## Release process

Releases are managed with [Changesets](https://github.com/changesets/changesets). Only maintainers publish releases, but **any contributor adding a user-facing change must include a changeset** in their PR.

### 1. Add a changeset with your PR

If your change is visible to users (new feature, bug fix, behavior change), run:

```bash
bun run changeset
```

The CLI will ask:

- **Bump type** — `patch` (bug fix), `minor` (new feature), `major` (breaking change)
- **Summary** — one line describing the change from a user perspective

This creates a file in `.changeset/`. Commit it alongside your code changes.

> PRs with no user-visible changes (docs, refactor, CI) don't need a changeset.

### 2. Release (maintainers only)

When ready to ship, a maintainer runs:

```bash
# Consume all pending changesets → bumps version in package.json + updates CHANGELOG.md
bun run version

# Commit and push
git add .
git commit -m "chore: release vX.Y.Z"
git push
```

The CI then runs all checks (format, lint, typecheck, unit tests, E2E). Once merged to `main`, the maintainer creates a **GitHub Release** with the tag matching the new version (e.g. `v1.6.0`) — this is what marks the release publicly.

### Versioning rules (semver)

| Change type                           | Example                      | Bump    |
| ------------------------------------- | ---------------------------- | ------- |
| Bug fix, dependency update            | Fix date overflow in Gantt   | `patch` |
| New feature, backward-compatible      | Add milestone type           | `minor` |
| Breaking change to JSON format or API | Rename a field in the schema | `major` |

---

## Submitting issues

- Search existing issues before opening a new one.
- For bugs, use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md).
- For feature requests, use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md).
- Be specific: include reproduction steps, expected vs. actual behavior, and environment details.

---

## Submitting pull requests

1. Create a branch from `main` with a descriptive name (`fix/slug-collision`, `feat/export-png`).
2. Keep pull requests focused on a single concern.
3. Ensure the app builds without errors (`bun run build`).
4. Run the full test suite — all tests must pass.
5. Fill in the [PR template](.github/PULL_REQUEST_TEMPLATE.md) — describe what changed and why.
6. Link to any related issue using `Closes #<issue-number>`.

---

## Code style

- **TypeScript strict mode** is enabled. Do not use `any` unless absolutely unavoidable.
- Do not add comments explaining obvious code. Comments should explain intent that is not clear from the code itself.
- Keep components small and focused. Extract logic into helpers when a component grows complex.
- API routes follow REST conventions. Use the correct HTTP verbs and status codes.
- All database queries use the `postgres` tagged template API — never concatenate user input into SQL strings.
- Formatting is handled by [oxfmt](https://github.com/oxc-project/oxc). Run `bun run fmt` before pushing.

---

## Questions

Open a [Discussion](https://github.com/Slashgear/roadmap-maker/discussions) for general questions, ideas, or feedback that does not fit a bug or feature report.
