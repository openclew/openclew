/**
 * openclew session-header — format a session header line.
 *
 * Usage:
 *   openclew session-header --name "Refonte checkout" --tags voice,stt,voxtral
 *   openclew session-header --name "Fix streaming" --tags streaming --date 2026-03-27
 *
 * Output:
 *   📅 2026-03-28 🏷️  Refonte checkout -----  #voice #stt #voxtral
 */

const { today } = require("./templates");

function formatSessionHeader(name, tags, date) {
  if (!name) {
    console.error("Error: --name is required");
    console.error(
      'Usage: openclew session-header --name "Session title" --tags tag1,tag2'
    );
    process.exit(1);
  }

  const d = date || today();
  const hashTags = tags.length > 0 ? tags.map((t) => `#${t}`).join(" ") : "";
  const line = `📅 ${d} 🏷️  ${name} -----  ${hashTags}`.trimEnd();

  console.log(line);
}

function main() {
  const args = process.argv.slice(2);
  let name = "";
  let tags = [];
  let date = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--name" && args[i + 1]) {
      name = args[++i];
    } else if (args[i] === "--tags" && args[i + 1]) {
      tags = args[++i].split(",").map((t) => t.trim()).filter(Boolean);
    } else if (args[i] === "--date" && args[i + 1]) {
      date = args[++i];
    }
  }

  formatSessionHeader(name, tags, date);
}

module.exports = { formatSessionHeader };

// Run as CLI only (dispatcher passes "session-header"); requiring the module must not run it
const calledAsSessionHeader = process.argv.includes("session-header");
if (require.main === module || calledAsSessionHeader) {
  main();
}
