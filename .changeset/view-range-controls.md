---
"@slashgear/roadmap-maker": minor
---

Add timeline zoom presets (1M, 3M, 6M, 1Y) and skip link to date range controls

- New `ViewRangeControls` component replacing duplicated view range blocks in App and AppTeam
- Segmented control with 1M / 3M / 6M / 1Y presets that set the view window from today
- Active preset highlighted; deselected automatically when dates are changed manually
- Skip link "Skip to date range" added alongside the existing "Skip to chart" link
- Accessible: `role="group"` + `aria-label` on preset group, `aria-pressed` on each button, full text `aria-label` on abbreviated labels