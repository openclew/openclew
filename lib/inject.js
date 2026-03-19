/**
 * Inject openclew block into an existing instruction file.
 */

const fs = require("fs");

const OPENCLEW_BLOCK = `
## Project knowledge (openclew)

This file is the **entry point** for project documentation.

**Doc-first rule:** before any task, read \`doc/_INDEX.md\` to find docs related to the task. Read them before exploring code.

Two types of docs in \`doc/\`:
- **Refdocs** (\`doc/_*.md\`) — evolve with the project (architecture, conventions, decisions)
- **Logs** (\`doc/log/YYYY-MM-DD_*.md\`) — frozen facts from a session, never modified after

Each doc has 3 levels: **L1** (metadata — read first to decide relevance) → **L2** (summary) → **L3** (full details, only when needed).

**Creating docs:** when a decision, convention, or significant event needs to be captured, create the file directly following the format in \`doc/_USING_OPENCLEW.md\`.
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
