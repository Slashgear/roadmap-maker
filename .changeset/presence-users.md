---
"@slashgear/roadmap-maker": minor
---

Add real-time user presence in team mode

- Each user who opens a roadmap appears as a colored avatar in the toolbar
- Display name is set on the login screen (optional, persisted to localStorage)
- A stable client ID is generated once per browser session (localStorage) and used as a deterministic color seed
- Presence is tracked server-side via the existing SSE connection — no separate heartbeat needed; connect = join, disconnect = leave
- Server broadcasts `presence_updated` to all viewers of the roadmap on every join/leave
- Current user's avatar has a colored ring to distinguish them from others
- Up to 4 avatars shown; overflow shown as `+N`