use std::env;
use std::fs;
use std::io::{self, Write as IoWrite};
use std::path::{Path, PathBuf};

use crate::config;
use crate::detect;
use crate::inject;
use crate::template::{guide, log, refs as ref_tpl};
use crate::util::{oc_version, today};

const PROJECT_MARKERS: &[&str] = &[
    ".git",
    "package.json",
    "Cargo.toml",
    "pyproject.toml",
    "go.mod",
    "Gemfile",
    "composer.json",
    "Makefile",
    "pom.xml",
    "build.gradle",
    "CMakeLists.txt",
    "setup.py",
    "setup.cfg",
];

fn is_project_dir(root: &Path) -> bool {
    PROJECT_MARKERS.iter().any(|m| root.join(m).exists())
}

fn ensure_global_dir() -> io::Result<()> {
    let home = dirs_path();
    if !home.exists() {
        fs::create_dir_all(&home)?;
    }

    let config_path = home.join("config.json");
    if !config_path.exists() {
        let config = serde_json::json!({
            "version": oc_version(),
            "installedAt": today()
        });
        fs::write(&config_path, serde_json::to_string_pretty(&config).unwrap() + "\n")?;
    } else {
        // Update version
        if let Ok(content) = fs::read_to_string(&config_path) {
            if let Ok(mut json) = serde_json::from_str::<serde_json::Value>(&content) {
                json["version"] = serde_json::Value::String(oc_version().to_string());
                fs::write(&config_path, serde_json::to_string_pretty(&json).unwrap() + "\n")?;
            }
        }
    }

    Ok(())
}

fn dirs_path() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(".openclew")
}

fn create_dirs(doc_dir: &Path, log_dir: &Path) -> io::Result<()> {
    if !doc_dir.exists() {
        fs::create_dir_all(doc_dir)?;
        eprintln!("  Created doc/");
    }
    if !log_dir.exists() {
        fs::create_dir_all(log_dir)?;
        eprintln!("  Created doc/log/");
    }
    Ok(())
}

fn update_gitignore(root: &Path) -> io::Result<()> {
    let gitignore = root.join(".gitignore");
    let entry = "doc/log/";

    if gitignore.exists() {
        let content = fs::read_to_string(&gitignore)?;
        if content.lines().any(|l| l.trim() == entry) {
            return Ok(());
        }
        let mut f = fs::OpenOptions::new().append(true).open(&gitignore)?;
        if !content.ends_with('\n') {
            writeln!(f)?;
        }
        writeln!(f, "{entry}")?;
    } else {
        fs::write(&gitignore, format!("{entry}\n"))?;
    }
    eprintln!("  Updated .gitignore");
    Ok(())
}

fn install_pre_commit_hook(root: &Path) -> io::Result<()> {
    let hooks_dir = root.join(".git/hooks");
    if !hooks_dir.exists() {
        return Ok(());
    }

    let hook_path = hooks_dir.join("pre-commit");
    let marker = "# openclew-index";
    let hook_script = format!(
        r#"
{marker}
if command -v openclew >/dev/null 2>&1; then
  openclew index
elif command -v npx >/dev/null 2>&1; then
  npx --yes openclew index
fi
git add doc/_INDEX.md 2>/dev/null || true
"#
    );

    if hook_path.exists() {
        let content = fs::read_to_string(&hook_path)?;
        if content.contains(marker) {
            return Ok(());
        }
        let mut f = fs::OpenOptions::new().append(true).open(&hook_path)?;
        write!(f, "{hook_script}")?;
    } else {
        fs::write(&hook_path, format!("#!/bin/sh\n{hook_script}"))?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(&hook_path, fs::Permissions::from_mode(0o755))?;
        }
    }
    eprintln!("  Installed pre-commit hook");
    Ok(())
}

/// Ask the user to choose an entry point, or default to first option if non-interactive
fn choose_entry_point(root: &Path) -> Option<(String, PathBuf)> {
    let detected = detect::detect_instruction_files(root);

    if !detected.is_empty() {
        // Use the first detected file
        let first = &detected[0];
        eprintln!("  Found: {} ({})", first.file, first.tool);
        return Some((first.file.to_string(), first.full_path.clone()));
    }

    // Create AGENTS.md
    let name = "AGENTS.md";
    let path = root.join(name);
    eprintln!("  Creating {name}");
    Some((name.to_string(), path))
}

fn create_docs(_root: &Path, doc_dir: &Path, log_dir: &Path, entry_point_path: Option<&Path>) -> io::Result<()> {
    // Guide
    let guide_path = doc_dir.join("_USING_OPENCLEW.md");
    if !guide_path.exists() {
        fs::write(&guide_path, guide::guide_content())?;
        eprintln!("  Created doc/_USING_OPENCLEW.md");
    }

    // Architecture seed
    let arch_path = doc_dir.join("_ARCHITECTURE.md");
    if !arch_path.exists() {
        let existing = entry_point_path
            .and_then(|p| fs::read_to_string(p).ok());
        fs::write(&arch_path, ref_tpl::example_ref_content(existing.as_deref()))?;
        eprintln!("  Created doc/_ARCHITECTURE.md");
    }

    // Example log
    let log_path = log_dir.join(format!("{}_setup-openclew.md", today()));
    if !log_path.exists() {
        fs::write(&log_path, log::example_log_content())?;
        eprintln!("  Created example log");
    }

    Ok(())
}

pub fn run(hook: bool, no_inject: bool, private_logs: bool) -> Result<(), String> {
    let root = env::current_dir().map_err(|e| format!("Cannot get cwd: {e}"))?;
    let doc_dir = root.join("doc");
    let log_dir = doc_dir.join("log");

    eprintln!("openclew init v{}", oc_version());

    // 0. Global config
    ensure_global_dir().map_err(|e| format!("Global config: {e}"))?;

    // Check if project dir
    if !is_project_dir(&root) {
        eprintln!("  Not a project directory (no .git, package.json, etc.)");
        eprintln!("  Global config updated. Run 'openclew init' inside a project to set up docs.");
        return Ok(());
    }

    // 1. Create directories
    create_dirs(&doc_dir, &log_dir).map_err(|e| format!("Create dirs: {e}"))?;

    // 2. Update .gitignore (opt-in — logs are versioned by default)
    if private_logs {
        update_gitignore(&root).map_err(|e| format!("Gitignore: {e}"))?;
    }

    // 3. Entry point detection & injection
    let entry_point_path = if !no_inject {
        if let Some((name, full_path)) = choose_entry_point(&root) {
            match inject::inject(&full_path) {
                Some("created") => eprintln!("  Created {name} with openclew block"),
                Some("updated") => eprintln!("  Updated openclew block in {name}"),
                _ => eprintln!("  {name} already has openclew block"),
            }

            // Save config
            let config = config::Config {
                entry_point: Some(name),
            };
            config::write_config(&config, &root).map_err(|e| format!("Config: {e}"))?;

            Some(full_path)
        } else {
            None
        }
    } else {
        eprintln!("  Skipping injection (--no-inject)");
        None
    };

    // 4. Pre-commit hook
    if hook {
        install_pre_commit_hook(&root).map_err(|e| format!("Hook: {e}"))?;
    }

    // 5. Create docs
    create_docs(&root, &doc_dir, &log_dir, entry_point_path.as_deref())
        .map_err(|e| format!("Docs: {e}"))?;

    // 6. Generate index
    crate::cmd::index::run()?;

    eprintln!("\nDone! Your project now has structured documentation in doc/.");
    eprintln!("Next: fill in doc/_ARCHITECTURE.md with your project's details.");

    Ok(())
}
