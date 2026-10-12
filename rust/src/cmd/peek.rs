//! `openclew peek` — list instruction file, refs, open TODOs (discovery before work).

use std::fs;
use std::path::{Path, PathBuf};

use crate::parse::collect::{collect_docs, Doc, DocKind};

const EXCLUDE_DIRS: &[&str] = &[
    ".git",
    "node_modules",
    "_archive",
    "old",
    ".Rproj.user",
    "log",
    "notes",
    "verify_logs",
];
const OPEN_TODO_STATUSES: &[&str] = &["open", "in progress", "in-progress", "wip", "blocked"];
const SUBDIR_SKIP: &[&str] = &["log", "notes", "verify_logs", "_archive", "old"];

pub struct PeekResult {
    pub instruction_file: Option<PathBuf>,
    pub doc_refs: Vec<Doc>,
    pub open_todos: Vec<Doc>,
    pub other_refs: Vec<PathBuf>,
}

/// Recursively find `_*.md` files (legacy refs) outside `exclude`.
pub fn find_refs_recursive(dir: &Path, exclude: &Path) -> Vec<PathBuf> {
    fn walk(current: &Path, exclude: &Path, out: &mut Vec<PathBuf>) {
        let Ok(entries) = fs::read_dir(current) else { return };
        for entry in entries.flatten() {
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            if path.is_dir() {
                if EXCLUDE_DIRS.contains(&name.as_str()) || path.starts_with(exclude) {
                    continue;
                }
                walk(&path, exclude, out);
            } else if path.is_file()
                && name.starts_with('_')
                && name.ends_with(".md")
                && name != "_INDEX.md"
            {
                out.push(path);
            }
        }
    }
    let mut out = Vec::new();
    walk(dir, exclude, &mut out);
    out.sort();
    out
}

pub fn peek(project_root: &Path) -> PeekResult {
    let doc_dir = project_root.join("doc");

    let instruction_file = ["CLAUDE.md", "AGENTS.md"]
        .iter()
        .map(|n| project_root.join(n))
        .find(|p| p.exists());

    let mut doc_refs = Vec::new();
    let mut open_todos = Vec::new();
    if doc_dir.exists() {
        for d in collect_docs(&doc_dir) {
            match d.kind {
                DocKind::Ref => doc_refs.push(d),
                DocKind::Todo => {
                    let status = match d.meta.status() {
                        "" => "open".to_string(),
                        s => s.to_lowercase(),
                    };
                    if OPEN_TODO_STATUSES.contains(&status.as_str()) {
                        open_todos.push(d);
                    }
                }
                DocKind::Log => {}
            }
        }
    }

    let other_refs = find_refs_recursive(project_root, &doc_dir);
    PeekResult { instruction_file, doc_refs, open_todos, other_refs }
}

fn doc_line(doc: &Doc, default_status: &str) -> String {
    let status = match doc.meta.status() {
        "" => default_status,
        s => s,
    };
    let tag = if status.is_empty() { String::new() } else { format!(" [{status}]") };
    match doc.meta.subject() {
        "" => format!("  {}{tag}", doc.filename),
        subject => format!("  {} — {subject}{tag}", doc.filename),
    }
}

pub fn run() -> Result<(), String> {
    let project_root = std::env::current_dir().map_err(|e| e.to_string())?;
    let result = peek(&project_root);
    let project_name = project_root
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();

    println!("\n{project_name}\n");

    match &result.instruction_file {
        Some(p) => println!("Instruction file: {}", p.file_name().unwrap().to_string_lossy()),
        None => println!("Instruction file: (none)"),
    }
    println!();

    println!("Refs in doc/ ({}):", result.doc_refs.len());
    if result.doc_refs.is_empty() {
        println!("  (none)");
    }
    for d in &result.doc_refs {
        println!("{}", doc_line(d, ""));
    }
    println!();

    if !result.open_todos.is_empty() {
        println!("Open TODOs ({}):", result.open_todos.len());
        for d in &result.open_todos {
            println!("{}", doc_line(d, "Open"));
        }
        println!();
    }

    if !result.other_refs.is_empty() {
        println!("Refs outside doc/ ({}):", result.other_refs.len());
        for p in &result.other_refs {
            let rel = p.strip_prefix(&project_root).unwrap_or(p);
            println!("  {}", rel.display());
        }
        println!();
    }

    let doc_dir = project_root.join("doc");
    if let Ok(entries) = fs::read_dir(&doc_dir) {
        let mut subdirs: Vec<String> = entries
            .flatten()
            .filter(|e| e.path().is_dir())
            .map(|e| e.file_name().to_string_lossy().to_string())
            .filter(|n| !SUBDIR_SKIP.contains(&n.as_str()))
            .collect();
        subdirs.sort();
        if !subdirs.is_empty() {
            println!("Subdirectories in doc/:");
            for d in subdirs {
                println!("  {d}/");
            }
            println!();
        }
    }
    Ok(())
}
