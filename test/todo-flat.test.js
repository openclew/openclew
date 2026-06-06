const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  parseFlatTodosFromString,
  validateFlatTodos,
  setMarkers,
} = require("../lib/todo-flat");

describe("parseFlatTodosFromString", () => {
  it("parses open and done status from the checkbox mark", () => {
    const todos = parseFlatTodosFromString(
      "- [ ] **Open** : do it\n- [x] **Done** : did it (2026-04-29)\n"
    );
    assert.equal(todos.length, 2);
    assert.equal(todos[0].status, "open");
    assert.equal(todos[1].status, "done");
  });

  it("extracts title and description, stripping HTML comment markers", () => {
    const [t] = parseFlatTodosFromString(
      "- [ ] **Title** : Description here. <!-- from: doc/log/x.md -->\n"
    );
    assert.equal(t.title, "Title");
    assert.equal(t.description, "Description here.");
  });

  it("extracts from and closed markers", () => {
    const [t] = parseFlatTodosFromString(
      "- [x] **Done** : d (2026-04-29). <!-- from: doc/log/a.md --> <!-- closed: doc/log/b.md -->\n"
    );
    assert.equal(t.from, "doc/log/a.md");
    assert.equal(t.closed, "doc/log/b.md");
  });

  it("accepts free-text from markers", () => {
    const [t] = parseFlatTodosFromString(
      "- [ ] **Idea** : x <!-- from: 2026-04-29 — cold idea -->\n"
    );
    assert.equal(t.from, "2026-04-29 — cold idea");
  });

  it("ignores non-todo lines", () => {
    const todos = parseFlatTodosFromString("# TODO\n\nSome prose.\n- [ ] **A** : a\n");
    assert.equal(todos.length, 1);
    assert.equal(todos[0].title, "A");
  });

  it("records 1-based line numbers", () => {
    const [t] = parseFlatTodosFromString("# TODO\n\n- [ ] **A** : a\n");
    assert.equal(t.lineNum, 3);
  });
});

describe("validateFlatTodos", () => {
  it("flags TODOs missing from (open and done alike)", () => {
    const todos = parseFlatTodosFromString(
      "- [ ] **NoFrom** : x\n- [ ] **HasFrom** : y <!-- from: doc/log/z.md -->\n"
    );
    const { missingFrom } = validateFlatTodos(todos);
    assert.equal(missingFrom.length, 1);
    assert.equal(missingFrom[0].title, "NoFrom");
  });

  it("flags done TODOs missing closed but not open ones", () => {
    const todos = parseFlatTodosFromString(
      "- [ ] **Open** : x <!-- from: a -->\n" +
        "- [x] **DoneNoClosed** : y (2026-04-29) <!-- from: a -->\n" +
        "- [x] **DoneClosed** : z (2026-04-29) <!-- from: a --> <!-- closed: b -->\n"
    );
    const { doneMissingClosed } = validateFlatTodos(todos);
    assert.equal(doneMissingClosed.length, 1);
    assert.equal(doneMissingClosed[0].title, "DoneNoClosed");
  });
});

describe("setMarkers", () => {
  it("appends a from marker when absent", () => {
    const line = setMarkers("- [ ] **A** : a", { from: "doc/log/x.md" });
    assert.ok(line.includes("<!-- from: doc/log/x.md -->"));
  });

  it("replaces an existing marker instead of duplicating", () => {
    const line = setMarkers(
      "- [ ] **A** : a <!-- from: old -->",
      { from: "new" }
    );
    assert.ok(line.includes("<!-- from: new -->"));
    assert.ok(!line.includes("old"));
    assert.equal((line.match(/from:/g) || []).length, 1);
  });

  it("adds a closed marker on closing", () => {
    const line = setMarkers(
      "- [x] **A** : a (2026-04-29) <!-- from: doc/log/x.md -->",
      { closed: "doc/log/y.md" }
    );
    assert.ok(line.includes("<!-- from: doc/log/x.md -->"));
    assert.ok(line.includes("<!-- closed: doc/log/y.md -->"));
  });
});
