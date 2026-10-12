use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};

use super::l1;
use super::metadata::Metadata;

const SKIP_DIRS: &[&str] = &["_archive", "old", ".Rproj.user"];
const SKIP_FILES: &[&str] = &["_INDEX.md", "_INDEX_NOTES.md"];
const REF_EXTRA_SKIP: &[&str] = &["log", "notes", "verify_logs", "todo"];

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DocKind {
    Ref,
    Log,
    Todo,
}

impl DocKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            DocKind::Ref => "ref",
            DocKind::Log => "log",
            DocKind::Todo => "todo",
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

fn file_name(path: &Path) -> String {
    path.file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string()
}

/// Parse each path, keep the parseable ones as `kind` docs
fn to_docs(paths: Vec<PathBuf>, kind: DocKind) -> Vec<Doc> {
    paths
        .into_iter()
        .filter_map(|filepath| {
            let meta = parse_file(&filepath)?;
            Some(Doc {
                filename: file_name(&filepath),
                filepath,
                kind: kind.clone(),
                meta,
            })
        })
        .collect()
}

/// All `.md` files under `dir`, newest first (date-prefixed filenames)
fn dated_md_files(dir: &Path) -> Vec<PathBuf> {
    let mut files: Vec<PathBuf> = walk_dir(dir, &HashSet::new())
        .into_iter()
        .filter(|f| file_name(f).ends_with(".md"))
        .collect();
    files.sort();
    files.reverse();
    files
}

/// Collect all docs from the doc/ directory.
/// Mirrors `lib/search.js` collectDocs: refs, then logs, then todos.
pub fn collect_docs(doc_dir: &Path) -> Vec<Doc> {
    let mut docs = Vec::new();

    // Refs: any .md under doc/ref/ (current convention) + _*.md elsewhere (legacy).
    // Excludes log/, notes/, verify_logs/, todo/ subdirs.
    if doc_dir.exists() {
        let ref_skip: HashSet<&str> = REF_EXTRA_SKIP.iter().copied().collect();
        let ref_dir = doc_dir.join("ref");
        let mut refs: Vec<PathBuf> = walk_dir(doc_dir, &ref_skip)
            .into_iter()
            .filter(|f| {
                let name = file_name(f);
                if !name.ends_with(".md") || SKIP_FILES.contains(&name.as_str()) {
                    return false;
                }
                f.starts_with(&ref_dir) || name.starts_with('_')
            })
            .collect();
        refs.sort();
        docs.extend(to_docs(refs, DocKind::Ref));
    }

    let log_dir = doc_dir.join("log");
    if log_dir.exists() {
        docs.extend(to_docs(dated_md_files(&log_dir), DocKind::Log));
    }

    let todo_dir = doc_dir.join("todo");
    if todo_dir.exists() {
        docs.extend(to_docs(dated_md_files(&todo_dir), DocKind::Todo));
    }

    docs
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::{json, Map, Value};

    /// Node <-> Rust parity: same fixtures, same golden as test/parity.test.js.
    #[test]
    fn test_parity_golden() {
        let parity_dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("../test/fixtures/parity");
        let doc_dir = parity_dir.join("doc");

        let actual: Vec<Value> = collect_docs(&doc_dir)
            .into_iter()
            .map(|d| {
                let mut meta: Map<String, Value> = d
                    .meta
                    .fields
                    .iter()
                    .map(|(k, v)| (k.clone(), json!(v)))
                    .collect();
                if let Some(v) = &d.meta.version {
                    meta.insert("version".to_string(), json!(v));
                }
                let rel = d.filepath.strip_prefix(&doc_dir).unwrap();
                json!({
                    "path": rel.to_string_lossy().replace('\\', "/"),
                    "kind": d.kind.as_str(),
                    "meta": meta,
                })
            })
            .collect();

        let golden = fs::read_to_string(parity_dir.join("expected.json")).unwrap();
        let expected: Vec<Value> = serde_json::from_str(&golden).unwrap();
        assert_eq!(Value::Array(actual), Value::Array(expected));
    }
}
