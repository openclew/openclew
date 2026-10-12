/**
 * Node <-> Rust parser parity.
 *
 * Both implementations parse test/fixtures/parity/doc and must produce
 * test/fixtures/parity/expected.json (Rust side: rust/src/parse/collect.rs tests).
 * Regenerate after an intended parser change: UPDATE_GOLDEN=1 node --test test/parity.test.js
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { collectDocs } = require("../lib/search");

const PARITY_DIR = path.join(__dirname, "fixtures", "parity");
const DOC_DIR = path.join(PARITY_DIR, "doc");
const GOLDEN = path.join(PARITY_DIR, "expected.json");

function sortedMeta(meta) {
  return Object.fromEntries(Object.keys(meta).sort().map((k) => [k, meta[k]]));
}

function snapshot() {
  return collectDocs(DOC_DIR).map((d) => ({
    path: path.relative(DOC_DIR, d.filepath).split(path.sep).join("/"),
    kind: d.kind,
    meta: sortedMeta(d.meta),
  }));
}

describe("parity golden", () => {
  it("collectDocs matches expected.json", () => {
    const actual = snapshot();
    if (process.env.UPDATE_GOLDEN) {
      fs.writeFileSync(GOLDEN, JSON.stringify(actual, null, 2) + "\n", "utf-8");
    }
    const expected = JSON.parse(fs.readFileSync(GOLDEN, "utf-8"));
    assert.deepEqual(actual, expected);
  });
});
