/**
 * Inject openclew block into an existing instruction file.
 */

const fs = require("fs");
const path = require("path");

// SSOT: templates/embedded/inject-block.md (shared with the Rust port)
const OPENCLEW_BLOCK = fs
  .readFileSync(path.join(__dirname, "..", "templates", "embedded", "inject-block.md"), "utf-8")
  .trim();

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
