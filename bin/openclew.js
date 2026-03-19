#!/usr/bin/env node

const { resolve } = require("path");

const args = process.argv.slice(2);
const command = args[0];

const USAGE = `
openclew — Long Life Memory for LLMs

Usage:
  openclew init                    Set up openclew in the current project
  openclew new <title>             Create a refdoc (evolves with the project)
  openclew log <title>             Create a session log (frozen facts)
  openclew checkout                End-of-session summary + log creation
  openclew search <query>          Search docs by keyword (L1/metadata)
  openclew status                  Show documentation health dashboard
  openclew index                   Regenerate doc/_INDEX.md
  openclew mcp                     Start MCP server (stdio JSON-RPC)
  openclew help                    Show this help

Options:
  --no-hook                        Skip pre-commit hook installation (init)
  --no-inject                      Skip instruction file injection (init)

Getting started:
  npx openclew init                1. Set up doc/ + guide + examples + git hook
  # Edit doc/_ARCHITECTURE.md      2. Replace the example with your project's architecture
  openclew new "API design"        3. Create your own refdocs
  git commit                       4. Index auto-regenerates on commit

Docs have 3 levels: L1 (metadata) → L2 (summary) → L3 (details).
Agents read L1 to decide what's relevant, then L2 for context.
More at: https://github.com/openclew/openclew
`.trim();

if (!command || command === "help" || command === "--help" || command === "-h") {
  console.log(USAGE);
  process.exit(0);
}

const commands = {
  init: () => require("../lib/init"),
  new: () => require("../lib/new-doc"),
  log: () => require("../lib/new-log"),
  checkout: () => require("../lib/checkout"),
  search: () => require("../lib/search"),
  status: () => require("../lib/status"),
  index: () => require("../lib/index-gen"),
  mcp: () => require("../lib/mcp-server"),
};

if (!commands[command]) {
  console.error(`Unknown command: ${command}`);
  console.error(`Run 'openclew help' for usage.`);
  process.exit(1);
}

commands[command]();
