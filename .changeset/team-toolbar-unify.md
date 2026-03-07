---
"@slashgear/roadmap-maker": patch
---

Unify team mode toolbar to use a single dropdown menu

Replace the separate desktop (`hidden sm:flex`) and mobile (`sm:hidden`) action blocks
with a single `···` dropdown (same pattern as static mode), using `DropdownItem` and
`DropdownSeparator` components. Adds Escape key support to close the menu.