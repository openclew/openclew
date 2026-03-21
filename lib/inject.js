/**
 * Inject openclew block into an existing instruction file.
 */

const fs = require("fs");

const OPENCLEW_BLOCK = `
## Project knowledge (openclew)

This project uses \`doc/\` as its knowledge base. Before starting any task:

1. **Read \`doc/_INDEX.md\`** — it lists all available docs with a one-line summary each
2. **Pick your reference doc(s)** — choose one or more docs relevant to what you're about to do
3. **Read them** (L1 for relevance, L2 for context) — then start working

If a doc contains placeholder comments (\`<!-- ... -->\`), fill them in based on what you observe in the code. This is expected — the docs are meant to be written by you.

Two types of docs:
- **Refdocs** (\`doc/_*.md\`) — architecture, conventions, decisions (evolve over time)
- **Logs** (\`doc/log/YYYY-MM-DD_*.md\`) — frozen facts from past sessions

Each doc has 3 levels: **L1** (subject + brief — 1 line) → **L2** (summary) → **L3** (full details, only when needed).

**Creating docs:** run \`npx openclew new "Title"\` (refdoc) or \`npx openclew log "Title"\` (session log). This generates a correctly formatted file in \`doc/\`.
`.trim();

const MARKER_START = "<!-- openclew_START -->";
const MARKER_END = "<!-- openclew_END -->";

function isAlreadyInjected(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  return content.includes(MARKER_START);
}

function inject(filePath) {
  if (isAlreadyInjected(filePath)) {
    return false;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const block = `\n\n${MARKER_START}\n${OPENCLEW_BLOCK}\n${MARKER_END}\n`;
  fs.writeFileSync(filePath, content + block, "utf-8");
  return true;
}

module.exports = { inject, isAlreadyInjected, OPENCLEW_BLOCK, MARKER_START };
