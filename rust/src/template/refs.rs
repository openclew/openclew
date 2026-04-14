use crate::util::{oc_version, today};

/// Template for a new ref
pub fn ref_content(title: &str) -> String {
    let date = today();
    let ver = oc_version();
    format!(
        r#"clw_ref@{ver} · created: {date} · updated: {date} · type: Reference · status: Active · category: · keywords: []

- **subject:** {title}
- **doc_brief:**

---

# Summary

## Objective
<!-- Why this document exists -->

## Key points
<!-- 3-5 essential takeaways -->

---

# Details

<!-- Full technical content -->

---

## Changelog

| Date | Change |
|------|--------|
| {date} | Initial creation |
"#
    )
}

/// Template for a ref with pre-filled content (used by MCP create_ref)
pub fn ref_content_filled(_title: &str, subject: &str, brief: &str, content: &str) -> String {
    let date = today();
    let ver = oc_version();
    format!(
        r#"clw_ref@{ver} · created: {date} · updated: {date} · type: Reference · status: Active · category: · keywords: []

- **subject:** {subject}
- **doc_brief:** {brief}

---

# Summary

{content}

---

# Details

<!-- Full technical content -->

---

## Changelog

| Date | Change |
|------|--------|
| {date} | Initial creation |
"#
    )
}

/// Example architecture ref (created by init)
pub fn example_ref_content(existing_instructions: Option<&str>) -> String {
    let date = today();
    let ver = oc_version();

    let seed_section = if let Some(instructions) = existing_instructions {
        // Strip openclew block
        let cleaned = regex::Regex::new(r"<!--\s*openclew_START\s*-->[\s\S]*?<!--\s*openclew_END\s*-->")
            .unwrap()
            .replace_all(instructions, "")
            .trim()
            .to_string();

        if cleaned.is_empty() {
            String::new()
        } else {
            format!(
                r#"## From existing project instructions

{cleaned}

## What to do next
<!-- Review the above (imported from your instruction file) and reorganize into the sections below. Then delete this section. -->

"#
            )
        }
    } else {
        String::new()
    };

    format!(
        r#"clw_ref@{ver} · created: {date} · updated: {date} · type: Reference · status: Active · category: Architecture · keywords: [architecture, overview, components]

- **subject:** Architecture overview
- **doc_brief:** <!-- ONE LINE: What does this project do, what's the main stack, how is it deployed? -->

---

# Summary

{seed_section}## What this project does
<!-- 1-2 sentences. What problem does it solve? Who uses it? -->

## Stack
<!-- List the main technologies: language, framework, database, key libraries. -->

## How it's organized
<!-- Describe the main directories and what lives where. -->

## Key decisions
<!-- List 2-5 architectural choices that someone new needs to know. -->

---

# Details

## Data flow
<!-- How does a request travel through the system? -->

## External dependencies
<!-- APIs, services, or systems this project talks to. -->

## How to run
<!-- Commands to start the project locally. -->

## Known constraints
<!-- Limits, technical debt, or things that don't scale. -->

---

## Changelog

| Date | Change |
|------|--------|
| {date} | Created by openclew init — fill this in! |
"#
    )
}
