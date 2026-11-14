# Start Here: LAZY DevKit

This folder is the canonical documentation hub for LAZY DevKit (repository: LazyDevRblx).

## Read in this order

1. [Product vision](vision/PRODUCT-VISION.md): What this is, whom it serves, and what must stay true.
2. [Decision log](decisions/DECISION-LOG.md): Accepted constraints, proposals, open questions, and superseded ideas.
3. [Architecture](architecture/SYSTEM-ARCHITECTURE.md): Agents, local bridge, Studio plugin, desktop observer, capabilities, trust boundaries.
4. [Development roadmap](planning/SKELETON-FLESH-SKIN-ROADMAP.md): Sequence and V0 acceptance tests.
5. [Research and integrations](research/TOOL-AND-REFERENCE-STRATEGY.md): How to evaluate software and sources without overclaiming compatibility.

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
- `planning/`: Milestones, acceptance criteria, backlog and phased work.
- `research/`: References, technical evidence, alternatives, constraints.
- `architecture/`: Interfaces, security, data schemas and implementation designs.
- `decisions/`: Binding decisions and their rationale.

## Updating these files

When new evidence or testing changes a conclusion, record the evidence, update the affected decision and cross-references, and leave a brief note indicating what was superseded. Keep unresolved assumptions visible.

**Design status:** Initial proposal and approved direction synthesized from development conversations. **Build status:** Repository foundation only, not a working Studio integration.