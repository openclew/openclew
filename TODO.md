# TODO

- [ ] **Budget tokens knowledge injecté** : Le bloc [Project Knowledge] (L1 index + L2 auto-injectés) peut dépasser 10k tokens sur les gros projets. Mesurer le poids réel de chaque composant, fixer un budget max configurable (`.openclew.json`), prioriser ce qui entre dans le budget. Impacte R.AlphA.IDE `knowledgeProvider.ts` et `openclew inject`
- [ ] **Init sans friction** : Chaque projet nécessite `openclew init`. Décision : résoudre d'abord pour AlphABot (fichier d'instructions per-projet), puis voir pour les autres éditeurs
- [ ] **Parité port Rust** : Rust supporte init/index/mcp (3/12). Manque : add ref, add log, search, peek, checkout, status, migrate, session-header. Bloquant pour distribuer un binaire natif autosuffisant (no Node required). Cible : `cargo-dist` → releases GitHub multi-OS + `curl | sh` installer
- [ ] **Verbosité configurable** : Niveau concis/normal/détaillé dans `.openclew.json`, injecté dans le bloc AGENTS.md. Défaut concis ou choix forcé au setup
- [ ] **CLI migrate --move** : Déplacement atomique fichier + repoint refs. Ex: `openclew migrate --move doc/_FOO.md doc/ref/FOO.md [--write]`. Prioritaire maintenant que doc/ref/ est le défaut
- [ ] **Auto-génération L1** : Option `--auto` sur `new`/`log` — appel LLM pour pré-remplir `doc_brief` + `subject` depuis contenu L3
- [ ] **Tester onboarding post-init** : Vérifier le flow "Try it now" sur un projet vierge. Test en isolation `/tmp/openclew-test/`
- [ ] **Dogfooding — doc migration** : Un-gitignore `doc/log/`, traduire 21 logs FR → EN depuis R.AlphA.Doc, purger les refs internes
- [x] **Publish oc_0.7.0** : Format pur Markdown, parser positionnel, templates sans divs, préfixe `clw_ref@`/`clw_log@`, nommage `doc/ref/`, commande `migrate` incluse, détection coexistence Node/Rust (2026-04-10)
- [ ] **Session memory** : Extraction auto des faits importants en fin de session
- [ ] **Semantic search** : Embeddings locaux optionnels (pas de serveur)
- [x] **Intégration AlphABot** : knowledgeProvider.ts dans R.AlphA.IDE — L1/L2/L3, scan doc/, system prompt, lazy-load (2026-04-08)
- [ ] **Propagation doc_brief** : Propager doc_brief → doc_brief dans R.AlphA.Doc (templates, hooks, conventions globales)
- [ ] **Amendement de logs** : Prévoir une méthodologie pour modifier des logs existants (aujourd'hui immutables). Cas d'usage : info factuellement fausse, statut périmé, refs cassées. Approche envisagée : amend daté (section `## Amendement YYYY-MM-DD` en fin de log) pour garder la traçabilité sans figer des erreurs
- [ ] **npm publish oc_0.7.0** : Lancer `rocpublish` (login + OTP 2FA). Commit release prêt (a21822c)
- [x] **MAJ docs R.AlphA.Doc post-0.7.0** : 3 refdocs migrés au format clw_ref@ + chemins `doc/ref/` + cmds `add ref`/`add log`. Commit R.AlphA.Doc 5cf74fa (2026-04-14)
- [ ] **doc/_FORMAT.md fantôme dans git** : Le blob existe en objet loose (accessible via `git show HEAD:doc/_FORMAT.md`) mais n'est ni dans le tree HEAD ni dans l'index. Artefact probable d'un filter-branch. Investiguer et nettoyer
- [x] **Init pollue `.gitignore` avec `doc/log/`** : `openclew init` n'ajoute plus `doc/log/` au `.gitignore` par défaut. Opt-in via `--private-logs` pour repos publics. JS + Rust + UPGRADING.md (2026-04-17)
