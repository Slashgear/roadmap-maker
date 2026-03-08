---
"@slashgear/roadmap-maker": patch
---

Fix N+1 query pattern when loading a roadmap — tasks for all sections are now fetched in a single `WHERE section_id = ANY(...)` query instead of one query per section.
