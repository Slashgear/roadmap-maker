# roadmap-maker

**Gantt roadmap builder** — static (localStorage) or team (SQLite + real-time SSE)

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](./LICENSE)
[![Built with Vite](https://img.shields.io/badge/Built%20with-Vite-646cff)](https://vitejs.dev)
[![Preact](https://img.shields.io/badge/Preact-10-673ab8)](https://preactjs.com)

![](./client/public/og-image.png)

Two build modes:

| Mode                 | Storage                       | Use case                            |
| -------------------- | ----------------------------- | ----------------------------------- |
| **Static** (default) | `localStorage` in the browser | Personal use, no server needed      |
| **Team**             | SQLite on the server + SSE    | Team use, changes sync in real-time |

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

### Docker

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
  "sections": [
    {
      "id": "sec-1",
      "roadmapId": "unique-id",
      "label": "🎨 Design",
      "color": "cyan", // orange | purple | cyan | green | pink | blue | amber | indigo | lime | rose | teal | slate
      "position": 0,
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
        },
      ],
    },
  ],
}
```

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

|                  | Technology                                                                |
| ---------------- | ------------------------------------------------------------------------- |
| Frontend         | [Preact](https://preactjs.com) + [TypeScript](https://typescriptlang.org) |
| Bundler          | [Vite](https://vitejs.dev)                                                |
| Styles           | [Tailwind CSS](https://tailwindcss.com)                                   |
| Validation       | [Zod](https://zod.dev)                                                    |
| Runtime / build  | [Bun](https://bun.sh)                                                     |
| Server           | [Hono](https://hono.dev) (static serving + team API)                      |
| DB (team mode)   | SQLite via `bun:sqlite` (WAL, FK, optimistic locking)                     |
| Real-time (team) | Server-Sent Events (SSE)                                                  |
| Tests            | [Vitest](https://vitest.dev)                                              |

---

## Team mode

The team build adds a REST API backed by SQLite and a real-time SSE stream. Multiple users can edit the same roadmap simultaneously — changes propagate to all connected clients within ~50 ms.

### How it works

- **Auth**: shared `AUTH_TOKEN` env var → session cookie (HttpOnly, 24h TTL)
- **Persistence**: SQLite with WAL mode and foreign key cascades
- **Optimistic locking**: every entity has a `version` integer; PUT requests must include the current version. A mismatch returns `409 Conflict` with the server's current state.
- **Real-time**: `GET /api/roadmaps/:slug/events` is an SSE stream. Every mutation broadcasts a typed event (`task_added`, `section_updated`…) to all connected clients.
- **API docs**: Swagger UI at `/api/docs` (OpenAPI 3.0 spec at `/api/openapi.json`)

### Build & run

```bash
# 1. Build the team frontend
bun run build:team          # outputs to ./public-team

# 2. Start the server with SQLite mode
AUTH_TOKEN=my-secret STORAGE=sqlite bun run server:team
# → http://localhost:8080 — enter token "my-secret" to sign in
```

### Docker (team)

```bash
docker build -f Dockerfile.team -t roadmap-maker-team .
docker run -p 8080:8080 \
  -e AUTH_TOKEN=my-secret \
  -v roadmap-data:/data \
  roadmap-maker-team
```

The SQLite database is persisted in the `/data` volume (`/data/roadmaps.db`).

---

## Deployment

### Docker — static mode (default)

```bash
docker build -t roadmap-maker .
docker run -p 8080:8080 roadmap-maker
```

### Docker — team mode

```bash
docker build -f Dockerfile.team -t roadmap-maker-team .
docker run -p 8080:8080 -e AUTH_TOKEN=secret -v data:/data roadmap-maker-team
```

### Fly.io (static mode)

```bash
# Install flyctl: https://fly.io/docs/hands-on/install-flyctl/
fly auth login
fly launch   # detects the Dockerfile, prompts for app name & region
fly deploy   # build & push image, then open https://<app-name>.fly.dev
```

### Any static host (Netlify / Vercel / Cloudflare Pages)

```bash
bun run build   # outputs static files to ./public
```

Then upload `./public` to your host of choice. Framework settings (if needed):

| Setting                    | Value                       |
| -------------------------- | --------------------------- |
| Build command              | `bun run build`             |
| Output / publish directory | `public`                    |
| Node version               | any (Bun handles the build) |

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request.

---

## License

MIT — see [LICENSE](./LICENSE) for details.
