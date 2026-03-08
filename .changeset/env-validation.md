---
"@slashgear/roadmap-maker": patch
---

Validate `AUTH_TOKEN` and `DATABASE_URL` at startup in postgres mode — server now exits immediately with a clear error listing all missing variables instead of failing later with a cryptic message.
