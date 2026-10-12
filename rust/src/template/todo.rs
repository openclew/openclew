use crate::util::{oc_version, today};

/// Template for a TODO doc (one task per file in doc/todo/)
pub fn todo_content(title: &str) -> String {
    let date = today();
    let ver = oc_version();
    format!(
        r#"clw_todo@{ver} · created: {date} · status: Open · priority: Normal · category: · keywords: []

- **subject:** {title}
- **doc_brief:**
- **from:** <!-- required: doc/log/*.md, doc/ref/*.md, or free-text reference (e.g. "2026-04-29 — cold idea") -->
- **closed:** <!-- filled at closing: log path or free-text session reference -->

---

# Summary

## Why it matters
<!-- What's the pain or opportunity? 1-2 lines. -->

## Done looks like
<!-- How will you know it's done? 1-2 lines. -->

<!-- Keep it short. Implementation details belong in the log when work starts. -->
"#
    )
}
