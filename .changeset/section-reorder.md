---
"@slashgear/roadmap-maker": minor
---

feat: add section reordering with ↑ ↓ buttons

- Up/down arrow buttons appear in each section header (no library, zero bundle cost)
- Static mode: instant local reorder
- Team mode: PUT /api/roadmaps/:slug/sections/reorder syncs order via SSE (sections_reordered event)
