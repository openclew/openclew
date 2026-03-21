/**
 * openclew log <title> — create a new session log.
 */

const fs = require("fs");
const path = require("path");
const { logContent, slugifyLog, today } = require("./templates");
const { readConfig } = require("./config");

const args = process.argv.slice(2);
// Support both "add log <title>" and legacy "log <title>"
const logIndex = args.lastIndexOf("log");
const titleArgs = logIndex >= 0 ? args.slice(logIndex + 1) : args.slice(1);
const title = titleArgs.join(" ");

if (!title) {
  console.error('Usage: openclew add log "Title of the log"');
  process.exit(1);
}

const projectRoot = process.cwd();
const logDir = path.join(projectRoot, "doc", "log");
if (!fs.existsSync(logDir)) {
  console.error("No doc/log/ directory found. Run 'openclew init' first.");
  process.exit(1);
}
if (!readConfig(projectRoot)) {
  console.warn("Warning: no .openclew.json found. Run 'openclew init' first.");
}

const slug = slugifyLog(title);
const date = today();
const filename = `${date}_${slug}.md`;
const filepath = path.join(logDir, filename);

if (fs.existsSync(filepath)) {
  console.error(`File already exists: doc/log/${filename}`);
  process.exit(1);
}

fs.writeFileSync(filepath, logContent(title), "utf-8");
console.log(`Created doc/log/${filename}`);
console.log("");
console.log("Next: open the file and fill in:");
console.log("  L1 — subject + doc_brief (what happened in 1-2 sentences)");
console.log("  L2 — problem + solution (the facts, frozen after this session)");
console.log("");
console.log("Logs are immutable — once written, never modified.");
