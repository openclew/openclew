use std::fs;
use std::path::{Path, PathBuf};

pub struct InstructionFile {
    pub tool: &'static str,
    pub file: String,
    pub full_path: PathBuf,
    pub is_dir: bool,
}

/// Mirrors lib/detect.js INSTRUCTION_FILES (AGENTS.md handled case-insensitively)
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

/// Case-insensitive search for an AGENTS.md file in project root
pub fn find_agents_md(project_root: &Path) -> Option<String> {
    let entries = fs::read_dir(project_root).ok()?;
    entries
        .flatten()
        .filter(|e| e.path().is_file())
        .map(|e| e.file_name().to_string_lossy().into_owned())
        .find(|name| name.to_lowercase() == "agents.md")
}

/// Detect existing instruction files: static list first, then AGENTS.md (like Node)
pub fn detect_instruction_files(project_root: &Path) -> Vec<InstructionFile> {
    let mut found: Vec<InstructionFile> = INSTRUCTION_FILES
        .iter()
        .filter_map(|&(tool, file)| {
            let full_path = project_root.join(file);
            full_path.exists().then(|| InstructionFile {
                tool,
                file: file.to_string(),
                is_dir: full_path.is_dir(),
                full_path,
            })
        })
        .collect();

    if let Some(agents) = find_agents_md(project_root) {
        if !found.iter().any(|f| f.file.to_lowercase() == agents.to_lowercase()) {
            found.push(InstructionFile {
                tool: "Codex / Gemini",
                full_path: project_root.join(&agents),
                file: agents,
                is_dir: false,
            });
        }
    }
    found
}
