#!/usr/bin/env node

const { resolve } = require("path");
const { checkForUpdate } = require("../lib/update-notifier");

const args = process.argv.slice(2);
const command = args[0];

const USAGE = `
openclew — Long Life Memory for LLMs

Usage:
  openclew init                    Set up openclew in your project
  openclew add ref <title>         Create a refdoc (evolves with the project)
  openclew add log <title>         Create a session log (frozen facts)
  openclew search <query>          Search docs by keyword
  openclew peek                    List instruction file + all refdocs
  openclew checkout                End-of-session summary

Run 'openclew help --all' for advanced commands.
More at: https://github.com/openclew/openclew
`.trim();

const USAGE_ALL = `
openclew — Long Life Memory for LLMs

Usage:
  openclew init                    Set up openclew in your project
  openclew add ref <title>         Create a refdoc (evolves with the project)
  openclew add log <title>         Create a session log (frozen facts)
  openclew search <query>          Search docs by keyword
  openclew peek                    List instruction file + all refdocs
  openclew checkout                End-of-session summary

Advanced:
  openclew status                  Documentation health dashboard
  openclew migrate                 Upgrade legacy docs to current format (dry-run)
  openclew migrate --write         Apply migration
  openclew migrate --todo          Extract TODO section from instruction file → TODO.md
  openclew migrate --repoint A B   Update related_docs paths after file moves
  openclew index                   Regenerate doc/_INDEX.md
  openclew session-header          Format session header line
  openclew mcp                     Start MCP server (stdio JSON-RPC)

Options (init):
  --hook                           Install pre-commit hook for _INDEX.md auto-generation
  --no-inject                      Skip instruction file injection
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

// Handle "add ref" / "add log" subcommands
if (command === "add") {
  const sub = args[1];
  if (sub === "ref") {
    require("../lib/new-doc");
  } else if (sub === "log") {
    require("../lib/new-log");
  } else {
    console.error(`Unknown type: ${sub || "(none)"}`);
    console.error('Usage: openclew add ref <title>  or  openclew add log <title>');
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
    status: () => require("../lib/status"),
    index: () => require("../lib/index-gen"),
    "session-header": () => require("../lib/session-header"),
    migrate: () => require("../lib/migrate"),
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
