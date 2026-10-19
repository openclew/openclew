const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { applyRefs, archiveRef, confirmRef, commitTitle } = require("../lib/review-apply");
const { reviewRefs } = require("../lib/review");

const FIXTURES = path.join(__dirname, "fixtures");
const TODAY = "2026-10-19";

/** Fresh copy of fixtures/review and its sibling project: apply writes files */
function workspace() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "oc-review-"));
  for (const name of ["review", "review-sibling"]) {
    fs.cpSync(path.join(FIXTURES, name), path.join(dir, name), { recursive: true });
  }
  return path.join(dir, "review");
}

const read = (root, rel) => fs.readFileSync(path.join(root, rel), "utf-8");

describe("review --apply (deterministic gestures)", () => {
  let root, result;
  before(() => {
    root = workspace();
    result = applyRefs(root, { today: TODAY, useGit: false });
  });

  it("applies only refresh and archive gestures it can prove", () => {
    assert.deepEqual(
      result.gestures.map((g) => [g.path, g.gesture, g.detail]),
      [
        ["doc/_LEGACY_REDIRECT.md", "archive", "superseded_by: review-sibling/doc/_LEGACY_REDIRECT.md"],
        ["doc/ref/MOVED_PATH.md", "refresh", "`deep/helper.js` → `src/deep/helper.js`"],
        ["doc/ref/MOVED_PATH.md", "refresh", "`notes/_SETUP.md` → `notes/ref/SETUP.md`"],
        ["doc/ref/OLD_API.md", "archive", "superseded_by: review-sibling/doc/ref/OLD_API.md"],
      ]
    );
  });

  it("rewrites a dead path only when the move is proven (subfolder suffix or legacy _NAME → ref/NAME)", () => {
    const content = read(root, "doc/ref/MOVED_PATH.md");
    assert.match(content, /`src\/deep\/helper\.js`/);
    assert.match(content, /`notes\/ref\/SETUP\.md`/);
    assert.match(content, /`lib\/dup\.js`/, "ambiguous: two files end with it");
    assert.match(content, /`backend\/config\.py`/, "same name elsewhere is not a proof");
  });

  it("archives in place: line-1 metadata and legacy L1 block", () => {
    assert.match(read(root, "doc/ref/OLD_API.md").split("\n")[0], / · status: Archived · .* · superseded_by: review-sibling\/doc\/ref\/OLD_API\.md$/);
    const legacy = read(root, "doc/_LEGACY_REDIRECT.md");
    assert.match(legacy, /\nstatus: Archived\nsuperseded_by: review-sibling\/doc\/_LEGACY_REDIRECT\.md\n/);
    assert.ok(fs.existsSync(path.join(root, "doc/_LEGACY_REDIRECT.md")));
  });

  it("leaves deprecated refs without a proven replacement to the agent", () => {
    assert.match(read(root, "doc/ref/DEPRECATED_NO_TARGET.md"), / · status: Active · /);
    const paths = reviewRefs(root, { today: TODAY, useGit: false }).candidates.map((c) => c.path);
    assert.ok(paths.includes("doc/ref/DEPRECATED_NO_TARGET.md"));
    assert.ok(!paths.includes("doc/ref/OLD_API.md"));
  });

  it("journals every gesture (when, who, what, why)", () => {
    const journal = read(root, "doc/review-journal.md");
    assert.match(journal, /^# Review journal/);
    assert.equal(journal.split("\n").filter((l) => l.startsWith(`| ${TODAY} | auto |`)).length, 4);
  });

  it("is idempotent", () => {
    assert.deepEqual(applyRefs(root, { today: TODAY, useGit: false }).gestures, []);
  });
});

describe("judged gestures (agent)", () => {
  it("confirm sets reviewed: and journals it", () => {
    const root = workspace();
    confirmRef(root, "doc/ref/TWIN_A.md", { why: "still accurate", today: TODAY });
    assert.match(read(root, "doc/ref/TWIN_A.md").split("\n")[0], / · reviewed: 2026-10-19$/);
    assert.match(read(root, "doc/review-journal.md"), /\| agent \| doc\/ref\/TWIN_A\.md \| confirm \| still accurate \|/);
  });

  it("archive refuses a replacement that does not exist, and never removes the file", () => {
    const root = workspace();
    assert.throws(() => archiveRef(root, "doc/ref/TWIN_B.md", { supersededBy: "doc/ref/NOPE.md", why: "x", today: TODAY }));
    archiveRef(root, "doc/ref/TWIN_B.md", { supersededBy: "doc/ref/TWIN_A.md", why: "merged into TWIN_A", today: TODAY });
    assert.match(read(root, "doc/ref/TWIN_B.md").split("\n")[0], /status: Archived · .*superseded_by: doc\/ref\/TWIN_A\.md/);
  });
});

describe("commit title", () => {
  it("agrees in number, and a project can override it in .openclew.json", () => {
    const root = workspace();
    assert.equal(commitTitle(root, 1), "docs(review): 1 automatic cleanup gesture");
    assert.equal(commitTitle(root, 47), "docs(review): 47 automatic cleanup gestures");
    fs.writeFileSync(
      path.join(root, ".openclew.json"),
      JSON.stringify({ reviewCommit: { one: "docs(review): 1 geste de nettoyage", many: "docs(review): {{COUNT}} gestes de nettoyage" } })
    );
    assert.equal(commitTitle(root, 1), "docs(review): 1 geste de nettoyage");
    assert.equal(commitTitle(root, 47), "docs(review): 47 gestes de nettoyage");
  });
});
