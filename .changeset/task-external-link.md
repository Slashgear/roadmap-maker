---
"@slashgear/roadmap-maker": minor
---

feat: add optional external link per task

Tasks can now have an optional `externalLink` URL (Jira ticket, GitHub issue, Linear item, etc.).
The link is displayed as a clickable icon in the Gantt left column and opens in a new tab.
The field is validated as a URL on JSON import and editable via the task modal.
