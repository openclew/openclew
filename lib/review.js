/**
 * openclew review — refs that may be outdated (read-only).
 *
 * A ref is a candidate when it is marked deprecated (status, type or brief
 * wording, any age), or when it has not been touched for `age_days` (latest of
 * git commit, `updated`, `reviewed`) AND shows at least one signal: orphan
 * (few inbound links), transient status, dead backticked paths, twin subject.
 * Ranked by weighted signals, then age.
 * Thresholds and weights: templates/embedded/review.json (SSOT shared with Rust).
 *
 * Zero dependencies — Node 16+ standard library only.
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { collectDocs } = require("./search");
const { render, today: localToday } = require("./templates");

const CONFIG = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "templates", "embedded", "review.json"), "utf-8")
);
// The journal cites refs by name: it must never count as an inbound link
const SKIP_FILES = new Set(["_INDEX.md", "_INDEX_NOTES.md", path.basename(CONFIG.journal)]);
const MD_TOKEN = /[\p{L}\p{N}_.\-]+\.md/gu;
const BACKTICK_PATH = /`([\p{L}\p{N}_.\-]+(?:\/[\p{L}\p{N}_.\-]+)+\.[A-Za-z0-9]+)`/gu;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function dayNumber(date) {
  if (!date || !DATE_RE.test(date)) return null;
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
}

/** Latest commit date per path (relative to root), from one `git log` */
function gitLastDates(root) {
  const dates = {};
  let out;
  try {
    out = execFileSync("git", ["-C", root, "log", "--format=@@%as", "--name-only", "--relative", "--", "doc"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 256 * 1024 * 1024,
    });
  } catch {
    return dates;
  }
  let current = null;
  for (const line of out.split("\n")) {
    if (line.startsWith("@@")) current = line.slice(2);
    else if (line.trim() && !(line in dates)) dates[line] = current;
  }
  return dates;
}

/** Text files of the project, skipping hidden, build and vendored dirs */
function scanFiles(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!CONFIG.skip_dirs.includes(entry.name)) scanFiles(full, out);
    } else if (entry.isFile() && !SKIP_FILES.has(entry.name)) {
      const ext = path.extname(entry.name).slice(1).toLowerCase();
      if (CONFIG.scan_extensions.includes(ext)) out.push(full);
    }
  }
  return out;
}

function readSmall(file) {
  try {
    if (fs.statSync(file).size > CONFIG.max_scan_bytes) return "";
    return fs.readFileSync(file, "utf-8");
  } catch {
    return "";
  }
}

/** Number of files citing each `.md` basename (a file counts once) */
function inboundCounts(root) {
  const counts = {};
  for (const file of scanFiles(root)) {
    const names = new Set((readSmall(file).match(MD_TOKEN) || []).map((t) => path.basename(t)));
    for (const name of names) counts[name] = (counts[name] || 0) + 1;
  }
  return counts;
}

function words(text) {
  return (text || "").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

/** Archived by status (spec or legacy wording) or by location (archive/ dir) */
function isArchived(rel, status) {
  if (words(status).some((w) => CONFIG.archived_statuses.includes(w))) return true;
  return rel.split("/").slice(0, -1).some((seg) => CONFIG.archive_dirs.includes(seg));
}

/** Deprecated or redirect wording in status, type, or first word of subject/brief */
function isDeprecated(meta) {
  const marked = (text) => words(text).some((w) => CONFIG.deprecated_markers.includes(w));
  const first = (text) => CONFIG.deprecated_markers.includes(words(text)[0]);
  return marked(meta.status) || marked(meta.type) || first(meta.subject) || first(meta.doc_brief);
}

function normalizeSubject(subject) {
  return (subject || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function deadPaths(content, root, refDir) {
  const dead = new Set();
  for (const m of content.matchAll(BACKTICK_PATH)) {
    const p = m[1];
    if (p.includes("..")) continue;
    // Resolved from the project, the ref's folder, or a sibling project
    const bases = [root, refDir, path.dirname(root)];
    if (!bases.some((base) => fs.existsSync(path.join(base, p)))) dead.add(p);
  }
  return [...dead].sort();
}

/**
 * @param {string} root project root (contains doc/)
 * @param {{today?: string, useGit?: boolean}} opts
 */
function reviewRefs(root, { today = localToday(), useGit = true } = {}) {
  const docDir = path.join(root, "doc");
  const refs = collectDocs(docDir)
    .filter((d) => d.kind === "ref")
    .map((d) => ({ ...d, rel: toPosix(path.relative(root, d.filepath)) }))
    .filter((d) => !isArchived(d.rel, d.meta.status));
  const gitDates = useGit ? gitLastDates(root) : {};
  const inbound = inboundCounts(root);
  const todayNum = dayNumber(today);

  const bySubject = {};
  for (const r of refs) {
    const key = normalizeSubject(r.meta.subject);
    if (key) (bySubject[key] = bySubject[key] || []).push(r.rel);
  }

  const candidates = [];
  for (const r of refs) {
    const dates = [gitDates[r.rel], r.meta.updated, r.meta.created, r.meta.reviewed]
      .map((s) => (s || "").trim())
      .filter((s) => dayNumber(s) !== null)
      .sort();
    const deprecated = isDeprecated(r.meta);
    const lastTouch = dates.length ? dates[dates.length - 1] : "";
    const age = dates.length ? todayNum - dayNumber(lastTouch) : null;
    const old = age !== null && age > CONFIG.age_days;
    if (!deprecated && !old) continue;

    const content = readSmall(r.filepath);
    const selfCite = (content.match(MD_TOKEN) || []).some((t) => path.basename(t) === r.filename);
    const inboundCount = (inbound[r.filename] || 0) - (selfCite ? 1 : 0);
    const status = (r.meta.status || "").trim();
    const dead = deadPaths(content, root, path.dirname(r.filepath));
    const twins = (bySubject[normalizeSubject(r.meta.subject)] || []).filter((p) => p !== r.rel).sort();

    const signals = deprecated ? ["deprecated"] : [];
    if (old) {
      if (inboundCount <= CONFIG.orphan_max_inbound) signals.push("orphan");
      if (CONFIG.transient_statuses.includes(status.toLowerCase())) signals.push("transient");
      if (dead.length) signals.push("dead_paths");
      if (twins.length) signals.push("twin");
    }
    if (!signals.length) continue;

    candidates.push({
      path: r.rel,
      subject: r.meta.subject || "",
      status,
      last_touch: lastTouch,
      age_days: age,
      inbound: inboundCount,
      score: signals.reduce((sum, s) => sum + CONFIG.signal_weights[s], 0),
      signals,
      dead_paths: dead,
      twin_of: twins,
    });
  }

  candidates.sort(
    (a, b) => b.score - a.score || (b.age_days ?? -1) - (a.age_days ?? -1) || (a.path < b.path ? -1 : 1)
  );
  return { today, age_days: CONFIG.age_days, refs_scanned: refs.length, candidates };
}

function signalLabel(c) {
  return c.signals
    .map((s) => {
      if (s === "transient") return `transient: ${c.status}`;
      if (s === "dead_paths") return `dead paths: ${c.dead_paths.length}`;
      if (s === "orphan") return `orphan (${c.inbound} link${c.inbound === 1 ? "" : "s"})`;
      return s;
    })
    .join(" · ");
}

function formatMarkdown(report, top) {
  const { candidates } = report;
  const lines = [
    `# openclew review — ${report.today}`,
    "",
    `${candidates.length} candidate(s) out of ${report.refs_scanned} refs (untouched for more than ${report.age_days} days, with at least one signal).`,
  ];
  if (!candidates.length) return lines.join("\n") + "\n";
  lines.push("", "| Ref | Subject | Age (days) | Signals |", "|---|---|---:|---|");
  for (const c of candidates.slice(0, top)) {
    lines.push(`| \`${c.path}\` | ${c.subject.replace(/\|/g, "\\|")} | ${c.age_days ?? "—"} | ${signalLabel(c)} |`);
  }
  if (candidates.length > top) lines.push("", `Top ${top} shown: --top ${candidates.length} for all, --json for details.`);
  return lines.join("\n") + "\n" + render("review-footer.md", { DATE: report.today });
}

/** Checkout block: top N candidates, or "" when there is none (zero line, zero token) */
function formatCheckout(report, top) {
  const shown = report.candidates.slice(0, top);
  if (!shown.length) return "";
  const rows = shown.map((c) => `     - ${c.path} — ${c.subject} (${c.age_days ?? "—"} d: ${signalLabel(c)})`).join("\n");
  return render("review-checkout.md", {
    COUNT: String(report.candidates.length),
    SHOWN: String(shown.length),
    ROWS: rows,
    DATE: report.today,
  });
}

function run() {
  const args = process.argv.slice(3);
  const root = process.cwd();
  if (!fs.existsSync(path.join(root, "doc"))) {
    console.error("No doc/ directory found. Run 'openclew init' first.");
    process.exit(1);
  }
  const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
  const apply = require("./review-apply");
  try {
    if (opt("--archive")) {
      apply.archiveRef(root, opt("--archive"), { supersededBy: opt("--superseded-by"), why: opt("--why") });
      console.log(`Archived ${opt("--archive")} (journal: ${CONFIG.journal})`);
      return;
    }
    if (opt("--confirm")) {
      apply.confirmRef(root, opt("--confirm"), { why: opt("--why") });
      console.log(`Confirmed ${opt("--confirm")} (journal: ${CONFIG.journal})`);
      return;
    }
  } catch (e) {
    console.error(`error: ${e.message}`);
    process.exit(1);
  }
  if (args.includes("--apply")) {
    const result = apply.applyRefs(root, { commit: args.includes("--commit") });
    process.stdout.write(apply.formatApply(result) || "No automatic gesture.\n");
    return;
  }
  const top = parseInt(opt("--top"), 10) || CONFIG.top_default;
  const report = reviewRefs(root);
  if (args.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    process.stdout.write(formatMarkdown(report, top));
  }
}

module.exports = {
  reviewRefs,
  formatMarkdown,
  formatCheckout,
  CONFIG,
  run,
  // shared with review-apply.js
  BACKTICK_PATH,
  dayNumber,
  deadPaths,
  isArchived,
  isDeprecated,
  scanFiles,
  toPosix,
};

if (require.main === module || process.argv[2] === "review") {
  run();
}
