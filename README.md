# roadmap-maker

**Gantt roadmap builder** — static (localStorage) or team (PostgreSQL + real-time SSE)

[![CI](https://github.com/Slashgear/roadmap-maker/actions/workflows/ci.yml/badge.svg)](https://github.com/Slashgear/roadmap-maker/actions/workflows/ci.yml)
[![Version](https://img.shields.io/github/package-json/v/Slashgear/roadmap-maker)](./package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](./LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)
[![GitHub stars](https://img.shields.io/github/stars/Slashgear/roadmap-maker?style=social)](https://github.com/Slashgear/roadmap-maker/stargazers)

[![Bun](https://img.shields.io/badge/Bun-1%2B-black?logo=bun&logoColor=white)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Built with Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white)](https://vitejs.dev)
[![Preact](https://img.shields.io/badge/Preact-10-673ab8?logo=preact&logoColor=white)](https://preactjs.com)
[![Hono](https://img.shields.io/badge/Hono-4-e36002?logo=hono&logoColor=white)](https://hono.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169e1?logo=postgresql&logoColor=white)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ed?logo=docker&logoColor=white)](./Dockerfile)
[![OpenAPI 3.0](https://img.shields.io/badge/OpenAPI-3.0-6ba539?logo=openapiinitiative&logoColor=white)](./server/api/openapi.ts)

![](./client/public/og-image.png)

## Table of contents

- [Features](#features)
- [Getting started](#getting-started)
- [Import / Export](#import--export)
- [Import from Jira / GitLab / CSV (AI skill)](#import-from-jira--gitlab--csv-ai-skill)
- [Examples](#examples)
- [Data format](#data-format)
- [Stack](#stack)
- [Team mode](#team-mode)
  - [How it works](#how-it-works)
  - [Database schema](#database-schema)
  - [API endpoints](#api-endpoints)
  - [Build & run locally](#build--run-locally)
  - [Docker (team)](#docker-team)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

Two build modes:

| Mode                 | Storage                        | Use case                            |
| -------------------- | ------------------------------ | ----------------------------------- |
| **Static** (default) | `localStorage` in the browser  | Personal use, no server needed      |
| **Team**             | PostgreSQL on the server + SSE | Team use, changes sync in real-time |

```mermaid
flowchart LR
    subgraph Static["Static mode"]
        B1[Browser] <--> LS[localStorage]
    end
    subgraph Team["Team mode"]
        B2[Browser] -->|REST API| H[Hono server]
        H --> PG[(PostgreSQL)]
        H -->|SSE stream| B2
    end
```

---

## Features

- **Gantt chart visualization** — timeline view with month headers, week grid lines, and a live "today" marker
- **Multiple roadmaps** — create and switch between as many roadmaps as you need
- **Sections & tasks** — organize work into color-coded sections, each containing bar tasks or milestone markers
- **5 task statuses** — Confirmed (green), In progress (blue), On hold (orange dashed), Critical (red), Done (gray)
- **Notes per task** — freeform context attached to any task
- **External links per task** — attach any URL (Jira ticket, GitHub issue, Linear item…) displayed as a clickable icon in the Gantt left column
- **Export / Import JSON** — download any roadmap as `.json`, reimport it anywhere
- **Persistent** — data survives tab and browser restarts via `localStorage`
- **Self-hostable** — one Docker command, no external services required

---

## Getting started

### Development

Prerequisites: [Bun](https://bun.sh) >= 1.0

```bash
git clone https://github.com/your-org/roadmap-maker.git
cd roadmap-maker
bun install
bun run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Production build

```bash
bun run build   # outputs static files to ./public
bun run preview # preview locally
```

### Docker Compose

The easiest way to run the app locally. Three services are defined — only `postgres` starts by default; the app services use [profiles](https://docs.docker.com/compose/profiles/) so you opt in explicitly.

**Postgres only** (for development / unit tests):

```bash
docker compose up -d
```

**Static app** — personal use, no auth, data in the browser:

```bash
docker compose --profile static up
# → http://localhost:8080
```

**Team app** — collaborative mode with PostgreSQL:

```bash
AUTH_TOKEN=my-secret docker compose --profile team up
# → http://localhost:8080 — sign in with "my-secret"
```

`AUTH_TOKEN` is required — the compose file will refuse to start without it.

### Docker (manual)

```bash
docker build -t roadmap-maker .
docker run -p 8080:8080 roadmap-maker
```

Open [http://localhost:8080](http://localhost:8080).

---

## Import / Export

Roadmaps can be shared as `.json` files:

- **Export** — click the "Export" button in the top bar to download the current roadmap
- **Import** — click "Import" and select a `.json` file; it will be validated and merged (upsert by slug)

See the [`examples/`](./examples/) directory for ready-to-import roadmaps.

---

## Import from Jira / GitLab / CSV (AI skill)

The repo ships an [agent skill](./.agents/skills/roadmap-import/AGENTS.md) that converts any structured data source into a ready-to-import `.json` file.

**Supported sources:**

| Source       | What gets mapped                                                                             |
| ------------ | -------------------------------------------------------------------------------------------- |
| **CSV**      | Flexible column names — label, start, end, section, status, type, note                       |
| **Jira**     | `summary` → label, `status` → status, `components` / `labels` → section, `duedate` → endDate |
| **GitLab**   | `title`, `state`, `due_date`, `milestone`, `labels`                                          |
| **Linear**   | `title`, `state`, `dueDate`, `team`, `project`                                               |
| **Any JSON** | Paste a sample row — the skill infers the mapping                                            |

**Usage with Claude Code:**

```
/roadmap-import
```

Then paste your CSV or JSON payload. The skill will:

1. Show you the proposed field mapping before generating anything
2. Map statuses to `confirmed / started / pending / critical / done`
3. Group items into sections (by epic, label, milestone, or component)
4. Assign section colors automatically
5. Write a `roadmap-export.json` file you can drag into the Import button

**Example — from a CSV:**

```
/roadmap-import

label,start,end,section,status
"Homepage redesign",2026-01-05,2026-01-19,Design,In Progress
"API migration",2026-01-12,2026-02-09,Tech,Done
"Go-live",2026-02-10,2026-02-10,Milestones,At Risk
```

The skill handles common edge cases: non-ISO date formats, missing start/end dates, identical start/end → auto-milestone, and merges duplicate section names.

---

## Examples

Three example roadmaps are available in [`examples/`](./examples/). Import them directly from the app.

### `design-system.json` — Design System 2.0

A 7-month roadmap for rebuilding a component library from scratch — audit, foundations, implementation, and migration.

|                |                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------- |
| **Period**     | May → Nov 2026                                                                                      |
| **Sections**   | Milestones, Audit & Foundations, Design, Engineering                                                |
| **Highlights** | Alpha → Beta → v1 sunset (critical) → public launch, dark mode (pending), open-source release (TBD) |

**Sections:**

- 🏁 **Milestones** — kickoff, alpha, beta, v1 hard sunset deadline (critical), public launch, OSS token release (TBD)
- 🔍 **Audit & Foundations** — component inventory, design token architecture, WCAG 2.2 audit, migration guide
- 🎨 **Design** — new visual language, Figma kit, navigation patterns, data viz, dark mode (pending)
- ⚙️ **Engineering** — monorepo setup, core components, Storybook + visual regression, codemods, docs site (Starlight)

---

### `saas-launch.json` — Lancement d'un produit SaaS

End-to-end roadmap for taking a SaaS product from discovery to general availability.

|                |                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------ |
| **Period**     | Mar → Aug 2026                                                                             |
| **Sections**   | Milestones, Discovery & Framing, Design & UX, Tech                                         |
| **Highlights** | Beta milestone, Product Hunt launch, Stripe billing integration, post-launch API (pending) |

**Sections:**

- 🏁 **Milestones** — closed beta, Product Hunt, SaaStr conference (TBD), GA launch
- 🗺️ **Discovery** — user research (15 interviews), MVP scoping, technical architecture
- 🎨 **Design** — wireframes, design system, high-fidelity mockups, onboarding, marketing landing page
- ⚙️ **Tech** — auth, core feature sprints, Stripe billing, QA, performance, public API v1 (pending)

---

### `mobile-app.json` — Développement d'une app mobile v1.0

Six-month roadmap for building and shipping a mobile app on iOS and Android.

|                |                                                                                               |
| -------------- | --------------------------------------------------------------------------------------------- |
| **Period**     | Apr → Oct 2026                                                                                |
| **Sections**   | Milestones, Discovery & Specs, Design & UX, Tech                                              |
| **Highlights** | Alpha → Beta → Store submission → Launch milestones, offline sync, post-launch v1.1 (pending) |

**Sections:**

- 🏁 **Milestones** — alpha, TestFlight/Play beta, App Store submission, public launch, v1.1 (TBD)
- 🗺️ **Discovery** — stack decision (React Native vs Flutter), user stories, MVP specs
- 🎨 **Design** — UX research, wireframes, mobile design system (HIG + Material 3), store assets
- ⚙️ **Tech** — auth, core sprints, push notifications, offline mode + sync, QA, beta bugfixes

---

## Data format

Roadmaps are plain JSON. The schema is validated on import using [Zod](https://zod.dev).

```jsonc
{
  "id": "unique-id",
  "slug": "my-roadmap", // used for hash routing (#my-roadmap)
  "title": "My Roadmap",
  "subtitle": "Q1 2026", // optional
  "startDate": "2026-01-01", // YYYY-MM-DD
  "endDate": "2026-06-30",
  "version": 3, // optional — optimistic locking counter (team mode only)
  "sections": [
    {
      "id": "sec-1",
      "roadmapId": "unique-id",
      "label": "🎨 Design",
      "color": "cyan", // orange | purple | cyan | green | pink | blue | amber | indigo | lime | rose | teal | slate
      "position": 0,
      "version": 1, // optional — optimistic locking counter (team mode only)
      "tasks": [
        {
          "id": "task-1",
          "sectionId": "sec-1",
          "label": "Homepage redesign",
          "startDate": "2026-01-05",
          "endDate": "2026-01-19",
          "status": "confirmed", // confirmed | started | pending | critical | done
          "type": "bar", // bar | milestone
          "note": "Optional context, decisions, links…",
          "externalLink": "https://yourorg.atlassian.net/browse/PROJ-42", // optional URL (Jira, GitHub, Linear…)
          "position": 0,
          "version": 2, // optional — optimistic locking counter (team mode only)
        },
      ],
    },
  ],
}
```

### `version` field

Each entity carries an integer `version` that increments on every write. In team mode, `PUT` requests must echo the current `version` — if it has changed in the meantime, the server responds `409 Conflict` with the latest state. This prevents lost updates when multiple users edit the same roadmap simultaneously. The field is optional in exported JSON files (ignored in static mode).

### Colors

12 colors available for sections:

`orange` `purple` `cyan` `green` `pink` `blue` `amber` `indigo` `lime` `rose` `teal` `slate`

### Statuses

| Value       | Color  | Appearance          | Meaning                        |
| ----------- | ------ | ------------------- | ------------------------------ |
| `confirmed` | Green  | Solid fill          | Planned and confirmed          |
| `started`   | Blue   | Solid fill          | Currently in progress          |
| `pending`   | Orange | Dashed, translucent | On hold or awaiting validation |
| `critical`  | Red    | Solid fill          | Hard deadline, must not slip   |
| `done`      | Gray   | Solid fill          | Completed                      |

---

## Stack

|                  | Technology                                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| Frontend         | [Preact](https://preactjs.com) + [TypeScript](https://typescriptlang.org)                                        |
| Bundler          | [Vite](https://vitejs.dev)                                                                                       |
| Styles           | [Tailwind CSS](https://tailwindcss.com)                                                                          |
| Validation       | [Zod](https://zod.dev)                                                                                           |
| Runtime / build  | [Bun](https://bun.sh)                                                                                            |
| Server           | [Hono](https://hono.dev) (static serving + team API)                                                             |
| DB (team mode)   | [PostgreSQL](https://postgresql.org) via [`postgres`](https://github.com/porsager/postgres) (optimistic locking) |
| Real-time (team) | Server-Sent Events (SSE)                                                                                         |
| Tests            | [Vitest](https://vitest.dev) + real PostgreSQL (Docker)                                                          |

---

## Team mode

The team build adds a REST API backed by PostgreSQL and a real-time SSE stream. Multiple users can edit the same roadmap simultaneously — changes propagate to all connected clients within ~50 ms.

### How it works

- **Auth**: shared `AUTH_TOKEN` env var → session cookie (HttpOnly, 24h TTL)
- **Persistence**: PostgreSQL with foreign key cascades and optimistic locking
- **Optimistic locking**: every entity has a `version` integer; PUT requests must include the current version. A mismatch returns `409 Conflict` with the server's current state.
- **Real-time**: `GET /api/roadmaps/:slug/events` is an SSE stream. Every mutation broadcasts a typed event (`task_added`, `section_updated`…) to all connected clients.
- **API docs**: Swagger UI at `/api/docs` (OpenAPI 3.0 spec at `/api/openapi.json`)

### Database schema

```mermaid
erDiagram
    roadmaps {
        TEXT id PK
        TEXT slug UK
        TEXT title
        TEXT subtitle
        TEXT start_date
        TEXT end_date
        INTEGER version
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }
    sections {
        TEXT id PK
        TEXT roadmap_id FK
        TEXT label
        TEXT color
        INTEGER position
        INTEGER version
    }
    tasks {
        TEXT id PK
        TEXT section_id FK
        TEXT label
        TEXT start_date
        TEXT end_date
        TEXT status
        TEXT type
        TEXT note
        TEXT external_link
        INTEGER position
        INTEGER version
    }
    roadmaps ||--o{ sections : "ON DELETE CASCADE"
    sections ||--o{ tasks : "ON DELETE CASCADE"
```

### API endpoints

All endpoints are prefixed with `/api` and require authentication (session cookie) except `/api/auth`.

| Method   | Endpoint                                            | Description                             |
| -------- | --------------------------------------------------- | --------------------------------------- |
| `POST`   | `/api/auth`                                         | Authenticate with `AUTH_TOKEN` → cookie |
| `GET`    | `/api/me`                                           | Check current session                   |
| `GET`    | `/api/roadmaps`                                     | List all roadmaps                       |
| `POST`   | `/api/roadmaps`                                     | Create a roadmap                        |
| `GET`    | `/api/roadmaps/:slug`                               | Get a roadmap (with sections & tasks)   |
| `PUT`    | `/api/roadmaps/:slug`                               | Update a roadmap (requires `version`)   |
| `DELETE` | `/api/roadmaps/:slug`                               | Delete a roadmap                        |
| `POST`   | `/api/roadmaps/:slug/sections`                      | Add a section                           |
| `PUT`    | `/api/roadmaps/:slug/sections/:id`                  | Update a section (requires `version`)   |
| `DELETE` | `/api/roadmaps/:slug/sections/:id`                  | Delete a section                        |
| `POST`   | `/api/roadmaps/:slug/sections/:sectionId/tasks`     | Add a task                              |
| `PUT`    | `/api/roadmaps/:slug/sections/:sectionId/tasks/:id` | Update a task (requires `version`)      |
| `DELETE` | `/api/roadmaps/:slug/sections/:sectionId/tasks/:id` | Delete a task                           |
| `GET`    | `/api/roadmaps/:slug/events`                        | SSE stream (real-time updates)          |
| `GET`    | `/api/openapi.json`                                 | OpenAPI 3.0 spec                        |
| `GET`    | `/api/docs`                                         | Swagger UI                              |

### Build & run locally

```bash
# 1. Start a local PostgreSQL instance
docker compose up -d

# 2. Build the team frontend
bun run build:team          # outputs to ./public-team

# 3. Start the server
DATABASE_URL=postgres://roadmaps:roadmaps@localhost:5432/roadmaps \
  AUTH_TOKEN=my-secret \
  STORAGE=postgres \
  bun run server/index.ts
# → http://localhost:8080 — enter token "my-secret" to sign in
```

### Docker (team)

```bash
docker build -f Dockerfile.team -t roadmap-maker-team .
docker run -p 8080:8080 \
  -e AUTH_TOKEN=my-secret \
  -e DATABASE_URL=postgres://user:pass@your-db-host:5432/roadmaps \
  roadmap-maker-team
```

No volume needed — the database lives in PostgreSQL.

---

## Deployment

### Any static host — static mode (Netlify / Vercel / Cloudflare Pages)

```bash
bun run build   # outputs static files to ./public
```

Upload `./public` to your host. Framework settings (if needed):

| Setting                    | Value                       |
| -------------------------- | --------------------------- |
| Build command              | `bun run build`             |
| Output / publish directory | `public`                    |
| Node version               | any (Bun handles the build) |

### Docker — static mode

```bash
docker build -t roadmap-maker .
docker run -p 8080:8080 roadmap-maker
```

### Docker — team mode

```bash
docker build -f Dockerfile.team -t roadmap-maker-team .
docker run -p 8080:8080 \
  -e AUTH_TOKEN=secret \
  -e DATABASE_URL=postgres://user:pass@your-db-host:5432/roadmaps \
  roadmap-maker-team
```

---

### Scaleway — static mode (Serverless Container)

The static build is a single Docker image with no external dependencies — ideal for a Scaleway Serverless Container.

```bash
# 1. Build & push to Scaleway Container Registry
docker build -t rg.fr-par.scw.cloud/<namespace>/roadmap-maker:latest .
docker push rg.fr-par.scw.cloud/<namespace>/roadmap-maker:latest
```

Then in the [Scaleway console](https://console.scaleway.com/containers/namespaces):

1. Create a **Container namespace** in your region
2. Create a new **Serverless Container** pointing to your image
3. Set port `8080`, min scale `0` (scales to zero when idle)
4. Deploy — your app is live at the provided URL

No environment variables required. Data lives in the user's browser (`localStorage`).

---

### Scaleway — team mode (Serverless Container + Serverless SQL)

Both the container and the database scale to zero — you pay only for actual usage. No infrastructure to manage, no persistent volumes.

```
Browser → Serverless Container (Hono) → Serverless SQL Database (PostgreSQL)
```

#### Step 1 — Create a Serverless SQL Database

In the [Scaleway console](https://console.scaleway.com/serverless-db/instances):

1. Create a **Serverless SQL Database** (PostgreSQL 16, region `fr-par`)
2. Create a user with read/write permissions on the `roadmaps` database
3. Copy the connection string — it looks like:
   ```
   postgres://roadmaps:<password>@<id>.pg.serverless.fr-par.scw.cloud:5432/roadmaps?sslmode=require
   ```

The database scales to zero automatically when idle — no running costs between uses.

#### Step 2 — Build & push the team image

```bash
# Authenticate with Scaleway Container Registry
docker login rg.fr-par.scw.cloud -u nologin -p <SCW_SECRET_KEY>

# Build the team image
docker build -f Dockerfile.team \
  -t rg.fr-par.scw.cloud/<namespace>/roadmap-maker-team:latest .

docker push rg.fr-par.scw.cloud/<namespace>/roadmap-maker-team:latest
```

#### Step 3 — Deploy the container

In the [Scaleway console](https://console.scaleway.com/containers/namespaces):

1. Create a new **Serverless Container** using the team image
2. Set port `8080`
3. Add the environment variables below (mark secrets as confidential):
   - `STORAGE` = `postgres`
   - `DATABASE_URL` = `postgres://roadmaps:<pass>@<id>.pg.serverless.fr-par.scw.cloud:5432/roadmaps?sslmode=require`
   - `AUTH_TOKEN` = a strong random secret (e.g. `openssl rand -hex 32`)
4. Set **min scale to `1`** if you need persistent SSE connections (scale-to-zero closes open streams)
5. Deploy

Your team app will be available at the provided `*.containers.fnc.fr-par.scw.cloud` URL.

> **Note on cold starts**: with min scale `0`, the first request after an idle period will wake both the container and the Serverless SQL Database. Expect a cold start of a few seconds. Set min scale to `1` on the container for instant response (the database wakes independently on first query).

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request.

---

## License

MIT — see [LICENSE](./LICENSE) for details.
