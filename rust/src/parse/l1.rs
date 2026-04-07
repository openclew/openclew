use regex::Regex;
use super::metadata::Metadata;

/// Find the L1 block using 3-level fallback:
/// 1. `<div class="oc-l1">...</div>`
/// 2. `<!-- L1_START --> ... <!-- L1_END -->`
/// 3. Positional: lines between line 0 (metadata) and first `---`
pub fn find_l1_block(content: &str) -> Option<String> {
    // 1. div format
    let div_re = Regex::new(r#"<div\s+class="oc-l1">([\s\S]+?)</div>"#).unwrap();
    if let Some(caps) = div_re.captures(content) {
        return Some(caps[1].to_string());
    }

    // 2. comment markers
    let comment_re = Regex::new(r"<!--\s*L1_START\s*-->([\s\S]+?)<!--\s*L1_END\s*-->").unwrap();
    if let Some(caps) = comment_re.captures(content) {
        return Some(caps[1].to_string());
    }

    // 3. Positional: skip line 0, collect until first `---`
    let lines: Vec<&str> = content.lines().collect();
    if lines.len() < 2 {
        return None;
    }

    let mut block_lines = Vec::new();
    for line in &lines[1..] {
        if line.trim() == "---" {
            break;
        }
        block_lines.push(*line);
    }

    let joined = block_lines.join("\n");
    if joined.trim().is_empty() {
        return None;
    }
    Some(joined)
}

/// Parse L1 block with bold format: `**subject:** value`
pub fn parse_l1(content: &str) -> Metadata {
    let mut meta = Metadata::default();
    let block = match find_l1_block(content) {
        Some(b) => b,
        None => return meta,
    };

    let subject_re = Regex::new(r"\*\*subject:\*\*\s*(.+)").unwrap();
    if let Some(caps) = subject_re.captures(&block) {
        meta.fields
            .insert("subject".to_string(), caps[1].trim().to_string());
    }

    let brief_re = Regex::new(r"\*\*doc_brief:\*\*\s*(.+)").unwrap();
    if let Some(caps) = brief_re.captures(&block) {
        meta.fields
            .insert("doc_brief".to_string(), caps[1].trim().to_string());
    }

    meta
}

/// Parse L1 block with legacy format: `key: value` lines
pub fn parse_l1_legacy(content: &str) -> Metadata {
    let mut meta = Metadata::default();
    let block = match find_l1_block(content) {
        Some(b) => b,
        None => return meta,
    };

    for line in block.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }
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

/// Parse a file's content: try metadata line + L1 bold, fallback to L1 legacy.
/// Returns None if no usable metadata found.
pub fn parse_file_content(content: &str) -> Option<Metadata> {
    let mut meta_line = super::metadata::parse_metadata_line(content);
    let l1 = parse_l1(content);

    if !l1.subject().is_empty() {
        meta_line.merge(&l1);
        return Some(meta_line);
    }

    let legacy = parse_l1_legacy(content);
    if !legacy.fields.is_empty() {
        meta_line.merge(&legacy);
        return Some(meta_line);
    }

    None
}

/// Extract a specific level block from content
pub fn extract_level(content: &str, level: &str) -> String {
    if level == "full" {
        return content.to_string();
    }

    let key = level.to_uppercase();
    let start_re = Regex::new(&format!(r"<!--\s*{key}_START\s*-->")).unwrap();
    let end_re = Regex::new(&format!(r"<!--\s*{key}_END\s*-->")).unwrap();

    let start_match = start_re.find(content);
    let end_match = end_re.find(content);

    match (start_match, end_match) {
        (Some(s), Some(e)) => content[s.end()..e.start()].trim().to_string(),
        _ => format!("No {key} block found in this document."),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_l1_comment_markers() {
        let content = r#"openclew@0.5.0 · type: Reference

<!-- L1_START -->
**subject:** Auth architecture

**doc_brief:** How auth works in this project
<!-- L1_END -->

---
"#;
        let meta = parse_l1(content);
        assert_eq!(meta.subject(), "Auth architecture");
        assert_eq!(meta.doc_brief(), "How auth works in this project");
    }

    #[test]
    fn test_l1_positional_fallback() {
        let content = "openclew@0.5.0 · type: Reference\n\n**subject:** Something\n\n---\n";
        let meta = parse_l1(content);
        assert_eq!(meta.subject(), "Something");
    }

    #[test]
    fn test_l1_legacy_format() {
        let content = "openclew@0.5.0\nsubject: Auth design\nsummary: How auth works\n---\n";
        let meta = parse_l1_legacy(content);
        assert_eq!(meta.fields.get("subject").unwrap(), "Auth design");
        assert_eq!(meta.fields.get("summary").unwrap(), "How auth works");
    }

    #[test]
    fn test_parse_file_content_prefers_bold() {
        let content = r#"openclew@0.5.0 · type: Reference
<!-- L1_START -->
**subject:** Bold subject
**doc_brief:** Bold brief
<!-- L1_END -->
"#;
        let meta = parse_file_content(content).unwrap();
        assert_eq!(meta.subject(), "Bold subject");
        assert_eq!(meta.doc_type(), "Reference");
    }

    #[test]
    fn test_extract_level() {
        let content = r#"some stuff
<!-- L1_START -->
L1 content here
<!-- L1_END -->
<!-- L2_START -->
L2 content here
<!-- L2_END -->
"#;
        assert_eq!(extract_level(content, "L1"), "L1 content here");
        assert_eq!(extract_level(content, "L2"), "L2 content here");
        assert!(extract_level(content, "L3").contains("No L3 block"));
        assert!(extract_level(content, "full").contains("some stuff"));
    }
}
