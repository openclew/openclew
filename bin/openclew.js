#!/usr/bin/env node

const { resolve } = require("path");
const { checkForUpdate } = require("../lib/update-notifier");

const args = process.argv.slice(2);
const command = args[0];

const USAGE = `
openclew — Long Life Memory for LLMs

Usage:
  openclew init                    Set up openclew in your project
  openclew add ref <title>         Create a ref (evolves with the project)
  openclew add log <title>         Create a session log (frozen facts)
  openclew add todo <title>        Create a TODO doc (one task per file)
  openclew search <query>          Search docs by keyword
  openclew peek                    List instruction file + all refs
  openclew checkout                End-of-session summary

Run 'openclew help --all' for advanced commands.
More at: https://github.com/openclew/openclew
`.trim();

const USAGE_ALL = `
openclew — Long Life Memory for LLMs

Usage:
  openclew init                    Set up openclew in your project
  openclew add ref <title>         Create a ref (evolves with the project)
  openclew add log <title>         Create a session log (frozen facts)
  openclew add todo <title>        Create a TODO doc (one task per file)
  openclew search <query>          Search docs by keyword
  openclew peek                    List instruction file + all refs
  openclew checkout                End-of-session summary

Advanced:
  openclew status                  Documentation health dashboard
  openclew review                  Refs that may be outdated (--top N, --json)
                                   --apply [--commit]: safe automatic cleanup
                                   --confirm|--archive <ref> --why <text>
  openclew index                   Regenerate doc/_INDEX.md
  openclew session-header          Format session header line
  openclew mcp                     Start MCP server (stdio JSON-RPC)

Options (init):
  --hook                           Install pre-commit hook for _INDEX.md auto-generation
  --no-inject                      Skip instruction file injection
  --private-logs                   Add doc/log/ to .gitignore (for public repos; default: logs versioned)
`.trim();

if (command === "--version" || command === "-v" || command === "version") {
  const pkg = require("../package.json");
  console.log(`openclew ${pkg.version} (node)`);
  process.exit(0);
}

if (!command || command === "help" || command === "--help" || command === "-h") {
  const showAll = args.includes("--all");
  console.log(showAll ? USAGE_ALL : USAGE);
  process.exit(0);
}

// Handle "add ref" / "add log" / "add todo" subcommands
if (command === "add") {
  const sub = args[1];
  if (sub === "ref") {
    require("../lib/new-doc");
  } else if (sub === "log") {
    require("../lib/new-log");
  } else if (sub === "todo") {
    require("../lib/new-todo");
  } else {
    console.error(`Unknown type: ${sub || "(none)"}`);
    console.error('Usage: openclew add ref|log|todo <title>');
    process.exit(1);
  }
  checkForUpdate().catch(() => {});
} else {
  // Command dispatch
  const commands = {
    init: () => require("../lib/init"),
    new: () => require("../lib/new-doc"),
    log: () => require("../lib/new-log"),
    checkout: () => require("../lib/checkout"),
    search: () => require("../lib/search"),
    peek: () => require("../lib/peek"),
    todo: () => require("../lib/new-todo"),
    status: () => require("../lib/status"),
    review: () => require("../lib/review"),
    index: () => require("../lib/index-gen"),
    "session-header": () => require("../lib/session-header"),
    // Deprecated and disabled (not ported to Rust) — message SSOT shared with Rust
    migrate: () => {
      process.stderr.write(require("../lib/templates").render("migrate-deprecated.txt"));
      process.exit(1);
    },
    mcp: () => require("../lib/mcp-server"),
  };

  if (!commands[command]) {
    console.error(`Unknown command: ${command}`);
    console.error(`Run 'openclew help' for usage.`);
    process.exit(1);
  }

  commands[command]();
  checkForUpdate().catch(() => {});
}
