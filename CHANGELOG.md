# @slashgear/roadmap-maker

## 1.0.0

### Major Changes

- Migrate to pure static site — no backend required

  The app no longer needs a server or database. All roadmap data is stored in `localStorage` and can be imported/exported as JSON files.

  **Breaking changes:**
  - Removed Hono REST API server (`src/` directory deleted)
  - Removed libsql/SQLite database dependency
  - Data is no longer persisted server-side — existing server data will not migrate automatically

  **New features:**
  - Export any roadmap as a `.json` file via the "Export" button
  - Import a roadmap JSON file (validated with Zod) via the "Import" button
  - Data persists across sessions via `localStorage`
  - Delete roadmap button added to the Settings modal
  - Hash-based routing (`#slug`) replaces path-based routing

  **Deployment:** The app now builds to a static bundle served by nginx (or any static host). The Dockerfile is updated accordingly.

### Minor Changes

- f275eec: Replace task color system with semantic status (confirmed / pending / critical)

  Tasks now carry a `status` field instead of a free-form `color`. Each status has a distinct visual:
  - Bar confirmed: solid green fill
  - Bar pending (on hold): translucent orange with dashed border
  - Bar critical: solid red fill
  - Milestone confirmed: solid green diamond
  - Milestone pending (à valider): outlined orange diamond
  - Milestone critical: solid red diamond

  The legend is rebuilt to show all 6 variants. The modal status selector adapts its labels to the selected type (On hold vs À valider).

- ddaa133: Add configurable view window to the Gantt chart

  The timeline now defaults to 30 days before today through 4 months ahead. Two date inputs above the chart let users adjust the window freely; a Reset button restores the default. Date arithmetic uses temporal-polyfill (Temporal.PlainDate) for correct month-boundary handling.
