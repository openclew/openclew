/**
 * Template content for refs and logs.
 * Embedded here so the CLI works standalone without needing to locate template files.
 */

const path = require("path");

/** YYYY-MM-DD in LOCAL time (toISOString is UTC: wrong date in the evening east of Greenwich) */
function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function slugify(title) {
  return title
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function slugifyLog(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function ocVersion() {
  try {
    const pkg = require(path.join(__dirname, "..", "package.json"));
    return pkg.version;
  } catch {
    return "0.0.0";
  }
}

// ── Embedded templates ──────────────────────────────────────────────
// SSOT: templates/embedded/*.md, shared with the Rust port (include_str!).
// Placeholders: {{DATE}}, {{VER}}, {{TITLE}}, {{SEED_SECTION}}, {{SEED}}.

const fs = require("fs");
const EMBEDDED_DIR = path.join(__dirname, "..", "templates", "embedded");

function render(name, vars = {}) {
  let out = fs.readFileSync(path.join(EMBEDDED_DIR, name), "utf-8");
  const all = { DATE: today(), VER: ocVersion(), ...vars };
  for (const [key, value] of Object.entries(all)) {
    out = out.split(`{{${key}}}`).join(value);
  }
  return out;
}

function refContent(title) {
  return render("ref.md", { TITLE: title });
}

function logContent(title) {
  return render("log.md", { TITLE: title });
}

/**
 * Guide doc — always created by init.
 * This is what agents read to understand openclew.
 */
function guideContent() {
  return render("guide.md");
}

/**
 * Architecture ref seeded from the existing instruction file (openclew block stripped).
 */
function exampleRefContent(existingInstructions) {
  let seedContent = "";
  if (existingInstructions) {
    seedContent = existingInstructions
      .replace(/<!--\s*openclew_START\s*-->[\s\S]*?<!--\s*openclew_END\s*-->/g, "")
      .trim();
  }
  // Seed rendered first so its own text is never scanned for placeholders
  const seedSection = seedContent ? render("example-ref-seed.md").split("{{SEED}}").join(seedContent) : "";
  return render("example-ref.md").split("{{SEED_SECTION}}").join(seedSection);
}

/**
 * Example log — shows what a filled-in log looks like.
 */
function exampleLogContent() {
  return render("example-log.md");
}

/**
 * Framework integration guide — created by init alongside the main guide.
 * Explains how openclew works with workflow frameworks (BMAD, Spec Kit, Kiro...).
 */
function frameworkIntegrationContent() {
  return render("framework-integration.md");
}

function todoContent() {
  return render("todo-root.md");
}

/**
 * Individual TODO doc — one file per task in doc/todo/.
 * Kept intentionally short. The point is to capture WHY it matters
 * and what done looks like — not implementation details.
 */
function todoDocContent(title) {
  return render("todo.md", { TITLE: title });
}


module.exports = {
  refContent,
  logContent,
  guideContent,
  frameworkIntegrationContent,
  exampleRefContent,
  exampleLogContent,
  todoContent,
  todoDocContent,
  render,
  slugify,
  slugifyLog,
  today,
  ocVersion,
};
