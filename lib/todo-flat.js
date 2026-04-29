/**
 * openclew flat TODO.md parser.
 *
 * Reads TODO.md (flat checklist format) and extracts from/closed metadata
 * from inline HTML comments:
 *
 *   - [ ] **Title** : Description. <!-- from: doc/log/foo.md -->
 *   - [x] **Title** : Description (2026-04-29). <!-- from: ... --> <!-- closed: ... -->
 *
 * Rules:
 *   - from:   required on every TODO (- [ ] and - [x])
 *   - closed: required on every checked TODO (- [x])
 *   - Both accept a doc path or free-text reference
 *
 * Zero dependencies.
 */

const fs = require("fs");

const TODO_LINE_RE = /^(\s*)-\s*\[([ xX])\]\s+(.*)$/;
const FROM_RE = /<!--\s*from:\s*([^]*?)-->/i;
const CLOSED_RE = /<!--\s*closed:\s*([^]*?)-->/i;
const TITLE_RE = /\*\*(.+?)\*\*/;

/**
 * Parse a TODO.md flat file. Returns one entry per `- [ ]` / `- [x]` line.
 *
 * @param {string} filepath
 * @returns {Array<{lineNum, raw, status, title, description, from, closed, indent}>}
 */
function parseFlatTodos(filepath) {
  let content;
  try {
    content = fs.readFileSync(filepath, "utf-8");
  } catch {
    return [];
  }
  return parseFlatTodosFromString(content);
}

function parseFlatTodosFromString(content) {
  const lines = content.split("\n");
  const todos = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(TODO_LINE_RE);
    if (!m) continue;
    const [, indent, mark, rest] = m;
    const status = mark.trim().toLowerCase() === "x" ? "done" : "open";

    const fromMatch = line.match(FROM_RE);
    const closedMatch = line.match(CLOSED_RE);
    const from = fromMatch ? fromMatch[1].trim() : "";
    const closed = closedMatch ? closedMatch[1].trim() : "";

    // Strip HTML comments to extract plain title/description
    const stripped = rest.replace(/<!--[\s\S]*?-->/g, "").trim();
    const titleMatch = stripped.match(TITLE_RE);
    const title = titleMatch ? titleMatch[1].trim() : "";
    let description = stripped;
    if (titleMatch) {
      description = stripped
        .replace(TITLE_RE, "")
        .replace(/^\s*[:\-—]\s*/, "")
        .trim();
    }

    todos.push({
      lineNum: i + 1,
      raw: line,
      indent,
      status,
      title,
      description,
      from,
      closed,
    });
  }
  return todos;
}

/**
 * Validate a parsed flat TODO list against the from/closed rules.
 *
 * @param {Array} todos
 * @returns {{missingFrom: Array, doneMissingClosed: Array}}
 */
function validateFlatTodos(todos) {
  const missingFrom = todos.filter((t) => !t.from);
  const doneMissingClosed = todos.filter((t) => t.status === "done" && !t.closed);
  return { missingFrom, doneMissingClosed };
}

/**
 * Rewrite a TODO.md line to inject or replace a from/closed marker.
 * Returns the modified line.
 *
 * @param {string} line - original TODO line
 * @param {{from?: string, closed?: string}} fields
 * @returns {string}
 */
function setMarkers(line, fields) {
  let result = line;
  if (fields.from !== undefined) {
    result = setOrAppendMarker(result, "from", fields.from, FROM_RE);
  }
  if (fields.closed !== undefined) {
    result = setOrAppendMarker(result, "closed", fields.closed, CLOSED_RE);
  }
  return result;
}

function setOrAppendMarker(line, name, value, regex) {
  const marker = `<!-- ${name}: ${value} -->`;
  if (regex.test(line)) {
    return line.replace(regex, marker);
  }
  return line.replace(/\s*$/, "") + " " + marker;
}

module.exports = {
  parseFlatTodos,
  parseFlatTodosFromString,
  validateFlatTodos,
  setMarkers,
};
