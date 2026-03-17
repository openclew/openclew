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

function writeConfig(config, projectRoot) {
  const p = configPath(projectRoot);
  fs.writeFileSync(p, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

function getEntryPoint(projectRoot) {
  const config = readConfig(projectRoot);
  return config && config.entryPoint ? config.entryPoint : null;
}

module.exports = { readConfig, writeConfig, getEntryPoint, CONFIG_FILE };
