<!-- openclew-managed -->
# oc-raise — Report an openclew friction

> If the `openclew` command is not found, run it through npx: `npx openclew <command>`.

Report a problem with openclew itself (format, templates, injected block, CLI, commands) as a GitHub Issue on `openclew/openclew`. Not for bugs of the user's project.

**Usage:** `/oc-raise "Short description of the friction"`

## Steps

1. **Describe the friction** from the session:
   - Title: one line, ≤ 70 characters.
   - Problem: expected vs observed, in 2-5 lines.
   - Example: a minimal, concrete case.
   - Proposal (optional): 1-3 options.
   - Files concerned in openclew (e.g. `templates/FORMAT.md`, `templates/embedded/inject-block.md`, `commands/oc-checkout.md`).

2. **Strip private context — the issue is public.** Remove project names, internal paths, people's names, client data, secrets, and any excerpt of the user's code or docs. Replace them with a neutral invented example that shows the same problem.

3. **Show the full draft to the user and ask for confirmation.** Never create the issue without an explicit yes.

4. **Create the issue:**
   ```bash
   gh issue create --repo openclew/openclew --title "<title>" --body-file <draft.md> --label <enhancement|bug|documentation>
   ```
   If `gh` is not installed or not authenticated, give the user this link to open it themselves, with the draft to paste:
   `https://github.com/openclew/openclew/issues/new`

5. **Return the issue URL** printed by `gh`.

## Body template

```markdown
## Problem

## Example

## Proposal

## Files concerned
```
