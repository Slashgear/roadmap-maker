---
"@slashgear/roadmap-maker": patch
---

refactor: replace manual error state with native HTML5 validation in TaskModal

Use `required` on the name field and rely on the browser's built-in constraint validation instead of a custom error state.
