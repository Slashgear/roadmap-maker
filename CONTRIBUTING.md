# Contributing to roadmap-maker

Thank you for your interest in contributing. This document explains how to set up the project locally, understand the codebase, and submit high-quality contributions.

---

## Development setup

### Prerequisites

- [Bun](https://bun.sh) >= 1.1
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
# Build team frontend, then start the server
bun run build:team
AUTH_TOKEN=dev STORAGE=sqlite bun run server:team
# → http://localhost:8080 — token: "dev"
```

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
│   │   ├── init.ts           # SQLite schema (WAL, FK, version columns)
│   │   ├── roadmaps.ts       # Roadmap queries
│   │   ├── sections.ts       # Section queries
│   │   └── tasks.ts          # Task queries + DbResult type
│   ├── middleware/
│   │   └── auth.ts           # Session cookie middleware
│   └── api/
│       ├── openapi.ts        # API factory + all REST routes + OpenAPI spec + Swagger UI
│       └── openapi.test.ts   # Vitest tests for all endpoints
├── examples/                 # Example roadmap JSON files
├── Dockerfile                # Static mode image
├── Dockerfile.team           # Team mode image (SQLite volume)
├── vite.config.ts            # Vite config — injects __APP_MODE__ and __APP_VERSION__
├── vitest.config.ts          # Vitest config — runs server/**/*.test.ts
└── package.json
```

---

## Available scripts

| Command               | Description                                            |
| --------------------- | ------------------------------------------------------ |
| `bun run dev`         | Vite dev server on :5173 (static mode)                 |
| `bun run build`       | Production build → `./public`                          |
| `bun run build:team`  | Team build → `./public-team`                           |
| `bun run server`      | Start Hono server (static mode)                        |
| `bun run server:team` | Start Hono server (SQLite mode, requires `AUTH_TOKEN`) |
| `bun run test`        | Run vitest tests (server API)                          |
| `bun run test:watch`  | Run vitest in watch mode                               |
| `bun run lint`        | Oxlint on client/                                      |
| `bun run fmt:check`   | Check formatting (oxfmt)                               |
| `bun run typecheck`   | TypeScript type check (client only)                    |

---

## Pre-commit checklist

Always run these before committing:

```bash
bun run fmt:check   # or: bun run fmt  (to auto-fix)
bun run lint
bunx tsc --noEmit
bun run test
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
4. Run `bun run test` — all tests must pass.
5. Fill in the [PR template](.github/PULL_REQUEST_TEMPLATE.md) — describe what changed and why.
6. Link to any related issue using `Closes #<issue-number>`.

---

## Code style

- **TypeScript strict mode** is enabled. Do not use `any` unless absolutely unavoidable.
- Do not add comments explaining obvious code. Comments should explain intent that is not clear from the code itself.
- Keep components small and focused. Extract logic into helpers when a component grows complex.
- API routes follow REST conventions. Use the correct HTTP verbs and status codes.
- Formatting is handled by [oxfmt](https://github.com/oxc-project/oxc). Run `bun run fmt` before pushing.

---

## Questions

Open a [Discussion](https://github.com/Slashgear/roadmap-maker/discussions) for general questions, ideas, or feedback that does not fit a bug or feature report.
