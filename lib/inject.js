/**
 * Inject openclew block into an existing instruction file.
 */

const fs = require("fs");

const OPENCLEW_BLOCK = `
## Project knowledge (openclew)

This project uses \`doc/\` as its knowledge base.

### Doc types

- **Refs** (\`doc/ref/*.md\` or \`doc/_*.md\`) — architecture, conventions, decisions (evolve over time)
- **Logs** (\`doc/log/YYYY-MM-DD_*.md\`) — frozen facts from past sessions

Each doc has 3 levels: **L1** (subject + brief) → **L2** (summary) → **L3** (full details, only when needed). Read L1 first to decide relevance, then go deeper.

### Task tracking

If a \`TODO.md\` exists at the project root, use it to track tasks. Format: simple checkboxes.
- \`- [ ]\` = pending, \`- [x]\` = done (add date: \`(YYYY-MM-DD)\`)
- Completed items older than 7 days are auto-purged

### Rules

- **No matching doc? Propose creating a ref** — suggest \`npx openclew add ref "Title"\` to capture key information before writing code. Logs are for end-of-session summaries only.
- **Missing information? Ask, don't guess.** If the task requires knowledge beyond this project, ask the user.
- **Format is mandatory.** Use \`npx openclew add ref\` or \`npx openclew add log\` to create docs — never from scratch.
- **Keep responses short.** Break large tasks into steps and confirm before proceeding.

### Commands

If an openclew MCP server is connected, prefer tool calls (\`list_docs\`, \`read_doc\`, \`search_docs\`). Otherwise use CLI:

- \`npx openclew peek\` — list all docs with subject and status
- \`npx openclew search "query"\` — search docs by keyword
- \`npx openclew add ref "Title"\` — create a ref
- \`npx openclew add log "Title"\` — create a session log
- \`npx openclew checkout\` — end-of-session summary
- \`npx openclew status\` — documentation health dashboard

### IMPORTANT — Start of every conversation

You MUST do this before ANY task, no exceptions:

1. **List docs** — call \`list_docs\` (MCP) or run \`npx openclew peek\`
2. **Pick** — identify which refs relate to the user's request
3. **Read** — read the relevant docs (L1 for quick scan, L2 for context)
4. **Only then** — start working

Skipping this step means you will miss architecture decisions, known pitfalls, and conventions — and produce wrong or redundant work.
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
