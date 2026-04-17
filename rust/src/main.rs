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

    /// Regenerate doc/_INDEX.md
    Index,

    /// Start MCP server (JSON-RPC over stdio)
    Mcp,
}

fn main() {
    let cli = Cli::parse();

    let result = match cli.command {
        Commands::Init { hook, no_inject, private_logs } => cmd::init::run(hook, no_inject, private_logs),
        Commands::Index => cmd::index::run(),
        Commands::Mcp => cmd::mcp::run(),
    };

    if let Err(e) = result {
        eprintln!("error: {e}");
        std::process::exit(1);
    }
}
