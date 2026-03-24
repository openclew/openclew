/**
 * openclew migrate — upgrade legacy docs to the openclew format.
 *
 * Detects docs with legacy metadata (R.AlphA.Doc@x.x.x or similar,
 * YAML-style L1 fields) and converts them to the openclew format
 * (condensed line 1, bold L1 fields, clean L2/L3 headers).
 *
 * Usage:
 *   openclew migrate            # Dry-run: show what would change
 *   openclew migrate --write    # Apply changes
 *
 * Zero dependencies — Node 16+ standard library only.
 */

const fs = require("fs");
const path = require("path");

// ── Status mapping (French legacy → English openclew) ───────────────

// ── Type mapping (French legacy → English openclew) ─────────────────

const TYPE_MAP = {
  "référence": "Reference",
  reference: "Reference",
  architecture: "Architecture",
  guide: "Guide",
  analyse: "Analysis",
  analysis: "Analysis",
  bug: "Bug",
  "fonctionnalité": "Feature",
  feature: "Feature",
  refactor: "Refactor",
  refactoring: "Refactor",
  documentation: "Doc",
  doc: "Doc",
  "déploiement": "Deploy",
  deploy: "Deploy",
};

const STATUS_MAP = {
  vivant: "Active",
  actif: "Active",
  active: "Active",
  stable: "Stable",
  "archivé": "Archived",
  archive: "Archived",
  archived: "Archived",
  "en cours": "In progress",
  "in progress": "In progress",
  "terminé": "Done",
  done: "Done",
  "abandonné": "Abandoned",
  abandoned: "Abandoned",
};

/**
 * Strip leading emoji characters from a value.
 * Covers common emoji ranges (emoticons, symbols, supplemental).
 */
function stripEmoji(str) {
  return str
    .replace(
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}✅❌⚠️🎯📋📝🔧👥✨🔑⏳🚀💡🔍📦🐛🔥⭐️]+/gu,
      ""
    )
    .trim();
}

function normalizeStatus(raw, kind) {
  if (!raw) return kind === "log" ? "Done" : "Active";
  const clean = stripEmoji(raw).toLowerCase().trim();
  const mapped = STATUS_MAP[clean];
  return mapped || stripEmoji(raw);
}

// ── Parser ──────────────────────────────────────────────────────────

/**
 * Parse YAML frontmatter (--- delimited block at start of file).
 * Returns { hasFrontmatter, fields, endIndex } or { hasFrontmatter: false }.
 */
function parseFrontmatter(content) {
  if (!content.startsWith("---")) return { hasFrontmatter: false };

  const endMatch = content.indexOf("\n---", 3);
  if (endMatch < 0) return { hasFrontmatter: false };

  const block = content.slice(4, endMatch);
  const fields = {};
  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("-")) continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx > 0) {
      const key = trimmed.slice(0, colonIdx).trim().toLowerCase();
      const value = trimmed.slice(colonIdx + 1).trim();
      if (key && value) fields[key] = value;
    }
  }

  // endIndex = position after closing "---\n"
  const endIndex = endMatch + 4;
  return { hasFrontmatter: true, fields, endIndex };
}

/**
 * Parse a legacy doc. Returns { isLegacy, fields, hasFrontmatter, frontmatterEnd }
 * or { isLegacy: false }.
 * "Legacy" = line 1 does NOT start with "openclew@" AND has an L1 block
 * with plain key: value fields (not **bold:** syntax).
 */
function parseLegacyDoc(content) {
  const lines = content.split("\n");
  const line1 = lines[0].trim();

  // Already openclew format
  if (line1.startsWith("openclew@")) return { isLegacy: false };

  // Check for L1 block
  const l1Match = content.match(
    /<!--\s*L1_START\s*-->([\s\S]+?)<!--\s*L1_END\s*-->/
  );

  // No L1 block — but if there's YAML frontmatter, still consider legacy
  if (!l1Match) {
    const fm = parseFrontmatter(content);
    if (!fm.hasFrontmatter || !fm.fields.subject) return { isLegacy: false };
    return {
      isLegacy: true,
      fields: fm.fields,
      line1,
      hasFrontmatter: true,
      frontmatterEnd: fm.endIndex,
      frontmatterOnly: true,
    };
  }

  const l1Block = l1Match[1];

  // Check if L1 already uses bold syntax (partially migrated?)
  const hasBoldSubject = /\*\*subject:\*\*/.test(l1Block);
  const hasPlainKV = l1Block
    .split("\n")
    .some((l) => {
      const t = l.trim();
      return (
        t &&
        !t.startsWith("#") &&
        !t.startsWith("<!--") &&
        !t.startsWith("**") &&
        t.includes(":") &&
        /^[a-z_]+:/.test(t)
      );
    });

  // Not legacy if already fully migrated
  if (hasBoldSubject && !hasPlainKV) return { isLegacy: false };

  // Parse YAML frontmatter if present
  const fm = parseFrontmatter(content);

  // Parse L1 key: value fields
  const l1Fields = {};
  for (const line of l1Block.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("<!--"))
      continue;
    if (trimmed.startsWith("**") && trimmed.includes(":**")) continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx > 0) {
      const key = trimmed.slice(0, colonIdx).trim().toLowerCase();
      const value = trimmed.slice(colonIdx + 1).trim();
      if (key && value) l1Fields[key] = value;
    }
  }

  // Merge: L1 fields take precedence over frontmatter
  const fields = fm.hasFrontmatter
    ? { ...fm.fields, ...l1Fields }
    : l1Fields;

  return {
    isLegacy: true,
    fields,
    line1,
    hasFrontmatter: fm.hasFrontmatter,
    frontmatterEnd: fm.hasFrontmatter ? fm.endIndex : -1,
  };
}

// ── Migrator ────────────────────────────────────────────────────────

/**
 * Convert a legacy doc content to openclew format.
 * Returns the new content string, or null if not legacy.
 */
function migrateContent(content, kind, ocVersion) {
  const parsed = parseLegacyDoc(content);
  if (!parsed.isLegacy) return null;

  const f = parsed.fields;

  // ── Build new metadata line 1 ──

  const parts = [`openclew@${ocVersion}`];

  if (kind === "log") {
    parts.push(`date: ${f.date || f.created || "unknown"}`);
  } else {
    parts.push(`created: ${f.created || "unknown"}`);
    parts.push(
      `updated: ${f.last_updated || f.updated || f.created || "unknown"}`
    );
  }

  const rawType = stripEmoji(f.type || "");
  const type = TYPE_MAP[rawType.toLowerCase()] || rawType || (kind === "log" ? "Feature" : "Reference");
  parts.push(`type: ${type}`);

  const status = normalizeStatus(f.status, kind);
  parts.push(`status: ${status}`);

  parts.push(`category: ${f.category || ""}`);
  parts.push(`keywords: ${f.keywords || "[]"}`);

  // related_docs — keep on line 1 if non-empty
  const related = f.related_docs || "";
  if (related && related !== "[]") {
    parts.push(`related_docs: ${related}`);
  }

  const newLine1 = parts.join(" · ");

  // ── Build new L1 block ──

  const subject = f.subject || "";
  const docBrief = f.doc_brief || f.summary || "";

  const newL1Block = `<!-- L1_START -->\n**subject:** ${subject}\n\n**doc_brief:** ${docBrief}\n<!-- L1_END -->`;

  // ── Apply replacements ──

  let result = content;

  if (parsed.frontmatterOnly) {
    // Frontmatter-only: replace frontmatter with line 1 + L1 block, keep body
    const afterFm = result.slice(parsed.frontmatterEnd);
    const body = afterFm.replace(/^\s*(?:#[^#\n]*\n\s*)?/, "");
    result = newLine1 + "\n\n" + newL1Block + "\n\n---\n\n" + body;
  } else if (parsed.hasFrontmatter) {
    // Frontmatter + L1 block: strip frontmatter, keep L1 for replacement
    const afterFm = result.slice(parsed.frontmatterEnd);
    const cleaned = afterFm.replace(/^\s*(?:#[^#\n]*\n\s*)?/, "");
    result = newLine1 + "\n\n" + cleaned;

    // Replace L1 block
    result = result.replace(
      /<!--\s*L1_START\s*-->[\s\S]+?<!--\s*L1_END\s*-->/,
      newL1Block
    );
  } else {
    // No frontmatter: replace line 1 + L1 block
    const firstNewline = result.indexOf("\n");
    if (firstNewline >= 0) {
      result = newLine1 + result.slice(firstNewline);
    } else {
      result = newLine1;
    }

    // Replace L1 block
    result = result.replace(
      /<!--\s*L1_START\s*-->[\s\S]+?<!--\s*L1_END\s*-->/,
      newL1Block
    );
  }

  // Remove legacy L1 header line (e.g. "# 📋 L1 · Métadonnées")
  result = result.replace(/^#[^#\n]*\bL1\b[^#\n]*\n/m, "");

  // Clean L2 header (remove emojis, normalize to English)
  result = result.replace(/^#[^#\n]*\bL2\b[^#\n]*$/m, "# L2 - Summary");

  // Clean L3 header
  result = result.replace(/^#[^#\n]*\bL3\b[^#\n]*$/m, "# L3 - Details");

  return result;
}

// ── File scanner ────────────────────────────────────────────────────

function collectFiles(docDir) {
  const files = [];

  // Refdocs: doc/_*.md (skip _INDEX.md and _INDEX_NOTES.md)
  const SKIP = new Set(["_INDEX.md", "_INDEX_NOTES.md"]);
  if (fs.existsSync(docDir)) {
    for (const entry of fs.readdirSync(docDir).sort()) {
      if (
        entry.startsWith("_") &&
        entry.endsWith(".md") &&
        !SKIP.has(entry)
      ) {
        files.push({
          filepath: path.join(docDir, entry),
          filename: entry,
          kind: "refdoc",
        });
      }
    }
  }

  // Logs: doc/log/*.md
  const logDir = path.join(docDir, "log");
  if (fs.existsSync(logDir)) {
    for (const entry of fs.readdirSync(logDir).sort()) {
      if (entry.endsWith(".md")) {
        files.push({
          filepath: path.join(logDir, entry),
          filename: entry,
          kind: "log",
        });
      }
    }
  }

  // Notes: doc/notes/*.md and doc/notes/**/*.md
  const notesDir = path.join(docDir, "notes");
  if (fs.existsSync(notesDir)) {
    const scanNotes = (dir) => {
      for (const entry of fs.readdirSync(dir).sort()) {
        const full = path.join(dir, entry);
        if (fs.statSync(full).isDirectory()) {
          scanNotes(full);
        } else if (entry.endsWith(".md")) {
          files.push({ filepath: full, filename: entry, kind: "log" });
        }
      }
    };
    scanNotes(notesDir);
  }

  return files;
}

// ── CLI runner ──────────────────────────────────────────────────────

function run() {
  const args = process.argv.slice(2);
  const writeMode = args.includes("--write");

  // Determine version
  let ocVersion = "0.0.0";
  try {
    const pkg = require(path.join(__dirname, "..", "package.json"));
    ocVersion = pkg.version;
  } catch {}

  // Find doc/ directory
  const projectRoot = process.cwd();
  const docDir = path.join(projectRoot, "doc");
  if (!fs.existsSync(docDir)) {
    console.error("No doc/ directory found. Run 'openclew init' first.");
    process.exit(1);
  }

  console.log(
    `openclew migrate ${writeMode ? "(write mode)" : "(dry-run)"}\n`
  );

  const files = collectFiles(docDir);
  let migrated = 0;
  let current = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    const relPath = path.relative(projectRoot, file.filepath);
    let content;
    try {
      content = fs.readFileSync(file.filepath, "utf-8");
    } catch (err) {
      console.log(`  ⚠ ${relPath} — read error: ${err.message}`);
      errors++;
      continue;
    }

    const result = migrateContent(content, file.kind, ocVersion);

    if (result === null) {
      current++;
      continue;
    }

    if (writeMode) {
      try {
        fs.writeFileSync(file.filepath, result, "utf-8");
        console.log(`  ✓ ${relPath}`);
      } catch (err) {
        console.log(`  ⚠ ${relPath} — write error: ${err.message}`);
        errors++;
        continue;
      }
    } else {
      console.log(`  → ${relPath}`);
    }
    migrated++;
  }

  // Summary
  console.log("");
  const total = files.length;
  console.log(
    `${migrated} to migrate, ${current} already current, ${errors} errors (${total} total)`
  );

  if (!writeMode && migrated > 0) {
    console.log("\nRun 'openclew migrate --write' to apply changes.");
  } else if (writeMode && migrated > 0) {
    console.log("\nReview with 'git diff'.");
  }
}

// ── Exports ─────────────────────────────────────────────────────────

module.exports = { parseLegacyDoc, migrateContent, collectFiles, run };

if (require.main === module || process.argv.includes("migrate")) {
  run();
}
