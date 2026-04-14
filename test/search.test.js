const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { parseMetadataLine, parseL1, parseL1Legacy, parseFile, walkDir, collectDocs, searchDocs } = require("../lib/search");

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "oc-test-"));
}

function writeDoc(dir, relPath, content) {
  const full = path.join(dir, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf-8");
  return full;
}

// ── parseMetadataLine ──────────────────────────────────────────────

describe("parseMetadataLine", () => {
  it("parses all fields from a complete metadata line", () => {
    const meta = parseMetadataLine(
      "openclew@0.5.4 · created: 2026-03-30 · updated: 2026-03-30 · type: Reference · status: Active · category: Format · keywords: [spec, L1]"
    );
    assert.equal(meta.version, "0.5.4");
    assert.equal(meta.created, "2026-03-30");
    assert.equal(meta.updated, "2026-03-30");
    assert.equal(meta.type, "Reference");
    assert.equal(meta.status, "Active");
    assert.equal(meta.category, "Format");
    assert.equal(meta.keywords, "[spec, L1]");
  });

  it("rejects non-openclew prefixes (legacy R.AlphA.Doc format)", () => {
    const meta = parseMetadataLine("R.AlphA.Doc@6.0.0 · type: Reference");
    assert.deepEqual(meta, {});
  });

  it("handles values with colons (e.g. time stamps)", () => {
    const meta = parseMetadataLine("openclew@0.5.4 · note: updated at 14:30:00");
    assert.equal(meta.note, "updated at 14:30:00");
  });

  it("handles log format (date instead of created/updated)", () => {
    const meta = parseMetadataLine(
      "openclew@0.5.4 · date: 2026-03-30 · type: Bug · status: Done"
    );
    assert.equal(meta.date, "2026-03-30");
    assert.equal(meta.created, undefined);
  });

  it("ignores everything after the first newline", () => {
    const meta = parseMetadataLine("openclew@1.0.0 · type: Guide\ntype: Bug");
    assert.equal(meta.type, "Guide");
  });
});

// ── parseL1 ────────────────────────────────────────────────────────

describe("parseL1", () => {
  it("extracts subject and doc_brief", () => {
    const meta = parseL1(`openclew@0.5.4
<!-- L1_START -->
**subject:** Authentication flow

**doc_brief:** OAuth2 with refresh tokens stored in Redis.
<!-- L1_END -->`);
    assert.equal(meta.subject, "Authentication flow");
    assert.equal(meta.doc_brief, "OAuth2 with refresh tokens stored in Redis.");
  });

  it("returns empty if no L1 markers", () => {
    assert.deepEqual(parseL1("# Just a title\nNo markers."), {});
  });

  it("handles subject without doc_brief (new doc, brief not filled)", () => {
    const meta = parseL1(`<!-- L1_START -->
**subject:** New doc
<!-- L1_END -->`);
    assert.equal(meta.subject, "New doc");
    assert.equal(meta.doc_brief, undefined);
  });

  it("handles doc_brief with colons (common in briefs)", () => {
    const meta = parseL1(`<!-- L1_START -->
**subject:** Format spec
**doc_brief:** 4 layers: metadata, L1, L2, L3. Each serves a purpose.
<!-- L1_END -->`);
    assert.equal(meta.doc_brief, "4 layers: metadata, L1, L2, L3. Each serves a purpose.");
  });

  it("handles doc_brief with markdown bold/links inside", () => {
    const meta = parseL1(`<!-- L1_START -->
**subject:** Complex brief
**doc_brief:** Uses **JWT** tokens via [OAuth2](https://oauth.net).
<!-- L1_END -->`);
    assert.equal(meta.doc_brief, "Uses **JWT** tokens via [OAuth2](https://oauth.net).");
  });

  it("ignores bold fields outside L1 markers", () => {
    const meta = parseL1(`**subject:** Outside

<!-- L1_START -->
**subject:** Inside
<!-- L1_END -->

**doc_brief:** Also outside`);
    assert.equal(meta.subject, "Inside");
    assert.equal(meta.doc_brief, undefined);
  });

  it("tolerates extra whitespace in markers", () => {
    const meta = parseL1(`<!--   L1_START   -->
**subject:** Spaced
<!--   L1_END   -->`);
    assert.equal(meta.subject, "Spaced");
  });

  it("parses div format with list items", () => {
    const meta = parseL1(`openclew@0.5.4
<div class="oc-l1">

- **subject:** Auth architecture
- **doc_brief:** JWT-based auth with Redis session storage.

</div>`);
    assert.equal(meta.subject, "Auth architecture");
    assert.equal(meta.doc_brief, "JWT-based auth with Redis session storage.");
  });

  it("prefers div format over comment markers when both present", () => {
    const meta = parseL1(`<div class="oc-l1">

- **subject:** From div
- **doc_brief:** Div brief

</div>
<!-- L1_START -->
**subject:** From comments
**doc_brief:** Comment brief
<!-- L1_END -->`);
    assert.equal(meta.subject, "From div");
    assert.equal(meta.doc_brief, "Div brief");
  });

  it("handles div format without list prefix", () => {
    const meta = parseL1(`<div class="oc-l1">

**subject:** No list prefix
**doc_brief:** Still works

</div>`);
    assert.equal(meta.subject, "No list prefix");
    assert.equal(meta.doc_brief, "Still works");
  });

  it("parses positional format (no markers, L1 between line 1 and first ---)", () => {
    const meta = parseL1(`openclew@0.6.0 · type: Reference · status: Active

- **subject:** Pure Markdown doc
- **doc_brief:** No wrappers, just Markdown.

---

# Summary
Some content here.`);
    assert.equal(meta.subject, "Pure Markdown doc");
    assert.equal(meta.doc_brief, "No wrappers, just Markdown.");
  });

  it("positional fallback ignores content after ---", () => {
    const meta = parseL1(`openclew@0.6.0 · type: Reference · status: Active

- **subject:** Before separator

---

**doc_brief:** This is after the separator and should not be parsed.`);
    assert.equal(meta.subject, "Before separator");
    assert.equal(meta.doc_brief, undefined);
  });
});

// ── parseL1Legacy ──────────────────────────────────────────────────

describe("parseL1Legacy", () => {
  it("parses plain key: value lines (pre-bold convention)", () => {
    const meta = parseL1Legacy(`<!-- L1_START -->
subject: Legacy auth doc
doc_brief: Describes the old auth flow
category: Architecture
<!-- L1_END -->`);
    assert.equal(meta.subject, "Legacy auth doc");
    assert.equal(meta.doc_brief, "Describes the old auth flow");
    assert.equal(meta.category, "Architecture");
  });

  it("ignores header lines starting with #", () => {
    const meta = parseL1Legacy(`<!-- L1_START -->
# L1
subject: Real subject
<!-- L1_END -->`);
    assert.equal(meta.subject, "Real subject");
  });

  it("does not match bold syntax (modern format should use parseL1)", () => {
    // Legacy parser treats **subject:** as key "**subject" — not a clean match
    const meta = parseL1Legacy(`<!-- L1_START -->
**subject:** Modern doc
<!-- L1_END -->`);
    // The key would be "**subject" not "subject"
    assert.equal(meta.subject, undefined);
  });
});

// ── parseFile (integration) ────────────────────────────────────────

describe("parseFile", () => {
  let dir;
  beforeEach(() => { dir = tmpDir(); });
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  it("merges metadata line + L1 fields", () => {
    const fp = writeDoc(dir, "_TEST.md",
      `openclew@0.5.4 · type: Reference · status: Active · category: Auth

<!-- L1_START -->
**subject:** Auth architecture

**doc_brief:** JWT-based with Redis sessions.
<!-- L1_END -->`);
    const meta = parseFile(fp);
    assert.equal(meta.type, "Reference");
    assert.equal(meta.subject, "Auth architecture");
    assert.equal(meta.doc_brief, "JWT-based with Redis sessions.");
  });

  it("falls back to legacy L1 when no bold syntax", () => {
    const fp = writeDoc(dir, "_OLD.md",
      `openclew@0.2.0 · type: Guide

<!-- L1_START -->
subject: Legacy doc
doc_brief: Old style brief
<!-- L1_END -->`);
    const meta = parseFile(fp);
    assert.equal(meta.subject, "Legacy doc");
    assert.equal(meta.type, "Guide");
  });

  it("returns null for file with no L1 block at all", () => {
    const fp = writeDoc(dir, "_BARE.md", "# Just a heading\nSome text.");
    assert.equal(parseFile(fp), null);
  });

  it("returns null for nonexistent file", () => {
    assert.equal(parseFile("/nonexistent/path.md"), null);
  });

  it("returns null for L1 block with neither bold nor legacy fields", () => {
    const fp = writeDoc(dir, "_EMPTY_L1.md",
      `openclew@0.5.4

<!-- L1_START -->
just some random text
<!-- L1_END -->`);
    assert.equal(parseFile(fp), null);
  });

  it("parses div format (new oc-l1 wrapper)", () => {
    const fp = writeDoc(dir, "_DIV.md",
      `openclew@0.5.4 · type: Guide · status: Active · category: Test

<div class="oc-l1">

- **subject:** Div format doc
- **doc_brief:** Testing the new div-based L1 format.

</div>`);
    const meta = parseFile(fp);
    assert.equal(meta.type, "Guide");
    assert.equal(meta.subject, "Div format doc");
    assert.equal(meta.doc_brief, "Testing the new div-based L1 format.");
  });

  it("parses positional format (new pure Markdown)", () => {
    const fp = writeDoc(dir, "_POSITIONAL.md",
      `openclew@0.6.0 · type: Reference · status: Active · category: Format

- **subject:** Pure Markdown doc
- **doc_brief:** No wrappers, just Markdown.

---

# Summary
Some detailed content here.`);
    const meta = parseFile(fp);
    assert.equal(meta.type, "Reference");
    assert.equal(meta.status, "Active");
    assert.equal(meta.category, "Format");
    assert.equal(meta.subject, "Pure Markdown doc");
    assert.equal(meta.doc_brief, "No wrappers, just Markdown.");
  });
});

// ── walkDir ────────────────────────────────────────────────────────

describe("walkDir", () => {
  let dir;
  beforeEach(() => { dir = tmpDir(); });
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  it("traverses subdirectories recursively", () => {
    writeDoc(dir, "a.md", "");
    writeDoc(dir, "sub/b.md", "");
    writeDoc(dir, "sub/deep/c.md", "");
    const files = walkDir(dir).map(f => path.relative(dir, f)).sort();
    assert.deepEqual(files, ["a.md", "sub/b.md", "sub/deep/c.md"]);
  });

  it("skips hardcoded dirs (_archive, old, .Rproj.user)", () => {
    writeDoc(dir, "good.md", "");
    writeDoc(dir, "_archive/skip.md", "");
    writeDoc(dir, "old/skip.md", "");
    writeDoc(dir, ".Rproj.user/skip.md", "");
    const files = walkDir(dir).map(f => path.basename(f));
    assert.deepEqual(files, ["good.md"]);
  });

  it("skips caller-specified extra dirs", () => {
    writeDoc(dir, "good.md", "");
    writeDoc(dir, "log/skip.md", "");
    writeDoc(dir, "notes/skip.md", "");
    const files = walkDir(dir, new Set(["log", "notes"])).map(f => path.basename(f));
    assert.deepEqual(files, ["good.md"]);
  });

  it("returns empty for nonexistent dir (no crash)", () => {
    assert.deepEqual(walkDir("/nonexistent/path"), []);
  });
});

// ── collectDocs ────────────────────────────────────────────────────

describe("collectDocs", () => {
  let dir;
  beforeEach(() => { dir = tmpDir(); });
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  const REF_DOC = `openclew@0.5.4 · type: Reference · status: Active

<div class="oc-l1">

- **subject:** Test ref
- **doc_brief:** A ref

</div>`;

  const LOG = `openclew@0.5.4 · date: 2026-03-30 · type: Feature · status: Done

<div class="oc-l1">

- **subject:** Test log
- **doc_brief:** A log

</div>`;

  it("separates refs (kind=ref) from logs (kind=log)", () => {
    writeDoc(dir, "_ARCH.md", REF_DOC);
    writeDoc(dir, "log/2026-03-30_test.md", LOG);
    const docs = collectDocs(dir);
    assert.equal(docs.filter(d => d.kind === "ref").length, 1);
    assert.equal(docs.filter(d => d.kind === "log").length, 1);
  });

  it("always skips _INDEX.md (auto-generated, not a real doc)", () => {
    writeDoc(dir, "_INDEX.md", REF_DOC);
    writeDoc(dir, "_REAL.md", REF_DOC);
    const docs = collectDocs(dir);
    assert.equal(docs.length, 1);
    assert.equal(docs[0].filename, "_REAL.md");
  });

  it("finds refs in doc/ subdirs (e.g. doc/ref/_SUB.md)", () => {
    writeDoc(dir, "ref/_SUB.md", REF_DOC);
    const refs = collectDocs(dir).filter(d => d.kind === "ref");
    assert.equal(refs.length, 1);
    assert.equal(refs[0].filename, "_SUB.md");
  });

  it("does NOT treat _*.md in log/ as refs", () => {
    writeDoc(dir, "log/_NOT_A_REF_DOC.md", REF_DOC);
    const refs = collectDocs(dir).filter(d => d.kind === "ref");
    assert.equal(refs.length, 0);
  });

  it("sorts logs newest first (reverse alphabetical = reverse chronological)", () => {
    writeDoc(dir, "log/2026-03-01_old.md", LOG);
    writeDoc(dir, "log/2026-03-15_mid.md", LOG);
    writeDoc(dir, "log/2026-03-30_new.md", LOG);
    const logs = collectDocs(dir).filter(d => d.kind === "log");
    assert.equal(logs[0].filename, "2026-03-30_new.md");
    assert.equal(logs[2].filename, "2026-03-01_old.md");
  });

  it("skips unparseable files silently", () => {
    writeDoc(dir, "_GOOD.md", REF_DOC);
    writeDoc(dir, "_BAD.md", "# No metadata at all");
    const docs = collectDocs(dir);
    assert.equal(docs.length, 1);
    assert.equal(docs[0].filename, "_GOOD.md");
  });
});

// ── searchDocs ─────────────────────────────────────────────────────

describe("searchDocs", () => {
  let dir;
  beforeEach(() => { dir = tmpDir(); });
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  function seedDocs() {
    writeDoc(dir, "_AUTH.md",
      `openclew@0.5.4 · type: Reference · status: Active · category: Security · keywords: [JWT, OAuth]

<div class="oc-l1">

- **subject:** Authentication architecture
- **doc_brief:** JWT-based auth with Redis session storage.

</div>`);
    writeDoc(dir, "_DEPLOY.md",
      `openclew@0.5.4 · type: Guide · status: Active · category: Infra · keywords: [docker, CI]

<div class="oc-l1">

- **subject:** Deploy pipeline
- **doc_brief:** CI/CD setup using GitHub Actions and Docker.

</div>`);
    writeDoc(dir, "_API.md",
      `openclew@0.5.4 · type: Reference · status: Active · category: API · keywords: [REST, auth]

<div class="oc-l1">

- **subject:** API reference
- **doc_brief:** REST endpoints including auth routes.

</div>`);
  }

  it("subject match (weight 3) ranks higher than keyword match (weight 2)", () => {
    seedDocs();
    const results = searchDocs(dir, "auth");
    // _AUTH.md has "auth" in subject (3) + brief (2) + keywords (2) = 7+bonuses
    // _API.md has "auth" in brief (2) + keywords (2) = 4+bonuses
    assert.equal(results[0].filename, "_AUTH.md");
  });

  it("multi-term query — docs matching more terms score higher", () => {
    seedDocs();
    // "auth" appears in _AUTH.md and _API.md, "JWT" only in _AUTH.md
    const results = searchDocs(dir, "auth JWT");
    assert.ok(results.length >= 1);
    assert.equal(results[0].filename, "_AUTH.md");
  });

  it("returns empty for empty/whitespace query", () => {
    seedDocs();
    assert.deepEqual(searchDocs(dir, ""), []);
    assert.deepEqual(searchDocs(dir, "   "), []);
  });

  it("returns empty when nothing matches", () => {
    seedDocs();
    assert.deepEqual(searchDocs(dir, "zzzznotfound"), []);
  });

  it("exact word match gets bonus over substring match", () => {
    writeDoc(dir, "_REST.md",
      `openclew@0.5.4 · type: Reference · status: Active

<div class="oc-l1">

- **subject:** REST API design
- **doc_brief:** RESTful endpoints

</div>`);
    writeDoc(dir, "_RESTORE.md",
      `openclew@0.5.4 · type: Reference · status: Active

<div class="oc-l1">

- **subject:** Restore backup procedure
- **doc_brief:** How to restore from backup

</div>`);
    const results = searchDocs(dir, "rest");
    // _REST.md has exact word "REST" → gets bonus
    // _RESTORE.md has "restore" which contains "rest" as substring only
    assert.equal(results[0].filename, "_REST.md");
  });

  it("search is case-insensitive", () => {
    seedDocs();
    const upper = searchDocs(dir, "JWT");
    const lower = searchDocs(dir, "jwt");
    assert.equal(upper.length, lower.length);
    assert.equal(upper[0].filename, lower[0].filename);
  });
});
