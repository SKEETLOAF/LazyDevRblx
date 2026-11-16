# Phase 12: Native Studio MCP capability verification (V1.4)

## Research finding and decision boundary

Research completed November 16, 2026 identified a much broader native Studio MCP interface than when LAZY's earliest bridge was designed. Native Studio MCP now documents source inspection and multi-edit, tree searches, Luau execution, playtest controls, console output, viewport screenshots, virtual input, asset generation and documentation retrieval. Source: [Roblox Studio MCP](https://create.roblox.com/docs/studio/mcp). The StudioTestService API independently describes Play/Run and multi-client test execution: [StudioTestService](https://create.roblox.com/docs/reference/engine/classes/StudioTestService).

**Direction:** Where native Studio MCP already works, use it as the default actuator. LAZY remains useful for project intent, evidence retention, reference comparison, specialist inspection, reviewed approvals and quality processes. Do not connect a second native Studio server, bypass Studio permissions or pretend the LAZY bridge proxies official MCP.

This release **does not implement an orchestrator**, invoke native MCP, run Roblox Studio or verify new Studio UI flows. It adds a read-only, programmatically inspectable catalog and a strict schema for **user-submitted test claims**.

## Implemented artifacts

- `src/capabilities/registry.mjs`: versioned, curated capability records with provider, recommended route (`native_first`, `lazy_specialist`, `research_candidate`, `unavailable`), risk, implementation flag, linked test files, public documentation, and historical reports where known
- `src/capabilities/verification.mjs`: schema validator for one user-submitted Studio test claim. It requires a capability ID, result, exact Git commit, Studio build, OS, host/client and version, timestamp and repo-local evidence paths. It **always** returns `reviewStatus: pending_human_review` and `versionBoundStudioVerified: false`
- `scripts/check-capabilities.mjs`: dependency-free, read-only CLI output; no network, filesystem or authorization checks and no Studio connection
- `test/capabilities.test.mjs`: static catalog consistency, real test-source pointers, current unverified statuses, strict result validation, path-traversal rejection, CLI regression tests

Run `npm run capabilities`, `npm run capabilities -- --json`, or `npm run capabilities -- --validate`.

### Evidence semantics

| Field | Meaning |
| --- | --- |
| `documented` | A source URL is known; not proof current host supports it |
| `implementedInLazy` | Code exists in this repository |
| `hasAutomatedTestPointers` | Node test files are identified; not proof the current release's CI passed |
| `ciPass` | Always `not_checked_by_registry`; CI status is external |
| `liveUserReported` | Limited old user test was reported, e.g. V0.3 |
| `versionBoundStudioVerified` | Remains false until a separate evidence review can prove exact tested commit and Studio build |
| `versionBoundHostVerified` | Remains false until the exact local host client path is reviewed |

A schema-valid user report does **not** certify anything. Real evidence files must be inspected by a person or a future trusted reviewer, checked against the declared commit/build, and ideally reproduced. There is no automated “pass” switch, and an environment file is never treated as executable instructions.

## Disposable-place integration lab

This is the next human-in-the-loop milestone and requires Roblox Studio running on the developer's machine. Use a **new disposable local place**, never a production DataStore, monetized place or private game until confidence improves.

1. Record Windows/OS version, Studio build number, Git commit of LAZY, local AI host/client and its version, native MCP setup, and test date. Record only versions, **not session tokens, home-directory paths, or credentials**.
2. In Studio, configure official **Roblox_Studio** MCP using the documented integration. Connect LAZY separately as `lazy-devkit` if needed. Use least privilege, do not register duplicate native servers.
3. Start with read-only inspection: official `search_game_tree`/`inspect_instance` and LAZY's manually shared structure. Confirm targets, privacy boundary, and that each responds independently.
4. Using a disposable ModuleScript, read a two-line source, propose a unique change, inspect the exact diff, approve, read back, Undo, Redo. Repeat with **Reject** and with stale source changed manually before approval.
5. Create one harmless Part in a disposable Folder through the intended supported interface, validate hierarchy, then Undo/Redo. Test unsupported class/property requests and stale observation rejection without making unintended changes.
6. Preview local Studio Output errors/warnings and Share deliberately. Confirm the AI cannot read them before Share. A clean or missing Output log is **not** a successful playtest.
7. Request a viewport screenshot from both documented native MCP and the LAZY plugin. Check permission prompts, image content and aspect ratio. Reject/cancel/deny and confirm no data is shared.
8. For LAZY's six-frame sequence, capture a deliberately moving object, review each sample, Cancel during the permission prompt and during capture, and verify no incomplete sequence is shared. Do not assume 60-FPS video from these samples.
9. Run a harmless solo Play/Run test, then a two-client test through native tools/StudioTestService where supported. Include a deliberate server warning and a basic client-server ownership rule. Record actual assertions and session state, not “no errors.”
10. Stop the daemon/restart Studio; verify old references and temporary snapshots expire and the native Studio server and LAZY do not conflict. Record which capabilities truly worked, were blocked or were inconclusive.

### Minimum report data (never embed credentials)

```json
{
  "capabilityId": "studio.viewport.capture",
  "result": "inconclusive",
  "testedCommit": "0000000000000000000000000000000000000000",
  "studioBuild": "replace with exact Studio build",
  "os": "Windows 11 build ...",
  "host": "ChatGPT Desktop",
  "hostVersion": "replace with exact host version",
  "observedAt": "2026-11-16T18:30:00Z",
  "evidencePaths": ["docs/verification/evidence/viewport-001.png"],
  "notes": "Describe expected/actual result and permission behavior"
}
```

This JSON is illustrative. **Do not commit fabricated evidence files or use the zero commit as an actual tested commit.** It intentionally carries no `verified: true` value. A record validated by `normalizeVerificationRecord` is still only an unreviewed claim.

## Concrete acceptance gate for the following release

- Test at least one official native Studio inspection/action and one LAZY-only evidence feature side by side on the same **disposable place**.
- Record versions, commit and reviewable test evidence for each result.
- Check that Studio controls authorization, including an explicit denied action.
- Confirm no collision between native and LAZY server processes/configuration.
- Make a **narrower** decision on which LAZY overlap is useful as a privacy/review fallback rather than deleting code prematurely.
- Keep any unverified capability labeled unverified. A failure should produce a reproducible bug report rather than a promotional “supported” status.

## Sources and known limits

Primary sources: [Roblox MCP documentation](https://create.roblox.com/docs/studio/mcp), [StudioTestService](https://create.roblox.com/docs/reference/engine/classes/StudioTestService), [StudioCaptureService](https://create.roblox.com/docs/reference/engine/classes/StudioCaptureService), [ChangeHistoryService](https://create.roblox.com/docs/reference/engine/classes/ChangeHistoryService), [official Roblox Studio agent plugin](https://github.com/Roblox/roblox-studio-agent-plugin), and LAZY's [integration checklist](V0-INTEGRATION-CHECKLIST.md).

The research-supported architecture is **not** proof a native Studio MCP server is installed or authorized on the user's PC. Neither Sine VFX, Moon Animator, Eclipse Animator nor Blender is controllable through this release. Their external integration surfaces remain subject to documented support, permission, version and real-world testing.
