# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Copilot, Cursor, etc.) when working with code in this repository.

## Commands

```bash
# Development (Vite dev server on port 5173)
bun run dev

# Production build (outputs Vite bundle to ./public)
bun run build

# Preview production build locally
bun run preview

# Format check (must pass before pushing)
bun run fmt:check

# Fix formatting
bun run fmt

# Lint (must pass before pushing)
bun run lint

# Auto-fix lint issues
bun run lint:fix

# Type check (must pass before pushing)
bunx tsc --noEmit

# Bundle analysis
bun run build:analyze

# Changesets (versioning — required before merging any user-facing change)
bun run changeset
```

There are no tests in this project yet.

## Before committing

Run these in order — all three must pass, and CI will enforce them:

```bash
bun run fmt:check   # formatting
bun run lint        # linting
bunx tsc --noEmit   # types
```

Every user-facing change (feature, fix, perf) requires a changeset:

```bash
bun run changeset   # select bump type and describe the change
```

## Architecture

**Pure static site — no backend:**

- `client/` — Preact SPA (built by Vite, served as static files)
- `public/` — Built frontend output (generated, do not edit)

All roadmap data lives in `localStorage` under the key `roadmap-maker:roadmaps`. Roadmaps can be exported as JSON files and imported back (validated with Zod).

**Data model (hierarchical):** `Roadmap → Sections → Tasks`

### Frontend (`client/src/`)

- **`App.tsx`** — All application state lives here (current roadmap, roadmap list, modal state). All CRUD mutations are synchronous — they update state and persist to localStorage. Import/export handlers read/write JSON files.
- **`schemas.ts`** — Zod schemas (`RoadmapSchema`, `SectionSchema`, `TaskSchema`) used for validating imported JSON files.
- **`types.ts`** — Single source of truth for `Roadmap`, `Section`, `Task` interfaces and the color system (`TaskStatus`, `SectionColor`, `COLOR_HEX`, etc.)
- **`components/GanttChart.tsx`** — Pure calculation-based Gantt renderer; no external chart library. Positions task bars by comparing dates against the roadmap's time range
- **`components/Modal.tsx`** — Base modal (backdrop click + Escape to close); used by all CRUD modals

Modal state uses a discriminated union in `App.tsx` (`type ModalState = { type: 'create-roadmap' } | { type: 'edit-section'; section: Section } | ...`). All create/edit operations open the appropriate modal variant.

### Key conventions

- **JSX**: Uses Preact with `jsxImportSource: "preact"` in tsconfig. Use `ComponentChildren` (not `React.ReactNode`) and `JSX.CSSProperties` from `'preact'`. Use `e.currentTarget.value` (not `e.target.value`) in event handlers — Preact types `currentTarget`, not `target`, as the element type
- **Colors**: 4 section colors (`milestones`, `framing`, `design`, `tech`) and 3 task statuses (`confirmed`, `pending`, `critical`). Hex values in `COLOR_HEX` in `types.ts`
- **Routing**: Hash-based (`window.location.hash = '#' + slug`). No server-side routing needed.
- **Styling**: Tailwind for static classes; inline styles for dynamic values (colors, widths calculated from dates)

### CI

The CI pipeline runs: `bun install --frozen-lockfile` → `fmt:check` → `lint` → `build` → `tsc --noEmit`. The release pipeline additionally uses changesets to publish to npm and build/push a Docker image to GHCR.
