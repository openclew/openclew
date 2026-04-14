/**
 * Template content for refs and logs.
 * Embedded here so the CLI works standalone without needing to locate template files.
 */

const path = require("path");

function today() {
  return new Date().toISOString().slice(0, 10);
}

function slugify(title) {
  return title
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function slugifyLog(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function ocVersion() {
  try {
    const pkg = require(path.join(__dirname, "..", "package.json"));
    return pkg.version;
  } catch {
    return "0.0.0";
  }
}

function refContent(title) {
  const date = today();
  const ver = ocVersion();
  return `clw_ref@${ver} · created: ${date} · updated: ${date} · type: Reference · status: Active · category: · keywords: []

- **subject:** ${title}
- **doc_brief:**

---

# Summary

## Objective
<!-- Why this document exists -->

## Key points
<!-- 3-5 essential takeaways -->

---

# Details

<!-- Full technical content -->

---

## Changelog

| Date | Change |
|------|--------|
| ${date} | Initial creation |
`;
}

function logContent(title) {
  const date = today();
  const ver = ocVersion();
  return `clw_log@${ver} · date: ${date} · type: Feature · status: In progress · category: · keywords: []

- **subject:** ${title}
- **doc_brief:**

---

# Summary

## Objective
<!-- Why this work was undertaken -->

## Problem
<!-- What was observed -->

## Solution
<!-- How it was resolved -->

---

# Details

<!-- Technical details, code changes, debugging steps... -->
`;
}

/**
 * Guide doc — always created by init.
 * This is what agents read to understand openclew.
 */
function guideContent() {
  const date = today();
  const ver = ocVersion();
  return `clw_ref@${ver} · created: ${date} · updated: ${date} · type: Guide · status: Active · category: Documentation · keywords: [openclew, L1, L2, L3, index, ref, log]

- **subject:** How openclew works
- **doc_brief:** How openclew structures project knowledge in 3 levels (L1/L2/L3) so AI agents and humans navigate efficiently.

---

# Summary

## What is openclew?

openclew gives your project a structured memory that both humans and AI agents can navigate efficiently.

## Doc-first rule

Before starting any task, run \`openclew peek\` to list all docs with their subject and status. Pick relevant ones, read them before exploring code. This avoids reinventing what's already documented.

## Two types of docs

**Refs** (\`doc/ref/*.md\`): knowledge that evolves with the project.
Architecture decisions, conventions, known pitfalls — anything that stays relevant over time.
Naming: \`doc/ref/UPPER_SNAKE_CASE.md\` (e.g. \`doc/ref/AUTH_DESIGN.md\`)

**Logs** (\`doc/log/YYYY-MM-DD_*.md\`): frozen facts from a work session.
What happened, what was decided, what was tried. Never modified after the session.
Naming: \`doc/log/YYYY-MM-DD_lowercase-slug.md\` (e.g. \`doc/log/2026-01-15_setup-auth.md\`)

## Document structure

Every doc has a metadata line + 3 levels. Read only what you need:

**Line 1 — Metadata**: version, date, type, status, category, keywords. For indexing and triage.

**L1 — Subject + Brief** (~40 tokens): what the doc is about and what it concludes. Read this first to decide if the doc is relevant.

**L2 — Summary**: the essential context — objective, key points, decisions.

**L3 — Details**: full technical content. Only read when deep-diving.

## Discovering docs

Run \`openclew peek\` to list all docs, or \`openclew search "query"\` to find docs by keyword. Both scan \`doc/\` dynamically — no index file needed.

An optional \`doc/_INDEX.md\` can be generated with \`openclew index\` for human browsing (e.g. on GitHub), but agents should use \`peek\` or \`search\` instead.

## Using with OpenClaw (or any agent framework)

openclew handles **project knowledge** — what your project knows, what was decided, what happened.
Agent frameworks (OpenClaw, Claude Code, Cursor, etc.) handle **agent behavior** — identity, tools, memory.

They work together:
- Your framework's workspace memory (\`MEMORY.md\`, \`SOUL.md\`, etc.) = agent-level, cross-project
- openclew's \`doc/\` = project-level, shared across all agents and sessions

openclew injects into your project's instruction file (AGENTS.md, CLAUDE.md, .cursorrules, etc.) — it doesn't replace or conflict with your framework's configuration.

---

# Details

## Creating a ref

Create \`doc/ref/TITLE.md\` (uppercase snake_case) with this structure:

\`\`\`
clw_ref@${ver} · created: YYYY-MM-DD · updated: YYYY-MM-DD · type: Reference · status: Active · category: · keywords: []

- **subject:** Title
- **doc_brief:**

---

# Summary
## Objective
## Key points

---

# Details
\`\`\`

**When to create one:**
- A decision was made that others need to know (architecture, convention, API design)
- A pattern or pitfall keeps coming up
- You want an agent to know something at the start of every session

## Creating a log

Create \`doc/log/YYYY-MM-DD_slug.md\` (lowercase, hyphens) with this structure:

\`\`\`
clw_log@${ver} · date: YYYY-MM-DD · type: Feature · status: In progress · category: · keywords: []

- **subject:** Title
- **doc_brief:**

---

# Summary
## Objective
## Problem
## Solution

---

# Details
\`\`\`

**When to create one:**
- End of a work session (what was done, what's left)
- A bug was investigated and resolved
- A spike or experiment was conducted

Logs are immutable — once the session ends, the log is never modified.

## How agents should use this

1. At session start: read the entry point file
2. Before any task: run \`openclew peek\` to list all docs, identify relevant ones
3. Read L1 (subject + brief) of relevant docs to confirm relevance
4. Read L2 for context
5. Only read L3 when you need implementation details
6. After significant work: propose creating or updating a ref. Logs are only for end-of-session wrap-up — never create a log as a first action

---

## Changelog

| Date | Change |
|------|--------|
| ${date} | Created by openclew init |
`;
}

/**
 * Example ref — shows what a filled-in doc looks like.
 */
function exampleRefContent(existingInstructions) {
  const date = today();
  const ver = ocVersion();

  // Strip openclew block from existing instructions to avoid duplication
  let seedContent = "";
  if (existingInstructions) {
    seedContent = existingInstructions
      .replace(/<!--\s*openclew_START\s*-->[\s\S]*?<!--\s*openclew_END\s*-->/g, "")
      .trim();
  }

  const seedSection = seedContent
    ? `## From existing project instructions

${seedContent}

## What to do next
<!-- Review the above (imported from your instruction file) and reorganize into the sections below. Then delete this section. -->

`
    : "";

  return `clw_ref@${ver} · created: ${date} · updated: ${date} · type: Reference · status: Active · category: Architecture · keywords: [architecture, overview, components]

- **subject:** Architecture overview
- **doc_brief:** <!-- ONE LINE: What does this project do, what's the main stack, how is it deployed? -->

---

# Summary

${seedSection}## What this project does
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
| ${date} | Created by openclew init — fill this in! |
`;
}

/**
 * Example log — shows what a filled-in log looks like.
 */
function exampleLogContent() {
  const date = today();
  const ver = ocVersion();
  return `clw_log@${ver} · date: ${date} · type: Doc · status: Done · category: Setup · keywords: [openclew, init, first-log]

- **subject:** First session — openclew setup
- **doc_brief:** This is your first log. It was created by \`openclew init\` to show the format. Edit it to describe what you actually did today, then create a real one with \`npx openclew add log "title"\`.

---

# Summary

## What happened
<!-- Replace this with what you actually worked on today. Example:
- Set up openclew, filled in doc/ref/ARCHITECTURE.md with our project stack
- Created first real log about the auth refactor
-->

## What I learned
<!-- Anything surprising or worth remembering. Example:
- The L1 brief is the most important part — it's what you'll scan next time
- Logs are frozen (immutable), refs evolve over time
-->

---

# Details

## How this works

A log captures what happened in one session. It's frozen — you never edit it later.

For knowledge that evolves (architecture, conventions, decisions), use refs:
\`npx openclew add ref "Title"\`

Each doc has 4 layers:
- **Metadata** (line 1) — for machines and indexing
- **L1** (subject + brief) — the clew: grasp any doc at a glance
- **L2** (summary) — enough context for most decisions
- **L3** (details) — full content, only when needed

Your agent reads the L1s to decide what's relevant, then dives deeper only where needed.
`;
}

/**
 * Framework integration guide — created by init alongside the main guide.
 * Explains how openclew works with workflow frameworks (BMAD, Spec Kit, Kiro...).
 */
function frameworkIntegrationContent() {
  const date = today();
  const ver = ocVersion();
  return `clw_ref@${ver} · created: ${date} · updated: ${date} · type: Guide · status: Active · category: Integration · keywords: [BMAD, Spec Kit, Kiro, workflow, framework, integration]

- **subject:** How to use openclew with workflow frameworks (BMAD, Spec Kit, Kiro...)
- **doc_brief:** openclew handles knowledge, your framework handles process. Covers concrete use cases, integration patterns, and what goes where. Works with any spec-driven methodology.

---

# Summary

## The split

Workflow frameworks (BMAD, Spec Kit, Kiro...) solve: *"my agent doesn't follow a process."*
openclew solves: *"my agent forgets everything between sessions."*

They're complementary. Use both.

| Your framework does | openclew does |
|---------------------|---------------|
| Structures the workflow (who does what, in what order) | Structures the knowledge (what to remember, where to find it) |
| Produces artifacts (PRD, architecture, stories, retro) | Persists them so they're found automatically next session |
| Scoped to one sprint/feature | Scoped to the lifetime of the codebase |

## Use cases

### UC1 — PRD forgotten after creation

You create a PRD with your framework. Two weeks later, a new session starts. The agent doesn't know the PRD exists.

**With openclew:** The PRD is persisted as \`doc/ref/PRD_AUTH.md\` (L1 scannable). The agent scans the index at session start and finds it automatically.

### UC2 — Sprint decisions lost

Three stories completed in a sprint. Decisions were made (API design, tradeoffs, rejected approaches). They live in chat history — gone.

**With openclew:** Each completed story produces a log (\`doc/log/YYYY-MM-DD_story-auth-flow.md\`). Immutable. When the project resumes, the agent sees what was decided and why.

### UC3 — Retrospective lessons not reused

Your framework runs a retro. Lessons are identified. They go into an output file that nobody reads again.

**With openclew:** Lessons go into \`doc/ref/LESSONS_LEARNED.md\` — a living ref, updated after each retro. Future sprints consult it automatically via the index.

### UC4 — New teammate onboarding

A new developer (or a new agent session) joins mid-project. No context.

**With openclew:** Run \`openclew peek\` → scan L1s → read L2s of relevant docs → full context in minutes. Same docs for humans and agents.

### UC5 — Framework needs project context

Your framework's agents (PM, Architect, Dev) start from generic prompts. They don't know your project's conventions, architecture, or past decisions.

**With openclew:** Point your framework's knowledge config at \`doc/\`. Agents read refs as context before producing artifacts.

---

# Details

## Integration pattern

\`\`\`
Framework (process)              openclew (knowledge)
───────────────────              ────────────────────
Create PRD            →          Save as doc/ref/PRD_FEATURE.md
Architecture design   →          Save as doc/ref/ARCHITECTURE.md
Sprint planning       →          Log as doc/log/YYYY-MM-DD_sprint-N.md
Story completed       →          Log as doc/log/YYYY-MM-DD_story-ID.md
Retrospective         →          Update doc/ref/LESSONS_LEARNED.md
───────────────────              ────────────────────
Next sprint starts    ←          Agent reads index, finds all of the above
\`\`\`

## Mapping: framework artifacts → openclew docs

| Framework artifact | openclew type | Naming | Mutability |
|--------------------|---------------|--------|------------|
| PRD | Ref | \`doc/ref/PRD_FEATURE.md\` | Updated as requirements evolve |
| Architecture decision | Ref | \`doc/ref/ARCHITECTURE.md\` | Updated as design evolves |
| Sprint plan | Log | \`doc/log/YYYY-MM-DD_sprint-N.md\` | Frozen (snapshot of the plan) |
| Completed story | Log | \`doc/log/YYYY-MM-DD_story-ID.md\` | Frozen (what was done) |
| Retrospective | Log + Ref | Log for the session, ref for accumulated lessons | Log frozen, ref updated |
| Tech spec | Ref | \`doc/ref/SPEC_FEATURE.md\` | Updated until implemented |

## BMAD-specific integration

BMAD uses a \`project_knowledge\` config that points agents to project context. Point it at \`doc/\`:

\`\`\`yaml
# _bmad/bmm/config.yaml
project_knowledge: doc/
\`\`\`

BMAD agents (PM, Architect, Dev, QA) will read openclew docs as context before producing artifacts.

## What openclew does NOT do

- Does not replace your framework's workflow or personas
- Does not impose a development process
- Does not require any specific framework — works standalone

---

## Changelog

| Date | Change |
|------|--------|
| ${date} | Created by openclew init |
`;
}

/**
 * TODO template — created by init at project root.
 * Simple checkbox format, no metadata line.
 */
function todoContent() {
  return `# TODO

- [ ] **Example task** : Replace this with your first real task
`;
}

module.exports = {
  refContent,
  logContent,
  guideContent,
  frameworkIntegrationContent,
  exampleRefContent,
  exampleLogContent,
  todoContent,
  slugify,
  slugifyLog,
  today,
  ocVersion,
};
