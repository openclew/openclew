/**
 * Read/write .openclew.json config at project root.
 */

const fs = require("fs");
const path = require("path");

const CONFIG_FILE = ".openclew.json";

function configPath(projectRoot) {
  return path.join(projectRoot || process.cwd(), CONFIG_FILE);
}

function readConfig(projectRoot) {
  const p = configPath(projectRoot);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

/** Merge into the existing file: keys set elsewhere (e.g. reviewCommit) survive init */
function writeConfig(config, projectRoot) {
  const p = configPath(projectRoot);
  const merged = { ...(readConfig(projectRoot) || {}), ...config };
  fs.writeFileSync(p, JSON.stringify(merged, null, 2) + "\n", "utf-8");
}

function getEntryPoint(projectRoot) {
  const config = readConfig(projectRoot);
  return config && config.entryPoint ? config.entryPoint : null;
}

module.exports = { readConfig, writeConfig, getEntryPoint, CONFIG_FILE };
