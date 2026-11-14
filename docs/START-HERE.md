# Start Here: LAZY DevKit

This folder is the canonical documentation hub for LAZY DevKit (repository: LazyDevRblx).

## Read in this order

1. [Product vision](vision/PRODUCT-VISION.md): What this is, whom it serves, and what must stay true.
2. [Decision log](decisions/DECISION-LOG.md): Accepted constraints, proposals, open questions, and superseded ideas.
3. [Executable V0 README](../README.md): What has been implemented, how to run it, and what has **not** been tested.
4. [Studio verification checklist](V0-INTEGRATION-CHECKLIST.md): Manual integration tests that remain open.
5. [Phase 2 implementation](PHASE-2-IMPLEMENTATION.md): Bounded hierarchy snapshots, exact-span proposal rules, and what remains unverified.

Architecture, Skeleton → Flesh → Skin roadmap, and integration research were proposed as separate documents, but **have not been committed**. Do not treat those former link targets as existing sources of truth or create parallel copies without reviewing the repository.

## Source-of-truth rules

- Current confirmed decisions are in the decision log. Discussion and examples elsewhere are not automatically approved requirements.
- Explicitly distinguish **approved**, **proposed**, **experimental**, **blocked**, and **verified**. Mark implementation status separately from design status.
- Source code and passing tests determine what currently works. Documentation cannot substitute for a runtime verification.
- Never claim that Eclipse Animator, Moon Animator, Sine VFX, or any other third-party plugin is programmatically controllable until its particular workflow is tested.
- Prioritize the user's existing project, creative direction, and manual edits. Never overwrite unrelated work to satisfy a new prompt.
- The first deliverable is an inspect → reversible edit → observe → validate → approve or revert loop. Generative models and broad plugin compatibility come later.
- Keep LAZY DevKit independent from ORBIT! and other games. Existing games may be used as disposable integration fixtures, not absorbed as product dependencies.

## Documentation categories

- `vision/`: Problem, audience, quality bar, product identity.
- `decisions/`: Binding decisions and their rationale.
- `V0-INTEGRATION-CHECKLIST.md`: Unverified Studio integration gates.
- `planning/`, `research/`, `architecture/`: Reserved for future work; not present as of V0.

## Updating these files

When new evidence or testing changes a conclusion, record the evidence, update the affected decision and cross-references, and leave a brief note indicating what was superseded. Keep unresolved assumptions visible.

**Design status:** Initial approved direction and proposed work are recorded in the decision log. **Build status:** V0.2 Node MCP bridge, scoped proposal logic, structural snapshot contract and Node tests exist; Studio integration is unverified.
