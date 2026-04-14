use chrono::Local;

/// Current date as YYYY-MM-DD
pub fn today() -> String {
    Local::now().format("%Y-%m-%d").to_string()
}

/// Package version (compiled from Cargo.toml)
pub fn oc_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

/// Slugify for refs: UPPERCASE, underscores
/// "Auth Design" → "AUTH_DESIGN"
pub fn slugify(title: &str) -> String {
    let s: String = title
        .to_uppercase()
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '_' })
        .collect();
    s.trim_matches('_').to_string()
}

/// Slugify for logs: lowercase, hyphens
/// "Auth Design" → "auth-design"
pub fn slugify_log(title: &str) -> String {
    let s: String = title
        .to_lowercase()
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '-' })
        .collect();
    s.trim_matches('-').to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_slugify() {
        assert_eq!(slugify("Auth Design"), "AUTH_DESIGN");
        assert_eq!(slugify("fix streaming bugs"), "FIX_STREAMING_BUGS");
        assert_eq!(slugify("  hello world  "), "HELLO_WORLD");
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
