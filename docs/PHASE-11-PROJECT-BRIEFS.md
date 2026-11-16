# Phase 11: Session-local project briefs and resource provenance (V1.3)

## What changed

V1.2 competency planning could select disciplines, shape a development plan, attach official documentation, and identify quality evidence gaps. But each new task started without **explicit project history, creative identity, and preserved decisions**. V1.3 adds a small, deterministic input bridge for that context, rather than inventing what the agent should remember.

The brief is **user-supplied planning data**, not a project file read, source-of-truth enforcement mechanism, instruction to bypass permissions, or model memory. The current daemon retains a bounded number of briefs in memory and drops all of them at restart.

## New MCP tools

- `lazydev_create_project_brief`: create one immutable brief from deliberate supplied fields
- `lazydev_list_project_briefs`: list project label, brief ID, style and counts
- `lazydev_read_project_brief`: read the full user-authored brief (including linked source URLs)

There are now **30 MCP tools** total. No new Studio plugin controls or privileged actions are added.

The optional fields of a brief are `creativeDirection`, `style`, `preserve`, `avoid`, `constraints`, `referenceIds`, and `sourceLinks`; `projectName` is required. Text and arrays are bounded, duplicates are rejected, and unexpected keys are refused. Up to 16 briefs are retained per daemon session. To change an old brief, create a new one with a new ID. An existing plan remains a frozen snapshot.

### Example

```json
{
  "projectName": "Example gravity adventure",
  "creativeDirection": "Angular shapes, readable silhouettes and cosmic materials",
  "style": "hybrid",
  "preserve": ["Keep existing movement controls", "Preserve original character designs"],
  "avoid": ["Generic unmotivated energy explosions"],
  "constraints": ["Gameplay readable from the usual camera distance"],
  "sourceLinks": [{
    "title": "Technical VFX reference",
    "url": "https://example.com/effects",
    "kind": "tutorial",
    "rightsClaim": "reference_only",
    "note": "Use principles, not a direct asset copy"
  }]
}
```

After creating the brief, copy its `briefId` into `lazydev_plan_competency_task` as `projectBriefId`. Task-specific `style` and `styleNotes` override the brief's defaults, while `projectContext` retains the user-supplied direction, preservation rules, constraints, reference IDs and provenance in the resulting plan.

The standalone offline CLI still supports plans **without** projectBriefId. It does not silently connect to a daemon or accept a brief ID it cannot resolve. Imported reference IDs must be available in the active `ReferenceStore` when a brief is created. Expiring imports later does not magically re-import the media.

## Source truth and licensing boundaries

User-supplied `sourceLinks` accept bounded HTTPS URLs with no embedded username/password. They are **not opened, downloaded, inspected, vetted for relevance, validated against current documentation, or verified for licensing**. Every such link is marked:
- `provenance: user_supplied_link`
- `retrievalStatus: not_fetched`
- `rightsVerification: not_independently_verified`

A `rightsClaim` of `user_claims_permission` is still just a *claim*. It does not authorize rehosting or copying another creator's media. Official Creator Hub links retain their separate curated provenance, checked dates and limitations. Untrusted project text and linked site contents are not operational instructions.

This release introduces no web crawler or unrestricted file access, no automatic asset downloads, no new plugin integrations, and no permanent memory. The agent should use actual web/docs research for questions about current source validity and cite the material it read; a plan by itself cannot substitute for research.

## Quality and missing integration

Project briefs improve **decision consistency**, not automatic visual quality. Existing skill gates still need real snapshots, test outcomes and, when applicable, audio/device/performance instruments that are not implemented. The quality assessment still returns `not_assessed` until someone explicitly evaluates actual work; no gate passes merely because a brief or resource exists.

V1.3 Node tests check field validation, stale/nonexistent imported references, provenance/rights labeling, project style override precedence, plan immutability and prior bridge compatibility. An actual ChatGPT/Claude/Codex workflow that creates, reuses and reviews a brief must still be tested in the installed host.

## Next substantial work

Add a deliberate **project export/import** or versioned manifest (with user consent), then live resource sourcing and actual quality-review instruments. Keep resource provenance, rights and credibility separate from aesthetic choices. No project identity should be invented or silently replaced.
