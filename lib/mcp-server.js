/**
 * openclew MCP server — Model Context Protocol over stdio.
 *
 * Exposes openclew docs as MCP tools so AI agents (Claude Code, Cursor, etc.)
 * can search and read project documentation natively.
 *
 * Tools:
 *   - search_docs(query)           Search docs by keyword (L1/metadata)
 *   - read_doc(path, level?)       Read a doc at specified level (L1/L2/L3/full)
 *   - list_docs(kind?)             List all docs with L1 metadata
 *
 * Protocol: MCP 2024-11-05 over stdio (JSON-RPC line-delimited)
 * Zero dependencies — Node 16+ standard library only.
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { searchDocs, collectDocs, parseFile } = require("./search");

const PROJECT_ROOT = process.cwd();
const DOC_DIR = path.join(PROJECT_ROOT, "doc");

// ── Helpers ─────────────────────────────────────────────────────────

function ocVersion() {
  try {
    return require(path.join(__dirname, "..", "package.json")).version;
  } catch {
    return "0.0.0";
  }
}

function extractLevel(content, level) {
  if (level === "full") return content;

  const markers = {
    L1: [/<!--\s*L1_START\s*-->/, /<!--\s*L1_END\s*-->/],
    L2: [/<!--\s*L2_START\s*-->/, /<!--\s*L2_END\s*-->/],
    L3: [/<!--\s*L3_START\s*-->/, /<!--\s*L3_END\s*-->/],
  };

  const key = level.toUpperCase();
  if (!markers[key]) return content;

  const [startRe, endRe] = markers[key];
  const startMatch = content.match(startRe);
  const endMatch = content.match(endRe);
  if (!startMatch || !endMatch) return `No ${key} block found in this document.`;

  const startIdx = startMatch.index + startMatch[0].length;
  const endIdx = endMatch.index;
  return content.slice(startIdx, endIdx).trim();
}

// ── MCP Tool implementations ────────────────────────────────────────

function toolSearchDocs(params) {
  const query = params.query;
  if (!query) return { error: "Missing required parameter: query" };
  if (!fs.existsSync(DOC_DIR)) return { error: "No doc/ directory found." };

  const results = searchDocs(DOC_DIR, query);
  return results.map((r) => ({
    path: path.relative(PROJECT_ROOT, r.filepath),
    kind: r.kind,
    subject: r.meta.subject || r.filename,
    doc_brief: r.meta.doc_brief || "",
    status: r.meta.status || "",
    category: r.meta.category || "",
    score: r.score,
  }));
}

function toolReadDoc(params) {
  const docPath = params.path;
  if (!docPath) return { error: "Missing required parameter: path" };

  const absPath = path.resolve(PROJECT_ROOT, docPath);
  // Security: ensure path is within project
  if (!absPath.startsWith(PROJECT_ROOT)) return { error: "Path outside project." };
  if (!fs.existsSync(absPath)) return { error: `File not found: ${docPath}` };

  const content = fs.readFileSync(absPath, "utf-8");
  const level = params.level || "L2";

  return {
    path: docPath,
    level: level,
    content: extractLevel(content, level),
  };
}

function toolListDocs(params) {
  if (!fs.existsSync(DOC_DIR)) return { error: "No doc/ directory found." };

  const docs = collectDocs(DOC_DIR);
  const kind = params.kind; // "ref", "log", or undefined (all)

  return docs
    .filter((d) => !kind || d.kind === kind)
    .map((d) => ({
      path: path.relative(PROJECT_ROOT, d.filepath),
      kind: d.kind,
      subject: d.meta.subject || d.filename,
      doc_brief: d.meta.doc_brief || "",
      status: d.meta.status || "",
      category: d.meta.category || "",
    }));
}

// ── MCP Protocol ────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "search_docs",
    description:
      "Search project documentation by keyword. Searches subject, doc_brief, category, keywords, type, and status fields. Returns results sorted by relevance.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (space-separated terms)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "read_doc",
    description:
      "Read a project document at a specified level. L1 = subject + brief (~40 tokens). L2 = summary + key points. L3 = full technical details. full = entire file.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Relative path to the document (e.g. doc/_ARCHITECTURE.md)",
        },
        level: {
          type: "string",
          enum: ["L1", "L2", "L3", "full"],
          description: "Level of detail to return (default: L2)",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "list_docs",
    description:
      "List all project documents with their L1 metadata (subject, brief, status, category).",
    inputSchema: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: ["ref", "log"],
          description: "Filter by document type. Omit to list all.",
        },
      },
    },
  },
];

const TOOL_HANDLERS = {
  search_docs: toolSearchDocs,
  read_doc: toolReadDoc,
  list_docs: toolListDocs,
};

function handleMessage(msg) {
  const { method, id, params } = msg;

  switch (method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: {
            name: "openclew",
            version: ocVersion(),
          },
        },
      };

    case "notifications/initialized":
      return null; // No response for notifications

    case "tools/list":
      return {
        jsonrpc: "2.0",
        id,
        result: { tools: TOOLS },
      };

    case "tools/call": {
      const toolName = params && params.name;
      const handler = TOOL_HANDLERS[toolName];
      if (!handler) {
        return {
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Unknown tool: ${toolName}` },
        };
      }

      const toolArgs = params.arguments || {};
      const result = handler(toolArgs);

      // If result has an error field, return as tool error content
      if (result && result.error) {
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: result.error }],
            isError: true,
          },
        };
      }

      return {
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
            },
          ],
        },
      };
    }

    default:
      if (id !== undefined) {
        return {
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Method not found: ${method}` },
        };
      }
      return null; // Ignore unknown notifications
  }
}

// ── stdio transport ─────────────────────────────────────────────────

function run() {
  // Check if running as CLI help
  const args = process.argv.slice(2);
  const cmdIndex = args.indexOf("mcp");
  const extraArgs = cmdIndex >= 0 ? args.slice(cmdIndex + 1) : args.slice(1);

  if (extraArgs.includes("--help") || extraArgs.includes("-h")) {
    console.log("openclew MCP server — Model Context Protocol over stdio");
    console.log("");
    console.log("Usage: openclew mcp");
    console.log("");
    console.log("Starts an MCP server on stdin/stdout for AI agent integration.");
    console.log("Configure in your AI tool's MCP settings:");
    console.log("");
    console.log('  { "command": "npx", "args": ["openclew", "mcp"] }');
    console.log("");
    console.log("Tools exposed:");
    console.log("  search_docs(query)       Search docs by keyword");
    console.log("  read_doc(path, level?)   Read doc at L1/L2/L3/full");
    console.log("  list_docs(kind?)         List all docs with L1 metadata");
    process.exit(0);
  }

  const rl = readline.createInterface({ input: process.stdin, terminal: false });

  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let msg;
    try {
      msg = JSON.parse(trimmed);
    } catch {
      const err = {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error" },
      };
      process.stdout.write(JSON.stringify(err) + "\n");
      return;
    }

    const response = handleMessage(msg);
    if (response) {
      process.stdout.write(JSON.stringify(response) + "\n");
    }
  });

  rl.on("close", () => process.exit(0));
}

// Export for tests
module.exports = { handleMessage, extractLevel, TOOLS };

// Run as CLI (invoked via dispatcher or directly)
const calledAsMcp = process.argv.includes("mcp");
if (require.main === module || calledAsMcp) {
  run();
}
