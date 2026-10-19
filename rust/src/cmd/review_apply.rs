//! Gestures on refs, never a deletion nor a move (mirrors lib/review-apply.js).
//!
//! Deterministic pass (`--apply`, run by checkout):
//!   - refresh: a dead backticked path is rewritten when its move is proven,
//!     with exactly one match: the cited path was relative to a subfolder
//!     (a file ends with it), or a legacy `<dir>/_NAME.md` became
//!     `<dir>/ref/.../NAME.md`. A mere same-name file elsewhere is no proof;
//!   - archive: a ref marked deprecated/redirect whose replacement is proven
//!     (same-name cited ref that exists, or the only existing ref cited in L1)
//!     gets `status: Archived` + `superseded_by`, in place.
//! Judged gestures (agent): `--archive`, `--confirm`.
//! Every gesture is appended to the journal (CONFIG.journal).

use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::LazyLock;

use regex::Regex;
use serde::Serialize;

use crate::cmd::review::{dead_paths, is_archived, is_deprecated, to_posix, CONFIG};
use crate::parse::collect::{collect_docs, Doc, DocKind};
use crate::template;

static MD_PATH: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"[\p{L}\p{N}_.\-]+(?:/[\p{L}\p{N}_.\-]+)+\.md").unwrap());
static L1_END: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\n---\n|<!--\s*L1_END\s*-->").unwrap());
static L1_START_LINE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"<!--\s*L1_START\s*-->").unwrap());
static L1_END_LINE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"<!--\s*L1_END\s*-->").unwrap());
static META_LINE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^(openclew|clw_ref)@").unwrap());

#[derive(Serialize, Debug, Clone, PartialEq)]
pub struct Gesture {
    pub path: String,
    pub gesture: String,
    pub detail: String,
    pub why: String,
}

#[derive(Serialize, Debug)]
pub struct ApplyResult {
    pub today: String,
    pub gestures: Vec<Gesture>,
    pub touched: Vec<String>,
    pub committed: Option<String>,
}

fn git(root: &Path, args: &[&str]) -> Option<String> {
    let out = Command::new("git").arg("-C").arg(root).args(args).stderr(Stdio::null()).output().ok()?;
    out.status.success().then(|| String::from_utf8_lossy(&out.stdout).to_string())
}

/// Refs with uncommitted changes (modified, staged, untracked): never touched
fn dirty_paths(root: &Path) -> HashSet<String> {
    let listed = git(root, &["ls-files", "-m", "-o", "--exclude-standard", "--", "doc"]).unwrap_or_default();
    let staged = git(root, &["diff", "--cached", "--name-only", "--relative", "--", "doc"]).unwrap_or_default();
    listed.lines().chain(staged.lines()).filter(|l| !l.is_empty()).map(String::from).collect()
}

fn strip_underscore(name: &str) -> &str {
    name.trim_start_matches('_')
}

fn file_name(p: &str) -> &str {
    p.rsplit('/').next().unwrap_or(p)
}

/// All files under base by exact name
fn file_index(base: &Path) -> HashMap<String, Vec<String>> {
    fn walk(base: &Path, dir: &Path, index: &mut HashMap<String, Vec<String>>) {
        let Ok(entries) = fs::read_dir(dir) else { return };
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with('.') {
                continue;
            }
            let path = entry.path();
            if path.is_dir() {
                if !CONFIG.skip_dirs.contains(&name) {
                    walk(base, &path, index);
                }
            } else if path.is_file() {
                let rel = to_posix(path.strip_prefix(base).unwrap_or(&path));
                index.entry(name).or_default().push(rel);
            }
        }
    }
    let mut index = HashMap::new();
    walk(base, base, &mut index);
    index
}

/// Proven new location of a dead path, in the project or the sibling it names:
/// (path, why), or None when there is not exactly one match
fn resolve_moved(
    root: &Path,
    cited: &str,
    cache: &mut HashMap<PathBuf, HashMap<String, Vec<String>>>,
) -> Option<(String, &'static str)> {
    let first = cited.split('/').next().unwrap_or(cited);
    let parent = root.parent().unwrap_or(root);
    let sibling = !root.join(first).is_dir() && parent.join(first).is_dir();
    let base = if sibling { parent.join(first) } else { root.to_path_buf() };
    let rest = if sibling { &cited[first.len() + 1..] } else { cited };
    let index = cache.entry(base.clone()).or_insert_with(|| file_index(&base));
    let name = file_name(rest);
    let mut matches: Vec<(String, &'static str)> = Vec::new();
    let suffix = format!("/{rest}");
    for found in index.get(name).into_iter().flatten() {
        if found.ends_with(&suffix) && !matches.iter().any(|(m, _)| m == found) {
            matches.push((found.clone(), "dead path, it was relative to a subfolder"));
        }
    }
    if name.starts_with('_') {
        let ref_dir = match rest.rsplit_once('/') {
            Some((dir, _)) => format!("{dir}/ref/"),
            None => "ref/".to_string(),
        };
        for found in index.get(strip_underscore(name)).into_iter().flatten() {
            if found.starts_with(&ref_dir) && !matches.iter().any(|(m, _)| m == found) {
                matches.push((found.clone(), "dead path, legacy _NAME moved to ref/"));
            }
        }
    }
    if matches.len() != 1 {
        return None;
    }
    let (found, why) = matches.remove(0);
    Some((if sibling { format!("{first}/{found}") } else { found }, why))
}

fn exists_from(root: &Path, ref_dir: &Path, p: &str) -> Option<PathBuf> {
    let parent = root.parent().unwrap_or(root);
    [root, ref_dir, parent].iter().map(|b| b.join(p)).find(|full| full.exists())
}

/// Replacement of a deprecated ref, only when proven
fn archive_target(root: &Path, doc: &Doc, content: &str) -> Option<String> {
    let ref_dir = doc.filepath.parent().unwrap_or(root);
    let own = fs::canonicalize(&doc.filepath).ok();
    let cited = |text: &str| -> Vec<String> {
        let mut seen = HashSet::new();
        let mut out = Vec::new();
        for m in MD_PATH.find_iter(text) {
            let p = m.as_str().to_string();
            if !seen.insert(p.clone()) {
                continue;
            }
            let other = exists_from(root, ref_dir, &p).and_then(|f| fs::canonicalize(f).ok());
            if other.is_some() && other != own {
                out.push(p);
            }
        }
        out
    };
    let own_name = strip_underscore(&doc.filename);
    if let Some(same) = cited(content).into_iter().find(|p| strip_underscore(file_name(p)) == own_name) {
        return Some(same);
    }
    let l1 = L1_END.find(content).map_or(content, |m| &content[..m.start()]);
    let in_l1 = cited(l1);
    (in_l1.len() == 1).then(|| in_l1[0].clone())
}

/// Set metadata fields in place: line-1 metadata (`clw_ref@` / `openclew@`)
/// or a legacy `key: value` L1 block. None for any other layout.
pub fn set_fields(content: &str, fields: &[(&str, &str)]) -> Option<String> {
    let mut lines: Vec<String> = content.split('\n').map(String::from).collect();
    if META_LINE.is_match(&lines[0]) {
        let mut parts: Vec<String> = lines[0].split(" · ").map(String::from).collect();
        for (key, value) in fields {
            let idx = parts
                .iter()
                .enumerate()
                .position(|(i, p)| i > 0 && p.split(':').next().unwrap_or("").trim().to_lowercase() == *key);
            match idx {
                Some(i) => parts[i] = format!("{key}: {value}"),
                None => parts.push(format!("{key}: {value}")),
            }
        }
        lines[0] = parts.join(" · ");
        return Some(lines.join("\n"));
    }
    let start = lines.iter().position(|l| L1_START_LINE.is_match(l))?;
    let end = lines.iter().position(|l| L1_END_LINE.is_match(l))?;
    if end < start {
        return None;
    }
    let mut insert_at = end;
    for (key, value) in fields {
        let prefix = format!("{key}:");
        let idx = (start + 1..insert_at).find(|&i| lines[i].starts_with(&prefix));
        match idx {
            Some(i) => {
                lines[i] = format!("{key}: {value}");
                insert_at = i + 1;
            }
            None => {
                lines.insert(insert_at, format!("{key}: {value}"));
                insert_at += 1;
            }
        }
    }
    Some(lines.join("\n"))
}

fn cell(text: &str) -> String {
    text.replace('|', "\\|").replace('\n', " ")
}

fn journal(root: &Path, entries: &[(Gesture, &str, &str)]) -> Result<(), String> {
    if entries.is_empty() {
        return Ok(());
    }
    let file = root.join(&CONFIG.journal);
    let mut content = fs::read_to_string(&file).unwrap_or_else(|_| template::review_journal_header());
    if !content.ends_with('\n') {
        content.push('\n');
    }
    for (g, date, by) in entries {
        let gesture = if g.detail.is_empty() { g.gesture.clone() } else { format!("{} ({})", g.gesture, g.detail) };
        content.push_str(&format!("| {date} | {by} | {} | {} | {} |\n", g.path, cell(&gesture), cell(&g.why)));
    }
    fs::write(&file, content).map_err(|e| format!("Cannot write journal: {e}"))
}

/// Commit title agreed in number; `.openclew.json` `reviewCommit: { one, many }` overrides it.
/// Read as raw JSON: `Config` is rewritten by `init` and must not carry it.
pub fn commit_title(root: &Path, count: usize) -> String {
    let custom: serde_json::Value = fs::read_to_string(root.join(".openclew.json"))
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    let form = if count == 1 { "one" } else { "many" };
    let title = custom["reviewCommit"][form]
        .as_str()
        .map(String::from)
        .or_else(|| CONFIG.commit_title.get(form).cloned())
        .unwrap_or_default();
    title.replace("{{COUNT}}", &count.to_string())
}

/// Dedicated commit of the touched files only; returns the short sha re-read from git
fn commit_gestures(root: &Path, paths: &[String], message: &str) -> Option<String> {
    let mut add = vec!["add", "--"];
    add.extend(paths.iter().map(String::as_str));
    git(root, &add)?;
    let mut commit = vec!["commit", "-q", "-m", message, "--only", "--"];
    commit.extend(paths.iter().map(String::as_str));
    git(root, &commit)?;
    git(root, &["rev-parse", "--short", "HEAD"]).map(|s| s.trim().to_string())
}

fn refs_of(root: &Path) -> Vec<(String, Doc)> {
    collect_docs(&root.join("doc"))
        .into_iter()
        .filter(|d| d.kind == DocKind::Ref)
        .map(|d| (to_posix(d.filepath.strip_prefix(root).unwrap_or(&d.filepath)), d))
        .collect()
}

/// Deterministic pass. Skips archived refs and refs with uncommitted changes.
pub fn apply_refs(root: &Path, today: &str, use_git: bool, commit: bool) -> ApplyResult {
    let dirty = if use_git { dirty_paths(root) } else { HashSet::new() };
    let mut cache = HashMap::new();
    let mut gestures = Vec::new();
    let mut touched = Vec::new();

    for (rel, doc) in refs_of(root) {
        if is_archived(&rel, doc.meta.status()) || dirty.contains(&rel) {
            continue;
        }
        let Ok(original) = fs::read_to_string(&doc.filepath) else { continue };
        let mut content = original.clone();
        let ref_dir = doc.filepath.parent().unwrap_or(root).to_path_buf();

        for dead in dead_paths(&content, root, &ref_dir) {
            let Some((moved, why)) = resolve_moved(root, &dead, &mut cache) else { continue };
            content = content.replace(&format!("`{dead}`"), &format!("`{moved}`"));
            gestures.push(Gesture {
                path: rel.clone(),
                gesture: "refresh".into(),
                detail: format!("`{dead}` → `{moved}`"),
                why: why.into(),
            });
        }

        if is_deprecated(&doc.meta) {
            if let Some(target) = archive_target(root, &doc, &content) {
                if let Some(archived) = set_fields(&content, &[("status", "Archived"), ("superseded_by", &target)]) {
                    content = archived;
                    gestures.push(Gesture {
                        path: rel.clone(),
                        gesture: "archive".into(),
                        detail: format!("superseded_by: {target}"),
                        why: "marked deprecated or redirect, replacement exists".into(),
                    });
                }
            }
        }

        if content != original && fs::write(&doc.filepath, &content).is_ok() {
            touched.push(rel);
        }
    }

    let entries: Vec<_> = gestures.iter().map(|g| (g.clone(), today, "auto")).collect();
    let _ = journal(root, &entries);
    let mut committed = None;
    if commit && use_git && !touched.is_empty() {
        let body: Vec<String> = gestures.iter().map(|g| format!("- {}: {} {}", g.path, g.gesture, g.detail)).collect();
        let message = format!("{}\n\n{}", commit_title(root, gestures.len()), body.join("\n"));
        let mut paths = touched.clone();
        paths.push(CONFIG.journal.clone());
        committed = commit_gestures(root, &paths, &message);
    }
    ApplyResult { today: today.to_string(), gestures, touched, committed }
}

fn judged(root: &Path, rel: &str, fields: &[(&str, &str)], gesture: Gesture, today: &str) -> Result<(), String> {
    if gesture.why.is_empty() {
        return Err("--why is required: say why, it goes to the journal".into());
    }
    let file = root.join(rel);
    let content = fs::read_to_string(&file).map_err(|_| format!("No such ref: {rel}"))?;
    let updated = set_fields(&content, fields).ok_or(format!("{rel}: metadata layout not supported, edit it by hand"))?;
    fs::write(&file, updated).map_err(|e| e.to_string())?;
    journal(root, &[(gesture, today, "agent")])
}

/// Judged archive: in place, with an optional replacement that must exist
pub fn archive_ref(root: &Path, rel: &str, superseded_by: Option<&str>, why: &str, today: &str) -> Result<(), String> {
    let mut fields = vec![("status", "Archived")];
    if let Some(target) = superseded_by {
        let ref_dir = root.join(rel).parent().map(Path::to_path_buf).unwrap_or(root.to_path_buf());
        if exists_from(root, &ref_dir, target).is_none() {
            return Err(format!("Replacement not found: {target}"));
        }
        fields.push(("superseded_by", target));
    }
    let detail = superseded_by.map(|t| format!("superseded_by: {t}")).unwrap_or_default();
    let gesture = Gesture { path: rel.to_string(), gesture: "archive".into(), detail, why: why.to_string() };
    judged(root, rel, &fields, gesture, today)
}

/// Judged confirmation: still true, takes the ref out of the score for age_days
pub fn confirm_ref(root: &Path, rel: &str, why: &str, today: &str) -> Result<(), String> {
    let gesture = Gesture { path: rel.to_string(), gesture: "confirm".into(), detail: String::new(), why: why.to_string() };
    judged(root, rel, &[("reviewed", today)], gesture, today)
}

/// Re-read summary of a deterministic pass, for checkout and the CLI
pub fn format_apply(result: &ApplyResult) -> String {
    if result.gestures.is_empty() {
        return String::new();
    }
    let commit = match &result.committed {
        Some(sha) => format!("committed {sha}"),
        None => "not committed".into(),
    };
    let mut lines =
        vec![format!("  🧹 Automatic cleanup: {} gesture(s), {commit} (journal: {})", result.gestures.len(), CONFIG.journal)];
    lines.extend(result.gestures.iter().map(|g| format!("     - {}: {} {}", g.path, g.gesture, g.detail)));
    lines.join("\n") + "\n"
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Same expectations as test/review-apply.test.js "commit title"
    #[test]
    fn test_commit_title() {
        let root = std::env::temp_dir().join(format!("oc-commit-title-{}", std::process::id()));
        fs::create_dir_all(&root).unwrap();
        let _ = fs::remove_file(root.join(".openclew.json"));
        assert_eq!(commit_title(&root, 1), "docs(review): 1 automatic cleanup gesture");
        assert_eq!(commit_title(&root, 47), "docs(review): 47 automatic cleanup gestures");
        let custom = r#"{"reviewCommit":{"one":"docs(review): 1 geste de nettoyage","many":"docs(review): {{COUNT}} gestes de nettoyage"}}"#;
        fs::write(root.join(".openclew.json"), custom).unwrap();
        assert_eq!(commit_title(&root, 1), "docs(review): 1 geste de nettoyage");
        assert_eq!(commit_title(&root, 47), "docs(review): 47 gestes de nettoyage");
        let _ = fs::remove_file(root.join(".openclew.json"));
    }
}
