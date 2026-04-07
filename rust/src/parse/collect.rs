use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};

use super::l1;
use super::metadata::Metadata;

const SKIP_DIRS: &[&str] = &["_archive", "old", ".Rproj.user"];
const SKIP_FILES: &[&str] = &["_INDEX.md", "_INDEX_NOTES.md"];
const REFDOC_EXTRA_SKIP: &[&str] = &["log", "notes", "verify_logs"];

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DocKind {
    Refdoc,
    Log,
}

impl DocKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            DocKind::Refdoc => "refdoc",
            DocKind::Log => "log",
        }
    }
}

#[derive(Debug, Clone)]
pub struct Doc {
    pub filepath: PathBuf,
    pub filename: String,
    pub kind: DocKind,
    pub meta: Metadata,
}

/// Recursively list all files under dir, skipping excluded directories
fn walk_dir(dir: &Path, extra_skip: &HashSet<&str>) -> Vec<PathBuf> {
    let mut results = Vec::new();
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return results,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name();
        let name_str = name.to_string_lossy();

        if path.is_dir() {
            if SKIP_DIRS.contains(&name_str.as_ref()) || extra_skip.contains(name_str.as_ref()) {
                continue;
            }
            results.extend(walk_dir(&path, extra_skip));
        } else if path.is_file() {
            results.push(path);
        }
    }

    results
}

/// Parse a file and return its metadata, or None if not parseable
fn parse_file(filepath: &Path) -> Option<Metadata> {
    let content = fs::read_to_string(filepath).ok()?;
    l1::parse_file_content(&content)
}

/// Collect all docs from the doc/ directory
pub fn collect_docs(doc_dir: &Path) -> Vec<Doc> {
    let mut docs = Vec::new();
    let skip_files: HashSet<&str> = SKIP_FILES.iter().copied().collect();

    // Refdocs: _*.md recursively under doc_dir (excluding log/, notes/, verify_logs/)
    if doc_dir.exists() {
        let refdoc_skip: HashSet<&str> = REFDOC_EXTRA_SKIP.iter().copied().collect();
        let mut refdocs: Vec<PathBuf> = walk_dir(doc_dir, &refdoc_skip)
            .into_iter()
            .filter(|f| {
                let name = f.file_name().unwrap_or_default().to_string_lossy();
                name.starts_with('_') && name.ends_with(".md") && !skip_files.contains(name.as_ref())
            })
            .collect();
        refdocs.sort();

        for filepath in refdocs {
            if let Some(meta) = parse_file(&filepath) {
                let filename = filepath
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();
                docs.push(Doc {
                    filepath,
                    filename,
                    kind: DocKind::Refdoc,
                    meta,
                });
            }
        }
    }

    // Logs: *.md recursively under doc_dir/log/
    let log_dir = doc_dir.join("log");
    if log_dir.exists() {
        let no_skip: HashSet<&str> = HashSet::new();
        let mut logs: Vec<PathBuf> = walk_dir(&log_dir, &no_skip)
            .into_iter()
            .filter(|f| {
                f.file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .ends_with(".md")
            })
            .collect();
        logs.sort();
        logs.reverse(); // newest first

        for filepath in logs {
            if let Some(meta) = parse_file(&filepath) {
                let filename = filepath
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();
                docs.push(Doc {
                    filepath,
                    filename,
                    kind: DocKind::Log,
                    meta,
                });
            }
        }
    }

    docs
}
