# Onboarding openclew — Flow

## Principe

L'onboarding openclew guide un utilisateur pour structurer la documentation de son projet.
Le résultat minimum = un `doc/` avec au moins un refdoc (`doc/_*.md`), découvrable par `openclew peek`.

## Détection

| Signal | Résultat |
|--------|----------|
| `.openclew.json` existe | Projet configuré → pas d'onboarding |
| `doc/_*.md` existe | Projet configuré → pas d'onboarding |
| `doc/_*.md` existe (sans _INDEX) | Projet partiel → proposer complétion |
| Rien | Projet vierge → proposer setup complet |

## Étapes

### 1. Détection automatique (client)

Au lancement, le client IDE scanne le workspace :
- Cherche `.openclew.json` ou `doc/_*.md`
- Si absent → affiche un CTA "Configurer la documentation projet"
- Si présent → flow normal (enrichissement L1/L2)

### 2. Scaffold (bot-guided)

Quand l'utilisateur accepte, le bot :
1. Crée `doc/` si absent
2. Scanne les fichiers existants (README, code, config) pour comprendre le projet
3. Crée un premier refdoc (`doc/_ARCHITECTURE.md`) avec les métadonnées détectées
4. Propose un premier refdoc (`doc/_ARCHITECTURE.md` ou similaire) basé sur ce qu'il a détecté

### 3. Validation

Le bot montre le résultat et demande confirmation. L'utilisateur peut :
- Accepter tel quel
- Demander des modifications
- Ajouter d'autres refdocs

### 4. Complétion

L'onboarding est marqué `completed` pour ce workspace. Le knowledge provider prend le relais normalement.

## Déclenchement

| Méthode | Quand |
|---------|-------|
| Automatique | Premier message dans un projet sans openclew |
| Manuel | Slash command `/setup` |
| Re-déclenchement | `/setup` fonctionne même si déjà complété (pour ajouter des docs) |

## Prompt bot

Le bot reçoit un contexte enrichi qui l'instruit de :
1. Lister les fichiers du projet (via `list_files`)
2. Identifier le langage principal, le framework, la structure
3. Créer les refdocs initiaux avec les métadonnées détectées
4. Proposer 1-3 refdocs pertinents selon le type de projet
