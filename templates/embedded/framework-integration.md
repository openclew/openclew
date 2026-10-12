clw_ref@{{VER}} · created: {{DATE}} · updated: {{DATE}} · doc_version: 1.0.0 · type: Guide · status: Active · category: Integration · keywords: [BMAD, Spec Kit, Kiro, workflow, framework, integration]

- **subject:** How to use openclew with workflow frameworks (BMAD, Spec Kit, Kiro...)
- **doc_brief:** openclew handles knowledge, your framework handles process. Covers concrete use cases, integration patterns, and what goes where. Works with any spec-driven methodology.

---

# Summary

## The split

Workflow frameworks (BMAD, Spec Kit, Kiro...) solve: *"my agent doesn't follow a process."*
openclew solves: *"my agent forgets everything between sessions."*

They're complementary. Use both.

| Your framework does | openclew does |
|---------------------|---------------|
| Structures the workflow (who does what, in what order) | Structures the knowledge (what to remember, where to find it) |
| Produces artifacts (PRD, architecture, stories, retro) | Persists them so they're found automatically next session |
| Scoped to one sprint/feature | Scoped to the lifetime of the codebase |

## Use cases

### UC1 — PRD forgotten after creation

You create a PRD with your framework. Two weeks later, a new session starts. The agent doesn't know the PRD exists.

**With openclew:** The PRD is persisted as `doc/ref/PRD_AUTH.md` (L1 scannable). The agent scans the index at session start and finds it automatically.

### UC2 — Sprint decisions lost

Three stories completed in a sprint. Decisions were made (API design, tradeoffs, rejected approaches). They live in chat history — gone.

**With openclew:** Each completed story produces a log (`doc/log/YYYY-MM-DD_story-auth-flow.md`). Immutable. When the project resumes, the agent sees what was decided and why.

### UC3 — Retrospective lessons not reused

Your framework runs a retro. Lessons are identified. They go into an output file that nobody reads again.

**With openclew:** Lessons go into `doc/ref/LESSONS_LEARNED.md` — a living ref, updated after each retro. Future sprints consult it automatically via the index.

### UC4 — New teammate onboarding

A new developer (or a new agent session) joins mid-project. No context.

**With openclew:** Run `openclew peek` → scan L1s → read L2s of relevant docs → full context in minutes. Same docs for humans and agents.

### UC5 — Framework needs project context

Your framework's agents (PM, Architect, Dev) start from generic prompts. They don't know your project's conventions, architecture, or past decisions.

**With openclew:** Point your framework's knowledge config at `doc/`. Agents read refs as context before producing artifacts.

---

# Details

## Integration pattern

```
Framework (process)              openclew (knowledge)
───────────────────              ────────────────────
Create PRD            →          Save as doc/ref/PRD_FEATURE.md
Architecture design   →          Save as doc/ref/ARCHITECTURE.md
Sprint planning       →          Log as doc/log/YYYY-MM-DD_sprint-N.md
Story completed       →          Log as doc/log/YYYY-MM-DD_story-ID.md
Retrospective         →          Update doc/ref/LESSONS_LEARNED.md
───────────────────              ────────────────────
Next sprint starts    ←          Agent reads index, finds all of the above
```

## Mapping: framework artifacts → openclew docs

| Framework artifact | openclew type | Naming | Mutability |
|--------------------|---------------|--------|------------|
| PRD | Ref | `doc/ref/PRD_FEATURE.md` | Updated as requirements evolve |
| Architecture decision | Ref | `doc/ref/ARCHITECTURE.md` | Updated as design evolves |
| Sprint plan | Log | `doc/log/YYYY-MM-DD_sprint-N.md` | Frozen (snapshot of the plan) |
| Completed story | Log | `doc/log/YYYY-MM-DD_story-ID.md` | Frozen (what was done) |
| Retrospective | Log + Ref | Log for the session, ref for accumulated lessons | Log frozen, ref updated |
| Tech spec | Ref | `doc/ref/SPEC_FEATURE.md` | Updated until implemented |

## BMAD-specific integration

BMAD uses a `project_knowledge` config that points agents to project context. Point it at `doc/`:

```yaml
# _bmad/bmm/config.yaml
project_knowledge: doc/
```

BMAD agents (PM, Architect, Dev, QA) will read openclew docs as context before producing artifacts.

## What openclew does NOT do

- Does not replace your framework's workflow or personas
- Does not impose a development process
- Does not require any specific framework — works standalone

---

## Changelog

| Date | Change |
|------|--------|
| {{DATE}} | Created by openclew init |
