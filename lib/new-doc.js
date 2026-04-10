/**
 * openclew new <title> — create a new refdoc.
 */

const fs = require("fs");
const path = require("path");
const { refdocContent, slugify } = require("./templates");
const { readConfig } = require("./config");

const args = process.argv.slice(2);
// Support both "add ref <title>" and legacy "new <title>"
const refIndex = args.indexOf("ref");
const newIndex = args.indexOf("new");
let titleArgs;
if (refIndex >= 0) {
  titleArgs = args.slice(refIndex + 1);
} else if (newIndex >= 0) {
  titleArgs = args.slice(newIndex + 1);
} else {
  titleArgs = args.slice(1);
}
const title = titleArgs.join(" ");

if (!title) {
  console.error('Usage: openclew add ref "Title of the document"');
  process.exit(1);
}

const projectRoot = process.cwd();
const docDir = path.join(projectRoot, "doc");
const refDir = path.join(docDir, "ref");
if (!fs.existsSync(docDir)) {
  console.error("No doc/ directory found. Run 'openclew init' first.");
  process.exit(1);
}
if (!readConfig(projectRoot)) {
  console.warn("Warning: no .openclew.json found. Run 'openclew init' first.");
}

// Ensure doc/ref/ exists
if (!fs.existsSync(refDir)) {
  fs.mkdirSync(refDir, { recursive: true });
}

const slug = slugify(title);
const filename = `${slug}.md`;
const filepath = path.join(refDir, filename);
// Also check legacy flat location
const legacyPath = path.join(docDir, `_${slug}.md`);

if (fs.existsSync(filepath)) {
  console.error(`File already exists: doc/ref/${filename}`);
  process.exit(1);
}
if (fs.existsSync(legacyPath)) {
  console.error(`File already exists at legacy path: doc/_${slug}.md`);
  console.error(`Use 'openclew migrate --move doc/_${slug}.md doc/ref/${filename}' to relocate it.`);
  process.exit(1);
}

fs.writeFileSync(filepath, refdocContent(title), "utf-8");
console.log(`Created doc/ref/${filename}`);
console.log("");
console.log("Next: open the file and fill in:");
console.log("  L1 — subject, status, keywords (so the index can find it)");
console.log("  L2 — objective + key points (what agents and humans need to know)");
console.log("  L3 — full details (only when needed)");
