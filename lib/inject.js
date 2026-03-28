/**
 * Inject openclew block into an existing instruction file.
 */

const fs = require("fs");

const OPENCLEW_BLOCK = `
## Project knowledge (openclew)

This project uses \`doc/\` as its knowledge base.

### Before any task

1. **Read \`doc/_INDEX.md\`** — lists all docs with a one-line summary
2. **Pick reference doc(s)** relevant to what you're about to do
3. **Read them** (L1 for relevance, L2 for context) — then start working

### Critical rules

- **No matching doc? Propose creating one.** Suggest \`npx openclew new "Title"\` to capture key information before writing code. Let the user decide.
- **Missing information? Ask, don't guess.** If the task requires knowledge outside this project (another repo, another service, external docs), ask the user for the path or URL. Do not invent an answer.
- **Keep responses short.** Propose a plan, don't dump hundreds of lines. If the task is large, break it into steps and confirm with the user before proceeding.

### Doc types

- **Refdocs** (\`doc/_*.md\`) — architecture, conventions, decisions (evolve over time)
- **Logs** (\`doc/log/YYYY-MM-DD_*.md\`) — frozen facts from past sessions

Each doc has 3 levels: **L1** (subject + brief) → **L2** (summary) → **L3** (full details, only when needed).

If a doc contains placeholder comments (\`<!-- ... -->\`), fill them in based on what you observe. The docs are meant to be written by you.

### Session commands

- "peek" → \`npx openclew peek\`
- "checkout" → \`npx openclew checkout\`
- "new doc about X" → \`npx openclew new "X"\`
- "search X" → \`npx openclew search "X"\`
- "doc status" → \`npx openclew status\`
`.trim();

const MARKER_START = "<!-- openclew_START -->";
const MARKER_END = "<!-- openclew_END -->";

function isAlreadyInjected(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  return content.includes(MARKER_START);
}

function inject(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const block = `${MARKER_START}\n${OPENCLEW_BLOCK}\n${MARKER_END}`;

  if (isAlreadyInjected(filePath)) {
    // Replace existing block with updated version
    const regex = new RegExp(
      `${MARKER_START}[\\s\\S]*?${MARKER_END}`,
      "g"
    );
    const updated = content.replace(regex, block);
    if (updated !== content) {
      fs.writeFileSync(filePath, updated, "utf-8");
      return "updated";
    }
    return false;
  }

  fs.writeFileSync(filePath, content + `\n\n${block}\n`, "utf-8");
  return "created";
}

module.exports = { inject, isAlreadyInjected, OPENCLEW_BLOCK, MARKER_START };
