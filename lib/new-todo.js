/**
 * openclew todo <title> — create a new TODO doc.
 *
 * One file per task in doc/todo/YYYY-MM-DD_slug.md.
 * Unlike TODO.md (flat checklist), each TODO gets its own doc
 * so it can carry a subject, doc_brief, and light context.
 */

const fs = require("fs");
const path = require("path");
const { todoDocContent, slugifyLog, today } = require("./templates");
const { readConfig } = require("./config");

const args = process.argv.slice(2);
const todoIndex = args.lastIndexOf("todo");
const titleArgs = todoIndex >= 0 ? args.slice(todoIndex + 1) : args.slice(1);
const title = titleArgs.join(" ");

if (!title) {
  console.error('Usage: openclew add todo "Title of the TODO"');
  process.exit(1);
}

const projectRoot = process.cwd();
const docDir = path.join(projectRoot, "doc");
const todoDir = path.join(docDir, "todo");

if (!fs.existsSync(docDir)) {
  console.error("No doc/ directory found. Run 'openclew init' first.");
  process.exit(1);
}

if (!fs.existsSync(todoDir)) {
  fs.mkdirSync(todoDir, { recursive: true });
}

if (!readConfig(projectRoot)) {
  console.warn("Warning: no .openclew.json found. Run 'openclew init' first.");
}

const slug = slugifyLog(title);
const date = today();
const filename = `${date}_${slug}.md`;
const filepath = path.join(todoDir, filename);

if (fs.existsSync(filepath)) {
  console.error(`File already exists: doc/todo/${filename}`);
  process.exit(1);
}

fs.writeFileSync(filepath, todoDocContent(title), "utf-8");
console.log(`Created doc/todo/${filename}`);
console.log("");
console.log("Next: fill in 2 short sections:");
console.log("  Why it matters    — the pain or opportunity (1-2 lines)");
console.log("  Done looks like   — how you'll know it's done (1-2 lines)");
console.log("");
console.log("Keep it short. Implementation details belong in a log when work starts.");
