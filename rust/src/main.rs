mod cmd;
mod config;
mod detect;
mod inject;
mod parse;
mod template;
mod util;

use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "openclew", version = concat!(env!("CARGO_PKG_VERSION"), " (rust)"), about = "Long Life Memory for LLMs")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Set up openclew in the current project
    Init {
        /// Install pre-commit hook for index generation
        #[arg(long)]
        hook: bool,

        /// Skip instruction file injection
        #[arg(long)]
        no_inject: bool,

        /// Add doc/log/ to .gitignore (opt-in; default: logs are versioned)
        #[arg(long)]
        private_logs: bool,

        /// Skip Claude Code slash commands installation
        #[arg(long)]
        no_commands: bool,
    },

    /// Create a doc from its template
    Add {
        #[command(subcommand)]
        kind: AddCmd,
    },

    /// Search docs by keyword
    Search {
        /// Query terms
        #[arg(required = true, num_args = 1..)]
        query: Vec<String>,
    },

    /// List instruction file + all refs + open TODOs
    Peek,

    /// End-of-session summary + pre-filled session log
    Checkout,

    /// Documentation health dashboard
    Status,

    /// Refs that may be outdated; --apply runs the safe automatic cleanup
    Review {
        /// Number of candidates shown (default: 10)
        #[arg(long)]
        top: Option<usize>,
        /// Full report as JSON
        #[arg(long)]
        json: bool,
        /// Apply deterministic gestures (refresh moved paths, archive proven redirects)
        #[arg(long)]
        apply: bool,
        /// With --apply: commit the touched refs and the journal in a dedicated commit
        #[arg(long)]
        commit: bool,
        /// Judged gesture: archive this ref in place
        #[arg(long)]
        archive: Option<String>,
        /// With --archive: the ref that replaces it (must exist)
        #[arg(long)]
        superseded_by: Option<String>,
        /// Judged gesture: confirm this ref is still true (sets reviewed:)
        #[arg(long)]
        confirm: Option<String>,
        /// Reason, written to the journal (required with --archive / --confirm)
        #[arg(long)]
        why: Option<String>,
    },

    /// Format session header line
    SessionHeader {
        /// Session title
        #[arg(long, default_value = "")]
        name: String,
        /// Comma-separated tags
        #[arg(long, default_value = "")]
        tags: String,
        /// Date (default: today)
        #[arg(long)]
        date: Option<String>,
    },

    /// Regenerate doc/_INDEX.md
    Index {
        /// doc/ directory (default: ./doc)
        doc_dir: Option<String>,
    },

    /// Start MCP server (JSON-RPC over stdio)
    Mcp,

    /// Deprecated and disabled: prints where to run it instead
    #[command(hide = true)]
    Migrate {
        #[arg(trailing_var_arg = true, allow_hyphen_values = true)]
        args: Vec<String>,
    },
}

#[derive(Subcommand)]
enum AddCmd {
    /// Create a ref (evolves with the project)
    Ref {
        #[arg(required = true, num_args = 1..)]
        title: Vec<String>,
    },
    /// Create a session log (frozen facts)
    Log {
        #[arg(required = true, num_args = 1..)]
        title: Vec<String>,
    },
    /// Create a TODO doc (one task per file)
    Todo {
        #[arg(required = true, num_args = 1..)]
        title: Vec<String>,
    },
}

fn main() {
    let cli = Cli::parse();

    let result = match cli.command {
        Commands::Init { hook, no_inject, private_logs, no_commands } => {
            cmd::init::run(cmd::init::InitOptions { hook, no_inject, private_logs, no_commands })
        }
        Commands::Add { kind } => match kind {
            AddCmd::Ref { title } => cmd::add::run(cmd::add::AddKind::Ref, &title.join(" ")),
            AddCmd::Log { title } => cmd::add::run(cmd::add::AddKind::Log, &title.join(" ")),
            AddCmd::Todo { title } => cmd::add::run(cmd::add::AddKind::Todo, &title.join(" ")),
        },
        Commands::Search { query } => cmd::search::run(&query.join(" ")),
        Commands::Peek => cmd::peek::run(),
        Commands::Checkout => cmd::checkout::run(),
        Commands::Status => cmd::status::run(),
        Commands::Review { top, json, apply, commit, archive, superseded_by, confirm, why } => {
            cmd::review::run(cmd::review::RunOptions { top, json, apply, commit, archive, superseded_by, confirm, why })
        }
        Commands::SessionHeader { name, tags, date } => cmd::session_header::run(&name, &tags, date.as_deref()),
        Commands::Index { doc_dir } => cmd::index::run(doc_dir),
        Commands::Mcp => cmd::mcp::run(),
        Commands::Migrate { .. } => {
            // Message SSOT shared with Node
            eprint!("{}", include_str!("../../templates/embedded/migrate-deprecated.txt"));
            std::process::exit(1);
        }
    };

    if let Err(e) = result {
        eprintln!("error: {e}");
        std::process::exit(1);
    }
}

#[cfg(test)]
mod parity_tests;
