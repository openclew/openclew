use std::collections::HashMap;

/// Parsed metadata from line 1 of a doc.
/// Accepts prefixes: `openclew@`, `clw_ref@`, `clw_log@`
#[derive(Debug, Default, Clone)]
pub struct Metadata {
    pub version: Option<String>,
    pub fields: HashMap<String, String>,
}

impl Metadata {
    pub fn get(&self, key: &str) -> Option<&str> {
        self.fields.get(key).map(|s| s.as_str())
    }

    pub fn subject(&self) -> &str {
        self.fields.get("subject").map(|s| s.as_str()).unwrap_or("")
    }

    pub fn doc_brief(&self) -> &str {
        self.fields.get("doc_brief").map(|s| s.as_str()).unwrap_or("")
    }

    pub fn status(&self) -> &str {
        self.fields.get("status").map(|s| s.as_str()).unwrap_or("")
    }

    pub fn category(&self) -> &str {
        self.fields.get("category").map(|s| s.as_str()).unwrap_or("")
    }

    pub fn keywords(&self) -> &str {
        self.fields.get("keywords").map(|s| s.as_str()).unwrap_or("")
    }

    pub fn doc_type(&self) -> &str {
        self.fields.get("type").map(|s| s.as_str()).unwrap_or("")
    }

    pub fn is_empty(&self) -> bool {
        self.version.is_none() && self.fields.is_empty()
    }

    /// Merge another metadata into this one. Other's fields win on conflict.
    pub fn merge(&mut self, other: &Metadata) {
        for (k, v) in &other.fields {
            if !v.is_empty() {
                self.fields.insert(k.clone(), v.clone());
            }
        }
        if other.version.is_some() {
            self.version = other.version.clone();
        }
    }
}

const VALID_PREFIXES: &[&str] = &["openclew@", "clw_ref@", "clw_log@"];

/// Parse the metadata line (line 1) of a doc.
/// Format: `prefix@VERSION · key:value · key:value · ...`
pub fn parse_metadata_line(content: &str) -> Metadata {
    let mut meta = Metadata::default();
    let first_line = content.lines().next().unwrap_or("").trim();

    let prefix = VALID_PREFIXES.iter().find(|p| first_line.starts_with(**p));
    let Some(prefix) = prefix else {
        return meta;
    };

    let parts: Vec<&str> = first_line.split(" · ").collect();
    for part in &parts {
        let trimmed = part.trim();

        // Version from prefix
        if trimmed.starts_with(prefix) {
            if let Some(ver) = trimmed.strip_prefix(prefix) {
                meta.version = Some(ver.to_string());
            }
            continue;
        }

        // key:value pair
        if let Some(colon_idx) = trimmed.find(':') {
            if colon_idx > 0 {
                let key = trimmed[..colon_idx].trim().to_lowercase();
                let value = trimmed[colon_idx + 1..].trim().to_string();
                meta.fields.insert(key, value);
            }
        }
    }

    meta
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_openclew_prefix() {
        let content = "openclew@0.5.0 · type: Reference · status: Active · category: arch · keywords: [auth, api]";
        let meta = parse_metadata_line(content);
        assert_eq!(meta.version.as_deref(), Some("0.5.0"));
        assert_eq!(meta.doc_type(), "Reference");
        assert_eq!(meta.status(), "Active");
        assert_eq!(meta.category(), "arch");
        assert_eq!(meta.keywords(), "[auth, api]");
    }

    #[test]
    fn test_parse_clw_ref_prefix() {
        let content = "clw_ref@0.6.0 · created: 2026-04-05 · type: Reference · status: Active";
        let meta = parse_metadata_line(content);
        assert_eq!(meta.version.as_deref(), Some("0.6.0"));
        assert_eq!(meta.doc_type(), "Reference");
    }

    #[test]
    fn test_parse_clw_log_prefix() {
        let content = "clw_log@0.6.0 · date: 2026-04-05 · type: Feature · status: In progress";
        let meta = parse_metadata_line(content);
        assert_eq!(meta.version.as_deref(), Some("0.6.0"));
        assert_eq!(meta.doc_type(), "Feature");
        assert_eq!(meta.status(), "In progress");
    }

    #[test]
    fn test_unknown_prefix_returns_empty() {
        let content = "R.AlphA.Doc@7.0.0 · some stuff";
        let meta = parse_metadata_line(content);
        assert!(meta.is_empty());
    }

    #[test]
    fn test_empty_content() {
        let meta = parse_metadata_line("");
        assert!(meta.is_empty());
    }

    #[test]
    fn test_colon_in_value() {
        let content = "openclew@0.5.0 · subject: Fix: timeout on auth";
        let meta = parse_metadata_line(content);
        assert_eq!(meta.subject(), "Fix: timeout on auth");
    }
}
