/**
 * openclew init — set up openclew in the current project.
 *
 * 1. Create doc/ and doc/log/
 * 2. Detect entry point (AGENTS.md case-insensitive by default)
 * 3. Inject openclew block into entry point
 * 4. Install pre-commit hook for index generation
 * 5. Create guide + example docs
 * 6. Generate initial _INDEX.md
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { detectInstructionFiles, findAgentsMdCaseInsensitive } = require("./detect");
const { inject, isAlreadyInjected } = require("./inject");
const { writeConfig } = require("./config");
const { guideContent, frameworkIntegrationContent, exampleRefdocContent, exampleLogContent, today } = require("./templates");

const PROJECT_ROOT = process.cwd();
const DOC_DIR = path.join(PROJECT_ROOT, "doc");
const LOG_DIR = path.join(DOC_DIR, "log");
const GIT_DIR = path.join(PROJECT_ROOT, ".git");

const args = process.argv.slice(2);
const noHook = args.includes("--no-hook");
const noInject = args.includes("--no-inject");

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
  const indexScript = `if [ -f doc/generate-index.py ]; then
  python3 doc/generate-index.py doc 2>/dev/null || echo "openclew: index generation failed"
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

function copyGenerateIndex() {
  const src = path.join(__dirname, "..", "hooks", "generate-index.py");
  const dst = path.join(DOC_DIR, "generate-index.py");

  if (fs.existsSync(dst)) {
    console.log("  doc/generate-index.py already exists");
    return false;
  }

  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dst);
    console.log("  Copied generate-index.py to doc/");
    return true;
  }

  console.log("  generate-index.py not found in package — skipping");
  return false;
}

function createDocs(entryPointPath) {
  // Guide — always created
  const guidePath = path.join(DOC_DIR, "_USING_OPENCLEW.md");
  if (!fs.existsSync(guidePath)) {
    fs.writeFileSync(guidePath, guideContent(), "utf-8");
    console.log("  Created doc/_USING_OPENCLEW.md (guide)");
  } else {
    console.log("  doc/_USING_OPENCLEW.md already exists");
  }

  // Framework integration guide
  const frameworkPath = path.join(DOC_DIR, "_OPENCLEW_FRAMEWORK_INTEGRATION.md");
  if (!fs.existsSync(frameworkPath)) {
    fs.writeFileSync(frameworkPath, frameworkIntegrationContent(), "utf-8");
    console.log("  Created doc/_OPENCLEW_FRAMEWORK_INTEGRATION.md (framework integration guide)");
  } else {
    console.log("  doc/_OPENCLEW_FRAMEWORK_INTEGRATION.md already exists");
  }

  // Architecture refdoc — seeded from existing instruction file if available
  const examplePath = path.join(DOC_DIR, "_ARCHITECTURE.md");
  if (!fs.existsSync(examplePath)) {
    let existingInstructions = null;
    if (entryPointPath && fs.existsSync(entryPointPath)) {
      try {
        existingInstructions = fs.readFileSync(entryPointPath, "utf-8");
      } catch {}
    }
    fs.writeFileSync(examplePath, exampleRefdocContent(existingInstructions), "utf-8");
    if (existingInstructions) {
      console.log("  Created doc/_ARCHITECTURE.md (seeded from instruction file)");
    } else {
      console.log("  Created doc/_ARCHITECTURE.md (template)");
    }
  } else {
    console.log("  doc/_ARCHITECTURE.md already exists");
  }

  // Example log
  const logPath = path.join(LOG_DIR, `${today()}_setup-openclew.md`);
  if (!fs.existsSync(logPath)) {
    fs.writeFileSync(logPath, exampleLogContent(), "utf-8");
    console.log(`  Created doc/log/${today()}_setup-openclew.md (example log)`);
  } else {
    console.log(`  doc/log/${today()}_setup-openclew.md already exists`);
  }
}

function runIndexGenerator() {
  const indexScript = path.join(DOC_DIR, "generate-index.py");
  if (!fs.existsSync(indexScript)) return;

  try {
    const { execSync } = require("child_process");
    execSync(`python3 "${indexScript}" "${DOC_DIR}"`, { stdio: "pipe" });
    console.log("  Generated doc/_INDEX.md");
  } catch {
    console.log("  Could not generate index (python3 not available)");
  }
}

async function main() {
  console.log("\nopenclew init\n");

  // Step 1: Create directories
  console.log("1. Project structure");
  createDirs();

  // Step 2: Gitignore
  console.log("\n2. Gitignore");
  updateGitignore();

  // Step 3: Copy index generator
  console.log("\n3. Index generator");
  copyGenerateIndex();

  // Step 4: Entry point
  console.log("\n4. Entry point");
  const entryPoint = await resolveEntryPoint();

  if (entryPoint) {
    if (isAlreadyInjected(entryPoint.fullPath)) {
      console.log(`  ${entryPoint.file} already has openclew block`);
    } else {
      inject(entryPoint.fullPath);
      console.log(`  Injected openclew block into ${entryPoint.file}`);
    }

    writeConfig({ entryPoint: entryPoint.file }, PROJECT_ROOT);
    console.log(`  Saved entry point → .openclew.json`);
  } else {
    // --no-inject: still create config to mark init was done
    writeConfig({ entryPoint: null }, PROJECT_ROOT);
  }

  // Step 5: Pre-commit hook
  console.log("\n5. Pre-commit hook");
  if (noHook) {
    console.log("  Skipping (--no-hook)");
  } else {
    installPreCommitHook();
  }

  // Step 6: Docs
  console.log("\n6. Docs");
  createDocs(entryPoint ? entryPoint.fullPath : null);

  // Step 7: Generate index
  console.log("\n7. Index");
  runIndexGenerator();

  // Done
  console.log("\n─── Ready ───\n");
  if (entryPoint) {
    console.log(`  Entry point: ${entryPoint.file}`);
  }
  console.log("  Guide:       doc/_USING_OPENCLEW.md");
  console.log("");
  console.log("  Start a session with your agent now.");
  console.log('  Ask it: "Read doc/_USING_OPENCLEW.md and document our architecture."');
  console.log("  That's it — openclew works from here.");
  console.log("");
}

main();
