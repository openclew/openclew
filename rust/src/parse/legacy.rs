//! Legacy-format detection (mirrors `isLegacy` of lib/migrate.js parseLegacyDoc).
//! Migration itself stays Node-only (`npx openclew migrate`) — user decision 2026-10-12.

use regex::Regex;

/// Has YAML frontmatter with a `subject` field
fn frontmatter_has_subject(content: &str) -> bool {
    if !content.starts_with("---") {
        return false;
    }
    let Some(end) = content[3..].find("\n---").map(|i| i + 3) else { return false };
    let block = content.get(4..end).unwrap_or("");
    block.split('\n').any(|line| {
        let t = line.trim();
        if t.is_empty() || t.starts_with('-') {
            return false;
        }
        match t.find(':') {
            Some(i) if i > 0 => t[..i].trim().eq_ignore_ascii_case("subject") && !t[i + 1..].trim().is_empty(),
            _ => false,
        }
    })
}

/// True when the doc needs `openclew migrate`
pub fn is_legacy(content: &str) -> bool {
    let line1 = content.split('\n').next().unwrap_or("").trim();
    if line1.starts_with("clw_ref@") || line1.starts_with("clw_log@") {
        return false;
    }
    if line1.starts_with("openclew@") {
        return true; // right format, old prefix
    }

    let div_re = Regex::new(r#"<div\s+class="oc-l1">([\s\S]+?)</div>"#).unwrap();
    let marker_re = Regex::new(r"<!--\s*L1_START\s*-->([\s\S]+?)<!--\s*L1_END\s*-->").unwrap();
    let Some(caps) = div_re.captures(content).or_else(|| marker_re.captures(content)) else {
        return frontmatter_has_subject(content);
    };

    let block = &caps[1];
    let has_bold_subject = block.contains("**subject:**");
    let key_re = Regex::new(r"^[a-z_]+:").unwrap();
    let has_plain_kv = block.split('\n').any(|l| {
        let t = l.trim();
        !t.is_empty()
            && !t.starts_with('#')
            && !t.starts_with("<!--")
            && !t.starts_with("**")
            && !t.starts_with("- **")
            && t.contains(':')
            && key_re.is_match(t)
    });
    !(has_bold_subject && !has_plain_kv)
}
