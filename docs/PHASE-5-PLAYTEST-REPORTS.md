# Phase 5: Reviewed Play/Run reports (V0.6 experimental)

## Scope

The existing LAZY DevKit bridge now accepts explicit Play/Run evidence from Roblox Studio. The UI launches tests **only when the user clicks**, through the documented native `StudioTestService:ExecutePlayModeAsync()` or `StudioTestService:ExecuteRunModeAsync()` APIs. The test runs until stopped by the user using Studio's existing Stop controls. Roblox documents the APIs in [StudioTestService](https://create.roblox.com/docs/reference/engine/classes/StudioTestService); the Output capture uses [LogService:GetLogHistory](https://create.roblox.com/docs/reference/engine/classes/LogService).

**Do not confuse completion with success.** If the API returned, that tells us the Studio test session ended, not whether a player spawned, a feature worked or the game passed a test. All shared reports explicitly contain `verdict: "not_assessed"`.

## Explicit local workflow

1. Work in an empty/disposable place. Play or Run executes the place's enabled game scripts; scripts may write DataStores or call external systems if enabled. Don't test production data without independent safety controls.
2. In LAZY DevKit's Studio panel, click **Launch solo Play test** (client+server mode) or **Launch Run simulation** (server-side simulation with no avatar client).
3. The plugin saves an Output history baseline and calls the corresponding StudioTestService function asynchronously, so its own UI stays responsive. Stop the session using Studio's Stop button.
4. When StudioTestService returns, the plugin collects Output history. If the baseline remains an identical prefix, it isolates the newly appended suffix; otherwise it retains a bounded history and labels `historyScope: "unfiltered_history"` because old messages may be included. Filtering is intentionally conservative.
5. Only warnings/errors are included, at most 80 entries with 1600 UTF-8 bytes per message. Review the frozen local preview carefully. **No network request occurs during test launch or collection.**
6. Click **Share reviewed test report with MCP** to send one immutable report to the token-protected localhost bridge, or **Discard** to delete the local preview without changing Studio Output.
7. In ChatGPT, Claude, or Codex with an active LAZY DevKit MCP connection, call `lazydev_list_playtests` then `lazydev_read_playtest` with the actual returned playtestId.

## Data contract and security

Request: authenticated localhost `POST /v1/studio/playtest-report`. Exact payload fields: `kind: "studio_playtest"`, `mode: "play"|"run"`, `returnState: "returned"|"start_error"`, `startedAt`, `endedAt` (Unix-second integers, at most four hours apart), `historyScope: "new_suffix"|"unfiltered_history"`, `truncated`, and `entries`. Entry schema matches the existing bounded diagnostics contract. The server rejects unexpected fields, arbitrary metadata, unsupported log types, invalid timestamps and impossible durations. Up to 20 reports are retained in memory per daemon session.

MCP metadata provides counts, timestamps, mode, Output coverage, and an explicit `verdict: "not_assessed"`. Read returns the same metadata plus the warning/error entries. There is no mechanism to modify or run arbitrary scripts, or to force a test to pass via this evidence API.

## What is NOT verified or implemented

- **Real Studio plugin integration for V0.6 is pending.** Passing Node tests does not establish the new GUI buttons or StudioTestService callback behavior on the user's machine.
- If the user ends a test by closing Studio or a plugin is unloaded, this report may never be created. A native API return is not a functional game assertion.
- Roblox Output may include messages from the editor or unrelated contexts and may omit other execution contexts; `historyScope` communicates what could be isolated. There is no guarantee of complete client/server coverage.
- No automatic tests, test assertions, generated Lua test code, performance telemetry, screenshots, video, or third-party plugin automation.
- A later phase may add **explicit assertions and scenario fixtures**, opt-in multi-client sessions, runtime tracing, visual observation and actionable diffs. These need their own permission model and testing.

## First test gate

After the PC setup is updated from `main`, reinstall `studio/LAZYDevKit.plugin.lua`, launch a disposable solo Play session, stop it, inspect the local preview and share it. The AI should see `verdict: not_assessed` even with zero errors. Then test Run mode separately. Only after user confirmation should these Studio integration boxes be marked complete in the verification checklist.
