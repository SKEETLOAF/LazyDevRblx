# Phase 10: Development Competency System (V1.2)

## Purpose

Build a general Roblox development assistant that uses **skills, resource selection, art direction, maintainable asset boundaries and evidence-based quality criteria** across modeling, environments, animation, VFX, SFX, UI/HUD, Luau and game design.

This phase provides a **working deterministic planner and evidence presence checker**, not autonomous Blender manipulation or an expert vision model. It makes missing expertise and missing evidence explicit rather than giving every output a fabricated grade.

## Implemented now

- `src/competency/catalog.mjs`: eight portable skill profiles with practical methods, failure modes, scoped quality gates and a **curated Roblox Creator Hub resource catalog**. Current URLs were independently checked against public documentation on **November 16, 2026**; future availability is not checked at each request. These are documentation links, not a licensed asset pool.
- `src/competency/engine.mjs`: strict bounded inputs, optional explicit disciplines and style, disclosed keyword inference, appropriate asset-kind decomposition, gate specification, ephemeral plan storage and evidence-only assessment.
- `skills/development-competency/SKILL.md` and eight focused companion skills: task-grounded instructions for build methods, anti-pattern avoidance, tool limitations and review evidence.
- `scripts/plan-competency.mjs`: **runs locally without Studio, a token or a daemon**.
- Four read-only MCP tools: `lazydev_list_competencies`, `lazydev_plan_competency_task`, `lazydev_read_competency_plan`, `lazydev_assess_competency_plan` (27 tools in total). They never apply changes, install plugins, read arbitrary files, download assets or perform external network searches.

## How to use today

```sh
npm run competency:plan -- "Create a modular house with an editable roof and a separate yard" --style bloxy --asset-kind building --disciplines building,modeling
npm run competency:plan -- "Build a creature attack with animation, VFX, audio, HUD feedback and server validation" --style anime --asset-kind ability
npm run competency:plan -- --list
```

The local CLI prints the route, selected skills, asset components and reasons, art-direction notes, curated docs and per-domain verification requirements as JSON. This is useful before the full Studio plugin has been runtime verified.

With a connected MCP client:

1. Ask `lazydev_list_competencies` for valid names, styles, asset kinds.
2. Invoke `lazydev_plan_competency_task` with the concrete task; specify disciplines instead of accepting keyword inference where important. The input accepts `task`, `disciplines`, `style`, `assetKind` and `styleNotes`.
3. Read the returned plan, resolve missing style direction, follow appropriate domain skill instructions, and use **actual connected tools** for editing. The plan itself never makes edits.
4. Obtain approved structural/visual/playtest observations, then call `lazydev_assess_competency_plan` with `planId` and `evidence` records: `{gateId,kind,id}`.
5. Examine the evidence itself and record which criteria are met, unmet or unknown. The tool reports **ready_for_review**, **evidence_missing**, or **instrumentation_unavailable**, but always `qualityVerdict: not_assessed`.

### Example boundary: a house

A property may contain a house, a yard and paths. The house may contain independently replaceable walls, roof, windows, doors and interior elements. Grouping in Roblox Explorer does **not** imply joining those pieces as a single mesh. Neither does every group need to become a separate mesh if topology or performance justifies shared geometry. The plan is a responsibility map rather than a mandatory hierarchy.

### Example boundary: an ability

Treat authoritative gameplay validation, rig animation, VFX modules, sound, camera/HUD cues, cleanup and performance checks as distinct but coordinated responsibilities. One failsafe can prevent cosmetic effects from controlling game state. Use official Studio MCP for supported native operations and the approved DevKit bridge for reviewed changes and evidence.

## Style intelligence

Profiles include **bloxy, voxel, toy, stylized, anime-inspired, realistic, hybrid and unspecified**. They are descriptions of shape/material/motion conventions, not automatic geometry generators or a default LAZY style. If style is unspecified, the returned plan must surface that gap. A hybrid needs reference-led decisions rather than averaging arbitrary presets.

## Evidence and honesty

The existing bridge can verify session-scoped IDs for manually shared `viewport`, `structure`, `sequence`, `reference`, `playtest`, `diagnostics`, and `observation`. These only establish **presence of evidence** in the currently running daemon.

Current missing instruments: `audio` listening/waveform inspection, `performance` profiling counters, `device` viewport/controller testing and `gameplay-data` representative balance telemetry. These gates are **instrumentation_unavailable**, not passed. Any style, rig quality, functional correctness, copyright-safe sourcing or security claim requires reviewing the relevant evidence and, where appropriate, a human or real test.

All task text, asset names and reference labels are untrusted data. Nothing in an imported file or tool response should be executed as agent instructions. The tool never uploads local files, accesses credentials, installs packages, controls Eclipse/Moon/Sine, or guesses whether a user owns a plugin.

## Future work after verifying this phase

1. Real Studio compatibility testing for V0.4–V1.1 and supported native MCP host interoperability.
2. Project-local style/reference manifests and a searchable, revisioned resource library with provenance/license review.
3. Quality review instruments for audio, device UI, performance, rig topology and animation playback.
4. Safe executable Blender/Rojo/Studio operations with checkpoints and iterative visual inspection.
5. A coordinator that can activate skills, retrieve *live* technical references, perform authorized edits, observe actual results and propose scoped improvements.

**Verification note:** Node tests validate plan generation, strict inputs, no duplicate domains, honest evidence results, ephemeral storage, CLI output and existing MCP compatibility. They do not prove that an AI learned modeling or can operate the user's installed plugins.
