/**
 * openclew search <query> — search docs by keyword.
 *
 * Searches metadata line (category, keywords, type, status) and
 * L1 fields (subject, doc_brief) across all refdocs and logs.
 * Returns results sorted by relevance score.
 *
 * Zero dependencies — Node 16+ standard library only.
 */

const fs = require("fs");
const path = require("path");

// ── Parsers (JS port of generate-index.py) ─────────────────────────

function parseMetadataLine(content) {
  const meta = {};
  const firstLine = content.split("\n", 1)[0].trim();
  if (!firstLine.startsWith("openclew@")) return meta;

  const parts = firstLine.split(" · ");
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith("openclew@")) {
      meta.version = trimmed.split("@")[1];
      continue;
    }
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx > 0) {
      const key = trimmed.slice(0, colonIdx).trim().toLowerCase();
      const value = trimmed.slice(colonIdx + 1).trim();
      meta[key] = value;
    }
  }
  return meta;
}

/**
 * Find the L1 block text using a 3-level fallback:
 *   1. <div class="oc-l1">...</div>
 *   2. <!-- L1_START --> ... <!-- L1_END -->
 *   3. Positional: lines between line 0 (metadata) and first `---`
 * Returns the block string, or null if nothing found.
 */
function findL1Block(content) {
  // 1. div format
  const divMatch = content.match(/<div\s+class="oc-l1">([\s\S]+?)<\/div>/);
  if (divMatch) return divMatch[1];

  // 2. comment markers
  const commentMatch = content.match(/<!--\s*L1_START\s*-->([\s\S]+?)<!--\s*L1_END\s*-->/);
  if (commentMatch) return commentMatch[1];

  // 3. Positional: skip line 0 (metadata), collect until first `---`
  const lines = content.split("\n");
  if (lines.length < 2) return null;
  const blockLines = [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") break;
    blockLines.push(lines[i]);
  }
  // Only return if there is actual content (not just blank lines)
  const joined = blockLines.join("\n");
  if (joined.trim().length === 0) return null;
  return joined;
}

function parseL1(content) {
  const meta = {};
  const block = findL1Block(content);
  if (!block) return meta;

  const subjectMatch = block.match(/\*\*subject:\*\*\s*(.+)/);
  if (subjectMatch) meta.subject = subjectMatch[1].trim();

  const briefMatch = block.match(/\*\*doc_brief:\*\*\s*(.+)/);
  if (briefMatch) meta.doc_brief = briefMatch[1].trim();

  return meta;
}

function parseL1Legacy(content) {
  const meta = {};
  const block = findL1Block(content);
  if (!block) return meta;

  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx > 0) {
      const key = trimmed.slice(0, colonIdx).trim().toLowerCase();
      const value = trimmed.slice(colonIdx + 1).trim();
      meta[key] = value;
    }
  }
  return meta;
}

function parseFile(filepath) {
  let content;
  try {
    content = fs.readFileSync(filepath, "utf-8");
  } catch {
    return null;
  }

  const metaLine = parseMetadataLine(content);
  const l1 = parseL1(content);

  if (l1.subject) {
    return { ...metaLine, ...l1 };
  }

  const legacy = parseL1Legacy(content);
  if (Object.keys(legacy).length) {
    return { ...metaLine, ...legacy };
  }

  return null;
}

// ── Collector ───────────────────────────────────────────────────────

const SKIP_DIRS = new Set(["_archive", "old", ".Rproj.user"]);
const SKIP_FILES = new Set(["_INDEX.md", "_INDEX_NOTES.md"]);
const REFDOC_EXTRA_SKIP = new Set(["log", "notes", "verify_logs"]);

/**
 * Recursively list all files under dir, skipping excluded directories.
 * @param {string} dir
 * @param {Set<string>} extraSkip - additional directory names to skip
 * @returns {string[]}
 */
function walkDir(dir, extraSkip = new Set()) {
  const results = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || extraSkip.has(entry.name)) continue;
      results.push(...walkDir(fullPath, extraSkip));
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }
  return results;
}

function collectDocs(docDir) {
  const docs = [];

  // Refdocs: _*.md recursively under docDir (excluding log/, notes/, verify_logs/)
  if (fs.existsSync(docDir)) {
    const refdocs = walkDir(docDir, REFDOC_EXTRA_SKIP)
      .filter((f) => {
        const name = path.basename(f);
        return name.startsWith("_") && name.endsWith(".md") && !SKIP_FILES.has(name);
      })
      .sort()
      .map((filepath) => {
        const meta = parseFile(filepath);
        return meta ? { filepath, filename: path.basename(filepath), kind: "refdoc", meta } : null;
      })
      .filter(Boolean);
    docs.push(...refdocs);
  }

  // Logs: *.md recursively under docDir/log/
  const logDir = path.join(docDir, "log");
  if (fs.existsSync(logDir)) {
    const logs = walkDir(logDir)
      .filter((f) => path.basename(f).endsWith(".md"))
      .sort()
      .reverse()
      .map((filepath) => {
        const meta = parseFile(filepath);
        return meta ? { filepath, filename: path.basename(filepath), kind: "log", meta } : null;
      })
      .filter(Boolean);
    docs.push(...logs);
  }

  return docs;
}

// ── Search engine ───────────────────────────────────────────────────

/**
 * Score a document against query terms.
 * Higher score = more relevant.
 *
 * Weights: subject (3), doc_brief (2), keywords (2), category (1.5), type (1), status (0.5)
 */
function scoreDoc(doc, queryTerms) {
  const fields = [
    { value: doc.meta.subject || "", weight: 3 },
    { value: doc.meta.doc_brief || "", weight: 2 },
    { value: doc.meta.keywords || "", weight: 2 },
    { value: doc.meta.category || "", weight: 1.5 },
    { value: doc.meta.type || "", weight: 1 },
    { value: doc.meta.status || "", weight: 0.5 },
  ];

  let score = 0;
  for (const term of queryTerms) {
    const termLower = term.toLowerCase();
    for (const field of fields) {
      const valueLower = field.value.toLowerCase();
      if (valueLower.includes(termLower)) {
        score += field.weight;
        // Bonus for exact word match (not substring)
        if (new RegExp(`\\b${termLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(field.value)) {
          score += field.weight * 0.5;
        }
      }
    }
  }
  return score;
}

/**
 * Search docs matching query. Returns sorted results.
 *
 * @param {string} docDir - Path to doc/ directory
 * @param {string} query - Search query (space-separated terms, AND logic)
 * @returns {Array<{filepath, filename, kind, meta, score}>}
 */
function searchDocs(docDir, query) {
  const docs = collectDocs(docDir);
  const queryTerms = query.trim().split(/\s+/).filter(Boolean);
  if (!queryTerms.length) return [];

  const results = [];
  for (const doc of docs) {
    const score = scoreDoc(doc, queryTerms);
    if (score > 0) {
      results.push({ ...doc, score });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

// ── CLI runner ──────────────────────────────────────────────────────

function run() {
  const args = process.argv.slice(2);
  const cmdIndex = args.indexOf("search");
  const queryArgs = cmdIndex >= 0 ? args.slice(cmdIndex + 1) : args.slice(1);
  const query = queryArgs.join(" ");

  if (!query) {
    console.error('Usage: openclew search <query>');
    console.error('');
    console.error('Examples:');
    console.error('  openclew search auth          # find docs about authentication');
    console.error('  openclew search "API design"   # multi-word search');
    process.exit(1);
  }

  const projectRoot = process.cwd();
  const docDir = path.join(projectRoot, "doc");
  if (!fs.existsSync(docDir)) {
    console.error("No doc/ directory found. Run 'openclew init' first.");
    process.exit(1);
  }

  const results = searchDocs(docDir, query);

  if (!results.length) {
    console.log(`No docs matching "${query}".`);
    process.exit(0);
  }

  console.log(`Found ${results.length} doc${results.length > 1 ? "s" : ""} matching "${query}":\n`);

  for (const r of results) {
    const relPath = path.relative(projectRoot, r.filepath);
    const icon = r.kind === "refdoc" ? "📘" : "📝";
    const subject = r.meta.subject || r.filename;
    const brief = r.meta.doc_brief || "";
    const status = r.meta.status ? ` [${r.meta.status}]` : "";

    console.log(`${icon} ${subject}${status}`);
    console.log(`   ${relPath}`);
    if (brief) console.log(`   ${brief}`);
    console.log("");
  }
}

// Export for MCP server + tests
module.exports = { searchDocs, collectDocs, walkDir, parseFile, parseMetadataLine, findL1Block, parseL1, parseL1Legacy };

// Run as CLI (invoked via dispatcher or directly)
const calledAsSearch = process.argv.includes("search");
if (require.main === module || calledAsSearch) {
  run();
}
