---
"@slashgear/roadmap-maker": minor
---

Improve colorblind accessibility for task status indicators

- Each task status now has a distinct visual pattern in addition to color (WCAG 1.4.1 — Use of Color)
  - `confirmed`: solid fill (unchanged)
  - `started`: diagonal stripes `/`
  - `pending`: diagonal stripes `\` + dashed border (previously solid)
  - `critical`: cross-hatch `#`
  - `done`: faded fill + solid border (unchanged)
- Milestone diamonds: `started` and `critical` get distinct borders to differentiate at small sizes
- Logic centralized in `getBarStyle()` and `getDiamondStyle()` helpers in `types.ts`, removing duplication across GanttChart, and both app legends