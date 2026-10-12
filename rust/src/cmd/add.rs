//! `openclew add ref|log|todo <title>` — create a doc from its template.
//! The `create_*` functions are shared with the MCP server (create_ref / create_log).

use std::fs;
use std::path::Path;

use crate::config::read_config;
use crate::template::{log as log_tpl, refs as ref_tpl, todo as todo_tpl};
use crate::util::{slugify, slugify_log, today};

/// Doc type accepted by `add`
#[derive(Clone, Copy)]
pub enum AddKind {
    Ref,
    Log,
    Todo,
}

/// Optional pre-filled body (MCP create_*); `None` = empty template
pub struct Filled<'a> {
    pub subject: &'a str,
    pub brief: &'a str,
    pub content: &'a str,
}

impl<'a> Filled<'a> {
    /// From MCP create_* params; `None` when no content (= empty template)
    pub fn from_params(params: &'a serde_json::Value, title: &'a str) -> Option<Self> {
        let content = params["content"].as_str().unwrap_or("");
        if content.is_empty() {
            return None;
        }
        Some(Filled {
            subject: params["subject"].as_str().unwrap_or(title),
            brief: params["brief"].as_str().unwrap_or(""),
            content,
        })
    }
}

/// Create doc/ref/<SLUG>.md. Returns the project-relative path.
pub fn create_ref(project_root: &Path, title: &str, filled: Option<Filled>) -> Result<String, String> {
    let doc_dir = project_root.join("doc");
    let slug = slugify(title);
    let legacy = doc_dir.join(format!("_{slug}.md"));
    if legacy.exists() {
        return Err(format!(
            "File already exists at legacy path: doc/_{slug}.md\nUse 'openclew migrate --move doc/_{slug}.md doc/ref/{slug}.md' to relocate it."
        ));
    }
    let content = match filled {
        Some(f) => ref_tpl::ref_content_filled(title, f.subject, f.brief, f.content),
        None => ref_tpl::ref_content(title),
    };
    write_new(&doc_dir.join("ref"), "doc/ref", &format!("{slug}.md"), &content)
}

/// Create doc/log/<date>_<slug>.md. Returns the project-relative path.
pub fn create_log(project_root: &Path, title: &str, filled: Option<Filled>) -> Result<String, String> {
    let content = match filled {
        Some(f) => log_tpl::log_content_filled(title, f.subject, f.brief, f.content),
        None => log_tpl::log_content(title),
    };
    let filename = format!("{}_{}.md", today(), slugify_log(title));
    write_new(&project_root.join("doc").join("log"), "doc/log", &filename, &content)
}

/// Create doc/todo/<date>_<slug>.md. Returns the project-relative path.
pub fn create_todo(project_root: &Path, title: &str) -> Result<String, String> {
    let filename = format!("{}_{}.md", today(), slugify_log(title));
    write_new(
        &project_root.join("doc").join("todo"),
        "doc/todo",
        &filename,
        &todo_tpl::todo_content(title),
    )
}

/// Write a file that must not exist yet (idempotence: never overwrite a doc)
fn write_new(dir: &Path, rel_dir: &str, filename: &str, content: &str) -> Result<String, String> {
    let rel = format!("{rel_dir}/{filename}");
    let filepath = dir.join(filename);
    if filepath.exists() {
        return Err(format!("File already exists: {rel}"));
    }
    fs::create_dir_all(dir).map_err(|e| format!("Cannot create {rel_dir}/: {e}"))?;
    fs::write(&filepath, content).map_err(|e| format!("Cannot write {rel}: {e}"))?;
    Ok(rel)
}

pub fn run(kind: AddKind, title: &str) -> Result<(), String> {
    let title = title.trim();
    let label = match kind {
        AddKind::Ref => "ref",
        AddKind::Log => "log",
        AddKind::Todo => "todo",
    };
    if title.is_empty() {
        return Err(format!("Usage: openclew add {label} \"Title\""));
    }

    let project_root = std::env::current_dir().map_err(|e| e.to_string())?;
    if !project_root.join("doc").exists() {
        return Err("No doc/ directory found. Run 'openclew init' first.".to_string());
    }
    if read_config(&project_root).is_none() {
        eprintln!("Warning: no .openclew.json found. Run 'openclew init' first.");
    }

    let rel = match kind {
        AddKind::Ref => create_ref(&project_root, title, None)?,
        AddKind::Log => create_log(&project_root, title, None)?,
        AddKind::Todo => create_todo(&project_root, title)?,
    };

    println!("Created {rel}");
    println!();
    match kind {
        AddKind::Ref => {
            println!("Next: open the file and fill in:");
            println!("  L1 — subject, status, keywords (so the index can find it)");
            println!("  L2 — objective + key points (what agents and humans need to know)");
            println!("  L3 — full details (only when needed)");
        }
        AddKind::Log => {
            println!("Next: open the file and fill in:");
            println!("  L1 — subject + doc_brief (what happened in 1-2 sentences)");
            println!("  L2 — problem + solution (the facts, frozen after this session)");
            println!();
            println!("Logs are immutable — once written, never modified.");
        }
        AddKind::Todo => {
            println!("Next: fill in 2 short sections:");
            println!("  Why it matters    — the pain or opportunity (1-2 lines)");
            println!("  Done looks like   — how you'll know it's done (1-2 lines)");
            println!();
            println!("Keep it short. Implementation details belong in a log when work starts.");
        }
    }
    Ok(())
}
