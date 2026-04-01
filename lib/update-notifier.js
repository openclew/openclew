/**
 * Check npm for newer openclew version (max once per day).
 * Non-blocking — never delays command execution.
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const CACHE_DIR = path.join(require("os").homedir(), ".openclew");
const CACHE_FILE = path.join(CACHE_DIR, "update-check.json");
const ONE_DAY = 24 * 60 * 60 * 1000;

function readCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function writeCache(data) {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data), "utf-8");
  } catch {}
}

function fetchLatestVersion() {
  return new Promise((resolve) => {
    const req = https.get(
      "https://registry.npmjs.org/openclew/latest",
      { timeout: 3000 },
      (res) => {
        let body = "";
        res.on("data", (d) => (body += d));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body).version || null);
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on("error", () => resolve(null));
    req.on("timeout", () => { req.destroy(); resolve(null); });
  });
}

/**
 * Check and print update banner if a newer version exists.
 * Call at the end of any command. Returns a promise but callers
 * can fire-and-forget.
 */
async function checkForUpdate() {
  try {
    const pkg = require("../package.json");
    const current = pkg.version;

    const cache = readCache();
    const now = Date.now();

    // Use cached result if fresh enough
    if (cache.checkedAt && now - cache.checkedAt < ONE_DAY) {
      if (cache.latest && cache.latest !== current && isNewer(cache.latest, current)) {
        printBanner(current, cache.latest);
      }
      return;
    }

    const latest = await fetchLatestVersion();
    writeCache({ checkedAt: now, latest });

    if (latest && latest !== current && isNewer(latest, current)) {
      printBanner(current, latest);
    }
  } catch {}
}

function isNewer(latest, current) {
  const a = latest.split(".").map(Number);
  const b = current.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) > (b[i] || 0)) return true;
    if ((a[i] || 0) < (b[i] || 0)) return false;
  }
  return false;
}

function printBanner(current, latest) {
  console.log();
  console.log(`  ┌──────────────────────────────────────────────┐`);
  console.log(`  │  Update available: ${current} → ${latest.padEnd(25)}│`);
  console.log(`  │  Run: npx openclew@latest init               │`);
  console.log(`  └──────────────────────────────────────────────┘`);
}

module.exports = { checkForUpdate };
