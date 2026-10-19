//! `openclew review` — refs that may be outdated, read-only (mirrors lib/review.js).
//!
//! Candidate = marked deprecated (status, type or brief wording, any age), or
//! untouched for `age_days` (latest of git commit, `updated`, `created`,
//! `reviewed`) AND at least one signal: orphan, transient status, dead
//! backticked paths, twin subject. Ranked by weighted signals, then age.
//! Thresholds and weights: templates/embedded/review.json.

use std::collections::{BTreeSet, HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::LazyLock;

use chrono::NaiveDate;
use regex::Regex;
use serde::{Deserialize, Serialize};

use crate::parse::collect::{collect_docs, DocKind};
use crate::template;
use crate::util::today;

#[derive(Deserialize)]
pub struct Config {
    pub age_days: i64,
    pub orphan_max_inbound: i64,
    pub signal_weights: HashMap<String, i64>,
    pub transient_statuses: Vec<String>,
    pub archived_statuses: Vec<String>,
    pub archive_dirs: Vec<String>,
    pub deprecated_markers: Vec<String>,
    pub journal: String,
    pub scan_extensions: Vec<String>,
    pub skip_dirs: Vec<String>,
    pub max_scan_bytes: u64,
    pub top_default: usize,
    pub commit_title: HashMap<String, String>,
}

pub static CONFIG: LazyLock<Config> =
    LazyLock::new(|| serde_json::from_str(template::REVIEW_CONFIG).expect("review.json is valid"));

const SKIP_FILES: &[&str] = &["_INDEX.md", "_INDEX_NOTES.md"];

/// The journal cites refs by name: it must never count as an inbound link
fn is_skipped_file(name: &str) -> bool {
    SKIP_FILES.contains(&name) || name == basename(&CONFIG.journal)
}
static MD_TOKEN: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"[\p{L}\p{N}_.\-]+\.md").unwrap());
static BACKTICK_PATH: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"`([\p{L}\p{N}_.\-]+(?:/[\p{L}\p{N}_.\-]+)+\.[A-Za-z0-9]+)`").unwrap());
static NON_ALNUM: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"[^\p{L}\p{N}]+").unwrap());

#[derive(Serialize, Debug, Clone, PartialEq)]
pub struct Candidate {
    pub path: String,
    pub subject: String,
    pub status: String,
    pub last_touch: String,
    pub age_days: Option<i64>,
    pub inbound: i64,
    pub score: i64,
    pub signals: Vec<&'static str>,
    pub dead_paths: Vec<String>,
    pub twin_of: Vec<String>,
}

#[derive(Serialize, Debug)]
pub struct Report {
    pub today: String,
    pub age_days: i64,
    pub refs_scanned: usize,
    pub candidates: Vec<Candidate>,
}

fn day_number(date: &str) -> Option<i64> {
    if date.len() != 10 {
        return None;
    }
    let d = NaiveDate::parse_from_str(date, "%Y-%m-%d").ok()?;
    Some(d.and_hms_opt(0, 0, 0)?.and_utc().timestamp() / 86_400)
}

pub fn to_posix(p: &Path) -> String {
    p.to_string_lossy().replace('\\', "/")
}

fn basename(token: &str) -> &str {
    token.rsplit(['/', '\\']).next().unwrap_or(token)
}

/// Latest commit date per path (relative to root), from one `git log`
fn git_last_dates(root: &Path) -> HashMap<String, String> {
    let mut dates = HashMap::new();
    let out = Command::new("git")
        .arg("-C")
        .arg(root)
        .args(["log", "--format=@@%as", "--name-only", "--relative", "--", "doc"])
        .stderr(Stdio::null())
        .output();
    let Ok(out) = out else { return dates };
    if !out.status.success() {
        return dates;
    }
    let mut current = String::new();
    for line in String::from_utf8_lossy(&out.stdout).lines() {
        if let Some(d) = line.strip_prefix("@@") {
            current = d.to_string();
        } else if !line.trim().is_empty() && !dates.contains_key(line) {
            dates.insert(line.to_string(), current.clone());
        }
    }
    dates
}

/// Text files of the project, skipping hidden, build and vendored dirs
fn scan_files(dir: &Path, out: &mut Vec<PathBuf>) {
    let Ok(entries) = fs::read_dir(dir) else { return };
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') {
            continue;
        }
        let path = entry.path();
        if path.is_dir() {
            if !CONFIG.skip_dirs.contains(&name) {
                scan_files(&path, out);
            }
        } else if path.is_file() && !is_skipped_file(&name) {
            let ext = path.extension().map(|e| e.to_string_lossy().to_lowercase()).unwrap_or_default();
            if CONFIG.scan_extensions.contains(&ext) {
                out.push(path);
            }
        }
    }
}

fn read_small(file: &Path) -> String {
    match fs::metadata(file) {
        Ok(m) if m.len() <= CONFIG.max_scan_bytes => fs::read_to_string(file).unwrap_or_default(),
        _ => String::new(),
    }
}

/// Number of files citing each `.md` basename (a file counts once)
fn inbound_counts(root: &Path) -> HashMap<String, i64> {
    let mut files = Vec::new();
    scan_files(root, &mut files);
    let mut counts = HashMap::new();
    for file in files {
        let content = read_small(&file);
        let names: HashSet<&str> = MD_TOKEN.find_iter(&content).map(|m| basename(m.as_str())).collect();
        for name in names {
            *counts.entry(name.to_string()).or_insert(0) += 1;
        }
    }
    counts
}

pub fn words(text: &str) -> Vec<String> {
    NON_ALNUM.split(&text.to_lowercase()).filter(|w| !w.is_empty()).map(String::from).collect()
}

/// Archived by status (spec or legacy wording) or by location (archive/ dir)
pub fn is_archived(rel: &str, status: &str) -> bool {
    if words(status).iter().any(|w| CONFIG.archived_statuses.contains(w)) {
        return true;
    }
    let segs: Vec<&str> = rel.split('/').collect();
    segs[..segs.len().saturating_sub(1)].iter().any(|s| CONFIG.archive_dirs.iter().any(|d| d == s))
}

/// Deprecated or redirect wording in status, type, or first word of subject/brief
pub fn is_deprecated(meta: &crate::parse::metadata::Metadata) -> bool {
    let marked = |text: &str| words(text).iter().any(|w| CONFIG.deprecated_markers.contains(w));
    let first = |text: &str| words(text).first().is_some_and(|w| CONFIG.deprecated_markers.contains(w));
    marked(meta.status()) || marked(meta.doc_type()) || first(meta.subject()) || first(meta.doc_brief())
}

fn normalize_subject(subject: &str) -> String {
    NON_ALNUM.replace_all(&subject.to_lowercase(), " ").trim().to_string()
}

pub fn dead_paths(content: &str, root: &Path, ref_dir: &Path) -> Vec<String> {
    let mut dead = BTreeSet::new();
    for cap in BACKTICK_PATH.captures_iter(content) {
        let p = &cap[1];
        if p.contains("..") {
            continue;
        }
        // Resolved from the project, the ref's folder, or a sibling project
        let sibling = root.parent().map(|parent| parent.join(p).exists()).unwrap_or(false);
        if !root.join(p).exists() && !ref_dir.join(p).exists() && !sibling {
            dead.insert(p.to_string());
        }
    }
    dead.into_iter().collect()
}

pub fn review_refs(root: &Path, today: &str, use_git: bool) -> Report {
    let refs: Vec<_> = collect_docs(&root.join("doc"))
        .into_iter()
        .filter(|d| d.kind == DocKind::Ref)
        .map(|d| {
            let rel = to_posix(d.filepath.strip_prefix(root).unwrap_or(&d.filepath));
            (rel, d)
        })
        .filter(|(rel, d)| !is_archived(rel, d.meta.status()))
        .collect();
    let git_dates = if use_git { git_last_dates(root) } else { HashMap::new() };
    let inbound = inbound_counts(root);
    let today_num = day_number(today).unwrap_or(0);

    let mut by_subject: HashMap<String, Vec<String>> = HashMap::new();
    for (rel, d) in &refs {
        let key = normalize_subject(d.meta.subject());
        if !key.is_empty() {
            by_subject.entry(key).or_default().push(rel.clone());
        }
    }

    let mut candidates = Vec::new();
    for (rel, d) in &refs {
        let mut dates: Vec<String> = [
            git_dates.get(rel).map(String::as_str),
            d.meta.get("updated"),
            d.meta.get("created"),
            d.meta.get("reviewed"),
        ]
        .into_iter()
        .flatten()
        .map(|s| s.trim().to_string())
        .filter(|s| day_number(s).is_some())
        .collect();
        dates.sort();
        let deprecated = is_deprecated(&d.meta);
        let last_touch = dates.pop().unwrap_or_default();
        let age = day_number(&last_touch).map(|n| today_num - n);
        let old = age.is_some_and(|a| a > CONFIG.age_days);
        if !deprecated && !old {
            continue;
        }

        let content = read_small(&d.filepath);
        let self_cite = MD_TOKEN.find_iter(&content).any(|m| basename(m.as_str()) == d.filename);
        let inbound_count = inbound.get(&d.filename).copied().unwrap_or(0) - i64::from(self_cite);
        let status = d.meta.status().trim().to_string();
        let ref_dir = d.filepath.parent().unwrap_or(root);
        let dead = dead_paths(&content, root, ref_dir);
        let mut twins: Vec<String> = by_subject
            .get(&normalize_subject(d.meta.subject()))
            .map(|v| v.iter().filter(|p| *p != rel).cloned().collect())
            .unwrap_or_default();
        twins.sort();

        let mut signals = if deprecated { vec!["deprecated"] } else { Vec::new() };
        if old {
            if inbound_count <= CONFIG.orphan_max_inbound {
                signals.push("orphan");
            }
            if CONFIG.transient_statuses.contains(&status.to_lowercase()) {
                signals.push("transient");
            }
            if !dead.is_empty() {
                signals.push("dead_paths");
            }
            if !twins.is_empty() {
                signals.push("twin");
            }
        }
        if signals.is_empty() {
            continue;
        }

        candidates.push(Candidate {
            path: rel.clone(),
            subject: d.meta.subject().to_string(),
            status,
            last_touch,
            age_days: age,
            inbound: inbound_count,
            score: signals.iter().map(|s| CONFIG.signal_weights.get(*s).copied().unwrap_or(0)).sum(),
            signals,
            dead_paths: dead,
            twin_of: twins,
        });
    }

    candidates.sort_by(|a, b| {
        b.score
            .cmp(&a.score)
            .then(b.age_days.unwrap_or(-1).cmp(&a.age_days.unwrap_or(-1)))
            .then(a.path.cmp(&b.path))
    });
    Report { today: today.to_string(), age_days: CONFIG.age_days, refs_scanned: refs.len(), candidates }
}

fn age_label(c: &Candidate) -> String {
    c.age_days.map_or("—".to_string(), |a| a.to_string())
}

fn signal_label(c: &Candidate) -> String {
    c.signals
        .iter()
        .map(|s| match *s {
            "transient" => format!("transient: {}", c.status),
            "dead_paths" => format!("dead paths: {}", c.dead_paths.len()),
            "orphan" => format!("orphan ({} link{})", c.inbound, if c.inbound == 1 { "" } else { "s" }),
            other => other.to_string(),
        })
        .collect::<Vec<_>>()
        .join(" · ")
}

pub fn format_markdown(report: &Report, top: usize) -> String {
    let n = report.candidates.len();
    let mut lines = vec![
        format!("# openclew review — {}", report.today),
        String::new(),
        format!(
            "{n} candidate(s) out of {} refs (untouched for more than {} days, with at least one signal).",
            report.refs_scanned, report.age_days
        ),
    ];
    if n == 0 {
        return lines.join("\n") + "\n";
    }
    lines.extend(["".into(), "| Ref | Subject | Age (days) | Signals |".into(), "|---|---|---:|---|".into()]);
    for c in report.candidates.iter().take(top) {
        lines.push(format!("| `{}` | {} | {} | {} |", c.path, c.subject.replace('|', "\\|"), age_label(c), signal_label(c)));
    }
    if n > top {
        lines.push(String::new());
        lines.push(format!("Top {top} shown: --top {n} for all, --json for details."));
    }
    lines.join("\n") + "\n" + &template::review_footer(&report.today)
}

/// Checkout block: top N candidates, or "" when there is none (zero line, zero token)
pub fn format_checkout(report: &Report, top: usize) -> String {
    let shown: Vec<&Candidate> = report.candidates.iter().take(top).collect();
    if shown.is_empty() {
        return String::new();
    }
    let rows = shown
        .iter()
        .map(|c| format!("     - {} — {} ({} d: {})", c.path, c.subject, age_label(c), signal_label(c)))
        .collect::<Vec<_>>()
        .join("\n");
    template::review_checkout(report.candidates.len(), shown.len(), &rows, &report.today)
}

pub struct RunOptions {
    pub top: Option<usize>,
    pub json: bool,
    pub apply: bool,
    pub commit: bool,
    pub archive: Option<String>,
    pub superseded_by: Option<String>,
    pub confirm: Option<String>,
    pub why: Option<String>,
}

pub fn run(opts: RunOptions) -> Result<(), String> {
    use crate::cmd::review_apply as apply;
    let root = std::env::current_dir().map_err(|e| e.to_string())?;
    if !root.join("doc").exists() {
        return Err("No doc/ directory found. Run 'openclew init' first.".into());
    }
    let why = opts.why.as_deref().unwrap_or("");
    if let Some(rel) = &opts.archive {
        apply::archive_ref(&root, rel, opts.superseded_by.as_deref(), why, &today())?;
        println!("Archived {rel} (journal: {})", CONFIG.journal);
        return Ok(());
    }
    if let Some(rel) = &opts.confirm {
        apply::confirm_ref(&root, rel, why, &today())?;
        println!("Confirmed {rel} (journal: {})", CONFIG.journal);
        return Ok(());
    }
    if opts.apply {
        let result = apply::apply_refs(&root, &today(), true, opts.commit);
        match apply::format_apply(&result).as_str() {
            "" => println!("No automatic gesture."),
            text => print!("{text}"),
        }
        return Ok(());
    }
    let report = review_refs(&root, &today(), true);
    if opts.json {
        println!("{}", serde_json::to_string_pretty(&report).map_err(|e| e.to_string())?);
    } else {
        print!("{}", format_markdown(&report, opts.top.unwrap_or(CONFIG.top_default)));
    }
    Ok(())
}
