use chrono::Local;

/// Current date as YYYY-MM-DD
pub fn today() -> String {
    Local::now().format("%Y-%m-%d").to_string()
}

/// Package version (compiled from Cargo.toml)
pub fn oc_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

/// Slugify for refs: UPPERCASE, runs of non-alphanumerics collapsed to `_`
/// "Auth Design" -> "AUTH_DESIGN" (mirrors lib/templates.js slugify)
pub fn slugify(title: &str) -> String {
    collapse_non_alnum(&title.to_uppercase(), '_')
}

/// Slugify for logs/todos: lowercase, runs of non-alphanumerics collapsed to `-`
/// "Auth Design" -> "auth-design" (mirrors lib/templates.js slugifyLog)
pub fn slugify_log(title: &str) -> String {
    collapse_non_alnum(&title.to_lowercase(), '-')
}

fn collapse_non_alnum(s: &str, sep: char) -> String {
    let mut out = String::new();
    for c in s.chars() {
        if c.is_ascii_alphanumeric() {
            out.push(c);
        } else if !out.ends_with(sep) {
            out.push(sep);
        }
    }
    out.trim_matches(sep).to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_slugify() {
        assert_eq!(slugify("Auth Design"), "AUTH_DESIGN");
        assert_eq!(slugify("fix streaming bugs"), "FIX_STREAMING_BUGS");
        assert_eq!(slugify("  hello world  "), "HELLO_WORLD");
        assert_eq!(slugify("a -- b"), "A_B");
    }

    #[test]
    fn test_slugify_log() {
        assert_eq!(slugify_log("Auth Design"), "auth-design");
        assert_eq!(slugify_log("Fix streaming bugs"), "fix-streaming-bugs");
    }

    #[test]
    fn test_today_format() {
        let t = today();
        assert_eq!(t.len(), 10);
        assert_eq!(&t[4..5], "-");
        assert_eq!(&t[7..8], "-");
    }
}
