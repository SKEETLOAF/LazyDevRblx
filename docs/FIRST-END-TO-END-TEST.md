# First real end-to-end development test

**Goal:** Prove that an existing AI agent can **inspect → change → test → observe → correct → verify** a tiny original feature in a disposable Roblox Studio place. This is an operator-run trial, not an automatically completed benchmark. Do not use ORBIT!, Aura Wars, production DataStores or a monetized place.

## Before opening Studio

1. Update the LAZY checkout and verify Node.js 20+: `npm test`.
2. Start one LAZY daemon: `npm start` (leave this terminal running).
3. In a separate terminal: `npm run doctor` or `npm run doctor -- --json`.
4. Connect the official **Roblox_Studio** MCP through Studio's current Quick Connect instructions to **one** AI host (Claude Code or Codex). Connect **lazy-devkit** separately only if testing its optional evidence tools. Do not register a duplicate native Studio MCP server.
5. In the AI host, request its **actual discovered tools** for each server. The doctor checks the LAZY daemon only; native file presence is not a native MCP handshake. If the Studio native MCP connection fails, stop and resolve it before any edit.
6. Keep the AI on one disposable place and tell it to ask before any destructive changes, uploads, asset purchases or publishing.

## The practical smoke task

Paste this to the AI host after connecting native Studio MCP:

> Use Roblox_Studio MCP on my currently open disposable place. First inspect the Workspace and report what actually exists. Create a Folder named LazySmoke in Workspace and an anchored 4×1×4 Part named TestMarker inside it at a safe, visible location. Give the part an obvious but original material/color, and set the camera so the result can be seen. Run a short playtest, read genuine Output/error results, and capture a viewport image. Describe only what you can verify. Then change TestMarker height from 1 to 2, observe the change, and re-test. Finally revert or undo the height change while preserving everything else. Show the observed before/after state and any failures. Do not claim a capability was used unless its tool actually succeeded.

The exact native Studio tool names and whether each operation is available depend on the connected host and current Studio version. If the host lacks an operation, record **unsupported** and stop that stage. Never substitute a fabricated report.

## Optional LAZY plugin check

Only if the optional Studio plugin is installed and you want to verify its specific bridge:

1. Install or refresh `studio/LAZYDevKit.plugin.lua` via Studio's local plugin workflow. A Git update does not refresh a previously installed local plugin.
2. Start the same daemon, and obtain its private token locally using `npm run session`. Paste it **only into the trusted Studio plugin panel**; do not share it with the AI or in bug reports.
3. Select `Workspace.LazySmoke`, click the explicit hierarchy inspection/share control in LAZY's Studio panel, then re-run `npm run doctor`.
4. Confirm that the structure count increases. A nonzero count means an observation reached the daemon, **not** that the native connection, plugin capture, or gameplay is correct.
5. If viewport capture is supported by this installation, request permission, preview locally, explicitly Share, then confirm a viewport is listed. If capture says unavailable or no permission dialog appears, note the precise visible error and version; do not mark capture verified.

## Evidence and acceptance record

Record the Studio build, Windows version, AI host/version, LAZY commit SHA, native MCP tool names actually discovered, and whether LAZY was connected separately. Never record tokens.

| Gate | Required evidence | Verdict |
| --- | --- | --- |
| Native access | A real, returned hierarchy inspection from the open disposable place | PASS / FAIL / UNSUPPORTED |
| Mutation | Created Folder/Part observed in Studio and returned by inspection | PASS / FAIL / UNSUPPORTED |
| Playtest | Real start/stop report and Output/error read; describe any incompleteness | PASS / FAIL / UNSUPPORTED |
| Visual observation | Actual viewport image received by the AI host, and a grounded description | PASS / FAIL / UNSUPPORTED |
| Iteration | Size changed, inspected again, test repeated | PASS / FAIL / UNSUPPORTED |
| Reversion | Original height restored, no unrelated objects changed | PASS / FAIL / UNSUPPORTED |
| Optional LAZY bridge | `doctor` connected plus shared structure/viewport where expressly authorized | PASS / FAIL / NOT TESTED |

A complete result requires **all six native gates** with evidence, not just green Node CI or an AI saying “done”. LAZY bridge success is a separate optional gate.

When a gate fails, fix the **first blocking failure** before adding new features. Report the failing gate, exact non-secret error, attempted action, and observed result. Do not add additional generic “phases” as a substitute for operating Studio.
