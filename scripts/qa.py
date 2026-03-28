#!/usr/bin/env python3
"""Affiche la checklist QA openclew en box-drawing depuis _OPENCLEW_ONBOARDING_TEST.md"""

import re
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent.parent / "R.AlphA.Doc" / "doc" / "_OPENCLEW_ONBOARDING_TEST.md"

LEGEND = {
    "✓": "\033[32m✓\033[0m",
    "✗": "\033[31m✗\033[0m",
    "—": "\033[90m—\033[0m",
}

COLS = ["I", "R", "V", "👥"]
# 👥 is double-width in most terminals
COL_DISPLAY = {"👥": 2}


def parse_tables(text):
    """Parse markdown tables from section 7 (Checklist QA)."""
    m = re.search(r"## 7\. Checklist QA.*?\n(.*?)(?=\n## \d|<!-- L3_END -->)", text, re.DOTALL)
    if not m:
        sys.exit("Section 7 (Checklist QA) not found")
    body = m.group(1)

    rows = []
    current_section = None
    for line in body.splitlines():
        line = line.strip()
        if line.startswith("### "):
            current_section = line[4:].strip()
            continue
        if current_section and line.startswith("|") and not line.startswith("|--") and not line.startswith("|-"):
            cols = [c.strip() for c in line.split("|")[1:-1]]
            if len(cols) >= 5:
                header_words = ("Situation", "Scenario", "Impl", "Raph")
                if any(cols[0].startswith(h) for h in header_words):
                    continue
                rows.append((current_section, cols[0], cols[1], cols[2], cols[3], cols[4]))
    return rows


def render(rows):
    W_FEAT = 56
    W_COL = 3

    def h(cl, cm, cr):
        return f"{cl}{'─' * (W_FEAT + 2)}{cm}{'─' * (W_COL + 2)}{cm}{'─' * (W_COL + 2)}{cm}{'─' * (W_COL + 2)}{cm}{'─' * (W_COL + 2)}{cr}"

    def cell(val):
        val = val.strip()
        colored = LEGEND.get(val, val)
        # Emoji/symbol = 1 char display but may be multi-byte
        if val in LEGEND or val in ("✓", "✗", "—", ""):
            return colored.center(W_COL) if val else " " * W_COL
        return val[:W_COL].center(W_COL)

    def hdr_cell(label):
        """Header cell — accounts for double-width emoji."""
        extra = COL_DISPLAY.get(label, 0)
        pad = W_COL - len(label) - extra
        left = pad // 2
        right = pad - left
        return " " * left + label + " " * right

    def row(feat, c1, c2, c3, c4, bold=False, header=False):
        feat_clean = feat.replace("`", "")
        if len(feat_clean) > W_FEAT:
            feat_clean = feat_clean[:W_FEAT - 1] + "…"
        f = feat_clean.ljust(W_FEAT)
        if bold:
            f = f"\033[1m{f}\033[0m"
        if header:
            return f"│ {f} │ {hdr_cell(c1)} │ {hdr_cell(c2)} │ {hdr_cell(c3)} │ {hdr_cell(c4)} │"
        return f"│ {f} │ {cell(c1)} │ {cell(c2)} │ {cell(c3)} │ {cell(c4)} │"

    print(h("┌", "┬", "┐"))
    print(row("Situation", COLS[0], COLS[1], COLS[2], COLS[3], bold=True, header=True))
    print(h("├", "┼", "┤"))

    prev_section = None
    for section, feat, c1, c2, c3, c4 in rows:
        if section != prev_section:
            if prev_section is not None:
                print(f"│{' ' * (W_FEAT + 2)}│{' ' * (W_COL + 2)}│{' ' * (W_COL + 2)}│{' ' * (W_COL + 2)}│{' ' * (W_COL + 2)}│")
            print(row(section.upper(), "", "", "", "", bold=True))
            prev_section = section
        print(row(feat, c1, c2, c3, c4))

    print(h("└", "┴", "┘"))

    # Stats
    total = len(rows)
    done_i = sum(1 for r in rows if r[2].strip())
    done_r = sum(1 for r in rows if r[3].strip())
    done_v = sum(1 for r in rows if r[4].strip())
    done_o = sum(1 for r in rows if r[5].strip())
    print(f"\n\033[1m{total} situations\033[0m  I:{done_i}  R:{done_r}  V:{done_v}  👥:{done_o}")

    # Legend
    print(f"\n\033[90mLégende : ✓ = validé, ✗ = échoué, vide = non testé\033[0m")
    print(f"\033[90mI = Impl  R = Raphaël  V = Victor  👥 = Autres\033[0m")


if __name__ == "__main__":
    if not SRC.exists():
        sys.exit(f"Source not found: {SRC}")
    text = SRC.read_text()
    rows = parse_tables(text)
    if not rows:
        sys.exit("No rows found in checklist tables")
    render(rows)
