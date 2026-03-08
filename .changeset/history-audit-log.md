---
"@slashgear/roadmap-maker": minor
---

feat(team): add server-side audit log and history panel

- New `roadmap_events` table records every create/update/delete on roadmaps, sections, and tasks
- New `GET /api/roadmaps/:slug/history` endpoint returns events newest-first (limit up to 200)
- "History" entry in the "···" dropdown opens a slide-over panel listing all events with human-readable descriptions and timestamps
- 4 new vitest tests covering the history endpoint
