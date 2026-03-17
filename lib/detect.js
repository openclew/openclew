/**
 * Detect existing AI instruction files in the project root.
 * Returns an array of { tool, file, fullPath, isDir } objects.
 */

const fs = require("fs");
const path = require("path");

const INSTRUCTION_FILES = [
  { tool: "Claude Code", file: "CLAUDE.md" },
  { tool: "Cursor", file: ".cursorrules" },
  { tool: "Cursor", file: ".cursor/rules" },
  { tool: "GitHub Copilot", file: ".github/copilot-instructions.md" },
  { tool: "Windsurf", file: ".windsurfrules" },
  { tool: "Windsurf", file: ".windsurf/rules" },
  { tool: "Cline", file: ".clinerules" },
  { tool: "Codex / Gemini", file: "AGENTS.md" },
  { tool: "Antigravity", file: ".antigravity/rules.md" },
  { tool: "Gemini CLI", file: ".gemini/GEMINI.md" },
  { tool: "Aider", file: "CONVENTIONS.md" },
];

/**
 * Find AGENTS.md case-insensitively in projectRoot.
 * Returns the actual filename (e.g. "agents.md", "Agents.md") or null.
 */
function findAgentsMdCaseInsensitive(projectRoot) {
  try {
    const entries = fs.readdirSync(projectRoot);
    const match = entries.find(
      (e) => e.toLowerCase() === "agents.md" && fs.statSync(path.join(projectRoot, e)).isFile()
    );
    return match || null;
  } catch {
    return null;
  }
}

function detectInstructionFiles(projectRoot) {
  const found = [];
  const seenLower = new Set();

  for (const entry of INSTRUCTION_FILES) {
    // Skip AGENTS.md in the static list — handled by case-insensitive scan
    if (entry.file.toLowerCase() === "agents.md") continue;

    const fullPath = path.join(projectRoot, entry.file);
    if (fs.existsSync(fullPath)) {
      const stat = fs.statSync(fullPath);
      found.push({
        tool: entry.tool,
        file: entry.file,
        fullPath,
        isDir: stat.isDirectory(),
      });
      seenLower.add(entry.file.toLowerCase());
    }
  }

  // Case-insensitive AGENTS.md detection
  const agentsFile = findAgentsMdCaseInsensitive(projectRoot);
  if (agentsFile && !seenLower.has(agentsFile.toLowerCase())) {
    found.push({
      tool: "Codex / Gemini",
      file: agentsFile,
      fullPath: path.join(projectRoot, agentsFile),
      isDir: false,
    });
  }

  return found;
}

module.exports = { detectInstructionFiles, findAgentsMdCaseInsensitive, INSTRUCTION_FILES };
