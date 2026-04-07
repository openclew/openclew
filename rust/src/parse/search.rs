use regex::Regex;
use std::path::Path;

use super::collect::{collect_docs, Doc};

/// Score a document against query terms.
/// Weights: subject (3), doc_brief (2), keywords (2), category (1.5), type (1), status (0.5)
fn score_doc(doc: &Doc, query_terms: &[String]) -> f64 {
    let fields: Vec<(&str, f64)> = vec![
        (doc.meta.subject(), 3.0),
        (doc.meta.doc_brief(), 2.0),
        (doc.meta.keywords(), 2.0),
        (doc.meta.category(), 1.5),
        (doc.meta.doc_type(), 1.0),
        (doc.meta.status(), 0.5),
    ];

    let mut score = 0.0;

    for term in query_terms {
        let term_lower = term.to_lowercase();
        for &(value, weight) in &fields {
            let value_lower = value.to_lowercase();
            if value_lower.contains(&term_lower) {
                score += weight;

                // Bonus for exact word match (word boundary)
                let escaped = regex::escape(&term_lower);
                if let Ok(re) = Regex::new(&format!(r"(?i)\b{escaped}\b")) {
                    if re.is_match(value) {
                        score += weight * 0.5;
                    }
                }
            }
        }
    }

    score
}

#[derive(Debug)]
pub struct SearchResult {
    pub doc: Doc,
    pub score: f64,
}

/// Search docs matching query. Returns results sorted by relevance (descending).
pub fn search_docs(doc_dir: &Path, query: &str) -> Vec<SearchResult> {
    let docs = collect_docs(doc_dir);
    let query_terms: Vec<String> = query
        .split_whitespace()
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .collect();

    if query_terms.is_empty() {
        return Vec::new();
    }

    let mut results: Vec<SearchResult> = docs
        .into_iter()
        .filter_map(|doc| {
            let score = score_doc(&doc, &query_terms);
            if score > 0.0 {
                Some(SearchResult { doc, score })
            } else {
                None
            }
        })
        .collect();

    results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
    results
}
