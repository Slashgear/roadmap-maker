# @slashgear/roadmap-maker

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
