use crate::util::{oc_version, today};

/// Template for a new log
pub fn log_content(title: &str) -> String {
    let date = today();
    let ver = oc_version();
    format!(
        r#"clw_log@{ver} · date: {date} · type: Feature · status: In progress · category: · keywords: []

- **subject:** {title}
- **doc_brief:**

---

# Summary

## Objective
<!-- Why this work was undertaken -->

## Problem
<!-- What was observed -->

## Solution
<!-- How it was resolved -->

---

# Details

<!-- Technical details, code changes, debugging steps... -->
"#
    )
}

/// Template for a log with pre-filled content (used by MCP create_log)
pub fn log_content_filled(_title: &str, subject: &str, brief: &str, content: &str) -> String {
    let date = today();
    let ver = oc_version();
    format!(
        r#"clw_log@{ver} · date: {date} · type: Feature · status: Done · category: · keywords: []

- **subject:** {subject}
- **doc_brief:** {brief}

---

# Summary

{content}

---

# Details

<!-- Technical details -->
"#
    )
}

/// Example log (created by init)
pub fn example_log_content() -> String {
    let date = today();
    let ver = oc_version();
    format!(
        r#"clw_log@{ver} · date: {date} · type: Doc · status: Done · category: Setup · keywords: [openclew, init, first-log]

- **subject:** First session — openclew setup
- **doc_brief:** This is your first log. Edit it to describe what you actually did today.

---

# Summary

## What happened
<!-- Replace this with what you actually worked on today. -->

## What I learned
<!-- Anything surprising or worth remembering. -->

---

# Details

## How this works

A log captures what happened in one session. It's frozen — you never edit it later.

For knowledge that evolves (architecture, conventions, decisions), use refdocs.

Each doc has 4 layers:
- **Metadata** (line 1) — for machines and indexing
- **L1** (subject + brief) — the clew: grasp any doc at a glance
- **L2** (summary) — enough context for most decisions
- **L3** (details) — full content, only when needed
"#
    )
}
