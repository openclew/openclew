//! `openclew session-header --name "Title" --tags a,b [--date YYYY-MM-DD]`
//! Output: 📅 2026-03-28 🏷️  Title -----  #a #b   (mirrors lib/session-header.js)

use crate::util::today;

pub fn format_session_header(name: &str, tags: &str, date: Option<&str>) -> String {
    let date = date.map(str::to_string).unwrap_or_else(today);
    let hash_tags: Vec<String> = tags
        .split(',')
        .map(str::trim)
        .filter(|t| !t.is_empty())
        .map(|t| format!("#{t}"))
        .collect();
    format!("📅 {date} 🏷️  {name} -----  {}", hash_tags.join(" "))
        .trim_end()
        .to_string()
}

pub fn run(name: &str, tags: &str, date: Option<&str>) -> Result<(), String> {
    if name.is_empty() {
        return Err("--name is required\nUsage: openclew session-header --name \"Session title\" --tags tag1,tag2".into());
    }
    println!("{}", format_session_header(name, tags, date));
    Ok(())
}
