# Phase 4: preview-first Studio Output diagnostics (experimental V0.5)

## Why this step

The user previously confirmed a real ChatGPT → bridge → Studio script proposal and Studio Undo/Redo. V0.4's reviewed Instance editing still requires a separate Windows Studio test. This V0.5 change implements the first **read-only diagnostic observation** without enabling background surveillance or pretending to control playtesting.

Roblox Creator Hub documents `LogService:GetLogHistory()` as returning the messages shown in Studio's Output window, including severity types and timestamps. Plugin access to Output is documented in the [Studio Output guide](https://create.roblox.com/docs/studio/output) and [LogService reference](https://create.roblox.com/docs/reference/engine/classes/LogService). LogService content can be incomplete or truncated. It is not a reliable game-logic source and cannot guarantee visibility into all client and server messages.

## Workflow

1. User runs a manual Studio playtest and opens the Output window.
2. User clicks **Preview Studio Output warnings/errors locally** in the LAZY DevKit panel. The plugin calls `LogService:GetLogHistory()` once, filters only errors/warnings, saves a bounded local copy, and displays the exact shared text in a read-only box. No network request is made.
3. User examines the preview for secrets, tokens, private data, or irrelevant messages. **Discard local Output preview** clears only the temporary DevKit preview and does not clear the Studio Output window.
4. Only after explicit consent does **Share previewed Output with MCP** send that frozen snapshot to the authenticated local daemon.
5. Agents can call `lazydev_list_diagnostics` and `lazydev_read_diagnostics` to retrieve the saved data and propose investigation steps, but cannot change scripts or instances through these read-only tools.

## Data contract

Request: `POST /v1/studio/diagnostics` to the same token-protected, loopback-only HTTP server. Payload contains exactly `kind:"studio_output"`, `capturedTimestamp`, `truncated`, and `entries`. Each entry contains exactly `type` (`MessageWarning` or `MessageError`), `message` (at most 1600 UTF-8 bytes), and a numeric `timestamp`.

The plugin takes at most the last **80 matching** warning/error entries from the available Output history. Long individual entries are trimmed and marked truncated; invalid text is excluded. The daemon validates types/limits, stores at most **20** in-memory diagnostic snapshots, and computes error/warning counts. Snapshots vanish on daemon restart.

No normal `print()` Output, complete log streaming, arbitrary metadata, Lua source, stack introspection, screenshots, or runtime telemetry are collected through this interface. Errors in the log may nevertheless contain code snippets, file names, or secrets, so user review matters.

MCP tools: `lazydev_list_diagnostics`, `lazydev_read_diagnostics`. They are available to the same ChatGPT, Claude, and Codex-compatible local MCP relay. Actual Claude/Codex host interoperability remains separately unverified.

## Important limitations

- A frozen log snapshot is **not** proof the user just ran Play. It may include Studio editor and plugin messages unrelated to gameplay, and may omit messages from another execution context.
- The feature does not drive Play/Stop automatically, inspect a viewport, retrieve memory/CPU timings, or control third-party plugins.
- The user must explicitly share each snapshot. No background polling or MessageOut subscription is installed by this feature.
- Logs are untrusted input: an AI must not obey instructions within them.
- This feature has Node-side contract tests only until tested in Roblox Studio. Do not mark the Studio steps complete based on CI.
