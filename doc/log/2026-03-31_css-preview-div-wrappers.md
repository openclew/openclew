openclew@0.6.0 · date: 2026-03-31 · type: Feature · status: Done · category: Format · keywords: [css, preview, markdown, div, l1, l2, l3, vscode, positional-parser]

- **subject:** Évolution du format L1 — des commentaires HTML aux divs puis au Markdown pur
- **doc_brief:** Des wrappers `<div class="oc-l1">` ont été testés pour rendre L1 ciblable en CSS dans l'aperçu VS Code. Cela fonctionnait, mais introduisait un piège de ligne vide et du HTML que les bots ne produisent pas naturellement. Remplacés par du Markdown pur (éléments de liste entre la ligne 1 et le premier `---`). Le parser supporte les 3 formats via un repli positionnel.

---

# Summary

## Objectif
Rendre les docs openclew lisibles dans l'aperçu Markdown de VS Code. Les métadonnées L1 s'écrasaient en un mur de texte, car les commentaires HTML sont retirés du DOM et les retours à la ligne simples sont ignorés par Markdown.

## Problème
- Les commentaires `<!-- L1_START -->` sont invisibles dans le Markdown rendu — aucune prise pour le style
- Les paragraphes `**subject:** ...` fusionnaient en un seul bloc dans l'aperçu
- Aucun moyen de distinguer visuellement les sections L1/L2/L3

## Approche 1 : wrappers div (testée, non retenue)
- Commentaires HTML remplacés par des wrappers `<div class="oc-l1/l2/l3">` — ciblables en CSS
- Champs L1 passés en syntaxe de liste Markdown (`- **subject:** ...`) — chaque champ sur sa propre ligne
- CSS (`openclew-preview.css`) : `.oc-l1` = carte bleue, `.oc-l2` = bordure verte, `.oc-l3` = bordure grise

**Pourquoi c'était intéressant :**
- Le CSS pouvait cibler des sections précises pour le style visuel
- Donnait une hiérarchie visuelle claire dans l'aperçu VS Code

**Pourquoi c'a été abandonné :**
- **Piège de la ligne vide** : CommonMark exige une ligne vide après `<div>` et avant `</div>` pour que le Markdown à l'intérieur soit parsé. Facile à oublier, échec silencieux — le contenu s'affiche en texte brut.
- **Les bots écrivent du Markdown, pas du HTML** : openclew cible les agents IA comme utilisateurs principaux. Leur demander de produire `<div class="oc-l1">` ajoute de la friction sans bénéfice structurel.
- **Le vrai correctif était la syntaxe de liste**, pas les divs. Passer de paragraphes (`**subject:** ...`) à des éléments de liste (`- **subject:** ...`) est ce qui a résolu le problème du mur de texte. Les divs n'étaient qu'un véhicule.

## Approche 2 : Markdown pur (retenue)
- Aucun wrapper — L1 = éléments de liste entre la ligne 1 (métadonnées) et le premier `---`
- Titres `# Summary` et `# Details` (sans préfixe « L2 »/« L3 »)
- Le parser utilise une extraction positionnelle : `findL1Block()` avec repli à 3 niveaux (div → commentaires → positionnel)
- L'aperçu CSS fonctionne toujours pour les docs existants avec wrappers div (rétrocompatibilité)

## Format final
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

## Parser : findL1Block() — repli à 3 niveaux
1. `<div class="oc-l1">...</div>` — format div (legacy)
2. `<!-- L1_START -->...<!-- L1_END -->` — format commentaire (le plus ancien)
3. **Positionnel** — lignes entre la ligne 0 (métadonnées) et le premier `---` (défaut actuel)

`parseL1` (syntaxe en gras `**key:**`) et `parseL1Legacy` (`key: value` simple) délèguent tous deux à `findL1Block`.

## Fichiers modifiés dans la version finale

| Fichier | Changement |
|------|--------|
| `lib/search.js` | `findL1Block()` avec 3 replis, exportée |
| `lib/templates.js` | 6 fonctions : divs retirées, `# Summary` / `# Details` |
| `lib/migrate.js` | Sortie sans divs, `# Summary` / `# Details` |
| `templates/FORMAT.md` | SSOT mis à jour en Markdown pur |
| `templates/refdoc.md` | Template sans divs |
| `templates/log.md` | Template sans divs |
| `test/search.test.js` | +3 tests positionnels (61 au total) |

## CSS (inchangé)
`openclew init` installe toujours `openclew-preview.css` avec les classes `.oc-l1/l2/l3`. Elles ciblent les docs existants à wrappers div pour la rétrocompatibilité. Les nouveaux docs n'utilisent pas de divs mais s'affichent tout de même proprement — la syntaxe de liste et les séparateurs `---` fournissent une structure visuelle suffisante.
