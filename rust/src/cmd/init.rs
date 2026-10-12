//! `openclew init` — set up openclew in the current project (mirrors lib/init.js).
//!
//! 0. ~/.openclew/ global config + user-level Copilot prompts (always)
//! 1. doc/{ref,log,todo}/  2. legacy cleanup  2b. .gitignore (--private-logs)
//! 4. entry point + injected block  5. pre-commit hook (--hook)
//! 6. guide/framework/architecture refs, example log, TODO.md
//! 7. VS Code preview  8. index  9. project Copilot prompts  10. Claude Code commands

use std::env;
use std::fs;
use std::io::{self, BufRead, IsTerminal, Write as IoWrite};
use std::path::{Path, PathBuf};

use serde_json::{Map, Value};

use crate::config;
use crate::detect;
use crate::inject::{self, Injected};
use crate::template;
use crate::util::{oc_version, today};

const PROJECT_MARKERS: &[&str] = &[
    ".git", "package.json", "Cargo.toml", "pyproject.toml", "go.mod", "Gemfile", "composer.json",
    "Makefile", "pom.xml", "build.gradle", "CMakeLists.txt", "setup.py", "setup.cfg",
];

/// Assets shipped with the binary (SSOT: repo files, also shipped in the npm package)
const PREVIEW_CSS: &str = include_str!("../../../templates/openclew-preview.css");
const PROMPTS: &[(&str, &str)] = &[
    ("oc-checkout.prompt.md", include_str!("../../../prompts/oc-checkout.prompt.md")),
    ("oc-init.prompt.md", include_str!("../../../prompts/oc-init.prompt.md")),
    ("oc-peek.prompt.md", include_str!("../../../prompts/oc-peek.prompt.md")),
    ("oc-search.prompt.md", include_str!("../../../prompts/oc-search.prompt.md")),
    ("oc-status.prompt.md", include_str!("../../../prompts/oc-status.prompt.md")),
];
const COMMANDS: &[(&str, &str)] = &[
    ("oc-checkout.md", include_str!("../../../commands/oc-checkout.md")),
    ("oc-init.md", include_str!("../../../commands/oc-init.md")),
    ("oc-peek.md", include_str!("../../../commands/oc-peek.md")),
    ("oc-search.md", include_str!("../../../commands/oc-search.md")),
    ("oc-status.md", include_str!("../../../commands/oc-status.md")),
    ("oc-todo.md", include_str!("../../../commands/oc-todo.md")),
];
/// SSOT shared with Node: native binary first, npx fallback
const PRE_COMMIT_INDEX: &str = include_str!("../../../templates/embedded/pre-commit-index.sh");
const MANAGED_MARKER: &str = "<!-- openclew-managed -->";

pub struct InitOptions {
    pub hook: bool,
    pub no_inject: bool,
    pub private_logs: bool,
    pub no_commands: bool,
}

/// Home dir like Node: HOME, then USERPROFILE, then the OS profile dir
fn home_dir() -> PathBuf {
    env::var_os("HOME")
        .or_else(|| env::var_os("USERPROFILE"))
        .map(PathBuf::from)
        .or_else(dirs::home_dir)
        .unwrap_or_else(|| PathBuf::from("."))
}

fn vscode_user_prompts_dir() -> PathBuf {
    let home = home_dir();
    if cfg!(target_os = "macos") {
        home.join("Library/Application Support/Code/User/prompts")
    } else if cfg!(windows) {
        env::var_os("APPDATA")
            .map(PathBuf::from)
            .unwrap_or_else(|| home.join("AppData").join("Roaming"))
            .join("Code")
            .join("User")
            .join("prompts")
    } else {
        home.join(".config/Code/User/prompts")
    }
}

fn write_pretty_json(path: &Path, value: &Value) -> io::Result<()> {
    fs::write(path, serde_json::to_string_pretty(value).unwrap() + "\n")
}

fn ensure_global_dir() -> io::Result<()> {
    let dir = home_dir().join(".openclew");
    let created = !dir.exists();
    fs::create_dir_all(&dir)?;

    let config_path = dir.join("config.json");
    if !config_path.exists() {
        let mut cfg = Map::new();
        cfg.insert("version".into(), Value::from(oc_version()));
        cfg.insert("installedAt".into(), Value::from(today()));
        write_pretty_json(&config_path, &Value::Object(cfg))?;
    } else if let Ok(mut cfg) = serde_json::from_str::<Value>(&fs::read_to_string(&config_path)?) {
        cfg["version"] = Value::from(oc_version());
        write_pretty_json(&config_path, &cfg)?;
    }

    println!("{}", if created { "  Created ~/.openclew/" } else { "  ~/.openclew/ already exists" });
    Ok(())
}

fn install_files(dir: &Path, files: &[(&str, &str)]) -> io::Result<()> {
    fs::create_dir_all(dir)?;
    for (name, content) in files {
        fs::write(dir.join(name), content)?;
    }
    Ok(())
}

fn install_user_prompts() {
    let dir = vscode_user_prompts_dir();
    match install_files(&dir, PROMPTS) {
        Ok(()) => {
            println!("  Installed {} prompt file(s) → {}", PROMPTS.len(), dir.display());
            println!("  Available in Copilot Chat: /oc-checkout, /oc-search, /oc-peek, /oc-status, /oc-init");
        }
        Err(e) => println!("  Could not install user-level prompts: {e}"),
    }
}

fn ensure_dir(root: &Path, rel: &str) -> io::Result<()> {
    let p = root.join(rel);
    if p.exists() {
        println!("  {rel}/ already exists");
    } else {
        fs::create_dir_all(&p)?;
        println!("  Created {rel}/");
    }
    Ok(())
}

fn cleanup_legacy_python(doc_dir: &Path) -> io::Result<()> {
    let legacy = doc_dir.join("generate-index.py");
    if legacy.exists() {
        fs::remove_file(&legacy)?;
        println!("  Removed legacy doc/generate-index.py (now JS-native)");
    } else {
        println!("  No legacy Python script to clean up");
    }
    Ok(())
}

fn update_gitignore(root: &Path) -> io::Result<()> {
    let path = root.join(".gitignore");
    let entry = "doc/log/";
    if path.exists() {
        let content = fs::read_to_string(&path)?;
        if content.contains(entry) {
            println!("  .gitignore already ignores doc/log/");
            return Ok(());
        }
        fs::OpenOptions::new().append(true).open(&path)?.write_all(format!("\n{entry}\n").as_bytes())?;
        println!("  Added doc/log/ to .gitignore");
    } else {
        fs::write(&path, format!("{entry}\n"))?;
        println!("  Created .gitignore with doc/log/");
    }
    Ok(())
}

fn ask(question: &str) -> String {
    print!("{question}");
    let _ = io::stdout().flush();
    let mut line = String::new();
    let _ = io::stdin().lock().read_line(&mut line);
    line.trim().to_string()
}

/// Entry point priority: AGENTS.md (any case) > other instruction file > new AGENTS.md
fn resolve_entry_point(root: &Path) -> io::Result<(String, PathBuf)> {
    let interactive = io::stdin().is_terminal();

    if let Some(agents) = detect::find_agents_md(root) {
        if !interactive {
            println!("  Using {agents} (non-interactive)");
            return Ok((agents.clone(), root.join(&agents)));
        }
        let answer = ask(&format!("  Found {agents} — use as entry point? [Y/n] ")).to_lowercase();
        if answer.is_empty() || answer == "y" || answer == "yes" {
            return Ok((agents.clone(), root.join(&agents)));
        }
    }

    let others: Vec<_> = detect::detect_instruction_files(root)
        .into_iter()
        .filter(|f| !f.is_dir && f.file.to_lowercase() != "agents.md")
        .collect();
    if !others.is_empty() {
        println!("  Detected instruction files:");
        for (i, f) in others.iter().enumerate() {
            println!("    {}. {} ({})", i + 1, f.file, f.tool);
        }
        println!("    {}. Create new AGENTS.md", others.len() + 1);
        if !interactive {
            println!("  Using {} (non-interactive)", others[0].file);
            return Ok((others[0].file.clone(), others[0].full_path.clone()));
        }
        let choice = ask(&format!("  Choose entry point [1-{}]: ", others.len() + 1));
        if let Ok(n) = choice.parse::<usize>() {
            if (1..=others.len()).contains(&n) {
                return Ok((others[n - 1].file.clone(), others[n - 1].full_path.clone()));
            }
        }
    }

    let path = root.join("AGENTS.md");
    let name = root.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
    fs::write(&path, format!("# {name}\n\nProject instructions for AI agents.\n"))?;
    println!("  Created AGENTS.md");
    Ok(("AGENTS.md".to_string(), path))
}

fn install_pre_commit_hook(root: &Path) -> io::Result<()> {
    let git_dir = root.join(".git");
    if !git_dir.exists() {
        println!("  No .git/ found — skipping hook installation");
        return Ok(());
    }
    let hooks_dir = git_dir.join("hooks");
    fs::create_dir_all(&hooks_dir)?;
    let hook = hooks_dir.join("pre-commit");
    let marker = "# openclew-index";
    let script = PRE_COMMIT_INDEX.trim();

    if hook.exists() {
        if fs::read_to_string(&hook)?.contains(marker) {
            println!("  Pre-commit hook already contains openclew index generation");
            return Ok(());
        }
        fs::OpenOptions::new()
            .append(true)
            .open(&hook)?
            .write_all(format!("\n\n{marker}\n{script}\n").as_bytes())?;
        println!("  Appended openclew index generation to existing pre-commit hook");
    } else {
        fs::write(&hook, format!("#!/bin/sh\n\n{marker}\n{script}\n"))?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(&hook, fs::Permissions::from_mode(0o755))?;
        }
        println!("  Created pre-commit hook for index generation");
    }
    Ok(())
}

/// Write `rel` (under doc/ref/) unless it, or its legacy `doc/_NAME.md` twin, exists
fn create_ref_once(doc_dir: &Path, name: &str, label: &str, content: impl FnOnce() -> String) -> io::Result<()> {
    let path = doc_dir.join("ref").join(name);
    let legacy = doc_dir.join(format!("_{name}"));
    if path.exists() {
        println!("  doc/ref/{name} already exists");
    } else if legacy.exists() {
        println!("  doc/_{name} already exists");
    } else {
        fs::write(&path, content())?;
        println!("  Created doc/ref/{name} ({label})");
    }
    Ok(())
}

fn create_docs(root: &Path, doc_dir: &Path, entry_point: Option<&Path>) -> io::Result<()> {
    create_ref_once(doc_dir, "USING_OPENCLEW.md", "guide", template::guide_content)?;
    create_ref_once(
        doc_dir,
        "OPENCLEW_FRAMEWORK_INTEGRATION.md",
        "framework integration guide",
        template::framework_integration_content,
    )?;

    let existing = entry_point.and_then(|p| fs::read_to_string(p).ok());
    let label = if existing.is_some() { "seeded from instruction file" } else { "template" };
    create_ref_once(doc_dir, "ARCHITECTURE.md", label, || {
        template::example_ref_content(existing.as_deref())
    })?;

    let log_name = format!("{}_setup-openclew.md", today());
    let log_path = doc_dir.join("log").join(&log_name);
    if log_path.exists() {
        println!("  doc/log/{log_name} already exists");
    } else {
        fs::write(&log_path, template::example_log_content())?;
        println!("  Created doc/log/{log_name} (example log)");
    }

    let todo_path = root.join("TODO.md");
    if todo_path.exists() {
        println!("  TODO.md already exists");
    } else {
        fs::write(&todo_path, template::todo_root_content())?;
        println!("  Created TODO.md (task tracking)");
    }
    Ok(())
}

/// Strip // and /* */ comments (VS Code settings are JSONC)
fn strip_json_comments(raw: &str) -> String {
    let line_re = regex::Regex::new(r"(?m)//.*$").unwrap();
    let block_re = regex::Regex::new(r"/\*[\s\S]*?\*/").unwrap();
    block_re.replace_all(&line_re.replace_all(raw, ""), "").to_string()
}

fn setup_vscode_preview(root: &Path) -> io::Result<()> {
    let vscode = root.join(".vscode");
    fs::create_dir_all(&vscode)?;
    fs::write(vscode.join("openclew-preview.css"), PREVIEW_CSS)?;

    let settings_path = vscode.join("settings.json");
    let mut settings: Map<String, Value> = fs::read_to_string(&settings_path)
        .ok()
        .and_then(|raw| serde_json::from_str(&strip_json_comments(&raw)).ok())
        .unwrap_or_default();

    let defaults: [(&str, Value); 3] = [
        ("markdown.preview.fontSize", Value::from(14)),
        ("markdown.preview.lineHeight", Value::from(1.5)),
        ("markdown.styles", Value::from(vec![".vscode/openclew-preview.css"])),
    ];
    let mut changed = false;
    for (key, value) in defaults {
        if !settings.contains_key(key) {
            settings.insert(key.to_string(), value);
            changed = true;
        }
    }

    if changed || !settings_path.exists() {
        write_pretty_json(&settings_path, &Value::Object(settings))?;
        println!("  Created .vscode/settings.json (markdown preview)");
    } else {
        println!("  .vscode/settings.json already configured");
    }
    println!("  Installed .vscode/openclew-preview.css");
    Ok(())
}

fn install_slash_commands() -> io::Result<()> {
    let claude = home_dir().join(".claude");
    if !claude.exists() {
        println!("  No ~/.claude/ found (Claude Code not installed) — skipping");
        return Ok(());
    }
    let dir = claude.join("commands");
    fs::create_dir_all(&dir)?;

    let mut installed = 0;
    for (name, content) in COMMANDS {
        let dest = dir.join(name);
        // Never overwrite a command the user edited (managed marker removed)
        if dest.exists() && !fs::read_to_string(&dest)?.contains(MANAGED_MARKER) {
            println!("  Skipped {name} (user-modified)");
            continue;
        }
        fs::write(&dest, content)?;
        installed += 1;
    }
    if installed > 0 {
        println!("  Installed {installed} slash command(s) → ~/.claude/commands/");
        println!("  Available: /oc-checkout, /oc-search, /oc-init, /oc-status");
    } else {
        println!("  Slash commands already up to date");
    }
    Ok(())
}

/// Map an io error to "<step>: <error>"
fn err(step: &'static str) -> impl Fn(io::Error) -> String {
    move |e| format!("{step}: {e}")
}

pub fn run(opts: InitOptions) -> Result<(), String> {
    let root = env::current_dir().map_err(|e| format!("Cannot get cwd: {e}"))?;
    let doc_dir = root.join("doc");

    println!("\nopenclew init\n");

    println!("0. Global config");
    ensure_global_dir().map_err(err("Global config"))?;

    println!("\n1. Copilot prompts (user-level)");
    install_user_prompts();

    if !PROJECT_MARKERS.iter().any(|m| root.join(m).exists()) {
        println!("\n─── Done ───\n");
        println!("  openclew installed → ~/.openclew/");
        println!();
        return Ok(());
    }

    println!("\n1. Project structure");
    for rel in ["doc", "doc/ref", "doc/log", "doc/todo"] {
        ensure_dir(&root, rel).map_err(err("Create dirs"))?;
    }

    println!("\n2. Index generator");
    cleanup_legacy_python(&doc_dir).map_err(err("Legacy cleanup"))?;

    if opts.private_logs {
        println!("\n2b. Gitignore (--private-logs)");
        update_gitignore(&root).map_err(err("Gitignore"))?;
    }

    println!("\n4. Entry point");
    let entry_point = if opts.no_inject {
        println!("  Skipping entry point setup (--no-inject)");
        config::write_config(&config::Config { entry_point: None }, &root).map_err(err("Config"))?;
        None
    } else {
        let (name, path) = resolve_entry_point(&root).map_err(err("Entry point"))?;
        match inject::inject(&path).map_err(err("Inject"))? {
            Injected::Created => println!("  Injected openclew block into {name}"),
            Injected::Updated => println!("  Updated openclew block in {name}"),
            Injected::Unchanged => println!("  {name} openclew block is up to date"),
        }
        config::write_config(&config::Config { entry_point: Some(name.clone()) }, &root)
            .map_err(err("Config"))?;
        println!("  Saved entry point → .openclew.json");
        Some((name, path))
    };

    println!("\n5. Pre-commit hook");
    if opts.hook {
        install_pre_commit_hook(&root).map_err(err("Hook"))?;
    } else {
        println!("  Skipping (use --hook to install index auto-generation)");
    }

    println!("\n6. Docs");
    create_docs(&root, &doc_dir, entry_point.as_ref().map(|(_, p)| p.as_path())).map_err(err("Docs"))?;

    println!("\n7. VS Code preview");
    setup_vscode_preview(&root).map_err(err("VS Code preview"))?;

    println!("\n8. Index");
    match crate::cmd::index::write_index(&doc_dir) {
        Ok(c) => println!("  Generated doc/_INDEX.md ({} refs, {} logs)", c.refs, c.logs),
        Err(e) => println!("  Could not generate index: {e}"),
    }

    println!("\n9. Copilot prompts (project)");
    install_files(&root.join(".github").join("prompts"), PROMPTS).map_err(err("Project prompts"))?;
    println!("  Installed {} prompt file(s) → .github/prompts/", PROMPTS.len());

    println!("\n10. Claude Code commands");
    if opts.no_commands {
        println!("  Skipping (--no-commands)");
    } else {
        install_slash_commands().map_err(err("Slash commands"))?;
    }

    println!("\n─── Ready ───\n");
    if let Some((name, _)) = &entry_point {
        println!("  Entry point: {name}");
    }
    println!("  Guide:       doc/ref/USING_OPENCLEW.md");
    println!();
    println!("─── Try it now ───\n");
    println!("  1. Open doc/ref/ARCHITECTURE.md and describe YOUR project");
    println!("     That's your first ref — the clew your future self will grab.\n");
    println!("  2. Create your first log:");
    println!("     npx openclew add log \"What I worked on today\"\n");
    println!("  3. Check your docs:");
    println!("     npx openclew peek\n");
    println!("  That's it. Your agent will find these docs automatically next session.");
    println!();
    Ok(())
}
