# Native-first review: real evidence without duplicate captures

## What changed

The first real Codex Studio test proved that native `Roblox_Studio` MCP could edit, playtest, inspect Output and capture images, while LAZY did not see those artifacts. This release adds a **limited, opt-in evidence pointer registry** and **reasoned not-applicable proposals** to quality-gate review. LAZY does not become a second capture service.

New MCP tools:
- `lazydev_record_native_evidence` records only *operator-approved metadata* about a native Studio MCP tool result.
- `lazydev_list_native_evidence` lists bounded session-local pointers.
- `lazydev_read_native_evidence` reads their declared provenance and uncertainty.
- `lazydev_assess_competency_plan` now accepts `notApplicable:[{gateId,reason}]`.

Native tool result content, screenshots, recordings and logs **are not fetched, uploaded, parsed, or validated by the registry**. The original agent must inspect the actual source via its own connected native MCP access and report its limitations. The pointer is `operator_reported_native_mcp_unverified`; its evidence status is `external_evidence_linked_for_review` instead of `ready_for_review` or `passed`. The user must explicitly approve recording metadata (`operatorConsent:true`). This flag is operator-reported, not a verified permission receipt.

## Example: color-changing platform

Using the actual connected host, first perform and examine a real native `start_stop_play` tool call on a disposable place. With the user's explicit approval, an agent may call `lazydev_record_native_evidence` using:

```json
{
  "kind":"playtest",
  "provider":"Roblox_Studio",
  "sourceTool":"start_stop_play",
  "sourceReference":"color-platform-play-1",
  "capturedAt":"2026-11-19T00:00:00Z",
  "placeId":0,
  "universeId":0,
  "placeName":"Untitled Experience",
  "sessionLabel":"codex_color_platform_1",
  "captureMode":"play",
  "summary":"Operator-reported interaction test; consult the actual native MCP response for details.",
  "operatorConsent":true
}
```

The date above is **illustrative**; actual records require a real capture time within the last 30 days and cannot be more than 5 minutes in the future. `sourceReference` is an **opaque, non-secret identifier**, not a Windows path or URL. The caller must preserve the ability to find the real native result; the pointer does not do that automatically. Likewise, the `sessionLabel` distinguishes unsaved places only as an operator declaration, not a verified Roblox session.

The returned `evidenceId` can then be used in a competency assessment:

```json
{
  "planId":"<real returned planId>",
  "evidence":[
    {"gateId":"scripting:behavior","kind":"playtest","id":"<real returned evidenceId>"}
  ],
  "notApplicable":[
    {"gateId":"scripting:performance","reason":"No active profiling target or performance-sensitive loop exists in this isolated prototype."}
  ]
}
```

The assessment returns `externalLinked` and `notApplicableProposed` counts. These **are not passes**. A gate marked N/A remains a user/agent proposal awaiting review. Invalid gates, duplicated N/A entries, unexplained exclusions and conflicting evidence links are rejected.

## Source restrictions and privacy

This initial implementation accepts only these exact reported native tool-to-evidence pairs:

| Kind | Required native tool |
| --- | --- |
| `viewport` | `screen_capture` |
| `structure` | `search_game_tree` |
| `playtest` | `start_stop_play` |
| `diagnostics` | `get_console_output` |
| `observation` | `script_read` |

No RoPilot/Blender source is silently relabeled as Roblox Studio. Arbitrary file paths, URLs, images, raw script source and console logs are not accepted. Reported `placeId`, `universeId`, place name, capture mode, timestamp and session label help prevent accidental mixups, **but are not independently attested**.

All records live only in the local daemon session (max 30), expire when it restarts, and are not intended as durable project memory. Local LAZY evidence still uses existing ID-presence checks. No mechanism can automatically pass art, function, performance, security, accessibility or compliance by declaring evidence or N/A.

## Live acceptance procedure

1. Update this branch and run `npm test` and `npm run doctor` with the running daemon.
2. Reinstall the updated local LAZY Studio plugin for place-aware hierarchy snapshots. No reinstall is necessary solely for these Node/MCP evidence tools if you already installed the recent plugin.
3. Connect the native `Roblox_Studio` MCP and the independent `lazy_devkit` server to Codex/Claude. Confirm both are visible.
4. In a **disposable Studio place**, use native tools to inspect hierarchy, playtest a real interaction and capture a real screenshot. Record the exact Studio version and actual returned tool names.
5. With explicit operator approval, record a playtest and screenshot as separate pointer records with their own IDs, capture times and reported place context. Do **not** put the local screenshots' absolute file paths into `sourceReference`.
6. Assess a relevant plan with the returned IDs, and propose at most a genuinely justified N/A gate.
7. Check that the assessment says `external_evidence_linked_for_review`, `not_applicable_proposed`, and `overallVerdict: not_assessed`; never `passed`.
8. Restart the daemon and confirm these temporary pointers disappear.

If the native host cannot expose stable references to prior tool calls, those pointers are only human-readable bookmarks. To truly verify a screenshot or playtest, the agent must still display or analyze the original native output. Future work may add safe, verified artifact ingestion with explicit user permission; this release does not claim it.

## Boundaries

No automatic capture, clipboard, desktop control, source code read, developer game edits, unauthorized tool invocation, or autonomous uploading. No additional required paid tool. No automatic performance/device testing. Screenshots omitting UI do not prove UI appearance. A known unrelated Output warning does not become a platform error merely because it appeared during the same test.
