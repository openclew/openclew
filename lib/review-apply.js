/**
 * openclew review — gestures on refs, never a deletion nor a move.
 *
 * Deterministic pass (`--apply`, run by checkout):
 *   - refresh: a dead backticked path is rewritten when its move is proven,
 *     with exactly one match: the cited path was relative to a subfolder
 *     (a file ends with it), or a legacy `<dir>/_NAME.md` became
 *     `<dir>/ref/.../NAME.md`. A mere same-name file elsewhere is no proof;
 *   - archive: a ref marked deprecated/redirect whose replacement is proven
 *     (same-name cited ref that exists, or the only existing ref cited in L1)
 *     gets `status: Archived` + `superseded_by`, in place.
 * Judged gestures (agent): `--archive`, `--confirm`.
 * Every gesture is appended to the journal (CONFIG.journal).
 *
 * Zero dependencies — Node 16+ standard library only.
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { collectDocs } = require("./search");
const { render, today: localToday } = require("./templates");
const { readConfig } = require("./config");
const {
  CONFIG,
  deadPaths,
  isArchived,
  isDeprecated,
  toPosix,
} = require("./review");

const MD_PATH = /[\p{L}\p{N}_.\-]+(?:\/[\p{L}\p{N}_.\-]+)+\.md/gu;

function git(root, args) {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] });
}

/** Refs with uncommitted changes (modified, staged, untracked): never touched */
function dirtyPaths(root) {
  try {
    const out =
      git(root, ["ls-files", "-m", "-o", "--exclude-standard", "--", "doc"]) +
      git(root, ["diff", "--cached", "--name-only", "--relative", "--", "doc"]);
    return new Set(out.split("\n").filter(Boolean));
  } catch {
    return new Set();
  }
}

const stripUnderscore = (name) => name.replace(/^_+/, "");

/** All files under base by exact name, cached */
const indexCache = new Map();
function fileIndex(base) {
  if (indexCache.has(base)) return indexCache.get(base);
  const byName = new Map();
  const add = (key, rel) => byName.set(key, [...(byName.get(key) || []), rel]);
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!CONFIG.skip_dirs.includes(entry.name)) walk(full);
      } else if (entry.isFile()) {
        add(entry.name, toPosix(path.relative(base, full)));
      }
    }
  };
  walk(base);
  indexCache.set(base, byName);
  return byName;
}

const isDir = (p) => {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
};

/**
 * Proven new location of a dead path, in the project or the sibling it names:
 * `{ path, why }`, or null when there is not exactly one match
 */
function resolveMoved(root, cited) {
  const first = cited.split("/")[0];
  const sibling = !isDir(path.join(root, first)) && isDir(path.join(path.dirname(root), first));
  const base = sibling ? path.join(path.dirname(root), first) : root;
  const rest = sibling ? cited.slice(first.length + 1) : cited;
  const name = path.basename(rest);
  const index = fileIndex(base);
  const matches = new Map();
  for (const found of index.get(name) || []) {
    if (found.endsWith("/" + rest)) matches.set(found, "dead path, it was relative to a subfolder");
  }
  if (name.startsWith("_")) {
    const dir = path.posix.dirname(rest);
    const refDir = dir === "." ? "ref/" : `${dir}/ref/`;
    for (const found of index.get(stripUnderscore(name)) || []) {
      if (found.startsWith(refDir)) matches.set(found, "dead path, legacy _NAME moved to ref/");
    }
  }
  if (matches.size !== 1) return null;
  const [[found, why]] = matches;
  return { path: (sibling ? first + "/" : "") + found, why };
}

function existsFrom(root, refDir, p) {
  return [root, refDir, path.dirname(root)].map((b) => path.join(b, p)).find((full) => fs.existsSync(full)) || null;
}

/** Replacement of a deprecated ref, only when proven */
function archiveTarget(root, ref, content) {
  const refDir = path.dirname(ref.filepath);
  const cited = (text) =>
    [...new Set(text.match(MD_PATH) || [])].filter((p) => {
      const full = existsFrom(root, refDir, p);
      return full && path.resolve(full) !== path.resolve(ref.filepath);
    });
  const own = stripUnderscore(ref.filename);
  const sameName = cited(content).filter((p) => stripUnderscore(path.basename(p)) === own);
  if (sameName.length) return sameName[0];
  const l1 = content.split(/\n---\n|<!--\s*L1_END\s*-->/)[0];
  const inL1 = cited(l1);
  return inL1.length === 1 ? inL1[0] : null;
}

/**
 * Set metadata fields in place: line-1 metadata (`clw_ref@` / `openclew@`)
 * or a legacy `key: value` L1 block. Returns null for any other layout.
 */
function setFields(content, fields) {
  const lines = content.split("\n");
  if (/^(openclew|clw_ref)@/.test(lines[0])) {
    const parts = lines[0].split(" · ");
    for (const [key, value] of fields) {
      const idx = parts.findIndex((p, i) => i > 0 && p.split(":")[0].trim().toLowerCase() === key);
      if (idx > 0) parts[idx] = `${key}: ${value}`;
      else parts.push(`${key}: ${value}`);
    }
    lines[0] = parts.join(" · ");
    return lines.join("\n");
  }
  const start = lines.findIndex((l) => /<!--\s*L1_START\s*-->/.test(l));
  const end = lines.findIndex((l) => /<!--\s*L1_END\s*-->/.test(l));
  if (start < 0 || end < start) return null;
  let insertAt = end;
  for (const [key, value] of fields) {
    const idx = lines.findIndex((l, i) => i > start && i < insertAt && l.startsWith(`${key}:`));
    if (idx > 0) {
      lines[idx] = `${key}: ${value}`;
      insertAt = idx + 1;
    } else {
      lines.splice(insertAt, 0, `${key}: ${value}`);
      insertAt += 1;
    }
  }
  return lines.join("\n");
}

const cell = (text) => String(text).replace(/\|/g, "\\|").replace(/\n/g, " ");

function journal(root, entries) {
  if (!entries.length) return;
  const file = path.join(root, CONFIG.journal);
  let content = fs.existsSync(file) ? fs.readFileSync(file, "utf-8") : render("review-journal.md");
  if (!content.endsWith("\n")) content += "\n";
  for (const e of entries) {
    const gesture = e.detail ? `${e.gesture} (${e.detail})` : e.gesture;
    content += `| ${e.date} | ${e.by} | ${e.path} | ${cell(gesture)} | ${cell(e.why)} |\n`;
  }
  fs.writeFileSync(file, content, "utf-8");
}

/** Commit title agreed in number; `.openclew.json` `reviewCommit: { one, many }` overrides it */
function commitTitle(root, count) {
  const forms = { ...CONFIG.commit_title, ...((readConfig(root) || {}).reviewCommit || {}) };
  return (count === 1 ? forms.one : forms.many).split("{{COUNT}}").join(String(count));
}

/** Dedicated commit of the touched files only; returns the short sha re-read from git */
function commitGestures(root, paths, message) {
  try {
    git(root, ["add", "--", ...paths]);
    git(root, ["commit", "-q", "-m", message, "--only", "--", ...paths]);
    return git(root, ["rev-parse", "--short", "HEAD"]).trim();
  } catch {
    return null;
  }
}

function refsOf(root) {
  return collectDocs(path.join(root, "doc"))
    .filter((d) => d.kind === "ref")
    .map((d) => ({ ...d, rel: toPosix(path.relative(root, d.filepath)) }));
}

/**
 * Deterministic pass. Skips archived refs and refs with uncommitted changes.
 * @param {{today?: string, useGit?: boolean, commit?: boolean}} opts
 */
function applyRefs(root, { today = localToday(), useGit = true, commit = false } = {}) {
  indexCache.clear();
  const dirty = useGit ? dirtyPaths(root) : new Set();
  const gestures = [];
  const touched = [];

  for (const ref of refsOf(root)) {
    if (isArchived(ref.rel, ref.meta.status) || dirty.has(ref.rel)) continue;
    const original = fs.readFileSync(ref.filepath, "utf-8");
    let content = original;
    const refDir = path.dirname(ref.filepath);

    for (const dead of deadPaths(content, root, refDir)) {
      const moved = resolveMoved(root, dead);
      if (!moved) continue;
      content = content.split("`" + dead + "`").join("`" + moved.path + "`");
      gestures.push({ path: ref.rel, gesture: "refresh", detail: `\`${dead}\` → \`${moved.path}\``, why: moved.why });
    }

    if (isDeprecated(ref.meta)) {
      const target = archiveTarget(root, ref, content);
      const archived = target && setFields(content, [["status", "Archived"], ["superseded_by", target]]);
      if (archived) {
        content = archived;
        gestures.push({ path: ref.rel, gesture: "archive", detail: `superseded_by: ${target}`, why: "marked deprecated or redirect, replacement exists" });
      }
    }

    if (content !== original) {
      fs.writeFileSync(ref.filepath, content, "utf-8");
      touched.push(ref.rel);
    }
  }

  journal(root, gestures.map((g) => ({ ...g, date: today, by: "auto" })));
  let committed = null;
  if (commit && useGit && touched.length) {
    const body = gestures.map((g) => `- ${g.path}: ${g.gesture} ${g.detail}`).join("\n");
    committed = commitGestures(root, [...touched, CONFIG.journal], `${commitTitle(root, gestures.length)}\n\n${body}`);
  }
  return { today, gestures, touched, committed };
}

function judged(root, rel, fields, entry, today) {
  if (!entry.why) throw new Error("--why is required: say why, it goes to the journal");
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) throw new Error(`No such ref: ${rel}`);
  const updated = setFields(fs.readFileSync(file, "utf-8"), fields);
  if (updated === null) throw new Error(`${rel}: metadata layout not supported, edit it by hand`);
  fs.writeFileSync(file, updated, "utf-8");
  journal(root, [{ path: toPosix(rel), date: today, by: "agent", ...entry }]);
}

/** Judged archive: in place, with an optional replacement that must exist */
function archiveRef(root, rel, { supersededBy = null, why, today = localToday() } = {}) {
  const fields = [["status", "Archived"]];
  if (supersededBy) {
    if (!existsFrom(root, path.dirname(path.join(root, rel)), supersededBy)) {
      throw new Error(`Replacement not found: ${supersededBy}`);
    }
    fields.push(["superseded_by", supersededBy]);
  }
  judged(root, rel, fields, { gesture: "archive", detail: supersededBy ? `superseded_by: ${supersededBy}` : "", why }, today);
}

/** Judged confirmation: still true, takes the ref out of the score for age_days */
function confirmRef(root, rel, { why, today = localToday() } = {}) {
  judged(root, rel, [["reviewed", today]], { gesture: "confirm", detail: "", why }, today);
}

/** Re-read summary of a deterministic pass, for checkout and the CLI */
function formatApply(result) {
  if (!result.gestures.length) return "";
  const lines = result.gestures.map((g) => `     - ${g.path}: ${g.gesture} ${g.detail}`);
  const commit = result.committed ? `committed ${result.committed}` : "not committed";
  return [`  🧹 Automatic cleanup: ${result.gestures.length} gesture(s), ${commit} (journal: ${CONFIG.journal})`, ...lines].join("\n") + "\n";
}

module.exports = { applyRefs, archiveRef, commitTitle, confirmRef, formatApply, setFields, resolveMoved };
