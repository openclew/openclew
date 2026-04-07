/// The openclew block injected into instruction files
pub fn openclew_block() -> String {
    r#"<!-- openclew_START -->
## openclew — project knowledge

This project uses [openclew](https://github.com/openclew/openclew) to structure its documentation.

**Before any task:** check `doc/_INDEX.md` or run `openclew peek` to list available docs. Read the relevant ones before exploring code.

**Doc types:**
- **Refdocs** (`doc/ref/*.md` or `doc/_*.md`): knowledge that evolves with the project (architecture, conventions, decisions)
- **Logs** (`doc/log/YYYY-MM-DD_*.md`): frozen facts from a work session (immutable after creation)

**Document format:** Each doc has a metadata line + 3 levels (L1 brief → L2 summary → L3 details). Read only what you need.

**Creating docs:** Use the MCP tools `create_ref` and `create_log` if available, or create files manually following the format in `doc/_USING_OPENCLEW.md`.
<!-- openclew_END -->"#
        .to_string()
}
