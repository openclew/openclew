const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { extractLevel, handleMessage } = require("../lib/mcp-server");

const currentDoc = `clw_ref@0.7.0 · type: Reference · status: Active

- **subject:** Architecture
- **doc_brief:** Shared knowledge.

---

# Summary

## Objective
Keep knowledge portable.

---

# Details

## Implementation
Plain Markdown.
`;

function readDoc(docPath, level) {
  return handleMessage({
    jsonrpc: "2.0", id: 1, method: "tools/call",
    params: { name: "read_doc", arguments: { path: docPath, level } },
  }).result;
}

describe("MCP document levels", () => {
  it("reads the current positional L1 with its metadata", () => {
    assert.match(extractLevel(currentDoc, "L1"), /clw_ref@0\.7\.0/);
    assert.match(extractLevel(currentDoc, "L1"), /Shared knowledge/);
    assert.doesNotMatch(extractLevel(currentDoc, "L1"), /Objective/);
  });

  it("reads Summary without Details, and Details without Summary", () => {
    const summary = extractLevel(currentDoc, "L2");
    const details = extractLevel(currentDoc, "L3");
    assert.match(summary, /Keep knowledge portable/);
    assert.doesNotMatch(summary, /Plain Markdown/);
    assert.match(details, /Plain Markdown/);
    assert.doesNotMatch(details, /Keep knowledge portable/);
  });

  it("retains legacy marker support", () => {
    const legacy = `openclew@0.2.0\n<!-- L1_START -->\n**subject:** Old\n<!-- L1_END -->\n<!-- L2_START -->\nOld summary\n<!-- L2_END -->\n<!-- L3_START -->\nOld details\n<!-- L3_END -->`;
    assert.match(extractLevel(legacy, "L1"), /Old/);
    assert.equal(extractLevel(legacy, "L2"), "Old summary");
    assert.equal(extractLevel(legacy, "L3"), "Old details");
  });

  it("reads a real project ref via MCP", () => {
    const response = readDoc("doc/ref/INIT.md", "L2");
    assert.equal(response.isError, undefined);
    const doc = JSON.parse(response.content[0].text);
    assert.match(doc.content, /shared knowledge layer/);
    assert.doesNotMatch(doc.content, /Migration from earlier versions/);
    assert.doesNotMatch(doc.content, /---$/);
  });

  it("rejects traversal and non-document paths", () => {
    const sibling = `../${path.basename(process.cwd())}-other/doc/ref/INIT.md`;
    for (const candidate of [sibling, "../package.json", "package.json"]) {
      assert.equal(readDoc(candidate, "full").isError, true);
    }
  });
});
