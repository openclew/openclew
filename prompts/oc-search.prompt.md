---
description: "Search project documentation by keyword"
argument-hint: "keyword to search for"
---

Run `npx openclew search "${input:query:Search keyword}"` to find relevant docs.

Display the results. If docs are found, propose reading the most relevant one at L2 level (between L2_START/L2_END markers). If no results, suggest alternative keywords or propose creating a new doc with `npx openclew new "Title"`.
