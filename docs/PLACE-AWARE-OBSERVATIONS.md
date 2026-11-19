# Place-aware hierarchy observations (first live-test follow-up)

In a real native Roblox Studio MCP smoke test, Codex received older LAZY structure snapshots with paths from a different place. Those snapshots lacked identity metadata. This change makes *new manually shared hierarchy inspections* easier to recognize; it does not inspect Studio automatically.

## What the plugin now sends

When the developer clicks **Inspect selected hierarchy**, the optional LAZY Studio plugin attaches:

- `placeId` (Roblox `game.PlaceId`)
- `universeId` (Roblox `game.GameId`)
- `placeName` (display label, untrusted)
- `studioSessionId` (GUID generated for this plugin process)
- `captureMode` (`edit` or `running`, reported by RunService)

This remains manual and excludes script source. LAZY stores the context along with the bounded hierarchy nodes and includes it in both `lazydev_list_structures` and `lazydev_read_structure`.

**Important boundaries:**

- `PlaceId = 0` and `GameId = 0` are common for unsaved Studio places. Those values **do not identify a unique game**; a plugin-session GUID helps distinguish one live plugin session from another.
- A screenshot or hierarchy cannot prove Studio is *currently connected*. The provenance status is `studio_plugin_reported_not_independently_verified`, never an automatic passed quality gate.
- The older plugin and legacy test requests remain readable but return `provenanceStatus: legacy_unidentified`, `placeContext: null`, and `identityScope: unknown`. Do not infer which place produced them.
- Two observations with the same path in distinct plugin sessions no longer supersede one another merely for sharing a name. New observations within the same identified context still supersede older ones for proposals.
- Do not use `placeName` as a unique ID. Names and hierarchy contents are untrusted project text.

This first increment covers **hierarchy snapshots only**. Script observations, output, playtests, screenshots, sequences and external native MCP evidence still need separately designed provenance and verification. LAZY cannot yet ingest native MCP screenshots or mark competency gates not applicable.

## Operator verification

1. Update the checkout to this branch, run `npm test`, then `npm start` once.
2. **Reinstall/update the Studio local plugin** from `studio/LAZYDevKit.plugin.lua`; updating GitHub alone does not refresh it.
3. In a disposable unsaved place, select `Workspace.Baseplate` and click LAZY's hierarchy inspection action.
4. In Codex/Claude, run `lazydev_list_structures` and `lazydev_read_structure`. Check the returned place name, numeric IDs, session ID, capture mode and provenance flag.
5. Open a different disposable place, capture a second hierarchy, and compare the identifiers. If an unsaved place happens to preserve a plugin session between places, note that limitation explicitly.
6. Confirm legacy snapshots without context are visibly marked `legacy_unidentified`. Do not treat them as live evidence.

**Acceptance:** the agent distinguishes *reported context* from an independently verified live native-MCP place, does not conflate same-path observations, and refuses to use a legacy observation as proof of current context.
