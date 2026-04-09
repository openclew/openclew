# TODO

- [ ] **Budget tokens knowledge injecté** : Le bloc [Project Knowledge] (L1 index + L2 auto-injectés) peut dépasser 10k tokens sur les gros projets. Mesurer le poids réel de chaque composant, fixer un budget max configurable (`.openclew.json`), prioriser ce qui entre dans le budget. Impacte R.AlphA.IDE `knowledgeProvider.ts` et `openclew inject`
- [ ] **Init sans friction** : Chaque projet nécessite `openclew init`. Décision : résoudre d'abord pour AlphABot (fichier d'instructions per-projet), puis voir pour les autres éditeurs
- [ ] **Verbosité configurable** : Niveau concis/normal/détaillé dans `.openclew.json`, injecté dans le bloc AGENTS.md. Défaut concis ou choix forcé au setup
- [ ] **CLI migrate --move** : Déplacement atomique fichier + repoint refs. Ex: `openclew migrate --move doc/_FOO.md doc/ref/FOO.md [--write]`
- [ ] **Auto-génération L1** : Option `--auto` sur `new`/`log` — appel LLM pour pré-remplir `doc_brief` + `subject` depuis contenu L3
- [ ] **Tester onboarding post-init** : Vérifier le flow "Try it now" sur un projet vierge. Test en isolation `/tmp/openclew-test/`
- [ ] **Dogfooding — doc migration** : Un-gitignore `doc/log/`, traduire 21 logs FR → EN depuis R.AlphA.Doc, purger les refs internes
- [ ] **Publish oc_0.7.0** : Format pur Markdown, parser positionnel, templates sans divs, préfixe `clw_ref@`/`clw_log@`, nommage `doc/ref/`, commande `migrate` incluse, détection coexistence Node/Rust
- [ ] **Session memory** : Extraction auto des faits importants en fin de session
- [ ] **Semantic search** : Embeddings locaux optionnels (pas de serveur)
- [ ] **Intégration AlphABot** : Implémenter la lecture L1/L2/L3 côté extension VS Code (R.AlphA.IDE)
- [ ] **Propagation doc_brief** : Propager doc_brief → doc_brief dans R.AlphA.Doc (templates, hooks, conventions globales)
