//! Flat TODO.md parser (mirrors lib/todo-flat.js).
//!
//!   - [ ] **Title** : Description. <!-- from: doc/log/foo.md -->
//!   - [x] **Title** : Description (2026-04-29). <!-- from: ... --> <!-- closed: ... -->

use regex::Regex;

#[derive(Debug, Clone, PartialEq)]
pub struct FlatTodo {
    pub line_num: usize,
    pub raw: String,
    pub done: bool,
    pub title: String,
    pub description: String,
    pub from: String,
    pub closed: String,
}

pub fn parse_flat_todos(content: &str) -> Vec<FlatTodo> {
    let line_re = Regex::new(r"^(\s*)-\s*\[([ xX])\]\s+(.*)$").unwrap();
    let from_re = Regex::new(r"(?is)<!--\s*from:\s*(.*?)-->").unwrap();
    let closed_re = Regex::new(r"(?is)<!--\s*closed:\s*(.*?)-->").unwrap();
    let comment_re = Regex::new(r"<!--[\s\S]*?-->").unwrap();
    let title_re = Regex::new(r"\*\*(.+?)\*\*").unwrap();
    let lead_sep_re = Regex::new(r"^\s*[:\-—]\s*").unwrap();

    let capture = |re: &Regex, line: &str| {
        re.captures(line).map(|c| c[1].trim().to_string()).unwrap_or_default()
    };

    content
        .split('\n')
        .enumerate()
        .filter_map(|(i, line)| {
            let caps = line_re.captures(line)?;
            let rest = &caps[3];
            let stripped = comment_re.replace_all(rest, "").trim().to_string();
            let (title, description) = match title_re.captures(&stripped) {
                Some(t) => {
                    let without = title_re.replace(&stripped, "");
                    (t[1].trim().to_string(), lead_sep_re.replace(&without, "").trim().to_string())
                }
                None => (String::new(), stripped.clone()),
            };
            Some(FlatTodo {
                line_num: i + 1,
                raw: line.to_string(),
                done: caps[2].trim().eq_ignore_ascii_case("x"),
                title,
                description,
                from: capture(&from_re, line),
                closed: capture(&closed_re, line),
            })
        })
        .collect()
}
