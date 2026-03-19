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
function exampleRefdocContent() {
  const date = today();
  const ver = ocVersion();
  return `openclew@${ver} · created: ${date} · updated: ${date} · type: Reference · status: Active · category: Architecture · keywords: [architecture, overview, components]

<!-- L1_START -->
**subject:** Architecture overview

**doc_brief:** High-level architecture of the project — components, data flow, key decisions.
<!-- L1_END -->

---

<!-- L2_START -->
# L2 - Summary

## Objective
Document the high-level architecture so new contributors and AI agents understand the system quickly.

## Key points
- Replace this with your actual architecture
- Describe the main components and how they interact
- Note key technical decisions and their rationale
<!-- L2_END -->

---

<!-- L3_START -->
# L3 - Details

<!-- Replace this with your actual architecture details -->

This is an example refdoc created by \`openclew init\`.
Edit it to document your project's architecture, or delete it and create your own.

---

## Changelog

| Date | Change |
|------|--------|
| ${date} | Created by openclew init (example) |
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

module.exports = {
  refdocContent,
  logContent,
  guideContent,
  exampleRefdocContent,
  exampleLogContent,
  slugify,
  slugifyLog,
  today,
};
