mod cmd;
mod config;
mod detect;
mod inject;
mod parse;
mod template;
mod util;

use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "openclew", version, about = "Long Life Memory for LLMs")]
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

    /// Regenerate doc/_INDEX.md
    Index,

    /// Start MCP server (JSON-RPC over stdio)
    Mcp,
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
        Commands::Init { hook, no_inject, private_logs } => cmd::init::run(hook, no_inject, private_logs),
        Commands::Add { kind } => match kind {
            AddCmd::Ref { title } => cmd::add::run(cmd::add::AddKind::Ref, &title.join(" ")),
            AddCmd::Log { title } => cmd::add::run(cmd::add::AddKind::Log, &title.join(" ")),
            AddCmd::Todo { title } => cmd::add::run(cmd::add::AddKind::Todo, &title.join(" ")),
        },
        Commands::Search { query } => cmd::search::run(&query.join(" ")),
        Commands::Peek => cmd::peek::run(),
        Commands::Index => cmd::index::run(),
        Commands::Mcp => cmd::mcp::run(),
    };

    if let Err(e) = result {
        eprintln!("error: {e}");
        std::process::exit(1);
    }
}

#[cfg(test)]
mod parity_tests;
