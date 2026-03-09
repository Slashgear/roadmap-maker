# @slashgear/roadmap-maker

## 1.13.0

### Minor Changes

- e252618: Add drag-to-move and resize interactions on Gantt task bars. Tasks can now be dragged horizontally to shift their dates, or resized via a right-edge handle to adjust the end date. Task dates are also no longer constrained to the roadmap's date range.

### Patch Changes

- 5b264cd: Add empty state placeholders in the Gantt chart.

  When a roadmap has no sections, a centered "Add your first section" button appears in the chart area. When a section has no tasks, a "Add your first task" button replaces the subtle row at the bottom of the section.

- 5bbfdb0: Fix focus management when reordering sections. After clicking ↑ or ↓, focus now follows the moved section to its new position instead of staying on the original DOM node.

## 1.12.0

### Minor Changes

- 1a4d44c: feat: add section reordering with ↑ ↓ buttons

  - Up/down arrow buttons appear in each section header (no library, zero bundle cost)
  - Static mode: instant local reorder
  - Team mode: PUT /api/roadmaps/:slug/sections/reorder syncs order via SSE (sections_reordered event)

## 1.11.0

### Minor Changes

- bea0f88: feat(team): add server-side audit log and history panel

  - New `roadmap_events` table records every create/update/delete on roadmaps, sections, and tasks
  - New `GET /api/roadmaps/:slug/history` endpoint returns events newest-first (limit up to 200)
  - "History" entry in the "···" dropdown opens a slide-over panel listing all events with human-readable descriptions and timestamps
  - 4 new vitest tests covering the history endpoint

### Patch Changes

- 8b02179: Show a conflict notice when a PUT request returns 409 in team mode — instead of silently discarding the update, the modal closes and an amber banner informs the user that their changes conflicted with another edit and the latest version has been loaded.
- 5a05e0a: Add indexes on `sections.roadmap_id` and `tasks.section_id` to speed up roadmap loading queries (team mode).
- d37a4cb: Validate `AUTH_TOKEN` and `DATABASE_URL` at startup in postgres mode — server now exits immediately with a clear error listing all missing variables instead of failing later with a cryptic message.
- ac3c20c: Disable PNG and SVG export buttons while an export is in progress — prevents duplicate exports on repeated clicks and shows "Exporting…" feedback in the dropdown.
- 0526cad: Fix N+1 query pattern when loading a roadmap — tasks for all sections are now fetched in a single `WHERE section_id = ANY(...)` query instead of one query per section.
- 6a0f91d: Improve import error message — replace raw Zod validation details with a friendly user-facing message. Technical details are still logged to the browser console for debugging.
- 15145eb: Add a search input to filter roadmaps by title — appears automatically when there are more than 5 roadmaps, in both static and team modes.
- 9af73a2: Show a "Connection lost — reconnecting…" banner in team mode when the SSE stream drops. The banner disappears automatically once the connection is restored and the server sends a fresh `init` event.

## 1.10.1

### Patch Changes

- 2ed8613: Unify team mode toolbar to use a single dropdown menu

  Replace the separate desktop (`hidden sm:flex`) and mobile (`sm:hidden`) action blocks
  with a single `···` dropdown (same pattern as static mode), using `DropdownItem` and
  `DropdownSeparator` components. Adds Escape key support to close the menu.

## 1.10.0

### Minor Changes

- 98ae422: Add collapsible sections to the Gantt chart

  - Each section header now has a chevron toggle button to collapse/expand its task rows
  - Collapsed sections show a task count badge `(N)` next to the section label
  - Chevron rotates 90° with a CSS transition to indicate state
  - Fully accessible: `aria-expanded` on the toggle button, descriptive `aria-label` on both buttons
  - Section header restructured from a single button to a `<div>` with two separate buttons (chevron + edit label) to avoid invalid nested `<button>` HTML

- 6a53186: Improve colorblind accessibility for task status indicators

  - Each task status now has a distinct visual pattern in addition to color (WCAG 1.4.1 — Use of Color)
    - `confirmed`: solid fill (unchanged)
    - `started`: diagonal stripes `/`
    - `pending`: diagonal stripes `\` + dashed border (previously solid)
    - `critical`: cross-hatch `#`
    - `done`: faded fill + solid border (unchanged)
  - Milestone diamonds: `started` and `critical` get distinct borders to differentiate at small sizes
  - Logic centralized in `getBarStyle()` and `getDiamondStyle()` helpers in `types.ts`, removing duplication across GanttChart, and both app legends

- d0f8fa3: Add SVG export for Gantt chart

  - New "Export SVG" option in the action menu (static and team modes)
  - Extracts chart capture logic into a shared `captureChart()` helper, removing duplication between PNG and SVG exports

- 1ae0585: Add real-time user presence in team mode

  - Each user who opens a roadmap appears as a colored avatar in the toolbar
  - Display name is set on the login screen (optional, persisted to localStorage)
  - A stable client ID is generated once per browser session (localStorage) and used as a deterministic color seed
  - Presence is tracked server-side via the existing SSE connection — no separate heartbeat needed; connect = join, disconnect = leave
  - Server broadcasts `presence_updated` to all viewers of the roadmap on every join/leave
  - Current user's avatar has a colored ring to distinguish them from others
  - Up to 4 avatars shown; overflow shown as `+N`

- 00cb081: Add URL sharing for static mode

  - "Copy link" button generates a shareable URL with the roadmap encoded via lz-string
  - Opening a shared URL silently imports the roadmap into localStorage and cleans the URL
  - lz-string is loaded lazily (dynamic import) — zero cost when the feature is not used

- acff35b: Refactor toolbar and add undo/redo for static mode

  - Unified `···` dropdown replaces the duplicated desktop/mobile action blocks
  - Dropdown groups: settings, copy link / exports / import / examples — with separators
  - Escape key closes the dropdown
  - Undo (Ctrl+Z / ⌘Z) and Redo (Ctrl+Y / ⌘Y / ⌘⇧Z) with up to 50 history entries
  - Undo/Redo buttons show visible text label alongside decorative icon (accessible)
  - `Btn` component now supports `disabled`, `title`, and `aria-label` props

- ae72ea1: Add timeline zoom presets (1M, 3M, 6M, 1Y) and skip link to date range controls

  - New `ViewRangeControls` component replacing duplicated view range blocks in App and AppTeam
  - Segmented control with 1M / 3M / 6M / 1Y presets that set the view window from today
  - Active preset highlighted; deselected automatically when dates are changed manually
  - Skip link "Skip to date range" added alongside the existing "Skip to chart" link
  - Accessible: `role="group"` + `aria-label` on preset group, `aria-pressed` on each button, full text `aria-label` on abbreviated labels

## 1.9.0

### Minor Changes

- 573cbaa: feat: improve mobile responsiveness

  - Reduce Gantt label column from 240px to 140px on screens < 640px
  - Reduce container padding on mobile (px-3 pt-6 vs px-6 pt-8)
  - Secondary actions (Settings, Export, Import, Examples) moved to a ··· dropdown on mobile

### Patch Changes

- 6738620: feat: add HTTP request logger to server via hono/logger

## 1.8.0

### Minor Changes

- 4531ffe: feat: add JSON import in team mode

### Patch Changes

- a511c44: feat: add /health route with DB connectivity check in team mode
- 87d95e2: chore: remove unused temporal-polyfill dependency

## 1.7.0

### Minor Changes

- 9dd6736: Migrate team mode from SQLite to PostgreSQL. The server now connects via `DATABASE_URL` (postgres tagged-template client). Docker Compose updated with postgres service and app profiles. README and CONTRIBUTING updated accordingly.

## 1.6.0

### Minor Changes

- c038ff0: Add team mode (collaborative) with SQLite backend and Playwright E2E tests

  - New team mode: SQLite storage, REST API with optimistic locking, real-time SSE sync
  - Authentication via shared token (session cookie)
  - OpenAPI spec + Swagger UI at `/api/docs`
  - Playwright E2E suite covering auth, roadmap/section/task CRUD, and multi-tab SSE sync

## 1.5.3

### Patch Changes

- 97e88ce: Replace Caddy with a Hono static file server (`server/`). Supports precompressed assets (br/zstd/gzip), immutable cache headers for versioned assets, and security headers.

## 1.5.2

### Patch Changes

- cc3b4d1: Move OG image to client/public for proper Vite static asset handling, update .gitignore accordingly.

## 1.5.1

### Patch Changes

- 9a2c12e: Add focus trap to all modals: Tab and Shift+Tab cycle through focusable elements without escaping the dialog.
- 7300e0d: Add SEO meta tags (title, description, Open Graph, Twitter card) and OG image to index.html.
- 16e5f26: Improve TaskModal accessibility: convert type/status buttons to radio inputs, associate external link label, add focus trap and programmatic focus on modal open.

## 1.5.0

### Minor Changes

- bbd95fd: Add landing page with hero, feature cards and examples to the empty state.

### Patch Changes

- 2fd70b4: Improve external link input styling in TaskModal: apply consistent dark theme and add a link icon prefix.
- c98a9fb: Reduce initial JS bundle by 73%: replace temporal-polyfill with native Date, switch to zod/mini, and lazy-load schemas and example JSONs.

## 1.4.2

### Patch Changes

- Fix release pipeline: use native changeset tag for automated versioning and Docker deployment.

## 1.4.1

### Patch Changes

- 7452838: Fix CI/CD release pipeline: add git user config for tag creation, fetch-depth 0 for changesets, and extract proper changelog from CHANGELOG.md for GitHub releases.

## 1.4.0

### Minor Changes

- 4102303: feat: add optional external link per task

  Tasks can now have an optional `externalLink` URL (Jira ticket, GitHub issue, Linear item, etc.).
  The link is displayed as a clickable icon in the Gantt left column and opens in a new tab.
  The field is validated as a URL on JSON import and editable via the task modal.

### Patch Changes

- fed62d2: refactor: replace manual error state with native HTML5 validation in TaskModal

  Use `required` on the name field and rely on the browser's built-in constraint validation instead of a custom error state.

## 1.3.0

### Minor Changes

- 7a78272: Add new status done for tasks

## 1.2.0

### Minor Changes

- b774570: Add footer with version number and GitHub link

## 1.1.0

### Minor Changes

- 64e4eb8: Add PNG export button for the Gantt chart
- 58d9486: Tasks within a section are now automatically sorted by ascending start date whenever a task is added or updated.

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
