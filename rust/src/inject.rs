use std::fs;
use std::path::Path;

use regex::Regex;

use crate::template;

const MARKER_START: &str = "<!-- openclew_START -->";
const MARKER_END: &str = "<!-- openclew_END -->";

/// Outcome of an injection (mirrors lib/inject.js return values)
#[derive(Debug, PartialEq, Eq)]
pub enum Injected {
    /// Block appended to a file that had none
    Created,
    /// Existing block replaced by a newer version
    Updated,
    /// Existing block already up to date
    Unchanged,
}

/// Inject or update the openclew block in an existing instruction file.
pub fn inject(file_path: &Path) -> std::io::Result<Injected> {
    let content = fs::read_to_string(file_path)?;
    let block = format!("{MARKER_START}\n{}\n{MARKER_END}", template::inject_block());

    if content.contains(MARKER_START) {
        let re = Regex::new(&format!(
            "{}[\\s\\S]*?{}",
            regex::escape(MARKER_START),
            regex::escape(MARKER_END)
        ))
        .unwrap();
        let updated = re.replace_all(&content, regex::NoExpand(&block)).to_string();
        if updated == content {
            return Ok(Injected::Unchanged);
        }
        fs::write(file_path, updated)?;
        return Ok(Injected::Updated);
    }

    fs::write(file_path, format!("{content}\n\n{block}\n"))?;
    Ok(Injected::Created)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_inject_is_idempotent() {
        let dir = std::env::temp_dir().join(format!("oc-inject-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        let f = dir.join("AGENTS.md");
        fs::write(&f, "# Proj\n").unwrap();

        assert_eq!(inject(&f).unwrap(), Injected::Created);
        let once = fs::read_to_string(&f).unwrap();
        assert_eq!(inject(&f).unwrap(), Injected::Unchanged);
        assert_eq!(fs::read_to_string(&f).unwrap(), once);
        assert_eq!(once.matches(MARKER_START).count(), 1);

        // Stale block is replaced, not duplicated
        fs::write(&f, format!("# Proj\n\n{MARKER_START}\nold\n{MARKER_END}\n")).unwrap();
        assert_eq!(inject(&f).unwrap(), Injected::Updated);
        let refreshed = fs::read_to_string(&f).unwrap();
        assert!(!refreshed.contains("\nold\n"));
        assert_eq!(refreshed.matches(MARKER_START).count(), 1);
        fs::remove_file(&f).unwrap();
    }
}
