//! Node <-> Rust parity: templates, slugs and search ranking must match
//! test/fixtures/parity/generated.json, produced by test/parity.test.js.
//! Inputs (titles, queries) are read from the golden, never redefined here.

use std::fs;
use std::path::{Path, PathBuf};

use serde_json::Value;

use crate::cmd::session_header::format_session_header;
use crate::parse::l1::extract_level;
use crate::parse::legacy::is_legacy;
use crate::parse::todo_flat::parse_flat_todos;
use crate::parse::search::search_docs;
use crate::template;
use crate::util::{oc_version, slugify, slugify_log, today};

fn parity_dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../test/fixtures/parity")
}

fn golden() -> Value {
    let raw = fs::read_to_string(parity_dir().join("generated.json")).unwrap();
    serde_json::from_str(&raw).unwrap()
}

fn tokenize(content: &str) -> String {
    content.replace(&today(), "{{DATE}}").replace(oc_version(), "{{VER}}")
}

#[test]
fn test_templates_parity() {
    let g = golden();
    let title = g["template_title"].as_str().unwrap();
    assert_eq!(tokenize(&template::ref_content(title)), g["templates"]["ref"].as_str().unwrap());
    assert_eq!(tokenize(&template::log_content(title)), g["templates"]["log"].as_str().unwrap());
    assert_eq!(tokenize(&template::todo_content(title)), g["templates"]["todo"].as_str().unwrap());
}

#[test]
fn test_slugs_parity() {
    for case in golden()["slugs"].as_array().unwrap() {
        let title = case["title"].as_str().unwrap();
        assert_eq!(slugify(title), case["ref"].as_str().unwrap(), "slugify({title:?})");
        assert_eq!(slugify_log(title), case["log"].as_str().unwrap(), "slugify_log({title:?})");
    }
}

#[test]
fn test_read_doc_levels_parity() {
    let doc_dir = parity_dir().join("doc");
    for case in golden()["levels"].as_array().unwrap() {
        let doc = case["doc"].as_str().unwrap();
        let level = case["level"].as_str().unwrap();
        let content = fs::read_to_string(doc_dir.join(doc)).unwrap();
        assert_eq!(
            extract_level(&content, level),
            case["content"].as_str().unwrap(),
            "extract_level({doc}, {level})"
        );
    }
}

#[test]
fn test_legacy_detection_parity() {
    let doc_dir = parity_dir().join("doc");
    for case in golden()["legacy"].as_array().unwrap() {
        let doc = case["doc"].as_str().unwrap();
        let content = fs::read_to_string(doc_dir.join(doc)).unwrap();
        assert_eq!(is_legacy(&content), case["is_legacy"].as_bool().unwrap(), "is_legacy({doc})");
    }
}

#[test]
fn test_flat_todos_parity() {
    let content = fs::read_to_string(parity_dir().join("TODO.md")).unwrap();
    let actual: Vec<Value> = parse_flat_todos(&content)
        .into_iter()
        .map(|t| {
            serde_json::json!({
                "line_num": t.line_num, "done": t.done, "title": t.title,
                "description": t.description, "from": t.from, "closed": t.closed,
            })
        })
        .collect();
    assert_eq!(Value::Array(actual), golden()["flat_todos"]);
}

#[test]
fn test_session_header_parity() {
    for case in golden()["session_headers"].as_array().unwrap() {
        let line = format_session_header(
            case["name"].as_str().unwrap(),
            case["tags"].as_str().unwrap(),
            case["date"].as_str(),
        );
        assert_eq!(line, case["line"].as_str().unwrap());
    }
}

#[test]
fn test_search_parity() {
    let doc_dir = parity_dir().join("doc");
    for case in golden()["search"].as_array().unwrap() {
        let query = case["query"].as_str().unwrap();
        // (path, score) pairs; scores compared as f64 (JSON 2 vs 2.0)
        let actual: Vec<(String, f64)> = search_docs(&doc_dir, query)
            .into_iter()
            .map(|r| {
                let rel = r.doc.filepath.strip_prefix(&doc_dir).unwrap();
                (rel.to_string_lossy().replace('\\', "/"), r.score)
            })
            .collect();
        let expected: Vec<(String, f64)> = case["results"]
            .as_array()
            .unwrap()
            .iter()
            .map(|r| (r["path"].as_str().unwrap().to_string(), r["score"].as_f64().unwrap()))
            .collect();
        assert_eq!(actual, expected, "search({query:?})");
    }
}

#[test]
fn test_review_parity() {
    use crate::cmd::review::{format_checkout, format_markdown, review_refs};
    let g = golden();
    let case = &g["review"];
    let root = parity_dir().join("../review");
    let report = review_refs(&root, case["today"].as_str().unwrap(), false);
    assert_eq!(serde_json::to_value(&report).unwrap(), case["report"]);
    assert_eq!(format_markdown(&report, 2), case["markdown_top2"].as_str().unwrap());
    assert_eq!(format_checkout(&report, 3), case["checkout_top3"].as_str().unwrap());
}

fn copy_dir(from: &Path, to: &Path) {
    fs::create_dir_all(to).unwrap();
    for entry in fs::read_dir(from).unwrap().flatten() {
        let target = to.join(entry.file_name());
        if entry.path().is_dir() {
            copy_dir(&entry.path(), &target);
        } else {
            fs::copy(entry.path(), target).unwrap();
        }
    }
}

#[test]
fn test_review_apply_parity() {
    use crate::cmd::review_apply::{apply_refs, archive_ref, confirm_ref, format_apply};
    let g = golden();
    let case = &g["review"];
    let today = case["today"].as_str().unwrap();
    let tmp = std::env::temp_dir().join(format!("oc-parity-rs-{}", std::process::id()));
    let _ = fs::remove_dir_all(&tmp);
    for name in ["review", "review-sibling"] {
        copy_dir(&parity_dir().join("..").join(name), &tmp.join(name));
    }
    let root = tmp.join("review");
    let result = apply_refs(&root, today, false, false);
    confirm_ref(&root, "doc/ref/TWIN_A.md", "still accurate", today).unwrap();
    archive_ref(&root, "doc/ref/TWIN_B.md", Some("doc/ref/TWIN_A.md"), "merged into TWIN_A", today).unwrap();
    let expected = &case["apply"];
    assert_eq!(serde_json::to_value(&result).unwrap(), expected["result"]);
    assert_eq!(format_apply(&result), expected["summary"].as_str().unwrap());
    for (file, content) in expected["files"].as_object().unwrap() {
        assert_eq!(fs::read_to_string(root.join(file)).unwrap(), content.as_str().unwrap(), "{file}");
    }
    let _ = fs::remove_dir_all(&tmp);
}
