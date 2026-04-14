const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { slugify, slugifyLog } = require("../lib/templates");

// ── slugify (ref filenames: _UPPER_SNAKE.md) ──────────────────────

describe("slugify", () => {
  it("basic: spaces → underscores, uppercase", () => {
    assert.equal(slugify("Authentication Flow"), "AUTHENTICATION_FLOW");
  });

  it("strips parentheses, exclamation marks, special chars", () => {
    assert.equal(slugify("API (v2) design!"), "API_V2_DESIGN");
  });

  it("collapses consecutive non-alpha separators", () => {
    assert.equal(slugify("a---b___c   d"), "A_B_C_D");
  });

  it("trims leading/trailing underscores from whitespace input", () => {
    assert.equal(slugify("  hello  "), "HELLO");
  });

  it("handles accented characters (stripped to underscore)", () => {
    assert.equal(slugify("Référence complète"), "R_F_RENCE_COMPL_TE");
  });

  it("handles single word", () => {
    assert.equal(slugify("auth"), "AUTH");
  });

  it("handles dots and slashes", () => {
    assert.equal(slugify("v2.1/beta"), "V2_1_BETA");
  });
});

// ── slugifyLog (log filenames: lowercase-hyphen) ───────────────────

describe("slugifyLog", () => {
  it("basic: spaces → hyphens, lowercase", () => {
    assert.equal(slugifyLog("Fix Streaming Bug"), "fix-streaming-bug");
  });

  it("strips parentheses and special chars", () => {
    assert.equal(slugifyLog("API (v2) test!"), "api-v2-test");
  });

  it("collapses consecutive separators", () => {
    assert.equal(slugifyLog("a---b   c"), "a-b-c");
  });

  it("trims leading/trailing hyphens", () => {
    assert.equal(slugifyLog("  hello  "), "hello");
  });

  it("handles accented characters (stripped to hyphen)", () => {
    assert.equal(slugifyLog("Référence"), "r-f-rence");
  });

  it("handles dots and slashes", () => {
    assert.equal(slugifyLog("v2.1/beta"), "v2-1-beta");
  });
});
