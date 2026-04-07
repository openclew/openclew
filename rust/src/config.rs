use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

const CONFIG_FILE: &str = ".openclew.json";

#[derive(Debug, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    #[serde(skip_serializing_if = "Option::is_none")]
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

pub fn write_config(config: &Config, project_root: &Path) -> std::io::Result<()> {
    let p = config_path(project_root);
    let json = serde_json::to_string_pretty(config).unwrap();
    fs::write(p, format!("{json}\n"))
}

pub fn get_entry_point(project_root: &Path) -> Option<String> {
    read_config(project_root).and_then(|c| c.entry_point)
}
