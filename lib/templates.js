/**
 * Template content for refdocs and logs.
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

function refdocContent(title) {
  const date = today();
  const ver = ocVersion();
  return `openclew@${ver} · created: ${date} · updated: ${date} · type: Reference · status: Active · category: · keywords: []

<!-- L1_START -->
**subject:** ${title}

**doc_brief:**
<!-- L1_END -->

---

<!-- L2_START -->
# L2 - Summary

## Objective
<!-- Why this document exists -->

## Key points
<!-- 3-5 essential takeaways -->
<!-- L2_END -->

---

<!-- L3_START -->
# L3 - Details

<!-- Full technical content -->

---

## Changelog

| Date | Change |
|------|--------|
| ${date} | Initial creation |
<!-- L3_END -->
`;
}

function logContent(title) {
  const date = today();
  const ver = ocVersion();
  return `openclew@${ver} · date: ${date} · type: Feature · status: In progress · category: · keywords: []

<!-- L1_START -->
**subject:** ${title}

**doc_brief:**
<!-- L1_END -->

---

<!-- L2_START -->
# L2 - Summary

## Objective
<!-- Why this work was undertaken -->

## Problem
<!-- What was observed -->

## Solution
<!-- How it was resolved -->
<!-- L2_END -->

---

<!-- L3_START -->
# L3 - Details

<!-- Technical details, code changes, debugging steps... -->
<!-- L3_END -->
`;
}

/**
 * Guide doc — always created by init.
 * This is what agents read to understand openclew.
 */
function guideContent() {
  const date = today();
  const ver = ocVersion();
  return `openclew@${ver} · created: ${date} · updated: ${date} · type: Guide · status: Active · category: Documentation · keywords: [openclew, L1, L2, L3, index, refdoc, log]

<!-- L1_START -->
**subject:** How openclew works

**doc_brief:** How openclew structures project knowledge in 3 levels (L1/L2/L3) so AI agents and humans navigate efficiently.
<!-- L1_END -->

---

<!-- L2_START -->
# L2 - Summary

## What is openclew?

openclew gives your project a structured memory that both humans and AI agents can navigate efficiently.

## Doc-first rule

Before starting any task, read \`doc/_INDEX.md\` to find docs related to the task. Read them before exploring code. This avoids reinventing what's already documented.

## Two types of docs

**Refdocs** (\`doc/_*.md\`): knowledge that evolves with the project.
Architecture decisions, conventions, known pitfalls — anything that stays relevant over time.
Naming: \`doc/_UPPER_SNAKE_CASE.md\` (e.g. \`doc/_AUTH_DESIGN.md\`)

**Logs** (\`doc/log/YYYY-MM-DD_*.md\`): frozen facts from a work session.
What happened, what was decided, what was tried. Never modified after the session.
Naming: \`doc/log/YYYY-MM-DD_lowercase-slug.md\` (e.g. \`doc/log/2026-01-15_setup-auth.md\`)

## Document structure

Every doc has a metadata line + 3 levels. Read only what you need:

**Line 1 — Metadata**: version, date, type, status, category, keywords. For indexing and triage.

**L1 — Subject + Brief** (~40 tokens): what the doc is about and what it concludes. Read this first to decide if the doc is relevant.

**L2 — Summary**: the essential context — objective, key points, decisions.

**L3 — Details**: full technical content. Only read when deep-diving.

## Index

\`doc/_INDEX.md\` is auto-generated from L1 metadata on every git commit (via a pre-commit hook).
Never edit it manually. To force a rebuild: \`openclew index\`
<!-- L2_END -->

---

<!-- L3_START -->
# L3 - Details

## Creating a refdoc

Create \`doc/_TITLE.md\` (uppercase snake_case) with this structure:

\`\`\`
openclew@${ver} · created: YYYY-MM-DD · updated: YYYY-MM-DD · type: Reference · status: Active · category: · keywords: []

<!-- L1_START -->
**subject:** Title

**doc_brief:**
<!-- L1_END -->

---

<!-- L2_START -->
# L2 - Summary
## Objective
## Key points
<!-- L2_END -->

---

<!-- L3_START -->
# L3 - Details
<!-- L3_END -->
\`\`\`

**When to create one:**
- A decision was made that others need to know (architecture, convention, API design)
- A pattern or pitfall keeps coming up
- You want an agent to know something at the start of every session

## Creating a log

Create \`doc/log/YYYY-MM-DD_slug.md\` (lowercase, hyphens) with this structure:

\`\`\`
openclew@${ver} · date: YYYY-MM-DD · type: Feature · status: In progress · category: · keywords: []

<!-- L1_START -->
**subject:** Title

**doc_brief:**
<!-- L1_END -->

---

<!-- L2_START -->
# L2 - Summary
## Objective
## Problem
## Solution
<!-- L2_END -->

---

<!-- L3_START -->
# L3 - Details
<!-- L3_END -->
\`\`\`

**When to create one:**
- End of a work session (what was done, what's left)
- A bug was investigated and resolved
- A spike or experiment was conducted

Logs are immutable — once the session ends, the log is never modified.

## How agents should use this

1. At session start: read the entry point file
2. Before any task: read \`doc/_INDEX.md\`, scan L1 metadata, identify relevant docs
3. Read L1 (subject + brief) of relevant docs to confirm relevance
4. Read L2 for context
5. Only read L3 when you need implementation details
6. After significant work: create or update refdocs and logs directly

The index (\`doc/_INDEX.md\`) auto-regenerates on every git commit. To force a rebuild: \`openclew index\`

---

## Changelog

| Date | Change |
|------|--------|
| ${date} | Created by openclew init |
<!-- L3_END -->
`;
}

/**
 * Example refdoc — shows what a filled-in doc looks like.
 */
function exampleRefdocContent(existingInstructions) {
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

  return `openclew@${ver} · created: ${date} · updated: ${date} · type: Reference · status: Active · category: Architecture · keywords: [architecture, overview, components]

<!-- L1_START -->
**subject:** Architecture overview

**doc_brief:** <!-- ONE LINE: What does this project do, what's the main stack, how is it deployed? -->
<!-- L1_END -->

---

<!-- L2_START -->
# L2 - Summary

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
<!-- L2_END -->

---

<!-- L3_START -->
# L3 - Details

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
<!-- L3_END -->
`;
}

/**
 * Example log — shows what a filled-in log looks like.
 */
function exampleLogContent() {
  const date = today();
  const ver = ocVersion();
  return `openclew@${ver} · date: ${date} · type: Feature · status: Done · category: Tooling · keywords: [openclew, setup, documentation]

<!-- L1_START -->
**subject:** Set up openclew

**doc_brief:** Initialized openclew for structured project knowledge. Created doc/ structure, git hook, guide, and example docs.
<!-- L1_END -->

---

<!-- L2_START -->
# L2 - Summary

## Objective
Set up structured documentation so AI agents and new contributors can navigate project knowledge efficiently.

## Problem
Project knowledge was scattered — README, inline comments, tribal knowledge. Each new AI session started from zero.

## Solution
Installed openclew. Every doc now has a metadata line (for triage) + L1 (subject and brief), L2 (summary for context), L3 (details when needed).
The index auto-regenerates on each commit via a git hook.
<!-- L2_END -->

---

<!-- L3_START -->
# L3 - Details

This log was created by \`openclew init\`.
It shows what a filled-in log looks like. Logs are immutable — once the session ends, the log is frozen.
For evolving knowledge, use refdocs (\`doc/_*.md\`).
<!-- L3_END -->
`;
}

/**
 * Framework integration guide — created by init alongside the main guide.
 * Explains how openclew works with workflow frameworks (BMAD, Spec Kit, Kiro...).
 */
function frameworkIntegrationContent() {
  const date = today();
  const ver = ocVersion();
  return `openclew@${ver} · created: ${date} · updated: ${date} · type: Guide · status: Active · category: Integration · keywords: [BMAD, Spec Kit, Kiro, workflow, framework, integration]

<!-- L1_START -->
**subject:** How to use openclew with workflow frameworks (BMAD, Spec Kit, Kiro...)

**doc_brief:** openclew handles knowledge, your framework handles process. Covers concrete use cases, integration patterns, and what goes where. Works with any spec-driven methodology.
<!-- L1_END -->

---

<!-- L2_START -->
# L2 - Summary

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

**With openclew:** The PRD is persisted as \`doc/_PRD_AUTH.md\` (L1 scannable). The agent scans the index at session start and finds it automatically.

### UC2 — Sprint decisions lost

Three stories completed in a sprint. Decisions were made (API design, tradeoffs, rejected approaches). They live in chat history — gone.

**With openclew:** Each completed story produces a log (\`doc/log/YYYY-MM-DD_story-auth-flow.md\`). Immutable. When the project resumes, the agent sees what was decided and why.

### UC3 — Retrospective lessons not reused

Your framework runs a retro. Lessons are identified. They go into an output file that nobody reads again.

**With openclew:** Lessons go into \`doc/_LESSONS_LEARNED.md\` — a living refdoc, updated after each retro. Future sprints consult it automatically via the index.

### UC4 — New teammate onboarding

A new developer (or a new agent session) joins mid-project. No context.

**With openclew:** Read \`doc/_INDEX.md\` → scan L1s → read L2s of relevant docs → full context in minutes. Same docs for humans and agents.

### UC5 — Framework needs project context

Your framework's agents (PM, Architect, Dev) start from generic prompts. They don't know your project's conventions, architecture, or past decisions.

**With openclew:** Point your framework's knowledge config at \`doc/\`. Agents read refdocs as context before producing artifacts.

<!-- L2_END -->

---

<!-- L3_START -->
# L3 - Details

## Integration pattern

\`\`\`
Framework (process)              openclew (knowledge)
───────────────────              ────────────────────
Create PRD            →          Save as doc/_PRD_FEATURE.md
Architecture design   →          Save as doc/_ARCHITECTURE.md
Sprint planning       →          Log as doc/log/YYYY-MM-DD_sprint-N.md
Story completed       →          Log as doc/log/YYYY-MM-DD_story-ID.md
Retrospective         →          Update doc/_LESSONS_LEARNED.md
───────────────────              ────────────────────
Next sprint starts    ←          Agent reads index, finds all of the above
\`\`\`

## Mapping: framework artifacts → openclew docs

| Framework artifact | openclew type | Naming | Mutability |
|--------------------|---------------|--------|------------|
| PRD | Refdoc | \`doc/_PRD_FEATURE.md\` | Updated as requirements evolve |
| Architecture decision | Refdoc | \`doc/_ARCHITECTURE.md\` | Updated as design evolves |
| Sprint plan | Log | \`doc/log/YYYY-MM-DD_sprint-N.md\` | Frozen (snapshot of the plan) |
| Completed story | Log | \`doc/log/YYYY-MM-DD_story-ID.md\` | Frozen (what was done) |
| Retrospective | Log + Refdoc | Log for the session, refdoc for accumulated lessons | Log frozen, refdoc updated |
| Tech spec | Refdoc | \`doc/_SPEC_FEATURE.md\` | Updated until implemented |

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
<!-- L3_END -->
`;
}

module.exports = {
  refdocContent,
  logContent,
  guideContent,
  frameworkIntegrationContent,
  exampleRefdocContent,
  exampleLogContent,
  slugify,
  slugifyLog,
  today,
};
