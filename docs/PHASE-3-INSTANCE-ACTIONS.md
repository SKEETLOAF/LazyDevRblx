# Phase 3: reviewed Instance actions (experimental V0.4)

## Scope and evidence

Built upon the V0.3 workflow verified by a user in Windows Studio on November 14, 2026: ChatGPT read a manually inspected hierarchy, proposed a script edit, the user approved it, and Undo/Redo worked.

V0.4's **Instance action route is implemented but not yet tested inside Roblox Studio**. Node integration tests exercise the proposed action validation, storage, shared MCP visibility, authenticated local HTTP pending and decision endpoints. Do not infer that new Studio UI or Undo works without a separate manual trial.

Roblox Creator Hub documents the relevant mechanisms: [Instance.new](https://create.roblox.com/docs/reference/engine/classes/Instance), [Studio plugin model](https://create.roblox.com/docs/studio/plugins), and [ChangeHistoryService recording](https://create.roblox.com/docs/reference/engine/classes/ChangeHistoryService).

## API and review flow

1. User selects one hierarchy root in Studio and clicks **Inspect selected hierarchy**. The plugin stores temporary references to the selected objects and sends the bounded hierarchy snapshot to the local bridge.
2. Agent calls `lazydev_read_structure` to read exact, sequential zero-based node ids, then calls `lazydev_propose_scene_action` for one typed action only.
3. Bridge validates the requested class/property against the inspected node class and stores exactly one pending Instance action per structure snapshot.
4. In Studio, user clicks **Check for proposed Instance action**, sees the target/old-new values or new object name/class, and chooses Reject or Approve.
5. On approval, Studio requires the **same hierarchy root to remain selected** and checks the same object reference, class, path, and tracked target properties. It rejects stale or mismatched targets.
6. Studio starts a ChangeHistoryService recording, performs the allowlisted action with `Instance.new` or a typed property assignment, and commits its Undo record on success. The tool receives a **Studio-reported** status, not proof of correctness.
7. User re-inspects to see the new result. The prior structureId is stale for subsequent actions.

MCP tools: `lazydev_propose_scene_action`, `lazydev_get_scene_proposal_status`. Local Studio endpoints: `GET /v1/studio/scene/pending?structureId=...` and `POST /v1/studio/scene/proposals/{id}/decision`. Both require the ephemeral localhost bearer token.

## Allowed operations

Creation is limited to **Folder, Model, Part** beneath a Workspace, Folder, Model, ServerStorage or ReplicatedStorage, **ScreenGui** beneath StarterGui, and **Frame / TextLabel** beneath ScreenGui or Frame. No initial arbitrary property payload is accepted. Set further properties only after a fresh manual inspection.

Typed property changes are restricted to:

- `Part`: Anchored, CanCollide, Position, Size, Color (normalized 0–1 components), Material (explicit enum subset), Transparency.
- `ScreenGui`: Enabled.
- `Frame` / `TextLabel`: Visible, GuiSize, GuiPosition, ZIndex, BackgroundTransparency.

Values are bounded. Position, Size, Color, GUI scale/offset, transparency, and ZIndex reject invalid types, non-finite numbers, and dangerous/out-of-range values. The proposal includes the inspected property values for a stale-check at apply time.

Unsupported: deletion, script creation, asset insertion, arbitrary instance methods, unrestricted classes/properties, properties called Source or Parent, changing services, direct execution, manipulating other Studio plugins, automatic approval, and large multi-action batches.

## Example proposals

After a user inspects their `Workspace.DevKit Probe` Folder (root node `0`), the AI can propose:

```json
{"structureId":"<actual inspected id>","action":"create_child","targetNodeId":0,"className":"Part","name":"DevKitBlock","rationale":"Create a disposable geometry test"}
```

After approval, Undo/Redo, and a fresh inspection of the new Part, it may propose:

```json
{"structureId":"<new inspected id>","action":"set_property","targetNodeId":0,"property":"Anchored","value":true,"rationale":"Keep the test Part stationary"}
```

The strings in angle brackets above are placeholders in documentation, not valid ids. Tools should take the actual returned `structureId` from the live inspection. Preview the action before clicking Approve.

## Limits and next evidence gates

- One action per proposal; one pending proposal per observation. New inspections supersede stale observations of the same root path.
- The selected hierarchy's object references are tracked by the plugin only until the next inspection or restart. No persistent GUIDs are written to game Instances.
- Undo is a Studio editor recording, not version-control backup; the user should test in a disposable place and confirm actual Undo/Redo.
- This is not yet a general-purpose scene editor, hierarchy synchronization protocol, viewport camera tool, animation/VFX-plugin adapter, or visual playtest inspector.
- After a verified Instance-action path, prioritize read-only Studio diagnostics, run/test observation, better visual diffs and carefully scoped multi-action transactions.

See [verification checklist](V0-INTEGRATION-CHECKLIST.md) for explicit Studio tasks. **The new V0.4 code must be installed as a local Studio plugin separately; updating GitHub does not update Studio's already installed plugin.**
