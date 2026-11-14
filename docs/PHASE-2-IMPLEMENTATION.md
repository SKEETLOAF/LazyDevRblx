# Phase 2: structured inspection and scoped edit proposals

**Implemented in code (experimental):** `src/structure.mjs`, `src/state.mjs`, `src/http.mjs`, `src/mcp.mjs`, `studio/LAZYDevKit.plugin.lua`. Node contract tests live in `test/phase2.test.mjs`.

**Not verified:** actual Studio plugin operation, resulting in-game behavior, per-host MCP interoperability, visual image capture, specialist plugin integrations.

## Structural evidence

The Studio plugin offers a separate **Inspect selected hierarchy** button. The user chooses one root Instance in Explorer, and only that hierarchy is traversed. Depth is capped at 4, counting the root as depth 0. At most 128 Instance entries are transmitted, with a `truncated` marker if any children are omitted.

The `POST /v1/studio/inspect-tree` request requires the same ephemeral token used by the existing bridge and uses the same localhost-only endpoint and origin check. The server validates the node count, sequential zero-based ids, earlier parent references, depth, bounded names/paths/classes, and typed properties. It stores at most 25 snapshots in memory.

Supported property keys:

| Instance category | Evidence captured |
| --- | --- |
| All | name, class, full path, depth, parent id |
| BasePart | Anchored, CanCollide, Size, Position, Color, Material, Transparency |
| GuiObject | Visible, GUI Size, GUI Position, ZIndex, BackgroundTransparency |
| ScreenGui | Enabled |

Script source, instances' arbitrary Attributes, expensive runtime probes and all arbitrary properties are excluded. The bridge normalizes `parentId` omitted on a root to null, because Lua JSON encoding omits nil fields.

Two MCP tools expose the captured results: `lazydev_list_structures` and `lazydev_read_structure`. Observations are read-only and do not grant edit privileges. The agent must treat any captured strings as untrusted project data.

## Exact-span edits

`lazydev_propose_scoped_edit` requires `snapshotId`, `expectedSha256`, `beforeText`, `afterText`, and `rationale`. The snapshot must still be current in the bridge. `beforeText` must occur **exactly once** within the original script. Text matching is literal and case-sensitive. Failure to match, duplicate matches, stale snapshots, oversized spans, or a hash mismatch produce an error, not a proposal.

Successful edits are rendered as full-source replacements to the existing Studio review panel. They do not apply automatically. In Studio, the script editor source must still match the inspected version before and during the update callback. The user has the final approve/reject control. The agent receives a Studio-reported receipt, not an assertion of correctness.

## Verification priorities

1. Exercise manual hierarchy capture and validate its JSON format in Windows Roblox Studio.
2. Validate the scoped edit preview, approval, stale source detection, and undo recording on a disposable place.
3. Inspect a GUI hierarchy and a large Workspace hierarchy, checking property values and truncation.
4. Try a deliberate concurrent edit in an open Script Editor; verify the change is cancelled safely.
5. Add a side-by-side change preview and explicit diagnostics before widening editing permissions.

Current Node CI tests only the JavaScript bridge and simulated Studio HTTP payloads. The Studio portion cannot be considered verified until these manual steps are recorded with evidence.
