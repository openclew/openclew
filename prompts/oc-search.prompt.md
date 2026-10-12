---
description: "Search project documentation by keyword"
argument-hint: "keyword to search for"
---

> If the `openclew` command is not found, run it through npx: `npx openclew <command>`.

Run `openclew search "${input:query:Search keyword}"` to find relevant docs.

Display the results. If docs are found, propose reading the most relevant one at L2 level (its `# Summary` section). If no results, suggest alternative keywords or propose creating a new doc with `openclew add ref "Title"`.
