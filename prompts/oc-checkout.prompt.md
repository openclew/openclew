---
description: "End-of-session summary — collect actions, propose logs, commit"
---

Run `npx openclew checkout` to collect git activity.

Then generate a structured summary:

1. List all actions from the session (features, fixes, refactors)
2. For each action, check: is it documented? is it committed?
3. Display a recap table
4. List refdocs related to the session — flag those that need updating
5. Propose creating logs for undocumented actions
6. Wait for user validation before committing

Format: use box-drawing tables, emoji status columns (5 chars wide), action column max 50 chars.

Closing message: concrete facts, compact emoji status per action, next steps.
