clw_ref@{{VER}} · created: {{DATE}} · updated: {{DATE}} · doc_version: 1.0.0 · type: Reference · status: Active · category: Architecture · keywords: [architecture, overview, components]

- **subject:** Architecture overview
- **doc_brief:** <!-- ONE LINE: What does this project do, what's the main stack, how is it deployed? -->

---

# Summary

{{SEED_SECTION}}## What this project does
<!-- 1-2 sentences. What problem does it solve? Who uses it? -->

## Stack
<!-- List the main technologies: language, framework, database, key libraries. -->

## How it's organized
<!-- Describe the main directories and what lives where. e.g.:
- src/routes/ — API endpoints
- src/services/ — business logic
- src/models/ — database models
-->

## Key decisions
<!-- List 2-5 architectural choices that someone new needs to know. e.g.:
- Auth via JWT (not sessions) because the API is stateless
- PostgreSQL over MongoDB because we need relational queries
- All validation happens in middleware, not in route handlers
-->

---

# Details

## Data flow
<!-- How does a request travel through the system? e.g.:
Client → route → middleware (auth, validation) → service → repository → DB
-->

## External dependencies
<!-- APIs, services, or systems this project talks to. -->

## How to run
<!-- Commands to start the project locally. e.g.:
npm install && npm run dev
-->

## Known constraints
<!-- Limits, technical debt, or things that don't scale. -->

---

## Changelog

| Date | Change |
|------|--------|
| {{DATE}} | Created by openclew init — fill this in! |
