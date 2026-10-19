const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const { reviewRefs, formatCheckout } = require("../lib/review");

const ROOT = path.join(__dirname, "fixtures", "review");
const TODAY = "2026-10-19";

describe("review", () => {
  const report = reviewRefs(ROOT, { today: TODAY, useGit: false });
  const byPath = Object.fromEntries(report.candidates.map((c) => [c.path, c]));

  it("scans every ref not archived by status or location", () => {
    assert.equal(report.refs_scanned, 13);
  });

  it("keeps old refs with a signal and deprecated refs of any age, highest weighted score first", () => {
    assert.deepEqual(report.candidates.map((c) => c.path), [
      "doc/ref/REDIRECT_STUB.md",
      "doc/ref/SUPERSEDED_LEGACY.md",
      "doc/ref/STALE_DRAFT.md",
      "doc/ref/TWIN_B.md",
      "doc/_LEGACY_REDIRECT.md",
      "doc/ref/DEPRECATED_NO_TARGET.md",
      "doc/ref/OLD_API.md",
      "doc/ref/TWIN_A.md",
    ]);
  });

  it("flags deprecated wording in status, type or brief, without age gate", () => {
    assert.deepEqual(byPath["doc/ref/SUPERSEDED_LEGACY.md"].signals, ["deprecated", "orphan"]);
    assert.deepEqual(byPath["doc/_LEGACY_REDIRECT.md"].signals, ["deprecated"]);
    assert.deepEqual(byPath["doc/ref/DEPRECATED_NO_TARGET.md"].signals, ["deprecated"]);
  });

  it("reports age, orphan, transient status and dead paths", () => {
    const c = byPath["doc/ref/STALE_DRAFT.md"];
    assert.equal(c.age_days, 291);
    assert.equal(c.score, 5);
    assert.equal(c.inbound, 0);
    assert.deepEqual(c.signals, ["orphan", "transient", "dead_paths"]);
    assert.equal(c.status, "Draft");
    assert.deepEqual(c.dead_paths, ["src/missing.js"]);
  });

  it("detects twins by normalized subject, and counts inbound links from code and docs", () => {
    assert.deepEqual(byPath["doc/ref/TWIN_A.md"].signals, ["twin"]);
    assert.equal(byPath["doc/ref/TWIN_A.md"].inbound, 2);
    assert.deepEqual(byPath["doc/ref/TWIN_A.md"].twin_of, ["doc/ref/TWIN_B.md"]);
    assert.deepEqual(byPath["doc/ref/TWIN_B.md"].signals, ["orphan", "twin"]);
  });

  it("a recent reviewed: date takes the ref out of the score", () => {
    assert.equal(byPath["doc/ref/REVIEWED.md"], undefined);
  });

  it("checkout block: top 3 when candidates exist, empty string otherwise", () => {
    const block = formatCheckout(report, 3);
    assert.match(block, /STALE_DRAFT\.md/);
    assert.equal(formatCheckout({ ...report, candidates: [] }, 3), "");
  });
});
