# Contributing to roadmap-maker

Thank you for your interest in contributing. This document explains how to set up the project locally, understand the codebase, and submit high-quality contributions.

---

## Development setup

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- Node.js >= 20 (only needed if you run the Vite dev server without Bun's Node compatibility layer)
- Git

### Steps

```bash
# 1. Fork and clone the repository
git clone https://github.com/your-org/roadmap-maker.git
cd roadmap-maker

# 2. Copy environment variables
cp .env.example .env

# 3. Install all dependencies (root + client)
bun install

# 4. Start the development servers (Hono API + Vite frontend)
bun run dev
```

The frontend is served at [http://localhost:5173](http://localhost:5173).
The API is available at [http://localhost:3001](http://localhost:3001).

---

## Project structure

```
roadmap-maker/
├── src/                  # Hono backend (Bun)
│   ├── index.ts          # Entry point — mounts routers, serves static files
│   ├── db.ts             # libsql client setup and schema initialization
│   └── routes/
│       ├── roadmaps.ts   # CRUD for roadmaps and nested sections
│       ├── sections.ts   # CRUD for sections and nested tasks
│       └── tasks.ts      # CRUD for tasks
├── client/               # React frontend (Vite)
│   └── src/
│       ├── App.tsx        # Root component — state, routing, modal orchestration
│       ├── api.ts         # Typed fetch wrappers for all API endpoints
│       ├── types.ts       # Shared TypeScript types and color constants
│       └── components/
│           ├── GanttChart.tsx   # Core Gantt rendering (pure calculation + DOM)
│           ├── Modal.tsx        # Reusable modal shell and form primitives
│           ├── TaskModal.tsx    # Create/edit task form
│           ├── SectionModal.tsx # Create/edit section form
│           └── RoadmapModal.tsx # Create/edit roadmap form
├── .env.example          # Environment variable template
├── Dockerfile            # Production container image
└── docker-compose.yml    # Compose file for local Docker usage
```

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
4. Fill in the [PR template](.github/PULL_REQUEST_TEMPLATE.md) — describe what changed and why.
5. Link to any related issue using `Closes #<issue-number>`.

---

## Code style

- **TypeScript strict mode** is enabled. Do not use `any` unless absolutely unavoidable.
- Do not add comments explaining obvious code. Comments should explain intent that is not clear from the code itself.
- Keep components small and focused. Extract logic into helpers when a component grows complex.
- API routes follow REST conventions. Use the correct HTTP verbs and status codes.
- No trailing whitespace; no unused imports.
- The project does not use a formatter config yet — match the style of the surrounding code.

---

## Questions

Open a [Discussion](https://github.com/your-org/roadmap-maker/discussions) for general questions, ideas, or feedback that does not fit a bug or feature report.
