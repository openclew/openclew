/**
 * openclew peek — list instruction file + all refs (doc/ and project-wide)
 *
 * Discovery tool: shows what knowledge exists before starting work.
 * Zero dependencies — Node 16+ standard library only.
 */

const fs = require("fs");
const path = require("path");
const { collectDocs } = require("./search");

/**
 * Recursively find _*.md files in a directory tree.
 * Excludes common non-doc directories.
 *
 * @param {string} dir - Directory to scan
 * @param {string[]} excludePaths - Absolute paths to exclude
 * @returns {string[]} Sorted list of absolute file paths
 */
function findRefsRecursive(dir, excludePaths = []) {
  const results = [];
  const EXCLUDE_DIRS = new Set([
    ".git",
    "node_modules",
    "_archive",
    "old",
    ".Rproj.user",
    "log",
    "notes",
    "verify_logs",
  ]);

  function walk(current) {
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        if (EXCLUDE_DIRS.has(entry.name)) continue;
        if (excludePaths.some((ex) => fullPath === ex || fullPath.startsWith(ex + path.sep))) continue;
        walk(fullPath);
      } else if (
        entry.isFile() &&
        entry.name.startsWith("_") &&
        entry.name.endsWith(".md") &&
        entry.name !== "_INDEX.md"
      ) {
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results.sort();
}

/**
 * Run peek for a project.
 *
 * @param {string} projectRoot - Absolute path to project root
 * @returns {{ instructionFile: string|null, docRefs: Array, otherRefs: string[] }}
 */
function peek(projectRoot) {
  const docDir = path.join(projectRoot, "doc");

  // Instruction file (CLAUDE.md or AGENTS.md)
  let instructionFile = null;
  for (const name of ["CLAUDE.md", "AGENTS.md"]) {
    const p = path.join(projectRoot, name);
    if (fs.existsSync(p)) {
      instructionFile = p;
      break;
    }
  }

  // Refs in doc/ (with parsed metadata)
  let docRefs = [];
  let openTodos = [];
  if (fs.existsSync(docDir)) {
    const docs = collectDocs(docDir);
    docRefs = docs.filter((d) => d.kind === "ref");
    const OPEN = new Set(["open", "in progress", "in-progress", "wip", "blocked"]);
    openTodos = docs.filter((d) => {
      if (d.kind !== "todo") return false;
      const s = (d.meta.status || "open").toLowerCase();
      return OPEN.has(s);
    });
  }

  // Refs outside doc/
  const otherRefs = findRefsRecursive(projectRoot, [docDir]);

  return { instructionFile, docRefs, otherRefs, openTodos };
}

// ── CLI runner ──────────────────────────────────────────────────────

function run() {
  const projectRoot = process.cwd();
  const result = peek(projectRoot);
  const projectName = path.basename(projectRoot);

  console.log(`\n${projectName}\n`);

  // Instruction file
  if (result.instructionFile) {
    console.log(`Instruction file: ${path.basename(result.instructionFile)}`);
  } else {
    console.log("Instruction file: (none)");
  }
  console.log("");

  // Doc refs
  console.log(`Refs in doc/ (${result.docRefs.length}):`);
  if (result.docRefs.length) {
    for (const doc of result.docRefs) {
      const name = path.basename(doc.filepath);
      const subject = doc.meta.subject || "";
      const status = doc.meta.status || "";
      const statusTag = status ? ` [${status}]` : "";
      if (subject) {
        console.log(`  ${name} — ${subject}${statusTag}`);
      } else {
        console.log(`  ${name}${statusTag}`);
      }
    }
  } else {
    console.log("  (none)");
  }
  console.log("");

  // Open TODOs
  if (result.openTodos && result.openTodos.length) {
    console.log(`Open TODOs (${result.openTodos.length}):`);
    for (const doc of result.openTodos) {
      const name = path.basename(doc.filepath);
      const subject = doc.meta.subject || "";
      const status = doc.meta.status || "Open";
      if (subject) {
        console.log(`  ${name} — ${subject} [${status}]`);
      } else {
        console.log(`  ${name} [${status}]`);
      }
    }
    console.log("");
  }

  // Other refs
  if (result.otherRefs.length) {
    console.log(`Refs outside doc/ (${result.otherRefs.length}):`);
    for (const filepath of result.otherRefs) {
      const rel = path.relative(projectRoot, filepath);
      console.log(`  ${rel}`);
    }
    console.log("");
  }

  // Subdirectories of doc/
  const docDir = path.join(projectRoot, "doc");
  if (fs.existsSync(docDir)) {
    const SKIP = new Set(["log", "notes", "verify_logs", "_archive", "old"]);
    const subdirs = fs
      .readdirSync(docDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !SKIP.has(e.name))
      .map((e) => e.name)
      .sort();

    if (subdirs.length) {
      console.log("Subdirectories in doc/:");
      for (const d of subdirs) {
        console.log(`  ${d}/`);
      }
      console.log("");
    }
  }
}

module.exports = { peek, findRefsRecursive };

const calledAsPeek = process.argv.includes("peek");
if (require.main === module || calledAsPeek) {
  run();
}
