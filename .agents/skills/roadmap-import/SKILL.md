---
name: roadmap-import
description: Generate a roadmap-maker JSON import file from CSV data or API exports (Jira, GitLab, Linear, Notion, etc.)
argument-hint: [paste CSV, JSON payload, or describe your data source]
---

# roadmap-import

Generate a valid JSON file ready to import into **roadmap-maker** from any structured data source: CSV, Jira, GitLab, Linear, Notion, or raw JSON.

## Schema reference

The output must match this exact structure:

```typescript
{
  id: string              // short unique id, e.g. "abc123"
  slug: string            // URL-safe identifier, e.g. "my-roadmap-q1"
  title: string
  subtitle?: string | null
  startDate: string       // "YYYY-MM-DD" — earliest task start
  endDate: string         // "YYYY-MM-DD" — latest task end
  sections: Section[]
}

Section {
  id: string
  roadmapId: string       // must match parent roadmap id
  label: string
  color: SectionColor     // see palette below
  position: number        // 0-based display order
  tasks: Task[]
}

Task {
  id: string
  sectionId: string       // must match parent section id
  label: string
  startDate: string       // "YYYY-MM-DD"
  endDate: string         // "YYYY-MM-DD"
  status: TaskStatus      // see values below
  type: "bar" | "milestone"
  note?: string           // optional free-text annotation
  position: number        // 0-based display order within section
}
```

**TaskStatus values:**
| Value | Meaning | Visual |
|-------|---------|--------|
| `confirmed` | Planned and confirmed | Solid green bar |
| `started` | Currently in progress | Solid blue bar |
| `pending` | On hold / unclear | Diagonal orange stripes |
| `critical` | Blocking / at risk | Solid red bar |
| `done` | Completed | Solid gray bar |

**SectionColor palette** (12 choices):
`orange` `purple` `cyan` `green` `pink` `blue` `amber` `indigo` `lime` `rose` `teal` `slate`

## Workflow

1. **Ask for the data source** if not provided as argument:
   - CSV paste (columns: label, start, end, section, status, type, note)
   - Jira JSON export or JQL query result
   - GitLab issues JSON (`/api/v4/issues`)
   - Linear export
   - Other — ask for a sample row to infer the mapping

2. **Identify field mappings** — show the mapping table to the user before generating:

   ```
   Source field      → Schema field
   ─────────────────────────────────
   summary / title   → task.label
   due_date          → task.endDate
   created_at        → task.startDate
   labels[0] / epic  → section.label
   status            → task.status (mapped, see below)
   milestone         → task.type = "milestone" if applicable
   description       → task.note (truncated to 200 chars)
   ```

3. **Map statuses** — ask the user to confirm uncertain mappings:
   - Jira: `Done` → `done`, `In Progress` → `started`, `To Do` / `Backlog` → `pending`, `Blocked` → `critical`
   - GitLab: `closed` → `done`, `opened` + label `doing` → `started`, `opened` → `pending`
   - Linear: `Done` / `Completed` → `done`, `In Progress` → `started`, `Todo` / `Backlog` → `pending`, `Blocked` / `Cancelled` → `critical`

4. **Group into sections** — use epic, label, milestone, or component as the grouping key. If no grouping exists, put everything in a single "Tasks" section.

5. **Assign colors** — cycle through the palette automatically. If the source has meaningful categories (Design, Tech, etc.) suggest semantic mappings.

6. **Generate the JSON** — compute `startDate`/`endDate` from min/max of all task dates. Generate short IDs (8 alphanumeric chars). Validate all dates are `YYYY-MM-DD`.

7. **Output** — write the JSON to a file (e.g. `roadmap-export.json`) in the current directory, ready to drag-and-drop into the roadmap-maker Import button.

## CSV format expected

Minimum viable CSV (column names are flexible, ask if ambiguous):

```csv
label,start,end,section,status,type,note
"Homepage redesign",2026-01-05,2026-01-19,Design,started,bar,"Waiting on brand assets"
"API migration",2026-01-12,2026-02-09,Tech,confirmed,bar,
"Go-live",2026-02-10,2026-02-10,Milestones,critical,milestone,
```

## Jira example mapping

Given a Jira issue object:

```json
{
  "key": "PROJ-42",
  "fields": {
    "summary": "Redesign checkout flow",
    "status": { "name": "In Progress" },
    "created": "2026-01-10T09:00:00Z",
    "duedate": "2026-02-14",
    "labels": ["design"],
    "components": [{ "name": "Frontend" }],
    "issuetype": { "name": "Story" },
    "description": "..."
  }
}
```

Maps to:

```json
{
  "id": "proj42xx",
  "sectionId": "<frontend-section-id>",
  "label": "Redesign checkout flow",
  "startDate": "2026-01-10",
  "endDate": "2026-02-14",
  "status": "started",
  "type": "bar",
  "note": "...",
  "position": 0
}
```

## GitLab example mapping

Given a GitLab issue (`/api/v4/projects/:id/issues`):

```json
{
  "title": "Fix CORS headers",
  "state": "opened",
  "created_at": "2026-01-15T08:00:00Z",
  "due_date": "2026-01-29",
  "milestone": { "title": "v2.1" },
  "labels": ["backend", "doing"]
}
```

Maps to:

```json
{
  "label": "Fix CORS headers",
  "startDate": "2026-01-15",
  "endDate": "2026-01-29",
  "status": "started",
  "type": "bar",
  "note": null,
  "position": 0
}
```

Section: milestone title → `"v2.1"`.

## Edge cases to handle

- **Missing end date** — use `startDate + 7 days` as fallback, warn the user
- **Missing start date** — use `endDate - 7 days` as fallback, warn the user
- **startDate > endDate** — swap them, warn the user
- **Milestone type** — if a task has identical start and end date, or is explicitly typed as milestone/epic, set `type: "milestone"`
- **Duplicate section names** — merge into one section
- **Too many sections** (> 12) — warn, suggest merging minor ones
- **Non-ISO dates** — convert common formats: `DD/MM/YYYY`, `MM/DD/YYYY`, `Jan 15 2026`, timestamps
