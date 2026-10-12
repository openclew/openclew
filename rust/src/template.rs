//! Doc templates. SSOT: `templates/embedded/*.md` at the repo root, shared with
//! the Node CLI (lib/templates.js) and embedded here at compile time.
//! Placeholders: {{DATE}}, {{VER}}, {{TITLE}}, {{SEED_SECTION}}, {{SEED}}.

use regex::Regex;

use crate::util::{oc_version, today};

const REF: &str = include_str!("../../templates/embedded/ref.md");
const LOG: &str = include_str!("../../templates/embedded/log.md");
const TODO: &str = include_str!("../../templates/embedded/todo.md");
const GUIDE: &str = include_str!("../../templates/embedded/guide.md");
const FRAMEWORK: &str = include_str!("../../templates/embedded/framework-integration.md");
const EXAMPLE_REF: &str = include_str!("../../templates/embedded/example-ref.md");
const EXAMPLE_REF_SEED: &str = include_str!("../../templates/embedded/example-ref-seed.md");
const EXAMPLE_LOG: &str = include_str!("../../templates/embedded/example-log.md");
const TODO_ROOT: &str = include_str!("../../templates/embedded/todo-root.md");
const INJECT_BLOCK: &str = include_str!("../../templates/embedded/inject-block.md");

/// Substitute {{DATE}}, {{VER}} and the given extra placeholders
fn render(template: &str, vars: &[(&str, &str)]) -> String {
    let date = today();
    let mut out = template
        .replace("{{DATE}}", &date)
        .replace("{{VER}}", oc_version());
    for (key, value) in vars {
        out = out.replace(&format!("{{{{{key}}}}}"), value);
    }
    out
}

pub fn ref_content(title: &str) -> String {
    render(REF, &[("TITLE", title)])
}

pub fn log_content(title: &str) -> String {
    render(LOG, &[("TITLE", title)])
}

pub fn todo_content(title: &str) -> String {
    render(TODO, &[("TITLE", title)])
}

pub fn guide_content() -> String {
    render(GUIDE, &[])
}

pub fn framework_integration_content() -> String {
    render(FRAMEWORK, &[])
}

/// Architecture ref, seeded from the existing instruction file (openclew block stripped)
pub fn example_ref_content(existing_instructions: Option<&str>) -> String {
    let block_re = Regex::new(r"<!--\s*openclew_START\s*-->[\s\S]*?<!--\s*openclew_END\s*-->").unwrap();
    let seed = existing_instructions
        .map(|s| block_re.replace_all(s, "").trim().to_string())
        .unwrap_or_default();
    // Seed rendered first so its own text is never scanned for placeholders
    let seed_section = if seed.is_empty() {
        String::new()
    } else {
        render(EXAMPLE_REF_SEED, &[]).replace("{{SEED}}", &seed)
    };
    render(EXAMPLE_REF, &[]).replace("{{SEED_SECTION}}", &seed_section)
}

pub fn example_log_content() -> String {
    render(EXAMPLE_LOG, &[])
}

pub fn todo_root_content() -> String {
    render(TODO_ROOT, &[])
}

/// Block injected into the instruction file, between openclew markers
pub fn inject_block() -> String {
    INJECT_BLOCK.trim().to_string()
}

/// Template pre-filled for MCP create_ref / create_log: brief in L1, `content` as the Summary body
pub fn fill(template_content: String, brief: &str, content: &str) -> String {
    let with_brief = if brief.is_empty() {
        template_content
    } else {
        template_content.replacen("- **doc_brief:**\n", &format!("- **doc_brief:** {brief}\n"), 1)
    };
    let summary_re = Regex::new(r"(?s)(# Summary\n\n).*?(\n---\n\n# Details)").unwrap();
    summary_re
        .replace(&with_brief, |caps: &regex::Captures| format!("{}{}\n{}", &caps[1], content.trim(), &caps[2]))
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fill_replaces_brief_and_summary() {
        let out = fill(ref_content("Auth"), "One line.", "Body text");
        assert!(out.contains("- **doc_brief:** One line.\n"));
        assert!(out.contains("# Summary\n\nBody text\n\n---\n\n# Details"));
        assert!(!out.contains("## Key points"));
    }

    #[test]
    fn test_example_ref_seed_strips_block() {
        let out = example_ref_content(Some("# Proj\n<!-- openclew_START -->x<!-- openclew_END -->\n"));
        assert!(out.contains("## From existing project instructions\n\n# Proj\n"));
        assert!(!out.contains("openclew_START"));
        assert!(!out.contains("{{"));
    }
}
