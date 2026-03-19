/**
 * openclew checkout — end-of-session summary + log creation.
 *
 * 1. Collect git activity (today's commits, uncommitted changes)
 * 2. Display summary table
 * 3. Create a session log pre-filled with the activity
 * 4. Regenerate the index
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { slugifyLog, today } = require("./templates");
const { readConfig } = require("./config");

function ocVersion() {
  try {
    const pkg = require(path.join(__dirname, "..", "package.json"));
    return pkg.version;
  } catch {
    return "0.0.0";
  }
}

const PROJECT_ROOT = process.cwd();
const DOC_DIR = path.join(PROJECT_ROOT, "doc");
const LOG_DIR = path.join(DOC_DIR, "log");

function run(cmd) {
  try {
    return execSync(cmd, { cwd: PROJECT_ROOT, encoding: "utf-8" }).trim();
  } catch {
    return "";
  }
}

function collectGitActivity() {
  const date = today();

  // Today's commits
  const commitLog = run(
    `git log --since="${date} 00:00" --format="%h %s" --no-merges`
  );
  const commits = commitLog
    ? commitLog.split("\n").filter((l) => l.trim())
    : [];

  // Uncommitted changes
  const status = run("git status --porcelain");
  const uncommitted = status ? status.split("\n").filter((l) => l.trim()) : [];

  // Files changed today (committed)
  const changedFiles = run(
    `git diff --name-only HEAD~${Math.max(commits.length, 1)}..HEAD 2>/dev/null`
  );
  const files = changedFiles
    ? changedFiles.split("\n").filter((l) => l.trim())
    : [];

  // Today's logs already created
  const existingLogs = fs.existsSync(LOG_DIR)
    ? fs.readdirSync(LOG_DIR).filter((f) => f.startsWith(date))
    : [];

  // Refdocs
  const refdocs = fs.existsSync(DOC_DIR)
    ? fs.readdirSync(DOC_DIR).filter((f) => f.startsWith("_") && f !== "_INDEX.md" && f.endsWith(".md"))
    : [];

  return { date, commits, uncommitted, files, existingLogs, refdocs };
}

function extractActions(commits) {
  // Group commits by type (feat, fix, refactor, docs, etc.)
  return commits.map((c) => {
    const match = c.match(/^([a-f0-9]+)\s+(\w+)(?:\(([^)]*)\))?:\s*(.+)$/);
    if (match) {
      return {
        hash: match[1],
        type: match[2],
        scope: match[3] || "",
        desc: match[4],
      };
    }
    // Non-conventional commit
    const parts = c.match(/^([a-f0-9]+)\s+(.+)$/);
    return {
      hash: parts ? parts[1] : "",
      type: "other",
      scope: "",
      desc: parts ? parts[2] : c,
    };
  });
}

function typeLabel(type) {
  const labels = {
    feat: "Feature",
    fix: "Fix",
    refactor: "Refactor",
    docs: "Doc",
    test: "Test",
    build: "Build",
    chore: "Chore",
  };
  return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

function displaySummary(activity) {
  const { date, commits, uncommitted, existingLogs, refdocs } = activity;
  const actions = extractActions(commits);

  console.log(`\nopenclew checkout — ${date}\n`);

  if (actions.length === 0 && uncommitted.length === 0) {
    console.log("  Nothing to report — no commits or changes today.");
    console.log("");
    return null;
  }

  // Summary table
  if (actions.length > 0) {
    console.log("  Commits today:");
    console.log(
      "  ┌─────┬──────────────────────────────────────────────┬─────┐"
    );
    console.log(
      "  │ Sta │ Action                                       │ Com │"
    );
    console.log(
      "  ├─────┼──────────────────────────────────────────────┼─────┤"
    );
    for (const a of actions) {
      const label = `${typeLabel(a.type)} : ${a.desc}`;
      const truncated = label.length > 44 ? label.slice(0, 43) + "…" : label;
      const padded = truncated.padEnd(44);
      console.log(`  │ ✅  │ ${padded} │ 🟢  │`);
    }
    console.log(
      "  └─────┴──────────────────────────────────────────────┴─────┘"
    );
    console.log("");
  }

  if (uncommitted.length > 0) {
    console.log(`  Uncommitted changes: ${uncommitted.length} file(s)`);
    for (const line of uncommitted.slice(0, 10)) {
      console.log(`    ${line}`);
    }
    if (uncommitted.length > 10) {
      console.log(`    ... and ${uncommitted.length - 10} more`);
    }
    console.log("");
  }

  // Documentation status
  if (existingLogs.length > 0) {
    console.log(`  📗 Today's logs: ${existingLogs.join(", ")}`);
  } else {
    console.log("  📕 No log created today");
  }
  console.log("");

  // Refdocs reminder
  if (refdocs.length > 0) {
    console.log("  📚 Refdocs — check if any need updating:");
    for (const doc of refdocs) {
      console.log(`     ${doc}`);
    }
    console.log("");
  }

  return actions;
}

function generateSessionLog(activity, actions) {
  const { date } = activity;

  // Build a descriptive title from actions
  let sessionTitle;
  if (actions.length === 1) {
    sessionTitle = actions[0].desc;
  } else if (actions.length > 1) {
    const types = [...new Set(actions.map((a) => typeLabel(a.type)))];
    sessionTitle = types.join(" + ") + " session";
  } else {
    sessionTitle = "Work session";
  }

  // Build pre-filled log content
  const keywords = [
    ...new Set(actions.map((a) => a.scope).filter(Boolean)),
  ];
  const keywordsStr =
    keywords.length > 0 ? `[${keywords.join(", ")}]` : "[]";

  const commitList = actions
    .map((a) => `- ${typeLabel(a.type)}: ${a.desc} (${a.hash})`)
    .join("\n");

  const ver = ocVersion();
  const logType = actions.length === 1 ? actions[0].type === "fix" ? "Bug" : "Feature" : "Feature";
  const content = `openclew@${ver} · date: ${date} · type: ${logType} · status: Done · category: · keywords: ${keywordsStr}

<!-- L1_START -->
**subject:** ${sessionTitle}

**doc_brief:** ${actions.map((a) => a.desc).join(". ")}.
<!-- L1_END -->

---

<!-- L2_START -->
# L2 - Summary

## Objective
<!-- Why this work was undertaken -->

## What was done
${commitList}

## Result
<!-- Outcome — what works now that didn't before -->
<!-- L2_END -->

---

<!-- L3_START -->
# L3 - Details

<!-- Technical details, code changes, debugging steps... -->
<!-- L3_END -->
`;

  const slug = slugifyLog(sessionTitle);
  const filename = `${date}_${slug}.md`;
  const filepath = path.join(LOG_DIR, filename);

  if (fs.existsSync(filepath)) {
    console.log(`  Log already exists: doc/log/${filename}`);
    return null;
  }

  if (!fs.existsSync(LOG_DIR)) {
    console.log("  No doc/log/ directory. Run 'openclew init' first.");
    return null;
  }

  fs.writeFileSync(filepath, content, "utf-8");
  console.log(`  📝 Created doc/log/${filename}`);
  console.log("     Pre-filled with today's commits. Edit to add context.");
  return filename;
}

function regenerateIndex() {
  const indexScript = path.join(DOC_DIR, "generate-index.py");
  if (!fs.existsSync(indexScript)) return;

  try {
    execSync(`python3 "${indexScript}" "${DOC_DIR}"`, { stdio: "pipe" });
    console.log("  📋 Regenerated doc/_INDEX.md");
  } catch {
    // Silent — index will be regenerated on next commit anyway
  }
}

function main() {
  if (!fs.existsSync(DOC_DIR)) {
    console.error("No doc/ directory found. Run 'openclew init' first.");
    process.exit(1);
  }

  if (!readConfig(PROJECT_ROOT)) {
    console.warn("Warning: no .openclew.json found. Run 'openclew init' first.\n");
  }

  const activity = collectGitActivity();
  const actions = displaySummary(activity);

  if (!actions || actions.length === 0) {
    return;
  }

  // Create session log
  console.log("─── Log ───");
  const created = generateSessionLog(activity, actions);

  // Regenerate index
  if (created) {
    regenerateIndex();
  }

  console.log("");
}

main();
