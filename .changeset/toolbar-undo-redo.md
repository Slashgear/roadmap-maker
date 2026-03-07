---
"@slashgear/roadmap-maker": minor
---

Refactor toolbar and add undo/redo for static mode

- Unified `···` dropdown replaces the duplicated desktop/mobile action blocks
- Dropdown groups: settings, copy link / exports / import / examples — with separators
- Escape key closes the dropdown
- Undo (Ctrl+Z / ⌘Z) and Redo (Ctrl+Y / ⌘Y / ⌘⇧Z) with up to 50 history entries
- Undo/Redo buttons show visible text label alongside decorative icon (accessible)
- `Btn` component now supports `disabled`, `title`, and `aria-label` props