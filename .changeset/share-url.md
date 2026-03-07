---
"@slashgear/roadmap-maker": minor
---

Add URL sharing for static mode

- "Copy link" button generates a shareable URL with the roadmap encoded via lz-string
- Opening a shared URL silently imports the roadmap into localStorage and cleans the URL
- lz-string is loaded lazily (dynamic import) — zero cost when the feature is not used