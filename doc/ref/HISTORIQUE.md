clw_ref@0.10.1 · created: 2026-10-13 · updated: 2026-10-13 · doc_version: 1.0.0 · type: Reference · status: Active · category: Projet · keywords: [historique, naming, clew, ariane, publication, npm, licence, format, l1, doc_brief, clw_ref, ref, refdoc, versions]

- **subject:** Historique d'openclew — origine du nom, publication, évolution du format et jalons de versions
- **doc_brief:** openclew est issu d'une méthodologie de documentation interne, publiée sous ce nom (open + OpenClaw + clew) en Apache 2.0 sur GitHub et npm. Son format a convergé vers des métadonnées en ligne 1, un L1 réduit à `subject` + `doc_brief` en Markdown pur, des préfixes `clw_ref@`/`clw_log@` et des refs dans `doc/ref/`.

---

# Summary

## Objectif
Garder la trace des décisions produit structurantes et de leur raison, pour éviter de les rouvrir. Le détail des versions est dans `CHANGELOG.md` ; le format courant dans `doc/ref/FORMAT.md`.

## Points clés
- **Nom** : open (open source) + OpenClaw (agent IA) + **clew** (pelote de fil d'Ariane, étymologie de « clue »). Tagline « Long Life Memory for LLMs », punchline « Your agent forgets. Your project remembers. »
- **Publication** : org GitHub `openclew`, dépôt `openclew/openclew`, paquet npm `openclew`. Licence MIT au départ, **Apache 2.0** depuis 0.5.0.
- **Format** : métadonnées condensées en ligne 1 ; L1 = `subject` + `doc_brief` uniquement ; L2/L3 = `# Summary` / `# Details` ; préfixes catégoriels `clw_ref@`/`clw_log@` ; refs dans `doc/ref/`. SSOT : `templates/FORMAT.md`.
- **Terminologie** : `living doc` → `refdoc` → `ref`.
- **Rétrocompatibilité** : chaque changement de format garde un parser de repli ; les anciennes docs restent lisibles, la migration est progressive (`openclew migrate`).

---

# Details

## 1. Origine et nom

openclew est issu d'une méthodologie de documentation interne (docs en 3 niveaux L1/L2/L3 lisibles par humains et agents), extraite pour être publiée.

| Candidat | Verdict |
|---|---|
| `living-memory` | Nom de travail, abandonné : générique, pris sur npm |
| `ariane` | Abandonné : pris sur npm et GitHub |
| `clew` | Pris sur npm (paquet CSS abandonné) |
| `openclew` | **Retenu** : disponible sur npm et GitHub |

Le sens : dans le mythe, Ariane donne à Thésée un *clew* (pelote de fil) pour sortir du labyrinthe. Ce n'est ni une carte ni un moteur de recherche, mais un fil continu entre où l'on était et où l'on est — le problème visé est la **navigation** dans la connaissance du projet, pas son stockage. L1 répond à la question « Should I read this? » au lieu d'un pattern matching sur le contenu.

## 2. Publication

| Étape | Décision |
|---|---|
| Réservation | Org GitHub `openclew`, dépôt public `openclew/openclew`, `openclew@0.0.1` publié comme placeholder npm |
| Préparation | README réécrit (métaphore du fil, efficience tokens de L1) ; audit de confidentialité des fichiers publics ; exemples fictifs marqués `[EXAMPLE]` |
| Historique git | Historique de développement condensé en quelques commits propres avant la publication ; fichier d'instructions interne purgé de l'historique et ignoré |
| Dogfooding | `AGENTS.md` à la racine du dépôt : openclew documente openclew |
| 0.3.0 | Première version npm utilisable : logo, métadonnées npm (`author`, `contributors`, `homepage`, `bugs`), champ `files` explicite |
| Licence | MIT → **Apache 2.0** (protection brevets et marque, alignement sur des projets d'agents open source comparables) |

Crédits publics : voir `package.json` (`author`, `contributors`). Le logo v1 provient d'un contributeur listé.

Logs de session : d'abord ignorés par git (« personnels ») ; `init` les versionne par défaut depuis 0.9.x, avec `--private-logs` pour les dépôts publics. Voir `doc/ref/INIT.md`.

## 3. Évolution du format

| Étape | Avant | Après | Pourquoi |
|---|---|---|---|
| Ligne 1 (0.2.x) | L1 mêlant métadonnées et contenu, « mur de texte » | Métadonnées condensées en ligne 1 (`version · date · type · status · category · keywords`) | Séparer l'indexation machine du contenu humain |
| L1 | Toutes les clés | `subject` + `doc_brief` seulement | `doc_brief` est greppable et sans collision avec le mot courant « brief » ; c'est une assertion, pas une narration |
| SSOT format | Format implicite, deux variantes coexistantes | `templates/FORMAT.md` = spécification unique | Templates, parsers et port Rust s'y conforment |
| Syntaxe L1 (0.4.0) | `key: value` | `**key:** value` ; YAML frontmatter abandonné ; headers anglais sans emoji | Lisibilité en rendu Markdown |
| Enveloppe L1 (0.6.0) | Commentaires HTML `<!-- L1_START -->`, puis divs HTML | Liste Markdown pure entre la ligne 1 et le premier `---` (parser positionnel) | Les commentaires disparaissent du rendu ; les divs créaient un piège de ligne vide et les agents ne produisent pas naturellement du HTML. Détail : `doc/log/2026-03-31_css-preview-div-wrappers.md` |
| Headers (0.6.0) | `# L2 - Summary` / `# L3 - Details` | `# Summary` / `# Details` | Plus courts ; le parser s'appuie dessus |
| Préfixe (0.7.0) | `openclew@` | `clw_ref@` / `clw_log@` | Le préfixe encode le type de doc |
| Emplacement des refs (0.7.0) | `doc/_*.md` | `doc/ref/*.md` (legacy toujours détecté) | Séparation nette refs / logs |
| `doc_version` | — | Champ semver de contenu (refs seulement) | `clw_ref@` porte la version du **format**, immuable hors migration ; `doc_version` porte la version du **contenu** |

## 4. Terminologie

| Date / version | Renommage |
|---|---|
| Avant publication | `living doc` → `refdoc` (`templates/living.md` → `templates/refdoc.md`) |
| 0.8.0 | `refdoc` → `ref` côté utilisateur (templates, commandes, README) ; `templates/ref.md` |
| 0.9.0 | `ref` dans le code interne et le port Rust ; MCP `list_docs` : `{kind: "ref"}` (rupture pour les clients passant `kind: "refdoc"`) |
| Conservé | `lib/migrate.js` reconnaît encore `refdoc` (son rôle est de lire le legacy) |

## 5. Jalons de versions

Préfixe de version `oc_`. Détail exhaustif : `CHANGELOG.md`.

| Version | Jalon |
|---|---|
| 0.1.0 | Dépôt initial : FORMAT, templates, README |
| 0.2.0 | CLI complète (`init`, `add`, `checkout`), détection du point d'entrée, injection entre marqueurs |
| 0.3.0 | `search`, `status`, serveur MCP ; zéro Python (index en JS) ; skills `oc-*` ; première publication npm |
| 0.4.0 | `migrate` ; métadonnées en ligne 1, L1 en gras |
| 0.5.x | `peek`, garde-fou projet, config globale `~/.openclew/`, Apache 2.0, prompts Copilot (projet puis utilisateur), `--version` |
| 0.6.0 | L1 en Markdown pur, `# Summary`/`# Details`, notification de mise à jour, tests automatisés |
| 0.7.0 | `clw_ref@`/`clw_log@`, `doc/ref/`, bloc injecté restructuré (MCP d'abord, « IMPORTANT »), début du port Rust |
| 0.8.0 – 0.9.0 | Renommage `refdoc` → `ref` (utilisateur puis code) |
| 0.10.x | `doc_version`, traçabilité des TODO (`from`/`closed`), port Rust étendu (parité Node ↔ Rust vérifiée par fixtures) |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-10-13 | Création (condensé de l'historique interne) |
