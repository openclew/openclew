/**
 * openclew index — regenerate doc/_INDEX.md
 *
 * Wraps hooks/generate-index.py. Falls back to a JS implementation
 * if Python is not available.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const docDir = path.join(process.cwd(), "doc");

if (!fs.existsSync(docDir)) {
  console.error("No doc/ directory found. Run 'openclew init' first.");
  process.exit(1);
}

// Try local generate-index.py first
const localScript = path.join(docDir, "generate-index.py");
const packageScript = path.join(__dirname, "..", "hooks", "generate-index.py");
const script = fs.existsSync(localScript) ? localScript : packageScript;

if (fs.existsSync(script)) {
  try {
    const output = execSync(`python3 "${script}" "${docDir}"`, {
      encoding: "utf-8",
    });
    console.log(output.trim());
    process.exit(0);
  } catch {
    console.error(
      "python3 not available. Install Python 3.8+ or regenerate manually."
    );
    process.exit(1);
  }
}

console.error("generate-index.py not found. Run 'openclew init' first.");
process.exit(1);
