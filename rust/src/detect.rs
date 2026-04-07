use std::fs;
use std::path::{Path, PathBuf};

pub struct InstructionFile {
    pub tool: &'static str,
    pub file: &'static str,
    pub full_path: PathBuf,
    pub is_dir: bool,
}

const INSTRUCTION_FILES: &[(&str, &str)] = &[
    ("Claude Code", "CLAUDE.md"),
    ("Cursor", ".cursorrules"),
    ("Cursor", ".cursor/rules"),
    ("GitHub Copilot", ".github/copilot-instructions.md"),
    ("Windsurf", ".windsurfrules"),
    ("Windsurf", ".windsurf/rules"),
    ("Cline", ".clinerules"),
    ("Antigravity", ".antigravity/rules.md"),
    ("Gemini CLI", ".gemini/GEMINI.md"),
    ("Aider", "CONVENTIONS.md"),
];

/// Case-insensitive search for AGENTS.md
pub fn find_agents_md(project_root: &Path) -> Option<String> {
    let entries = fs::read_dir(project_root).ok()?;
    for entry in entries.flatten() {
        let name = entry.file_name();
        let name_str = name.to_string_lossy();
        if name_str.to_lowercase() == "agents.md" {
            return Some(name_str.into_owned());
        }
    }
    None
}

/// Detect all existing instruction files in project root
pub fn detect_instruction_files(project_root: &Path) -> Vec<InstructionFile> {
    let mut found = Vec::new();

    // Check AGENTS.md first (case-insensitive)
    if let Some(agents_name) = find_agents_md(project_root) {
        let full_path = project_root.join(&agents_name);
        found.push(InstructionFile {
            tool: "Codex / Gemini",
            file: Box::leak(agents_name.into_boxed_str()),
            full_path,
            is_dir: false,
        });
    }

    // Check static list
    for &(tool, file) in INSTRUCTION_FILES {
        let full_path = project_root.join(file);
        if full_path.exists() {
            // Skip if it's AGENTS.md (already found above)
            if file.to_lowercase() == "agents.md" {
                continue;
            }
            let is_dir = full_path.is_dir();
            found.push(InstructionFile {
                tool,
                file,
                full_path,
                is_dir,
            });
        }
    }

    found
}
