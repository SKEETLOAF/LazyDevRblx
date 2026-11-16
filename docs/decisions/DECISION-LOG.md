# LAZY DevKit: Decision Log

**Important:** 'Accepted direction' means product direction, not evidence of implemented functionality.

| ID | Status | Decision and rationale |
| --- | --- | --- |
| D-001 | Accepted direction | Separate public repository `SKEETLOAF/LazyDevRblx`, independent from ORBIT! and game-specific vaults. |
| D-002 | Accepted direction | Build a **model-independent agent enhancement** first, with a Roblox Studio plugin and optional local desktop bridge; don't train or resell an AI model. |
| D-003 | Accepted direction | Serve existing projects and new projects. Preserve user-authored work, naming, architecture and chosen creative identity. |
| D-004 | Accepted direction | Give agents both structural and visual observation; verification happens during creation, not only at the end. |
| D-005 | Accepted direction | AI provides independently reasoned planning, constructive disagreement, varied alternatives and reference-grounded comparisons; no mandatory '3 or 5 choices' format. |
| D-006 | Accepted direction | Use Skeleton → Flesh → Skin as a flexible development lens, with visual identity considered from the start. |
| D-007 | Accepted direction | Prefer supported Studio MCP and documented APIs over duplicated capability; third-party plugin control is conditional on tested interoperability. |
| D-008 | Accepted direction | Local-first, Windows-first prototype, with a public path and no paid specialist plugin required for core tasks. |
| D-009 | Accepted direction | High-risk actions need approval; observations and desktop automation are opt-in; relevant errors and reversibility limits stay visible. |
| D-010 | Accepted direction | Keep `main` protected from unreviewed initial development by working on a separate branch and PR. |
| D-011 | Proposed | TypeScript MCP coordination layer, Luau Studio plugin and small platform-specific desktop helper. Validate feasibility in V0. |
| D-012 | Proposed | One portable canonical skill set, with thin adapters/instructions for compatible AI clients. |
| D-013 | Proposed | 'Teach Mode' records permitted UI workflows and tests them in a disposable context. Must not be treated as universal automation. |
| D-014 | Proposed | Fast / Balanced / Thorough verification settings without weakening permission checks. |
| D-015 | Proposed | Optional public extension API and contributed adapters after core functionality is stable. |

| D-016 | Proposed; experimentally implemented | Optional bounded hierarchy capture: manual opt-in, max 128 nodes, depth 4, only allowlisted structural/visual properties; no source collection. Studio verification remains pending. |
| D-017 | Proposed; experimentally implemented | Exact-span source edits match one unique `beforeText` string against the inspected SHA-256 snapshot; they still require explicit Studio approval and are not collaborative merges. |

| D-018 | Proposed; experimentally implemented | One explicit per-user Studio daemon, with independent stdio MCP relays for ChatGPT, Claude and Codex. Clients share opted-in observations and cannot bypass Studio approval. Each AI host requires its own integration test. |

| D-019 | Proposed; implemented experimentally in V0.4 | Only one allowlisted Instance creation or typed property change may be proposed against a manually inspected structure. Require the original selected root, unchanged target identity/properties, explicit Studio approval, and undo recording. No arbitrary instance operations or code execution. Studio runtime verification pending. |

| D-020 | Proposed; experimentally implemented | Studio Output observations are user-previewed and explicitly shared, read-only, restricted to bounded warnings/errors, and never auto-streamed to MCP. The feature must not be described as a verified playtest monitor until tested in Studio. |

| D-021 | Proposed; experimentally implemented | User-clicked native StudioTestService Play/Run sessions may produce explicit, local-preview, manually shared bounded test reports. No automatic pass verdict, background playtest automation, or assumed complete log coverage. Studio execution and compatibility remain unverified. |

| D-022 | Proposed; experimentally implemented | Studio viewport capture uses StudioCaptureService plugin permission, a locally displayed exact-pixel EditableImage preview, separate user-initiated sharing to a token-protected localhost bridge, and a bounded MCP PNG image response. No background/desktop capture, and new Studio API integration remains unverified. |

| D-023 | Proposed; experimentally implemented | Sine interoperability starts with opt-in inspection of planted `ReplicatedStorage.SineVFX` and selected object's tags/`Properties` folder. Official Sine docs describe `shared.sv` as a **client runtime** interface, not Studio plugin editor automation; do not call it from the DevKit plugin or claim control of editor windows. |
| D-024 | Accepted direction; experimental preflight | Prefer Roblox's official built-in Studio MCP for native scene/animation/playtest operations, keeping DevKit as a separate review/specialist adapter. The offline preflight may inspect local file presence but never install, register, execute native MCP, read host settings, or infer active connectivity. |

| D-025 | Proposed; implemented experimentally in V0.9 | User explicitly imports local PNG/JPEG/WebP/GIF references into an authenticated in-memory bridge. Vision-capable agents receive real images/GIF keyframes and quantized visual/timing measurements. No arbitrary agent-side file reads, URL fetching, or third-party model training pipeline. |
| D-026 | Accepted direction; implemented as limited evidence | Evaluate reference fidelity and game art quality on separate measurable and judgmental dimensions. Contrast/palette/edges/timing statistics are descriptive proxies, **not objective aesthetic scores**. Visual deconstruction reconstructs plausible layers and processes rather than falsely recovering original rig/animation/VFX source files. |

| D-027 | Accepted direction; experimentally implemented in V1.0 | Visual motion observation should use bounded user-started Studio screenshot sequences, local review of every frame and one explicit share. Record actual capture-request offsets, not promised frame rate. Compare to imported GIFs using normalized time and measured image evidence, never fabricated event alignment or quality grades. |

| D-028 | Source-audited and Node-tested in V1.1; Studio runtime pending | Cancellation must remain authoritative while the Studio screenshot permission request or screenshot capture is pending. A mid-permission cancel had been overwritten by resetting the flag after the yielding prompt; patch and static regression test cover this ordering. |
| D-029 | Source-audited and Node-tested in V1.1 | Pixel-change fractions must reflect *visible* premultiplied RGBA, not unseen RGB changes at zero alpha. Motion change onset/peak/quiet are thresholded evidence, never automatic semantic event or quality verdict. |

| D-030 | Implemented experimentally in V1.2 | Competency routing selects from eight development disciplines using explicit inputs or disclosed keyword inference. Plans distinguish art-direction constraints and maintainable object-group responsibilities from mesh welding or automatic asset creation. Portable skill descriptions are instructional, not claims of installed specialist-app control. |
| D-031 | Implemented as evidence-only in V1.2 | Quality gates distinguish missing evidence, stored evidence available for inspection, and currently unavailable audio/performance/device/gameplay telemetry. Presence of evidence never automatically certifies an artistic, functional or security requirement. |
| D-032 | Implemented as curated source catalog in V1.2 | Skill plans include links to official Roblox Creator Hub documentation with provenance and an explicit 2026-11-16 check date. No live search, license grant, downloaded templates or unverified third-party integration is implied. |

| D-033 | Implemented experimentally in V1.3 | Explicit user-authored, ephemeral project briefs can inform multiple competency plans without rewriting a game's identity. Preserve/avoid rules, art-direction notes, constraints and linked imported media stay distinct from per-task overrides. URLs and rights claims are user-supplied and not independently verified. No automatic project scrape, remote fetch, or permanent memory is implied. |

| D-034 | Implemented experimentally in V1.4 | Use a source-linked capability matrix that distinguishes implemented, declared Node tests, historical user reports, and exact-version Studio/host verification. Prefer native Studio MCP for overlapping documented actions, keep specialized LAZY review/evidence separate, and never promote a user-filled or syntactically valid verification record to a verified status without reviewing proof. No new control privileges. |

## Open technical questions

- Which specific existing AI hosts can actually invoke local MCP services in their supported client environments? Test each, do not infer from marketing.
- Should the Studio plugin primarily connect to a native DevKit companion, or should the companion sit alongside official Studio MCP? Initial recommendation: **alongside**, avoiding duplicate tool endpoints.
- Which Studio APIs are presently available to plugins for viewport capture, script edits and undo? Record versioned proofs and compatibility tests.
- Can Eclipse or Sine expose their output in a way that supports replay, differential inspection and compatible editing? Test real installations, not descriptions.
- What security controls prevent localhost processes, prompt injection and window-selection mistakes from triggering unintended desktop input?
- Which screenshot cadence gives useful feedback without wasting model budget?

## Don't silently decide these

- Final public brand, license and publishing terms.
- Mac support date, hosted model providers, paid tiers or marketplace.
- Complete Eclipse/Moon/Sine automation or proprietary-code integration.
- Long-term generation model, visual scoring metric or automatic copying of online references.

## Change protocol

Add a short dated entry when decisions move between statuses, recording evidence and what was superseded. Source code is not retroactive approval of a product decision.