/**
 * Node <-> Rust parity.
 *
 * Both implementations run against test/fixtures/parity and must produce the
 * same golden files (Rust side: rust/src/parity_tests.rs):
 *   - expected.json   collectDocs over parity/doc
 *   - generated.json  templates, slugs, search ranking
 * Regenerate after an intended change: UPDATE_GOLDEN=1 node --test test/parity.test.js
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { collectDocs, searchDocs } = require("../lib/search");
const { refContent, logContent, todoDocContent, slugify, slugifyLog, today, ocVersion } = require("../lib/templates");

const PARITY_DIR = path.join(__dirname, "fixtures", "parity");
const DOC_DIR = path.join(PARITY_DIR, "doc");

// Shared inputs — the Rust test reads them from generated.json, never redefines them
const TEMPLATE_TITLE = "Auth Design";
const SLUG_TITLES = ["Auth Design", "  hello world  ", "a -- b", "Fix: café crème!", "v2.0 / API", "Straße"];
const SEARCH_QUERIES = ["auth", "search", "ci", "setup", "Legacy guide", "nomatch"];

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
