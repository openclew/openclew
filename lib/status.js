/**
 * openclew status — documentation health dashboard.
 *
 * Shows stats, docs missing doc_brief, stale docs, and distribution.
 * Zero dependencies — Node 16+ standard library only.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { collectDocs, parseFile } = require("./search");
const { parseLegacyDoc } = require("./migrate");
const { parseFlatTodos, validateFlatTodos } = require("./todo-flat");

function run() {
  const projectRoot = process.cwd();
  const docDir = path.join(projectRoot, "doc");

  if (!fs.existsSync(docDir)) {
    console.error("No doc/ directory found. Run 'openclew init' first.");
    process.exit(1);
  }

  const docs = collectDocs(docDir);
  const refs = docs.filter((d) => d.kind === "ref");
  const logs = docs.filter((d) => d.kind === "log");
  const todos = docs.filter((d) => d.kind === "todo");

  // ── Overview ──────────────────────────────────────────────────
  console.log("openclew status\n");
  console.log(`  Refs: ${refs.length}`);
  console.log(`  Logs:    ${logs.length}`);
  console.log(`  Total:   ${docs.length}`);
  console.log("");

  // ── Legacy format detection ──────────────────────────────────
  let legacyCount = 0;
  for (const d of docs) {
    try {
      const content = fs.readFileSync(d.filepath, "utf-8");
      const parsed = parseLegacyDoc(content);
      if (parsed.isLegacy) legacyCount++;
    } catch {}
  }
  if (legacyCount > 0) {
    console.log(`Legacy format: ${legacyCount} docs need migration`);
    console.log(`  Run 'openclew migrate' to preview, 'openclew migrate --write' to apply.\n`);
  }

  // ── Coexistence check (Node.js vs Rust binary) ────────────────
  try {
    // Branch on platform: `where ... 2>nul` is a Windows command. Run on a Unix
    // shell it would create a stray file literally named `nul` (nul is not a
    // device on Unix) every time `which` returns non-zero. Never mix the two.
    const lookupCmd =
      process.platform === "win32"
        ? "where openclew 2>nul"
        : "which -a openclew 2>/dev/null";
    const whichOut = execSync(lookupCmd, {
      encoding: "utf-8",
      timeout: 3000,
    }).trim();
    const paths = whichOut.split("\n").map((p) => p.trim()).filter(Boolean);
    if (paths.length > 1) {
      console.log(`⚠ Multiple openclew binaries found:`);
      for (const p of paths) console.log(`  - ${p}`);
      console.log(`  Active: ${paths[0]} (first in PATH)\n`);
    }
  } catch {}

  // ── Missing doc_brief ─────────────────────────────────────────
  const missingBrief = docs.filter(
    (d) => !d.meta.doc_brief || d.meta.doc_brief === ""
  );
  if (missingBrief.length) {
    console.log(`Missing doc_brief (${missingBrief.length}):`);
    for (const d of missingBrief) {
      const relPath = path.relative(projectRoot, d.filepath);
      const subject = d.meta.subject || d.filename;
      console.log(`  - ${relPath}  (${subject})`);
    }
    console.log("");
  }

  // ── Missing subject ───────────────────────────────────────────
  const missingSubject = docs.filter(
    (d) => !d.meta.subject || d.meta.subject === ""
  );
  if (missingSubject.length) {
    console.log(`Missing subject (${missingSubject.length}):`);
    for (const d of missingSubject) {
      const relPath = path.relative(projectRoot, d.filepath);
      console.log(`  - ${relPath}`);
    }
    console.log("");
  }

  // ── Stale refs (updated > 30 days ago) ─────────────────────
  const now = new Date();
  const staleThresholdMs = 30 * 24 * 60 * 60 * 1000;
  const staleRefs = refs.filter((d) => {
    const updated = d.meta.updated || d.meta.created;
    if (!updated) return true; // No date = stale
    const docDate = new Date(updated);
    return !isNaN(docDate.getTime()) && now - docDate > staleThresholdMs;
  });
  if (staleRefs.length) {
    console.log(`Stale refs (not updated in 30+ days): ${staleRefs.length}`);
    for (const d of staleRefs) {
      const relPath = path.relative(projectRoot, d.filepath);
      const updated = d.meta.updated || d.meta.created || "no date";
      const subject = d.meta.subject || d.filename;
      console.log(`  - ${relPath}  (${subject}, last: ${updated})`);
    }
    console.log("");
  }

  // ── TODOs Done without `closed` ──────────────────────────────
  const doneTodosNoClosed = todos.filter(
    (d) =>
      (d.meta.status || "").toLowerCase() === "done" &&
      (!d.meta.closed || d.meta.closed === "")
  );
  if (doneTodosNoClosed.length) {
    console.log(`Done TODOs missing closed (${doneTodosNoClosed.length}):`);
    for (const d of doneTodosNoClosed) {
      const relPath = path.relative(projectRoot, d.filepath);
      const subject = d.meta.subject || d.filename;
      console.log(`  - ${relPath}  (${subject})`);
    }
    console.log("  Add a closed: line in L1 (log path or session reference).\n");
  }

  // ── TODOs (any) without `from` ───────────────────────────────
  const todosNoFrom = todos.filter(
    (d) => !d.meta.from || d.meta.from === ""
  );
  if (todosNoFrom.length) {
    console.log(`TODOs missing from (${todosNoFrom.length}):`);
    for (const d of todosNoFrom) {
      const relPath = path.relative(projectRoot, d.filepath);
      const subject = d.meta.subject || d.filename;
      console.log(`  - ${relPath}  (${subject})`);
    }
    console.log("  Add a from: line in L1 (log path or free-text reference).\n");
  }

  // ── Status distribution ───────────────────────────────────────
  const statusCounts = {};
  for (const d of docs) {
    const st = d.meta.status || "—";
    statusCounts[st] = (statusCounts[st] || 0) + 1;
  }
  const statusEntries = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]);
  if (statusEntries.length) {
    console.log("Status distribution:");
    for (const [status, count] of statusEntries) {
      console.log(`  ${status}: ${count}`);
    }
    console.log("");
  }

  // ── Category distribution ─────────────────────────────────────
  const catCounts = {};
  for (const d of docs) {
    const cat = d.meta.category || "—";
    if (cat && cat !== "—") catCounts[cat] = (catCounts[cat] || 0) + 1;
  }
  const catEntries = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
  if (catEntries.length) {
    console.log("Category distribution:");
    for (const [cat, count] of catEntries) {
      console.log(`  ${cat}: ${count}`);
    }
    console.log("");
  }

  // ── TODO in instruction file (suggest extraction) ─────────────
  const { getEntryPoint } = require("./config");
  const entryFile = getEntryPoint(projectRoot);
  if (entryFile) {
    const entryPath = path.join(projectRoot, entryFile);
    if (fs.existsSync(entryPath)) {
      const entryContent = fs.readFileSync(entryPath, "utf-8");
      const todoInEntry = entryContent.split("\n").filter((l) => /^\s*- \[[ x]\] /i.test(l.trim()));
      if (todoInEntry.length > 0 && !fs.existsSync(path.join(projectRoot, "TODO.md"))) {
        console.log(`⚠ Found ${todoInEntry.length} TODO item(s) in ${entryFile}`);
        console.log(`  Consider moving them to TODO.md for cleaner instructions.`);
        console.log(`  Run 'openclew migrate --todo' to extract automatically.\n`);
      }
    }
  }

  // ── TODO.md stats ─────────────────────────────────────────────
  const todoPath = path.join(projectRoot, "TODO.md");
  if (fs.existsSync(todoPath)) {
    const flatTodos = parseFlatTodos(todoPath);
    const pending = flatTodos.filter((t) => t.status === "open").length;
    const done = flatTodos.filter((t) => t.status === "done").length;

    console.log(`TODO.md: ${pending} pending, ${done} done`);

    // Check for stale completed items (> 7 days)
    const staleThreshold = 7 * 24 * 60 * 60 * 1000;
    const dateRe = /\((\d{4}-\d{2}-\d{2})\)/;
    const staleDone = flatTodos.filter((t) => {
      if (t.status !== "done") return false;
      const m = dateRe.exec(t.raw);
      if (!m) return false;
      return now - new Date(m[1]) > staleThreshold;
    });
    if (staleDone.length) {
      console.log(`  ${staleDone.length} completed item(s) older than 7 days — consider purging (archive, don't delete)`);
    }

    // ── from/closed tracing on flat TODOs ───────────────────────
    const { missingFrom, doneMissingClosed } = validateFlatTodos(flatTodos);
    if (missingFrom.length) {
      console.log(`  ${missingFrom.length} TODO(s) missing from marker:`);
      for (const t of missingFrom.slice(0, 10)) {
        const label = t.title || t.description.slice(0, 60);
        console.log(`    L${t.lineNum}: ${label}`);
      }
      if (missingFrom.length > 10) {
        console.log(`    … (${missingFrom.length - 10} more)`);
      }
      console.log(`  Add: <!-- from: doc/log/<path>.md --> (or free-text reference)`);
    }
    if (doneMissingClosed.length) {
      console.log(`  ${doneMissingClosed.length} done TODO(s) missing closed marker:`);
      for (const t of doneMissingClosed.slice(0, 10)) {
        const label = t.title || t.description.slice(0, 60);
        console.log(`    L${t.lineNum}: ${label}`);
      }
      if (doneMissingClosed.length > 10) {
        console.log(`    … (${doneMissingClosed.length - 10} more)`);
      }
      console.log(`  Add: <!-- closed: doc/log/<path>.md --> (or free-text reference)`);
    }
    console.log("");
  }

  // ── Health score ──────────────────────────────────────────────
  const total = docs.length;
  if (total === 0) {
    console.log("Health: no docs yet. Run 'openclew new' to create one.");
    return;
  }

  const withBrief = total - missingBrief.length;
  const withSubject = total - missingSubject.length;
  const freshRefs = refs.length - staleRefs.length;
  const healthPct = Math.round(
    ((withBrief + withSubject + freshRefs) /
      (total + total + Math.max(refs.length, 1))) *
      100
  );

  console.log(`Health: ${healthPct}%`);
  if (healthPct === 100) {
    console.log("  All docs have subject + doc_brief, no stale refs.");
  }
}

module.exports = { run };

const calledAsStatus = process.argv.includes("status");
if (require.main === module || calledAsStatus) {
  run();
}
