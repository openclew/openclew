/**
 * openclew new <title> — create a new living doc.
 */

const fs = require("fs");
const path = require("path");
const { livingContent, slugify } = require("./templates");
const { readConfig } = require("./config");

const args = process.argv.slice(2);
// Remove "new" command from args
const cmdIndex = args.indexOf("new");
const titleArgs = cmdIndex >= 0 ? args.slice(cmdIndex + 1) : args.slice(1);
const title = titleArgs.join(" ");

if (!title) {
  console.error('Usage: openclew new "Title of the document"');
  process.exit(1);
}

const projectRoot = process.cwd();
const docDir = path.join(projectRoot, "doc");
if (!fs.existsSync(docDir)) {
  console.error("No doc/ directory found. Run 'openclew init' first.");
  process.exit(1);
}
if (!readConfig(projectRoot)) {
  console.warn("Warning: no .openclew.json found. Run 'openclew init' first.");
}

const slug = slugify(title);
const filename = `_${slug}.md`;
const filepath = path.join(docDir, filename);

if (fs.existsSync(filepath)) {
  console.error(`File already exists: doc/${filename}`);
  process.exit(1);
}

fs.writeFileSync(filepath, livingContent(title), "utf-8");
console.log(`Created doc/${filename}`);
console.log("");
console.log("Next: open the file and fill in:");
console.log("  L1 — subject, status, keywords (so the index can find it)");
console.log("  L2 — objective + key points (what agents and humans need to know)");
console.log("  L3 — full details (only when needed)");
