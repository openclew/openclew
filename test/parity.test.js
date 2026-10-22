/**
 * Node <-> Rust parity.
 *
 * Both implementations run against test/fixtures/parity and must produce the
 * same golden files (Rust side: rust/src/parity_tests.rs):
 *   - expected.json   collectDocs over parity/doc
 *   - generated.json  templates, slugs, search ranking, read_doc levels
 * Regenerate after an intended change: UPDATE_GOLDEN=1 node --test test/parity.test.js
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { collectDocs, searchDocs } = require("../lib/search");
const { extractLevel } = require("../lib/mcp-server");
const { walkDir } = require("../lib/search");
const { parseLegacyDoc } = require("../lib/migrate");
const { parseFlatTodos } = require("../lib/todo-flat");
const { formatSessionHeader } = require("../lib/session-header");
const { reviewRefs, formatMarkdown, formatCheckout } = require("../lib/review");
const { applyRefs, archiveRef, confirmRef, formatApply } = require("../lib/review-apply");
const os = require("os");

/** formatSessionHeader prints instead of returning: capture its console.log */
function sessionHeaderLine({ name, tags, date }) {
  const log = console.log;
  let line = "";
  console.log = (s) => { line = s; };
  try {
    formatSessionHeader(name, tags.split(",").map((t) => t.trim()).filter(Boolean), date);
  } finally {
    console.log = log;
  }
  return line;
}
const { refContent, logContent, todoDocContent, slugify, slugifyLog, today, ocVersion } = require("../lib/templates");

const PARITY_DIR = path.join(__dirname, "fixtures", "parity");
const REVIEW_DIR = path.join(__dirname, "fixtures", "review");
const REVIEW_TODAY = "2026-10-19";
const DOC_DIR = path.join(PARITY_DIR, "doc");

// Shared inputs — the Rust test reads them from generated.json, never redefines them
const TEMPLATE_TITLE = "Auth Design";
const SLUG_TITLES = ["Auth Design", "  hello world  ", "a -- b", "Fix: café crème!", "v2.0 / API", "Straße"];
const SEARCH_QUERIES = ["auth", "search", "ci", "setup", "Legacy guide", "nomatch"];
const LEVEL_DOCS = ["ref/ARCHITECTURE.md", "ref/api/AUTH.md", "_LEGACY_GUIDE.md", "ref/NOT_OPENCLEW.md"];
const LEVELS = ["L1", "L2", "L3", "l2", "full", "X"];
const SESSION_HEADERS = [
  { name: "Refonte checkout", tags: "voice, stt,,voxtral", date: "2026-03-28" },
  { name: "No tags", tags: "", date: "2026-03-27" },
];

/** Every .md under parity/doc, sorted, `/`-separated (legacy detection covers all of them) */
function allFixtureDocs() {
  return walkDir(DOC_DIR)
    .filter((f) => f.endsWith(".md"))
    .map(relDoc)
    .sort();
}

function sortedMeta(meta) {
  return Object.fromEntries(Object.keys(meta).sort().map((k) => [k, meta[k]]));
}

function relDoc(filepath) {
  return path.relative(DOC_DIR, filepath).split(path.sep).join("/");
}

/** Date and version vary per run: replace them with stable tokens */
function tokenize(content) {
  return content.split(today()).join("{{DATE}}").split(ocVersion()).join("{{VER}}");
}

function collectSnapshot() {
  return collectDocs(DOC_DIR).map((d) => ({ path: relDoc(d.filepath), kind: d.kind, meta: sortedMeta(d.meta) }));
}

function generatedSnapshot() {
  return {
    template_title: TEMPLATE_TITLE,
    templates: {
      ref: tokenize(refContent(TEMPLATE_TITLE)),
      log: tokenize(logContent(TEMPLATE_TITLE)),
      todo: tokenize(todoDocContent(TEMPLATE_TITLE)),
    },
    slugs: SLUG_TITLES.map((title) => ({ title, ref: slugify(title), log: slugifyLog(title) })),
    search: SEARCH_QUERIES.map((query) => ({
      query,
      results: searchDocs(DOC_DIR, query).map((r) => ({ path: relDoc(r.filepath), score: r.score })),
    })),
    levels: LEVEL_DOCS.flatMap((doc) => {
      const content = fs.readFileSync(path.join(DOC_DIR, doc), "utf-8");
      return LEVELS.map((level) => ({ doc, level, content: extractLevel(content, level) }));
    }),
    legacy: allFixtureDocs().map((doc) => ({
      doc,
      is_legacy: parseLegacyDoc(fs.readFileSync(path.join(DOC_DIR, doc), "utf-8")).isLegacy,
    })),
    flat_todos: parseFlatTodos(path.join(PARITY_DIR, "TODO.md")).map((t) => ({
      line_num: t.lineNum,
      done: t.status === "done",
      title: t.title,
      description: t.description,
      from: t.from,
      closed: t.closed,
    })),
    session_headers: SESSION_HEADERS.map((h) => ({ ...h, line: sessionHeaderLine(h) })),
    review: reviewSnapshot(),
  };
}

/** Review over fixtures/review, git ignored (fixture commit dates vary) */
function reviewSnapshot() {
  const report = reviewRefs(REVIEW_DIR, { today: REVIEW_TODAY, useGit: false });
  return {
    today: REVIEW_TODAY,
    report,
    markdown_top2: formatMarkdown(report, 2),
    checkout_top3: formatCheckout(report, 3),
    apply: applySnapshot(),
  };
}

/** Apply + judged gestures on a temp copy of fixtures/review and its sibling */
function applySnapshot() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "oc-parity-"));
  for (const name of ["review", "review-sibling"]) {
    fs.cpSync(path.join(__dirname, "fixtures", name), path.join(tmp, name), { recursive: true });
  }
  const root = path.join(tmp, "review");
  const result = applyRefs(root, { today: REVIEW_TODAY, useGit: false });
  confirmRef(root, "doc/ref/TWIN_A.md", { why: "still accurate", today: REVIEW_TODAY });
  archiveRef(root, "doc/ref/TWIN_B.md", { supersededBy: "doc/ref/TWIN_A.md", why: "merged into TWIN_A", today: REVIEW_TODAY });
  const files = [...result.touched, "doc/ref/TWIN_A.md", "doc/ref/TWIN_B.md", "doc/review-journal.md"];
  return {
    result,
    summary: formatApply(result),
    files: Object.fromEntries(files.map((f) => [f, fs.readFileSync(path.join(root, f), "utf-8")])),
  };
}

function checkGolden(name, actual) {
  const file = path.join(PARITY_DIR, name);
  if (process.env.UPDATE_GOLDEN) {
    fs.writeFileSync(file, JSON.stringify(actual, null, 2) + "\n", "utf-8");
  }
  assert.deepEqual(actual, JSON.parse(fs.readFileSync(file, "utf-8")));
}

describe("parity golden", () => {
  it("collectDocs matches expected.json", () => {
    checkGolden("expected.json", collectSnapshot());
  });

  it("templates, slugs and search match generated.json", () => {
    checkGolden("generated.json", generatedSnapshot());
  });
});
