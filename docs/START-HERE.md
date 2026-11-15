# Start Here: LAZY DevKit

This folder is the canonical documentation hub for LAZY DevKit (repository: LazyDevRblx).

## Read in this order

1. [Product vision](vision/PRODUCT-VISION.md): What this is, whom it serves, and what must stay true.
2. [Decision log](decisions/DECISION-LOG.md): Accepted constraints, proposals, open questions, and superseded ideas.
3. [Executable V0 README](../README.md): What has been implemented, how to run it, and what has **not** been tested.
4. [Studio verification checklist](V0-INTEGRATION-CHECKLIST.md): Manual integration tests that remain open.
5. [Phase 2 implementation](PHASE-2-IMPLEMENTATION.md): Bounded hierarchy snapshots, exact-span proposal rules, and what remains unverified.
6. [Desktop connection](DESKTOP-CONNECTION.md): Experimental multi-client MCP packaging, shared daemon, token handoff, and Windows PC setup.
7. [Phase 3 Instance actions](PHASE-3-INSTANCE-ACTIONS.md): Allowlisted, previewed Instance creation/property edits and remaining Studio tests.
8. [Phase 4 diagnostics](PHASE-4-DIAGNOSTICS.md): Opt-in read-only Output warnings and errors, privacy boundaries, and verification.
9. [Phase 5 Play/Run reports](PHASE-5-PLAYTEST-REPORTS.md): User-launched test sessions with reviewable evidence, native Studio Test API, and limitations.
10. [Phase 6 viewport observation](PHASE-6-VIEWPORT-OBSERVATION.md): User-permissioned screenshots, local exact-frame preview, bounded image transfer and MCP compatibility.
11. [Phase 7 specialist interoperability](PHASE-7-SINE-AND-NATIVE-MCP.md): Read-only Sine runtime checks, official Studio MCP coexistence, Eclipse interchange and verification boundaries.
12. [Phase 8 reference analysis](PHASE-8-REFERENCES-AND-QUALITY.md): Local still-image/GIF imports, measurable timing and visual properties, and evidence-first quality assessment.

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

**Design status:** Initial approved direction and proposed work are recorded in the decision log. **Build status:** V0.3 script read/approve/Undo/Redo tested by user in Windows Studio. V0.4 Instance actions, V0.5 Output diagnostics, V0.6 Play/Run reports, and V0.7 viewport image capture/transfer and V0.8 Sine runtime inspection/official-MCP preflight and V0.9 still-image/GIF reference analysis implemented with Node tests; these newer Studio workflows remain unverified in Studio or specific MCP hosts.
