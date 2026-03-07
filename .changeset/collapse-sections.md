---
"@slashgear/roadmap-maker": minor
---

Add collapsible sections to the Gantt chart

- Each section header now has a chevron toggle button to collapse/expand its task rows
- Collapsed sections show a task count badge `(N)` next to the section label
- Chevron rotates 90° with a CSS transition to indicate state
- Fully accessible: `aria-expanded` on the toggle button, descriptive `aria-label` on both buttons
- Section header restructured from a single button to a `<div>` with two separate buttons (chevron + edit label) to avoid invalid nested `<button>` HTML