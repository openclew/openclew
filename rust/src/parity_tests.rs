//! Node <-> Rust parity: templates, slugs and search ranking must match
//! test/fixtures/parity/generated.json, produced by test/parity.test.js.
//! Inputs (titles, queries) are read from the golden, never redefined here.

use std::fs;
use std::path::{Path, PathBuf};

use serde_json::Value;

use crate::parse::l1::extract_level;
use crate::parse::search::search_docs;
use crate::template::{log as log_tpl, refs as ref_tpl, todo as todo_tpl};
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
    assert_eq!(tokenize(&ref_tpl::ref_content(title)), g["templates"]["ref"].as_str().unwrap());
    assert_eq!(tokenize(&log_tpl::log_content(title)), g["templates"]["log"].as_str().unwrap());
    assert_eq!(tokenize(&todo_tpl::todo_content(title)), g["templates"]["todo"].as_str().unwrap());
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
