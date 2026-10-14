//! `openclew status` — documentation health dashboard (mirrors lib/status.js).

use std::fs;
use std::path::Path;
use std::process::Command;

use chrono::{NaiveDate, Utc};
use regex::Regex;

use crate::config::get_entry_point;
use crate::parse::collect::{collect_docs, Doc, DocKind};
use crate::parse::legacy::is_legacy;
use crate::parse::todo_flat::{parse_flat_todos, FlatTodo};

const DAY_SECS: i64 = 24 * 60 * 60;

fn rel(doc: &Doc, root: &Path) -> String {
    doc.filepath.strip_prefix(root).unwrap_or(&doc.filepath).display().to_string()
}

fn subject_or_filename(doc: &Doc) -> &str {
    match doc.meta.subject() {
        "" => &doc.filename,
        s => s,
    }
}

/// Age in seconds of a YYYY-MM-DD date (UTC midnight, like JS `new Date("YYYY-MM-DD")`)
fn age_secs(date: &str) -> Option<i64> {
    let d = NaiveDate::parse_from_str(date.get(..10)?, "%Y-%m-%d").ok()?;
    Some(Utc::now().timestamp() - d.and_hms_opt(0, 0, 0)?.and_utc().timestamp())
}

/// Count values in first-seen order, then sort by count desc (stable, like JS)
fn distribution<'a>(values: impl Iterator<Item = &'a str>) -> Vec<(String, usize)> {
    let mut counts: Vec<(String, usize)> = Vec::new();
    for v in values {
        match counts.iter_mut().find(|(k, _)| k == v) {
            Some((_, n)) => *n += 1,
            None => counts.push((v.to_string(), 1)),
        }
    }
    counts.sort_by(|a, b| b.1.cmp(&a.1));
    counts
}

fn print_docs(title: &str, docs: &[&Doc], root: &Path, with_subject: bool) {
    if docs.is_empty() {
        return;
    }
    println!("{title} ({}):", docs.len());
    for d in docs {
        if with_subject {
            println!("  - {}  ({})", rel(d, root), subject_or_filename(d));
        } else {
            println!("  - {}", rel(d, root));
        }
    }
}

fn print_flat_issues(label: &str, items: &[&FlatTodo], hint: &str) {
    if items.is_empty() {
        return;
    }
    println!("  {} {label}:", items.len());
    for t in items.iter().take(10) {
        let label = if t.title.is_empty() { t.description.chars().take(60).collect() } else { t.title.clone() };
        println!("    L{}: {label}", t.line_num);
    }
    if items.len() > 10 {
        println!("    … ({} more)", items.len() - 10);
    }
    println!("  Add: {hint}");
}

/// Warn when several `openclew` executables are on PATH (Node + Rust coexistence)
fn coexistence_check() {
    let out = if cfg!(windows) {
        Command::new("where").arg("openclew").output()
    } else {
        Command::new("which").args(["-a", "openclew"]).output()
    };
    let Ok(out) = out else { return };
    let text = String::from_utf8_lossy(&out.stdout);
    let paths: Vec<&str> = text.lines().map(str::trim).filter(|l| !l.is_empty()).collect();
    if paths.len() > 1 {
        println!("⚠ Multiple openclew binaries found:");
        for p in &paths {
            println!("  - {p}");
        }
        println!("  Active: {} (first in PATH)\n", paths[0]);
    }
}

pub fn run() -> Result<(), String> {
    let root = std::env::current_dir().map_err(|e| e.to_string())?;
    let doc_dir = root.join("doc");
    if !doc_dir.exists() {
        return Err("No doc/ directory found. Run 'openclew init' first.".to_string());
    }

    let docs = collect_docs(&doc_dir);
    let of_kind = |k: DocKind| docs.iter().filter(|d| d.kind == k).collect::<Vec<_>>();
    let (refs, logs, todos) = (of_kind(DocKind::Ref), of_kind(DocKind::Log), of_kind(DocKind::Todo));

    println!("openclew status\n");
    println!("  Refs: {}", refs.len());
    println!("  Logs:    {}", logs.len());
    println!("  Total:   {}", docs.len());
    println!();

    let legacy_count = docs
        .iter()
        .filter(|d| fs::read_to_string(&d.filepath).map(|c| is_legacy(&c)).unwrap_or(false))
        .count();
    if legacy_count > 0 {
        println!("Legacy format: {legacy_count} docs need migration");
        println!("  Run 'npx openclew@0.9.0 migrate' to preview, 'npx openclew@0.9.0 migrate --write' to apply.\n");
    }

    coexistence_check();

    let missing_brief: Vec<&Doc> = docs.iter().filter(|d| d.meta.doc_brief().is_empty()).collect();
    print_docs("Missing doc_brief", &missing_brief, &root, true);
    if !missing_brief.is_empty() {
        println!();
    }

    let missing_subject: Vec<&Doc> = docs.iter().filter(|d| d.meta.subject().is_empty()).collect();
    print_docs("Missing subject", &missing_subject, &root, false);
    if !missing_subject.is_empty() {
        println!();
    }

    // Stale refs: no date, or updated/created > 30 days ago (unparseable date = not stale)
    let stale_refs: Vec<&Doc> = refs
        .iter()
        .copied()
        .filter(|d| {
            let updated = match d.meta.get("updated").unwrap_or("") {
                "" => d.meta.get("created").unwrap_or(""),
                u => u,
            };
            updated.is_empty() || age_secs(updated).is_some_and(|a| a > 30 * DAY_SECS)
        })
        .collect();
    if !stale_refs.is_empty() {
        println!("Stale refs (not updated in 30+ days): {}", stale_refs.len());
        for d in &stale_refs {
            let updated = [d.meta.get("updated"), d.meta.get("created")]
                .into_iter()
                .flatten()
                .find(|s| !s.is_empty())
                .unwrap_or("no date");
            println!("  - {}  ({}, last: {updated})", rel(d, &root), subject_or_filename(d));
        }
        println!();
    }

    let done_no_closed: Vec<&Doc> = todos
        .iter()
        .copied()
        .filter(|d| d.meta.status().to_lowercase() == "done" && d.meta.get("closed").unwrap_or("").is_empty())
        .collect();
    print_docs("Done TODOs missing closed", &done_no_closed, &root, true);
    if !done_no_closed.is_empty() {
        println!("  Add a closed: line in L1 (log path or session reference).\n");
    }

    let no_from: Vec<&Doc> = todos.iter().copied().filter(|d| d.meta.get("from").unwrap_or("").is_empty()).collect();
    print_docs("TODOs missing from", &no_from, &root, true);
    if !no_from.is_empty() {
        println!("  Add a from: line in L1 (log path or free-text reference).\n");
    }

    let statuses = distribution(docs.iter().map(|d| match d.meta.status() {
        "" => "—",
        s => s,
    }));
    if !statuses.is_empty() {
        println!("Status distribution:");
        for (s, n) in &statuses {
            println!("  {s}: {n}");
        }
        println!();
    }

    let categories = distribution(docs.iter().map(|d| d.meta.category()).filter(|c| !c.is_empty() && *c != "—"));
    if !categories.is_empty() {
        println!("Category distribution:");
        for (c, n) in &categories {
            println!("  {c}: {n}");
        }
        println!();
    }

    let todo_path = root.join("TODO.md");
    if let Some(entry) = get_entry_point(&root) {
        if let Ok(content) = fs::read_to_string(root.join(&entry)) {
            let todo_line = Regex::new(r"(?i)^\s*- \[[ x]\] ").unwrap();
            let count = content.split('\n').filter(|l| todo_line.is_match(l.trim())).count();
            if count > 0 && !todo_path.exists() {
                println!("⚠ Found {count} TODO item(s) in {entry}");
                println!("  Consider moving them to TODO.md for cleaner instructions.");
                println!("  Run 'npx openclew@0.9.0 migrate --todo' to extract automatically.\n");
            }
        }
    }

    if let Ok(content) = fs::read_to_string(&todo_path) {
        let flat = parse_flat_todos(&content);
        let pending = flat.iter().filter(|t| !t.done).count();
        println!("TODO.md: {pending} pending, {} done", flat.len() - pending);

        let date_re = Regex::new(r"\((\d{4}-\d{2}-\d{2})\)").unwrap();
        let stale_done = flat
            .iter()
            .filter(|t| t.done)
            .filter(|t| {
                date_re
                    .captures(&t.raw)
                    .and_then(|c| age_secs(&c[1]))
                    .is_some_and(|a| a > 7 * DAY_SECS)
            })
            .count();
        if stale_done > 0 {
            println!("  {stale_done} completed item(s) older than 7 days — consider purging (archive, don't delete)");
        }

        let missing_from: Vec<&FlatTodo> = flat.iter().filter(|t| t.from.is_empty()).collect();
        let done_missing_closed: Vec<&FlatTodo> = flat.iter().filter(|t| t.done && t.closed.is_empty()).collect();
        print_flat_issues("TODO(s) missing from marker", &missing_from, "<!-- from: doc/log/<path>.md --> (or free-text reference)");
        print_flat_issues(
            "done TODO(s) missing closed marker",
            &done_missing_closed,
            "<!-- closed: doc/log/<path>.md --> (or free-text reference)",
        );
        println!();
    }

    let total = docs.len();
    if total == 0 {
        println!("Health: no docs yet. Run 'openclew add ref \"Title\"' to create one.");
        return Ok(());
    }
    let with_brief = total - missing_brief.len();
    let with_subject = total - missing_subject.len();
    let fresh_refs = refs.len() - stale_refs.len();
    let health = ((with_brief + with_subject + fresh_refs) as f64 / (2 * total + refs.len().max(1)) as f64 * 100.0).round();
    println!("Health: {health}%");
    if health == 100.0 {
        println!("  All docs have subject + doc_brief, no stale refs.");
    }
    Ok(())
}
