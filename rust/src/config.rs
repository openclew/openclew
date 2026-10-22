use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

const CONFIG_FILE: &str = ".openclew.json";

#[derive(Debug, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    /// `null` with --no-inject (marks init as done, like Node)
    pub entry_point: Option<String>,
}

fn config_path(project_root: &Path) -> PathBuf {
    project_root.join(CONFIG_FILE)
}

pub fn read_config(project_root: &Path) -> Option<Config> {
    let p = config_path(project_root);
    let content = fs::read_to_string(p).ok()?;
    serde_json::from_str(&content).ok()
}

/// Merge into the existing file: keys set elsewhere (e.g. reviewCommit) survive init
pub fn write_config(config: &Config, project_root: &Path) -> std::io::Result<()> {
    let p = config_path(project_root);
    let mut merged = fs::read_to_string(&p)
        .ok()
        .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
        .filter(|v| v.is_object())
        .unwrap_or_else(|| serde_json::json!({}));
    if let (Some(map), serde_json::Value::Object(ours)) = (merged.as_object_mut(), serde_json::to_value(config).unwrap()) {
        map.extend(ours);
    }
    let json = serde_json::to_string_pretty(&merged).unwrap();
    fs::write(p, format!("{json}\n"))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Same expectation as test/config.test.js
    #[test]
    fn test_write_config_keeps_other_keys() {
        let root = std::env::temp_dir().join(format!("oc-config-{}", std::process::id()));
        fs::create_dir_all(&root).unwrap();
        fs::write(root.join(CONFIG_FILE), r#"{"entryPoint":"AGENTS.md","reviewCommit":{"one":"x"}}"#).unwrap();
        write_config(&Config { entry_point: Some("CLAUDE.md".into()) }, &root).unwrap();
        let v: serde_json::Value = serde_json::from_str(&fs::read_to_string(root.join(CONFIG_FILE)).unwrap()).unwrap();
        assert_eq!(v, serde_json::json!({"entryPoint": "CLAUDE.md", "reviewCommit": {"one": "x"}}));
        let _ = fs::remove_file(root.join(CONFIG_FILE));
    }
}

pub fn get_entry_point(project_root: &Path) -> Option<String> {
    read_config(project_root).and_then(|c| c.entry_point)
}
