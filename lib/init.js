/**
 * openclew init — set up openclew in the current project.
 *
 * 0. Create ~/.openclew/ (global config)
 * 1. Detect if we're in a project (project markers)
 *    - If not: stop after global config
 *    - If yes: proceed with project init
 * 2. Create doc/ and doc/log/
 * 3. Detect entry point (AGENTS.md case-insensitive by default)
 * 4. Inject openclew block into entry point
 * 5. Install pre-commit hook for index generation
 * 6. Create guide + example docs
 * 7. Generate initial _INDEX.md
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const readline = require("readline");
const { detectInstructionFiles, findAgentsMdCaseInsensitive } = require("./detect");
const { inject, isAlreadyInjected } = require("./inject");
const { writeConfig } = require("./config");
const { guideContent, frameworkIntegrationContent, exampleRefContent, exampleLogContent, todoContent, today, ocVersion } = require("./templates");

const PROJECT_ROOT = process.cwd();
const DOC_DIR = path.join(PROJECT_ROOT, "doc");
const REF_DIR = path.join(DOC_DIR, "ref");
const LOG_DIR = path.join(DOC_DIR, "log");
const GIT_DIR = path.join(PROJECT_ROOT, ".git");
const OPENCLEW_HOME = path.join(os.homedir(), ".openclew");

const PROJECT_MARKERS = [".git", "package.json", "Cargo.toml", "pyproject.toml", "go.mod", "Gemfile", "composer.json", "Makefile", "pom.xml", "build.gradle", "CMakeLists.txt", "setup.py", "setup.cfg"];

function isProjectDir() {
  return PROJECT_MARKERS.some((m) => fs.existsSync(path.join(PROJECT_ROOT, m)));
}

function ensureGlobalDir() {
  const created = !fs.existsSync(OPENCLEW_HOME);
  if (created) {
    fs.mkdirSync(OPENCLEW_HOME, { recursive: true });
  }

  const configPath = path.join(OPENCLEW_HOME, "config.json");
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(
      configPath,
      JSON.stringify({ version: ocVersion(), installedAt: today() }, null, 2) + "\n",
      "utf-8"
    );
  } else {
    // Update version on each init
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      cfg.version = ocVersion();
      fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2) + "\n", "utf-8");
    } catch {}
  }

  if (created) {
    console.log("  Created ~/.openclew/");
  } else {
    console.log("  ~/.openclew/ already exists");
  }
}

const args = process.argv.slice(2);
const withHook = args.includes("--hook");
const noInject = args.includes("--no-inject");
const privateLogs = args.includes("--private-logs");

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function createDirs() {
  if (!fs.existsSync(DOC_DIR)) {
    fs.mkdirSync(DOC_DIR, { recursive: true });
    console.log("  Created doc/");
  } else {
    console.log("  doc/ already exists");
  }

  if (!fs.existsSync(REF_DIR)) {
    fs.mkdirSync(REF_DIR, { recursive: true });
    console.log("  Created doc/ref/");
  } else {
    console.log("  doc/ref/ already exists");
  }

  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    console.log("  Created doc/log/");
  } else {
    console.log("  doc/log/ already exists");
  }
}

/**
 * Resolve the entry point file.
 *
 * Priority:
 * 1. AGENTS.md (case-insensitive) — default, universal
 * 2. Other detected instruction files — user picks one
 * 3. Create AGENTS.md — if nothing exists
 */
async function resolveEntryPoint() {
  if (noInject) {
    console.log("  Skipping entry point setup (--no-inject)");
    return null;
  }

  // 1. Check for AGENTS.md (case-insensitive)
  const agentsFile = findAgentsMdCaseInsensitive(PROJECT_ROOT);
  if (agentsFile) {
    if (!process.stdin.isTTY) {
      // Non-interactive: accept AGENTS.md by default
      console.log(`  Using ${agentsFile} (non-interactive)`);
      return { file: agentsFile, fullPath: path.join(PROJECT_ROOT, agentsFile), created: false };
    }
    const answer = await ask(`  Found ${agentsFile} — use as entry point? [Y/n] `);
    if (answer === "" || answer.toLowerCase() === "y" || answer.toLowerCase() === "yes") {
      return { file: agentsFile, fullPath: path.join(PROJECT_ROOT, agentsFile), created: false };
    }
  }

  // 2. Detect other instruction files
  const others = detectInstructionFiles(PROJECT_ROOT).filter(
    (f) => !f.isDir && f.file.toLowerCase() !== "agents.md"
  );

  if (others.length > 0) {
    console.log("  Detected instruction files:");
    others.forEach((f, i) => console.log(`    ${i + 1}. ${f.file} (${f.tool})`));
    console.log(`    ${others.length + 1}. Create new AGENTS.md`);

    if (!process.stdin.isTTY) {
      // Non-interactive: default to first detected file
      console.log(`  Using ${others[0].file} (non-interactive)`);
      return { file: others[0].file, fullPath: others[0].fullPath, created: false };
    }

    const choice = await ask(`  Choose entry point [1-${others.length + 1}]: `);
    const idx = parseInt(choice, 10) - 1;

    if (idx >= 0 && idx < others.length) {
      return { file: others[idx].file, fullPath: others[idx].fullPath, created: false };
    }
  }

  // 3. Create AGENTS.md
  const agentsPath = path.join(PROJECT_ROOT, "AGENTS.md");
  fs.writeFileSync(agentsPath, `# ${path.basename(PROJECT_ROOT)}\n\nProject instructions for AI agents.\n`, "utf-8");
  console.log("  Created AGENTS.md");
  return { file: "AGENTS.md", fullPath: agentsPath, created: true };
}

function installPreCommitHook() {
  if (!fs.existsSync(GIT_DIR)) {
    console.log("  No .git/ found — skipping hook installation");
    return false;
  }

  const hooksDir = path.join(GIT_DIR, "hooks");
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  const preCommitPath = path.join(hooksDir, "pre-commit");
  const indexScript = `if command -v npx >/dev/null 2>&1; then
  npx --yes openclew index 2>/dev/null || echo "openclew: index generation failed"
  git add doc/_INDEX.md 2>/dev/null
fi`;

  const MARKER = "# openclew-index";

  if (fs.existsSync(preCommitPath)) {
    const existing = fs.readFileSync(preCommitPath, "utf-8");
    if (existing.includes(MARKER)) {
      console.log("  Pre-commit hook already contains openclew index generation");
      return false;
    }
    fs.appendFileSync(preCommitPath, `\n\n${MARKER}\n${indexScript}\n`, "utf-8");
    console.log("  Appended openclew index generation to existing pre-commit hook");
  } else {
    fs.writeFileSync(preCommitPath, `#!/bin/sh\n\n${MARKER}\n${indexScript}\n`, "utf-8");
    fs.chmodSync(preCommitPath, "755");
    console.log("  Created pre-commit hook for index generation");
  }

  return true;
}

function updateGitignore() {
  const gitignorePath = path.join(PROJECT_ROOT, ".gitignore");
  const entry = "doc/log/";

  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, "utf-8");
    if (content.includes(entry)) {
      console.log("  .gitignore already ignores doc/log/");
      return;
    }
    fs.appendFileSync(gitignorePath, `\n${entry}\n`, "utf-8");
    console.log("  Added doc/log/ to .gitignore");
  } else {
    fs.writeFileSync(gitignorePath, `${entry}\n`, "utf-8");
    console.log("  Created .gitignore with doc/log/");
  }
}

function cleanupLegacyPython() {
  // Remove legacy generate-index.py if present (replaced by JS-native index-gen)
  const legacyScript = path.join(DOC_DIR, "generate-index.py");
  if (fs.existsSync(legacyScript)) {
    fs.unlinkSync(legacyScript);
    console.log("  Removed legacy doc/generate-index.py (now JS-native)");
    return true;
  }
  console.log("  No legacy Python script to clean up");
  return false;
}

function createDocs(entryPointPath) {
  // Guide — always created
  const guidePath = path.join(REF_DIR, "USING_OPENCLEW.md");
  const legacyGuidePath = path.join(DOC_DIR, "_USING_OPENCLEW.md");
  if (!fs.existsSync(guidePath) && !fs.existsSync(legacyGuidePath)) {
    fs.writeFileSync(guidePath, guideContent(), "utf-8");
    console.log("  Created doc/ref/USING_OPENCLEW.md (guide)");
  } else {
    const which = fs.existsSync(guidePath) ? "doc/ref/USING_OPENCLEW.md" : "doc/_USING_OPENCLEW.md";
    console.log(`  ${which} already exists`);
  }

  // Framework integration guide
  const frameworkPath = path.join(REF_DIR, "OPENCLEW_FRAMEWORK_INTEGRATION.md");
  const legacyFrameworkPath = path.join(DOC_DIR, "_OPENCLEW_FRAMEWORK_INTEGRATION.md");
  if (!fs.existsSync(frameworkPath) && !fs.existsSync(legacyFrameworkPath)) {
    fs.writeFileSync(frameworkPath, frameworkIntegrationContent(), "utf-8");
    console.log("  Created doc/ref/OPENCLEW_FRAMEWORK_INTEGRATION.md (framework integration guide)");
  } else {
    const which = fs.existsSync(frameworkPath) ? "doc/ref/OPENCLEW_FRAMEWORK_INTEGRATION.md" : "doc/_OPENCLEW_FRAMEWORK_INTEGRATION.md";
    console.log(`  ${which} already exists`);
  }

  // Architecture ref — seeded from existing instruction file if available
  const examplePath = path.join(REF_DIR, "ARCHITECTURE.md");
  const legacyExamplePath = path.join(DOC_DIR, "_ARCHITECTURE.md");
  if (!fs.existsSync(examplePath) && !fs.existsSync(legacyExamplePath)) {
    let existingInstructions = null;
    if (entryPointPath && fs.existsSync(entryPointPath)) {
      try {
        existingInstructions = fs.readFileSync(entryPointPath, "utf-8");
      } catch {}
    }
    fs.writeFileSync(examplePath, exampleRefContent(existingInstructions), "utf-8");
    if (existingInstructions) {
      console.log("  Created doc/ref/ARCHITECTURE.md (seeded from instruction file)");
    } else {
      console.log("  Created doc/ref/ARCHITECTURE.md (template)");
    }
  } else {
    const which = fs.existsSync(examplePath) ? "doc/ref/ARCHITECTURE.md" : "doc/_ARCHITECTURE.md";
    console.log(`  ${which} already exists`);
  }

  // Example log
  const logPath = path.join(LOG_DIR, `${today()}_setup-openclew.md`);
  if (!fs.existsSync(logPath)) {
    fs.writeFileSync(logPath, exampleLogContent(), "utf-8");
    console.log(`  Created doc/log/${today()}_setup-openclew.md (example log)`);
  } else {
    console.log(`  doc/log/${today()}_setup-openclew.md already exists`);
  }

  // TODO.md — task tracking at project root
  const todoPath = path.join(PROJECT_ROOT, "TODO.md");
  if (!fs.existsSync(todoPath)) {
    fs.writeFileSync(todoPath, todoContent(), "utf-8");
    console.log("  Created TODO.md (task tracking)");
  } else {
    console.log("  TODO.md already exists");
  }
}

function setupVscodePreview() {
  const vscodeDir = path.join(PROJECT_ROOT, ".vscode");
  const settingsPath = path.join(vscodeDir, "settings.json");
  const cssFilename = "openclew-preview.css";
  const cssDest = path.join(vscodeDir, cssFilename);

  if (!fs.existsSync(vscodeDir)) {
    fs.mkdirSync(vscodeDir, { recursive: true });
  }

  // Copy CSS file
  const cssSrc = path.join(__dirname, "..", "templates", cssFilename);
  if (fs.existsSync(cssSrc)) {
    fs.copyFileSync(cssSrc, cssDest);
  } else {
    console.log(`  CSS template not found: ${cssSrc}`);
    return;
  }

  // Merge into .vscode/settings.json
  const ocSettings = {
    "markdown.preview.fontSize": 14,
    "markdown.preview.lineHeight": 1.5,
    "markdown.styles": [".vscode/openclew-preview.css"],
  };

  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      // Strip JSON comments (// and /* */) before parsing
      const raw = fs.readFileSync(settingsPath, "utf-8");
      const stripped = raw.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
      settings = JSON.parse(stripped);
    } catch {
      // Malformed JSON — overwrite
    }
  }

  let changed = false;
  for (const [key, val] of Object.entries(ocSettings)) {
    if (!(key in settings)) {
      settings[key] = val;
      changed = true;
    }
  }

  if (changed || !fs.existsSync(settingsPath)) {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf-8");
    console.log("  Created .vscode/settings.json (markdown preview)");
  } else {
    console.log("  .vscode/settings.json already configured");
  }

  console.log("  Installed .vscode/openclew-preview.css");
}

function runIndexGenerator() {
  if (!fs.existsSync(DOC_DIR)) return;

  try {
    const { writeIndex } = require("./index-gen");
    const { refs, logs } = writeIndex(DOC_DIR);
    console.log(`  Generated doc/_INDEX.md (${refs} refs, ${logs} logs)`);
  } catch (err) {
    console.log(`  Could not generate index: ${err.message}`);
  }
}

function getVscodeUserPromptsDir() {
  const home = os.homedir();
  switch (process.platform) {
    case "darwin":
      return path.join(home, "Library", "Application Support", "Code", "User", "prompts");
    case "win32":
      return path.join(process.env.APPDATA || path.join(home, "AppData", "Roaming"), "Code", "User", "prompts");
    default:
      return path.join(home, ".config", "Code", "User", "prompts");
  }
}

function installUserPrompts() {
  const pkgPromptsDir = path.join(__dirname, "..", "prompts");
  if (!fs.existsSync(pkgPromptsDir)) {
    console.log("  No prompts/ directory in package — skipping");
    return;
  }

  const files = fs.readdirSync(pkgPromptsDir).filter((f) => f.endsWith(".prompt.md"));
  if (files.length === 0) return;

  const userPromptsDir = getVscodeUserPromptsDir();
  try {
    if (!fs.existsSync(userPromptsDir)) {
      fs.mkdirSync(userPromptsDir, { recursive: true });
    }
    for (const file of files) {
      fs.copyFileSync(path.join(pkgPromptsDir, file), path.join(userPromptsDir, file));
    }
    console.log(`  Installed ${files.length} prompt file(s) → ${userPromptsDir}`);
    console.log("  Available in Copilot Chat: /oc-checkout, /oc-search, /oc-peek, /oc-status, /oc-init");
  } catch (err) {
    console.log(`  Could not install user-level prompts: ${err.message}`);
  }
}

function installProjectPrompts() {
  const pkgPromptsDir = path.join(__dirname, "..", "prompts");
  if (!fs.existsSync(pkgPromptsDir)) return;

  const files = fs.readdirSync(pkgPromptsDir).filter((f) => f.endsWith(".prompt.md"));
  if (files.length === 0) return;

  const projectPromptsDir = path.join(PROJECT_ROOT, ".github", "prompts");
  if (!fs.existsSync(projectPromptsDir)) {
    fs.mkdirSync(projectPromptsDir, { recursive: true });
  }
  for (const file of files) {
    fs.copyFileSync(path.join(pkgPromptsDir, file), path.join(projectPromptsDir, file));
  }
  console.log(`  Installed ${files.length} prompt file(s) → .github/prompts/`);
}

function installSlashCommands() {
  const home = process.env.HOME || process.env.USERPROFILE;
  if (!home) {
    console.log("  Cannot determine home directory — skipping");
    return;
  }

  const claudeCommandsDir = path.join(home, ".claude", "commands");
  if (!fs.existsSync(path.join(home, ".claude"))) {
    console.log("  No ~/.claude/ found (Claude Code not installed) — skipping");
    return;
  }

  if (!fs.existsSync(claudeCommandsDir)) {
    fs.mkdirSync(claudeCommandsDir, { recursive: true });
  }

  // Find commands/ dir relative to this package
  const pkgCommandsDir = path.join(__dirname, "..", "commands");
  if (!fs.existsSync(pkgCommandsDir)) {
    console.log("  No commands/ directory in package — skipping");
    return;
  }

  const MARKER = "<!-- openclew-managed -->";
  const files = fs.readdirSync(pkgCommandsDir).filter((f) => f.endsWith(".md"));
  let installed = 0;

  for (const file of files) {
    const dest = path.join(claudeCommandsDir, file);

    // Only overwrite if file has the managed marker (or doesn't exist)
    if (fs.existsSync(dest)) {
      const existing = fs.readFileSync(dest, "utf-8");
      if (!existing.includes(MARKER)) {
        console.log(`  Skipped ${file} (user-modified)`);
        continue;
      }
    }

    fs.copyFileSync(path.join(pkgCommandsDir, file), dest);
    installed++;
  }

  if (installed > 0) {
    console.log(`  Installed ${installed} slash command(s) → ~/.claude/commands/`);
    console.log("  Available: /oc-checkout, /oc-search, /oc-init, /oc-status");
  } else {
    console.log("  Slash commands already up to date");
  }
}

async function main() {
  console.log("\nopenclew init\n");

  // Step 0: Global config (~/.openclew/) — always
  console.log("0. Global config");
  ensureGlobalDir();

  // Step 0b: User-level Copilot prompts — always (works in all projects)
  console.log("\n1. Copilot prompts (user-level)");
  installUserPrompts();

  // Check if we're in a project
  if (!isProjectDir()) {
    console.log(`\n─── Done ───\n`);
    console.log(`  openclew installed → ~/.openclew/`);
    console.log("");
    return;
  }

  // Step 1: Create directories
  console.log("\n1. Project structure");
  createDirs();

  // Step 2: Cleanup legacy Python (if upgrading from older version)
  console.log("\n2. Index generator");
  cleanupLegacyPython();

  // Step 2b: Gitignore (opt-in — logs are a shared knowledge layer by default)
  if (privateLogs) {
    console.log("\n2b. Gitignore (--private-logs)");
    updateGitignore();
  }

  // Step 4: Entry point
  console.log("\n4. Entry point");
  const entryPoint = await resolveEntryPoint();

  if (entryPoint) {
    const result = inject(entryPoint.fullPath);
    if (result === "created") {
      console.log(`  Injected openclew block into ${entryPoint.file}`);
    } else if (result === "updated") {
      console.log(`  Updated openclew block in ${entryPoint.file}`);
    } else {
      console.log(`  ${entryPoint.file} openclew block is up to date`);
    }

    writeConfig({ entryPoint: entryPoint.file }, PROJECT_ROOT);
    console.log(`  Saved entry point → .openclew.json`);
  } else {
    // --no-inject: still create config to mark init was done
    writeConfig({ entryPoint: null }, PROJECT_ROOT);
  }

  // Step 5: Pre-commit hook (opt-in — _INDEX.md is optional, agents use peek/search)
  console.log("\n5. Pre-commit hook");
  if (withHook) {
    installPreCommitHook();
  } else {
    console.log("  Skipping (use --hook to install index auto-generation)");
  }

  // Step 6: Docs
  console.log("\n6. Docs");
  createDocs(entryPoint ? entryPoint.fullPath : null);

  // Step 7: VS Code preview styling
  console.log("\n7. VS Code preview");
  setupVscodePreview();

  // Step 8: Generate index
  console.log("\n8. Index");
  runIndexGenerator();

  // Step 9: Project-level Copilot prompts (.github/prompts/)
  console.log("\n9. Copilot prompts (project)");
  installProjectPrompts();

  // Step 10: Install Claude Code slash commands
  const noCommands = args.includes("--no-commands");
  console.log("\n10. Claude Code commands");
  if (noCommands) {
    console.log("  Skipping (--no-commands)");
  } else {
    installSlashCommands();
  }

  // Done
  console.log("\n─── Ready ───\n");
  if (entryPoint) {
    console.log(`  Entry point: ${entryPoint.file}`);
  }
  console.log("  Guide:       doc/ref/USING_OPENCLEW.md");
  console.log("");
  console.log("─── Try it now ───\n");
  console.log("  1. Open doc/ref/ARCHITECTURE.md and describe YOUR project");
  console.log("     That's your first ref — the clew your future self will grab.\n");
  console.log("  2. Create your first log:");
  console.log("     npx openclew add log \"What I worked on today\"\n");
  console.log("  3. Check your docs:");
  console.log("     npx openclew peek\n");
  console.log("  That's it. Your agent will find these docs automatically next session.");
  console.log("");
}

main();
