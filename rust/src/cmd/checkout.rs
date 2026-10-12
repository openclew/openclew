//! `openclew checkout` — end-of-session summary + session log (mirrors lib/checkout.js).
//!
//! 1. Collect git activity (today's commits, uncommitted changes)
//! 2. Display summary table
//! 3. Create a session log pre-filled with the activity
//! 4. Regenerate the index

use std::fs;
use std::path::Path;
use std::process::Command;

use regex::Regex;

use crate::config::read_config;
use crate::template;
use crate::util::{slugify_log, today};

struct Action {
    hash: String,
    kind: String,
    scope: String,
    desc: String,
}

/// Run git, return trimmed stdout ("" on any failure, like Node's execSync wrapper)
fn git(root: &Path, args: &[&str]) -> String {
    Command::new("git")
        .args(args)
        .current_dir(root)
        .output()
        .ok()
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_default()
}

fn non_empty_lines(s: &str) -> Vec<String> {
    s.lines().filter(|l| !l.trim().is_empty()).map(str::to_string).collect()
}

fn extract_actions(commits: &[String]) -> Vec<Action> {
    let conventional = Regex::new(r"^([a-f0-9]+)\s+([A-Za-z0-9_]+)(?:\(([^)]*)\))?:\s*(.+)$").unwrap();
    let plain = Regex::new(r"^([a-f0-9]+)\s+(.+)$").unwrap();
    commits
        .iter()
        .map(|c| {
            if let Some(m) = conventional.captures(c) {
                return Action {
                    hash: m[1].to_string(),
                    kind: m[2].to_string(),
                    scope: m.get(3).map_or("", |s| s.as_str()).to_string(),
                    desc: m[4].to_string(),
                };
            }
            let (hash, desc) = match plain.captures(c) {
                Some(p) => (p[1].to_string(), p[2].to_string()),
                None => (String::new(), c.clone()),
            };
            Action { hash, kind: "other".into(), scope: String::new(), desc }
        })
        .collect()
}

fn type_label(kind: &str) -> String {
    match kind {
        "feat" => "Feature".into(),
        "fix" => "Fix".into(),
        "refactor" => "Refactor".into(),
        "docs" => "Doc".into(),
        "test" => "Test".into(),
        "build" => "Build".into(),
        "chore" => "Chore".into(),
        other => {
            let mut chars = other.chars();
            match chars.next() {
                Some(first) => first.to_uppercase().chain(chars).collect(),
                None => String::new(),
            }
        }
    }
}

/// Refs: doc/ref/*.md (current) + doc/_*.md (legacy), directory order like Node readdirSync
fn list_refs(doc_dir: &Path) -> Vec<String> {
    let names = |dir: &Path| -> Vec<String> {
        let mut v: Vec<String> = fs::read_dir(dir)
            .map(|e| e.flatten().map(|e| e.file_name().to_string_lossy().to_string()).collect())
            .unwrap_or_default();
        v.sort();
        v
    };
    let mut refs: Vec<String> = names(&doc_dir.join("ref")).into_iter().filter(|f| f.ends_with(".md")).collect();
    refs.extend(
        names(doc_dir)
            .into_iter()
            .filter(|f| f.starts_with('_') && f != "_INDEX.md" && f.ends_with(".md")),
    );
    refs
}

fn display_summary(date: &str, actions: &[Action], uncommitted: &[String], existing_logs: &[String], refs: &[String]) {
    println!("\nopenclew checkout — {date}\n");

    if !actions.is_empty() {
        println!("  Commits today:");
        println!("  ┌─────┬──────────────────────────────────────────────┬─────┐");
        println!("  │ Sta │ Action                                       │ Com │");
        println!("  ├─────┼──────────────────────────────────────────────┼─────┤");
        for a in actions {
            let label = format!("{} : {}", type_label(&a.kind), a.desc);
            let truncated = if label.chars().count() > 44 {
                format!("{}…", label.chars().take(43).collect::<String>())
            } else {
                label
            };
            println!("  │ ✅  │ {truncated:<44} │ 🟢  │");
        }
        println!("  └─────┴──────────────────────────────────────────────┴─────┘");
        println!();
    }

    if !uncommitted.is_empty() {
        println!("  Uncommitted changes: {} file(s)", uncommitted.len());
        for line in uncommitted.iter().take(10) {
            println!("    {line}");
        }
        if uncommitted.len() > 10 {
            println!("    ... and {} more", uncommitted.len() - 10);
        }
        println!();
    }

    if existing_logs.is_empty() {
        println!("  📕 No log created today");
    } else {
        println!("  📗 Today's logs: {}", existing_logs.join(", "));
    }
    println!();

    if !refs.is_empty() {
        println!("  📚 Refs — check if any need updating:");
        for r in refs {
            println!("     {r}");
        }
        println!();
    }
}

fn session_log_content(date_actions: &[Action]) -> (String, String) {
    let actions = date_actions;
    let title = match actions.len() {
        1 => actions[0].desc.clone(),
        0 => "Work session".to_string(),
        _ => {
            let mut types: Vec<String> = Vec::new();
            for a in actions {
                let l = type_label(&a.kind);
                if !types.contains(&l) {
                    types.push(l);
                }
            }
            format!("{} session", types.join(" + "))
        }
    };

    let mut scopes: Vec<&str> = Vec::new();
    for a in actions {
        if !a.scope.is_empty() && !scopes.contains(&a.scope.as_str()) {
            scopes.push(&a.scope);
        }
    }
    let keywords = format!("[{}]", scopes.join(", "));
    let commits = actions
        .iter()
        .map(|a| format!("- {}: {} ({})", type_label(&a.kind), a.desc, a.hash))
        .collect::<Vec<_>>()
        .join("\n");
    let log_type = if actions.len() == 1 && actions[0].kind == "fix" { "Bug" } else { "Feature" };
    let brief = format!("{}.", actions.iter().map(|a| a.desc.as_str()).collect::<Vec<_>>().join(". "));

    let content = template::checkout_log_content(log_type, &keywords, &title, &brief, &commits);
    (title, content)
}

pub fn run() -> Result<(), String> {
    let root = std::env::current_dir().map_err(|e| e.to_string())?;
    let doc_dir = root.join("doc");
    let log_dir = doc_dir.join("log");
    if !doc_dir.exists() {
        return Err("No doc/ directory found. Run 'openclew init' first.".to_string());
    }
    if read_config(&root).is_none() {
        eprintln!("Warning: no .openclew.json found. Run 'openclew init' first.\n");
    }

    let date = today();
    let commits = non_empty_lines(&git(&root, &["log", &format!("--since={date} 00:00"), "--format=%h %s", "--no-merges"]));
    // Node trims the whole `git status` output, which eats the first line's leading space
    let uncommitted = non_empty_lines(&git(&root, &["status", "--porcelain"]));
    let mut existing_logs: Vec<String> = fs::read_dir(&log_dir)
        .map(|e| {
            e.flatten()
                .map(|e| e.file_name().to_string_lossy().to_string())
                .filter(|f| f.starts_with(&date))
                .collect()
        })
        .unwrap_or_default();
    existing_logs.sort();
    let refs = list_refs(&doc_dir);
    let actions = extract_actions(&commits);

    if actions.is_empty() && uncommitted.is_empty() {
        println!("\nopenclew checkout — {date}\n");
        println!("  Nothing to report — no commits or changes today.");
        println!();
        return Ok(());
    }
    display_summary(&date, &actions, &uncommitted, &existing_logs, &refs);
    if actions.is_empty() {
        return Ok(());
    }

    println!("─── Log ───");
    let (title, content) = session_log_content(&actions);
    let filename = format!("{date}_{}.md", slugify_log(&title));
    let filepath = log_dir.join(&filename);
    if filepath.exists() {
        println!("  Log already exists: doc/log/{filename}");
    } else if !log_dir.exists() {
        println!("  No doc/log/ directory. Run 'openclew init' first.");
    } else {
        fs::write(&filepath, content).map_err(|e| format!("Cannot write log: {e}"))?;
        println!("  📝 Created doc/log/{filename}");
        println!("     Pre-filled with today's commits. Edit to add context.");
        // Silent on failure: the index is rebuilt on next commit anyway
        if crate::cmd::index::write_index(&doc_dir).is_ok() {
            println!("  📋 Regenerated doc/_INDEX.md");
        }
    }
    println!();
    Ok(())
}
