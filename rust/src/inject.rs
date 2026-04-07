use std::fs;
use std::path::Path;

use crate::template::inject_block;

const MARKER_START: &str = "<!-- openclew_START -->";
const MARKER_END: &str = "<!-- openclew_END -->";

/// Check if file already has the openclew block
pub fn is_already_injected(file_path: &Path) -> bool {
    fs::read_to_string(file_path)
        .map(|content| content.contains(MARKER_START))
        .unwrap_or(false)
}

/// Inject or update the openclew block in a file.
/// Returns "created" if file was created, "updated" if block was replaced, None if no change.
pub fn inject(file_path: &Path) -> Option<&'static str> {
    let block = inject_block::openclew_block();

    if !file_path.exists() {
        fs::write(file_path, &block).ok()?;
        return Some("created");
    }

    let content = fs::read_to_string(file_path).ok()?;

    if content.contains(MARKER_START) {
        // Replace existing block
        let start_idx = content.find(MARKER_START)?;
        let end_idx = content.find(MARKER_END)?;
        let end_idx = end_idx + MARKER_END.len();

        let new_content = format!("{}{}{}", &content[..start_idx], block, &content[end_idx..]);

        if new_content == content {
            return None; // No change
        }

        fs::write(file_path, new_content).ok()?;
        Some("updated")
    } else {
        // Append block
        let new_content = if content.ends_with('\n') {
            format!("{content}\n{block}")
        } else {
            format!("{content}\n\n{block}")
        };

        fs::write(file_path, new_content).ok()?;
        Some("updated")
    }
}
