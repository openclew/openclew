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

function run() {
  const projectRoot = process.cwd();
  const docDir = path.join(projectRoot, "doc");

  if (!fs.existsSync(docDir)) {
    console.error("No doc/ directory found. Run 'openclew init' first.");
    process.exit(1);
  }

  const docs = collectDocs(docDir);
  const refdocs = docs.filter((d) => d.kind === "refdoc");
  const logs = docs.filter((d) => d.kind === "log");

  // ── Overview ──────────────────────────────────────────────────
  console.log("openclew status\n");
  console.log(`  Refdocs: ${refdocs.length}`);
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
    const whichOut = execSync("which -a openclew 2>/dev/null || where openclew 2>nul", {
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

  // ── Stale refdocs (updated > 30 days ago) ─────────────────────
  const now = new Date();
  const staleThresholdMs = 30 * 24 * 60 * 60 * 1000;
  const staleRefdocs = refdocs.filter((d) => {
    const updated = d.meta.updated || d.meta.created;
    if (!updated) return true; // No date = stale
    const docDate = new Date(updated);
    return !isNaN(docDate.getTime()) && now - docDate > staleThresholdMs;
  });
  if (staleRefdocs.length) {
    console.log(`Stale refdocs (not updated in 30+ days): ${staleRefdocs.length}`);
    for (const d of staleRefdocs) {
      const relPath = path.relative(projectRoot, d.filepath);
      const updated = d.meta.updated || d.meta.created || "no date";
      const subject = d.meta.subject || d.filename;
      console.log(`  - ${relPath}  (${subject}, last: ${updated})`);
    }
    console.log("");
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
    const todoContent = fs.readFileSync(todoPath, "utf-8");
    const todoLines = todoContent.split("\n");
    const pending = todoLines.filter((l) => /^- \[ \] /.test(l.trim())).length;
    const done = todoLines.filter((l) => /^- \[x\] /i.test(l.trim())).length;

    console.log(`TODO.md: ${pending} pending, ${done} done`);

    // Check for stale completed items (> 7 days)
    const staleThreshold = 7 * 24 * 60 * 60 * 1000;
    const dateRe = /\((\d{4}-\d{2}-\d{2})\)\s*$/;
    const staleDone = todoLines.filter((l) => {
      const trimmed = l.trim();
      if (!/^- \[x\] /i.test(trimmed)) return false;
      const m = dateRe.exec(trimmed);
      if (!m) return false;
      return now - new Date(m[1]) > staleThreshold;
    });
    if (staleDone.length) {
      console.log(`  ${staleDone.length} completed item(s) older than 7 days — consider purging`);
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
  const freshRefdocs = refdocs.length - staleRefdocs.length;
  const healthPct = Math.round(
    ((withBrief + withSubject + freshRefdocs) /
      (total + total + Math.max(refdocs.length, 1))) *
      100
  );

  console.log(`Health: ${healthPct}%`);
  if (healthPct === 100) {
    console.log("  All docs have subject + doc_brief, no stale refdocs.");
  }
}

module.exports = { run };

const calledAsStatus = process.argv.includes("status");
if (require.main === module || calledAsStatus) {
  run();
}
