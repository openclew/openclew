openclew@0.6.0 · date: 2026-03-31 · type: Feature · status: Done · category: Format · keywords: [css, preview, markdown, div, l1, l2, l3, vscode, positional-parser]

- **subject:** L1 format evolution — from HTML comments to divs to pure Markdown
- **doc_brief:** Tested `<div class="oc-l1">` wrappers to make L1 CSS-targetable in VS Code preview. Worked, but introduced a blank-line pitfall and HTML that bots don't produce naturally. Replaced with pure Markdown (list items between line 1 and first `---`). Parser supports all 3 formats via positional fallback.

---

# Summary

## Objective
Make openclew docs readable in VS Code Markdown preview. L1 metadata was collapsing into a wall of text because HTML comments are stripped from the DOM and single line breaks are ignored by Markdown.

## Problem
- `<!-- L1_START -->` comments are invisible in rendered Markdown — no styling hook
- `**subject:** ...` paragraphs merged into a single block in preview
- No way to visually distinguish L1/L2/L3 sections

## Approach 1: div wrappers (tested, not retained)
- Replaced HTML comments with `<div class="oc-l1/l2/l3">` wrappers — CSS-targetable
- L1 fields switched to Markdown list syntax (`- **subject:** ...`) — each field on its own line
- CSS (`openclew-preview.css`): `.oc-l1` = blue card, `.oc-l2` = green border, `.oc-l3` = gray border

**Why it was interesting:**
- CSS could target specific sections for visual styling
- Gave clear visual hierarchy in VS Code preview

**Why it was dropped:**
- **Blank line pitfall**: CommonMark requires a blank line after `<div>` and before `</div>` for Markdown inside to be parsed. Easy to forget, silent failure — the content renders as raw text.
- **Bots write Markdown, not HTML**: openclew targets AI agents as primary users. Asking them to produce `<div class="oc-l1">` adds friction for no structural benefit.
- **The real fix was the list syntax**, not the divs. Switching from paragraphs (`**subject:** ...`) to list items (`- **subject:** ...`) is what solved the wall-of-text problem. The divs were just a vehicle.

## Approach 2: pure Markdown (retained)
- No wrappers at all — L1 = list items between line 1 (metadata) and first `---`
- `# Summary` and `# Details` headings (no "L2"/"L3" prefix)
- Parser uses positional extraction: `findL1Block()` with 3-level fallback (div → comments → positional)
- CSS preview still works for any existing docs with div wrappers (backward compat)

## Final format
```markdown
openclew@VERSION · date: YYYY-MM-DD · type: Feature · ...

- **subject:** Short title
- **doc_brief:** What was done and why.

---

# Summary
...

---

# Details
...
```

---

# Details

## Parser: findL1Block() — 3-level fallback
1. `<div class="oc-l1">...</div>` — div format (legacy)
2. `<!-- L1_START -->...<!-- L1_END -->` — comment format (oldest)
3. **Positional** — lines between line 0 (metadata) and first `---` (current default)

Both `parseL1` (bold `**key:**` syntax) and `parseL1Legacy` (plain `key: value`) delegate to `findL1Block`.

## Files changed in final version

| File | Change |
|------|--------|
| `lib/search.js` | `findL1Block()` with 3 fallbacks, exported |
| `lib/templates.js` | 6 functions: divs removed, `# Summary` / `# Details` |
| `lib/migrate.js` | Output without divs, `# Summary` / `# Details` |
| `templates/FORMAT.md` | SSOT updated to pure Markdown |
| `templates/refdoc.md` | Template without divs |
| `templates/log.md` | Template without divs |
| `test/search.test.js` | +3 positional tests (61 total) |

## CSS (unchanged)
`openclew init` still installs `openclew-preview.css` with `.oc-l1/l2/l3` classes. These target existing div-wrapped docs for backward compat. New docs don't use divs but still render cleanly — the list syntax and `---` separators provide sufficient visual structure.
