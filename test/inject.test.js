const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { inject, isAlreadyInjected, MARKER_START, OPENCLEW_BLOCK } = require("../lib/inject");

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "oc-inject-"));
}

describe("inject", () => {
  let dir;
  beforeEach(() => { dir = tmpDir(); });
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  it("appends block to a fresh file, returns 'created'", () => {
    const fp = path.join(dir, "AGENTS.md");
    fs.writeFileSync(fp, "# My project\n");
    assert.equal(inject(fp), "created");
    const content = fs.readFileSync(fp, "utf-8");
    assert.ok(content.includes(MARKER_START));
    assert.ok(content.includes("<!-- openclew_END -->"));
  });

  it("preserves original content before the injected block", () => {
    const fp = path.join(dir, "AGENTS.md");
    const original = "# My project\n\nExisting rules here.\n";
    fs.writeFileSync(fp, original);
    inject(fp);
    const content = fs.readFileSync(fp, "utf-8");
    assert.ok(content.startsWith(original));
  });

  it("is idempotent — second inject with same content returns false", () => {
    const fp = path.join(dir, "AGENTS.md");
    fs.writeFileSync(fp, "# My project\n");
    inject(fp);
    assert.equal(inject(fp), false);
  });

  it("updates block when OPENCLEW_BLOCK content changes", () => {
    const fp = path.join(dir, "AGENTS.md");
    // Simulate an old block (different content between markers)
    const oldBlock = `${MARKER_START}\nOLD CONTENT\n<!-- openclew_END -->`;
    fs.writeFileSync(fp, `# My project\n\n${oldBlock}\n`);
    assert.equal(isAlreadyInjected(fp), true);
    const result = inject(fp);
    assert.equal(result, "updated");
    const content = fs.readFileSync(fp, "utf-8");
    assert.ok(content.includes(OPENCLEW_BLOCK));
    assert.ok(!content.includes("OLD CONTENT"));
  });

  it("does not duplicate markers on update", () => {
    const fp = path.join(dir, "AGENTS.md");
    fs.writeFileSync(fp, "# My project\n");
    inject(fp);
    // Simulate block change by manually altering
    const content = fs.readFileSync(fp, "utf-8");
    fs.writeFileSync(fp, content.replace("Project knowledge", "MODIFIED"), "utf-8");
    inject(fp);
    const final = fs.readFileSync(fp, "utf-8");
    const markerCount = (final.match(/openclew_START/g) || []).length;
    assert.equal(markerCount, 1);
  });
});
