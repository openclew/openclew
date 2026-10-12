use std::env;
use std::fs;
use std::io::{self, BufRead, Write as IoWrite};
use std::path::PathBuf;

use serde_json::{json, Value};

use crate::parse::collect::collect_docs;
use crate::parse::l1::extract_level;
use crate::parse::search::search_docs;
use crate::cmd::add::{self, Filled};
use crate::util::oc_version;

fn project_root() -> PathBuf {
    env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
}

fn doc_dir() -> PathBuf {
    project_root().join("doc")
}

// ── MCP Tool implementations ────────────────────────────────────────

fn tool_search_docs(params: &Value) -> Value {
    let query = params["query"].as_str().unwrap_or("");
    if query.is_empty() {
        return json!({"error": "Missing required parameter: query"});
    }

    let dd = doc_dir();
    if !dd.exists() {
        return json!({"error": "No doc/ directory found."});
    }

    let root = project_root();
    let results = search_docs(&dd, query);
    let items: Vec<Value> = results
        .iter()
        .map(|r| {
            let rel = r.doc.filepath.strip_prefix(&root).unwrap_or(&r.doc.filepath);
            json!({
                "path": rel.to_string_lossy().replace('\\', "/"),
                "kind": r.doc.kind.as_str(),
                "subject": r.doc.meta.subject(),
                "doc_brief": r.doc.meta.doc_brief(),
                "status": r.doc.meta.status(),
                "category": r.doc.meta.category(),
                "score": r.score,
            })
        })
        .collect();
    Value::Array(items)
}

fn tool_read_doc(params: &Value) -> Value {
    let doc_path = match params["path"].as_str() {
        Some(p) => p,
        None => return json!({"error": "Missing required parameter: path"}),
    };

    let root = project_root();
    let abs_path = root.join(doc_path);

    // Security: ensure path is within project
    if let Ok(canonical) = abs_path.canonicalize() {
        if let Ok(canonical_root) = root.canonicalize() {
            if !canonical.starts_with(&canonical_root) {
                return json!({"error": "Path outside project."});
            }
        }
    }

    if !abs_path.exists() {
        return json!({"error": format!("File not found: {doc_path}")});
    }

    let content = match fs::read_to_string(&abs_path) {
        Ok(c) => c,
        Err(e) => return json!({"error": format!("Cannot read file: {e}")}),
    };

    let level = params["level"].as_str().unwrap_or("L2");
    let extracted = extract_level(&content, level);

    json!({
        "path": doc_path,
        "level": level,
        "content": extracted,
    })
}

fn tool_list_docs(params: &Value) -> Value {
    let dd = doc_dir();
    if !dd.exists() {
        return json!({"error": "No doc/ directory found."});
    }

    let root = project_root();
    let kind_filter = params["kind"].as_str();
    let docs = collect_docs(&dd);

    let items: Vec<Value> = docs
        .iter()
        .filter(|d| match kind_filter {
            Some(k) => d.kind.as_str() == k,
            None => true,
        })
        .map(|d| {
            let rel = d.filepath.strip_prefix(&root).unwrap_or(&d.filepath);
            json!({
                "path": rel.to_string_lossy().replace('\\', "/"),
                "kind": d.kind.as_str(),
                "subject": d.meta.subject(),
                "doc_brief": d.meta.doc_brief(),
                "status": d.meta.status(),
                "category": d.meta.category(),
            })
        })
        .collect();
    Value::Array(items)
}

fn created(result: Result<String, String>, label: &str) -> Value {
    match result {
        Ok(path) => json!({ "path": path, "message": format!("Created {label}: {path}") }),
        Err(e) => json!({ "error": e }),
    }
}

fn required_title(params: &Value) -> Result<&str, Value> {
    match params["title"].as_str().unwrap_or("").trim() {
        "" => Err(json!({"error": "Missing required parameter: title"})),
        t => Ok(t),
    }
}

fn tool_create_log(params: &Value) -> Value {
    match required_title(params) {
        Ok(t) => created(add::create_log(&project_root(), t, Filled::from_params(params, t)), "log"),
        Err(e) => e,
    }
}

fn tool_create_ref(params: &Value) -> Value {
    match required_title(params) {
        Ok(t) => created(add::create_ref(&project_root(), t, Filled::from_params(params, t)), "ref"),
        Err(e) => e,
    }
}

fn tool_create_todo(params: &Value) -> Value {
    match required_title(params) {
        Ok(t) => created(add::create_todo(&project_root(), t), "todo"),
        Err(e) => e,
    }
}

// ── MCP Protocol ────────────────────────────────────────────────────

const TOOLS: &str = r#"[
  {
    "name": "search_docs",
    "description": "Search project documentation by keyword. Returns results sorted by relevance.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "query": { "type": "string", "description": "Search query (space-separated terms)" }
      },
      "required": ["query"]
    }
  },
  {
    "name": "read_doc",
    "description": "Read a project document at a specified level. L1 = subject + brief (~40 tokens). L2 = summary. L3 = full details. full = entire file.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "path": { "type": "string", "description": "Relative path to the document" },
        "level": { "type": "string", "enum": ["L1", "L2", "L3", "full"], "description": "Level of detail (default: L2)" }
      },
      "required": ["path"]
    }
  },
  {
    "name": "list_docs",
    "description": "List all project documents with their L1 metadata.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "kind": { "type": "string", "enum": ["ref", "log", "todo"], "description": "Filter by type. Omit to list all." }
      }
    }
  },
  {
    "name": "create_log",
    "description": "Create a session log with pre-filled content. The file is generated with proper L1/L2/L3 structure.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "title": { "type": "string", "description": "Log title (used for filename slug)" },
        "subject": { "type": "string", "description": "Subject line (defaults to title)" },
        "brief": { "type": "string", "description": "One-line doc_brief" },
        "content": { "type": "string", "description": "Summary content (inserted in L2 section)" }
      },
      "required": ["title"]
    }
  },
  {
    "name": "create_ref",
    "description": "Create a ref with pre-filled content. The file is generated with proper L1/L2/L3 structure in doc/ref/.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "title": { "type": "string", "description": "Ref title (used for filename slug)" },
        "subject": { "type": "string", "description": "Subject line (defaults to title)" },
        "brief": { "type": "string", "description": "One-line doc_brief" },
        "content": { "type": "string", "description": "Summary content (inserted in L2 section)" }
      },
      "required": ["title"]
    }
  },
  {
    "name": "create_todo",
    "description": "Create a TODO doc (one task per file) in doc/todo/, with from/closed traceability fields to fill.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "title": { "type": "string", "description": "TODO title (used for filename slug and subject)" }
      },
      "required": ["title"]
    }
  }
]"#;

fn handle_message(msg: &Value) -> Option<Value> {
    let method = msg["method"].as_str().unwrap_or("");
    let id = msg.get("id");
    let params = msg.get("params").cloned().unwrap_or(json!({}));

    match method {
        "initialize" => Some(json!({
            "jsonrpc": "2.0",
            "id": id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": { "tools": {} },
                "serverInfo": {
                    "name": "openclew",
                    "version": oc_version(),
                }
            }
        })),

        "notifications/initialized" => None,

        "tools/list" => {
            let tools: Value = serde_json::from_str(TOOLS).unwrap();
            Some(json!({
                "jsonrpc": "2.0",
                "id": id,
                "result": { "tools": tools }
            }))
        }

        "tools/call" => {
            let tool_name = params["name"].as_str().unwrap_or("");
            let tool_args = params.get("arguments").cloned().unwrap_or(json!({}));

            let result = match tool_name {
                "search_docs" => tool_search_docs(&tool_args),
                "read_doc" => tool_read_doc(&tool_args),
                "list_docs" => tool_list_docs(&tool_args),
                "create_log" => tool_create_log(&tool_args),
                "create_ref" => tool_create_ref(&tool_args),
                "create_todo" => tool_create_todo(&tool_args),
                _ => {
                    return Some(json!({
                        "jsonrpc": "2.0",
                        "id": id,
                        "error": { "code": -32601, "message": format!("Unknown tool: {tool_name}") }
                    }));
                }
            };

            // Check for tool-level error
            if let Some(err) = result.get("error") {
                return Some(json!({
                    "jsonrpc": "2.0",
                    "id": id,
                    "result": {
                        "content": [{ "type": "text", "text": err }],
                        "isError": true
                    }
                }));
            }

            let text = if result.is_string() {
                result.as_str().unwrap().to_string()
            } else {
                serde_json::to_string_pretty(&result).unwrap()
            };

            Some(json!({
                "jsonrpc": "2.0",
                "id": id,
                "result": {
                    "content": [{ "type": "text", "text": text }]
                }
            }))
        }

        _ => {
            if id.is_some() {
                Some(json!({
                    "jsonrpc": "2.0",
                    "id": id,
                    "error": { "code": -32601, "message": format!("Method not found: {method}") }
                }))
            } else {
                None // Ignore unknown notifications
            }
        }
    }
}

pub fn run() -> Result<(), String> {
    let stdin = io::stdin();
    let stdout = io::stdout();

    for line in stdin.lock().lines() {
        let line = line.map_err(|e| format!("stdin read error: {e}"))?;
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        let msg: Value = match serde_json::from_str(trimmed) {
            Ok(v) => v,
            Err(_) => {
                let err = json!({
                    "jsonrpc": "2.0",
                    "id": null,
                    "error": { "code": -32700, "message": "Parse error" }
                });
                let mut out = stdout.lock();
                writeln!(out, "{}", serde_json::to_string(&err).unwrap())
                    .map_err(|e| format!("stdout write error: {e}"))?;
                out.flush().map_err(|e| format!("flush error: {e}"))?;
                continue;
            }
        };

        if let Some(response) = handle_message(&msg) {
            let mut out = stdout.lock();
            writeln!(out, "{}", serde_json::to_string(&response).unwrap())
                .map_err(|e| format!("stdout write error: {e}"))?;
            out.flush().map_err(|e| format!("flush error: {e}"))?;
        }
    }

    Ok(())
}
