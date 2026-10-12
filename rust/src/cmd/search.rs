//! `openclew search <query>` — keyword search over doc metadata (L1 + line 1).

use crate::parse::collect::DocKind;
use crate::parse::search::search_docs;

pub fn run(query: &str) -> Result<(), String> {
    let query = query.trim();
    if query.is_empty() {
        return Err([
            "Usage: openclew search <query>",
            "",
            "Examples:",
            "  openclew search auth          # find docs about authentication",
            "  openclew search \"API design\"   # multi-word search",
        ]
        .join("\n"));
    }

    let project_root = std::env::current_dir().map_err(|e| e.to_string())?;
    let doc_dir = project_root.join("doc");
    if !doc_dir.exists() {
        return Err("No doc/ directory found. Run 'openclew init' first.".to_string());
    }

    let results = search_docs(&doc_dir, query);
    if results.is_empty() {
        println!("No docs matching \"{query}\".");
        return Ok(());
    }

    let plural = if results.len() > 1 { "s" } else { "" };
    println!("Found {} doc{plural} matching \"{query}\":\n", results.len());

    for r in &results {
        let rel = r.doc.filepath.strip_prefix(&project_root).unwrap_or(&r.doc.filepath);
        let icon = match r.doc.kind {
            DocKind::Ref => "📘",
            DocKind::Todo => "☐",
            DocKind::Log => "📝",
        };
        let subject = match r.doc.meta.subject() {
            "" => r.doc.filename.as_str(),
            s => s,
        };
        let status = match r.doc.meta.status() {
            "" => String::new(),
            s => format!(" [{s}]"),
        };
        println!("{icon} {subject}{status}");
        println!("   {}", rel.display());
        let brief = r.doc.meta.doc_brief();
        if !brief.is_empty() {
            println!("   {brief}");
        }
        println!();
    }
    Ok(())
}
