const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { readConfig, writeConfig } = require("../lib/config");

describe("config", () => {
  it("writeConfig keeps keys it does not set (init must not drop project settings)", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "oc-config-"));
    fs.writeFileSync(path.join(root, ".openclew.json"), JSON.stringify({ entryPoint: "AGENTS.md", reviewCommit: { one: "x" } }));
    writeConfig({ entryPoint: "CLAUDE.md" }, root);
    assert.deepEqual(readConfig(root), { entryPoint: "CLAUDE.md", reviewCommit: { one: "x" } });
  });
});
