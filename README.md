# LAZY DevKit

## Native-first Studio workflow: connection check

LAZY is an **optional MCP evidence/review tool**, not a replacement for the official Roblox Studio MCP. Connect `Roblox_Studio` independently to Claude Code/Codex for ordinary Studio actions. Use LAZY for opt-in reference/quality evidence.

Before requesting edits, check this machine's LAZY connection:

```powershell
npm test
npm start                 # leave this running
# In a second PowerShell terminal:
npm run doctor            # does not reveal tokens or edit Studio
npm run doctor -- --json  # machine-readable diagnosis
```

The doctor checks the actual local LAZY MCP endpoint, required tools, and counts of *previously shared* evidence. It **cannot** verify native Studio MCP connectivity, a currently running Studio session, screenshot permission or a working end-to-end AI edit. See [First end-to-end Studio test](docs/FIRST-END-TO-END-TEST.md) to verify those on a disposable place and record real results. The optional LAZY Studio plugin remains a separate manual bridge; updating this repository does not update an installed plugin.

**V1.7:** Opt-in local Blender scene and WAV inspections can now produce bounded evidence for existing competency reviews. This does not automate editor GUI operations, generate finished assets, grade artistry or replace Studio playtests.

A public, local-first, model-independent experiment for safer AI-assisted Roblox development. **V1.4 adds a source-linked, read-only capability inventory and a strict schema for recording Studio integration-test claims. It separates historical user tests from version-bound verification, and recognizes documented native Roblox Studio MCP tools without pretending they are connected. Most V0.4-and-later Studio UI flows remain unverified.**

Start with [docs/START-HERE.md](docs/START-HERE.md) for product decisions. The implementation below is deliberately smaller than the long-term vision.

## Verified-capability roadmap (V1.4)

Before adding broader automation, inspect the explicit implementation and verification matrix:

```sh
npm run capabilities
npm run capabilities -- --json
npm run capabilities -- --validate
```

This is a **read-only catalog**, not a Studio probe. It shows native-first routes, LAZY-specific work and experimental/unsupported specialist integrations. Every entry separately describes implementation, declared Node tests, old user reports and missing version-bound live Studio/host verification. A green CI run does not automatically change those last two fields. The catalog now tracks documented native Studio MCP features as candidates for direct native use instead of duplicating them.

[Phase 12: verification and native MCP convergence](docs/PHASE-12-CAPABILITY-VERIFICATION.md) includes the machine-readable field contract and a disposable-place Studio test protocol. No token, project file or local Studio environment is accessed by this command.

## Local creative artifact inspection (V1.7)

The user can explicitly inspect actual Blender scene structure or uncompressed WAV signal levels. Optional Blender diagnostics render three 512px views. The original asset stays unchanged.

```powershell
npm run artifact:inspect -- wav "C:/MyGame/audio/impact.wav" --out "C:/MyGame/reviews/impact.json"
npm run artifact:inspect -- blender "C:/MyGame/models/creature.blend" --out "C:/MyGame/reviews/creature-audit" --previews
# If Blender is not on PATH, add --blender "C:/Path/To/blender.exe".
npm run artifact:import -- "C:/MyGame/reviews/creature-audit/audit.json"
```

The last command is a **separate user opt-in** requiring the already running authenticated localhost daemon. It shares **JSON metadata only**; raw meshes/audio and previews remain local. Four new MCP tools record, list, read and compare audit reports. A supplied report is marked unverified and no quality gate automatically passes. Blender remains an external executable, not a security sandbox. See [Phase 15 artifact inspection](docs/PHASE-15-ARTIFACT-INSPECTION.md).

## Cross-disciplinary competency system (V1.3)

LAZY DevKit now exposes eight development competencies: **modeling, building, animation, VFX, SFX, UI/HUD, Luau scripting, and game design**. Use it without Studio to plan how a deliverable should be built, what should remain independently editable, what official references to consult, which Roblox art-language principles apply and what evidence is missing.

```sh
npm run competency:plan -- "Build a stylized house with a yard and removable roof" --style stylized --asset-kind building --disciplines building,modeling
npm run competency:plan -- "Animate a creature attack with VFX, sound, HUD and server validation" --style anime --asset-kind ability
npm run competency:plan -- --list
```

With the shared MCP daemon running, use `lazydev_list_competencies`, `lazydev_plan_competency_task`, `lazydev_read_competency_plan`, and `lazydev_assess_competency_plan`. The last tool checks whether explicitly linked screenshots, structures, references, sequences or playtest snapshots are present, **not whether the work is good or passed**. Audio waveform/listening, physical-device UI testing, performance telemetry and representative gameplay analytics remain unsupported evidence kinds. The router is rule-based; confirm its inferred disciplines before acting.

Nine portable `SKILL.md` files cover the shared development workflow and eight disciplines. See [Phase 10 competence, sourcing and quality](docs/PHASE-10-COMPETENCY-SYSTEM.md). Resources are curated Roblox Creator Hub documentation links checked on 2026-11-16, **not live search results** or third-party assets with transferable licenses. Project-specific references and art styles remain developer-authorized.

## Session-local project briefs (V1.3)

A developer or trusted agent can deliberately create a brief through `lazydev_create_project_brief`, then use `lazydev_list_project_briefs` and `lazydev_read_project_brief`. The brief contains a project name, optional style and direction, lists of constraints, things to preserve/avoid, already-imported reference IDs, and explicit HTTPS reading/resource links. The tools do not read game files, download links, create assets, or modify Studio.

Pass the returned `briefId` as `projectBriefId` to `lazydev_plan_competency_task`. The plan retains a frozen copy of the brief's direction and constraints. Explicit per-task `style` and `styleNotes` take precedence over brief defaults, without editing the brief.

Imported reference IDs must actually exist in the current local bridge when the brief is created. User-entered links are labeled **user supplied, not fetched and not license verified** even when somebody claims permission. Briefs (last 16) are stored only in the running daemon; restart clears them. This is a limited context foundation, not long-term memory or an automatic search engine.

See [Phase 11 project briefs and resource provenance](docs/PHASE-11-PROJECT-BRIEFS.md) for examples and limitations.

## What is implemented through V1.4

- Portable local MCP packaging and connection instructions for ChatGPT Desktop, Claude Desktop, Claude Code, and Codex. **A user verified a ChatGPT-to-Studio inspection and script edit using V0.3; Claude/Codex and the new V0.4 Instance actions remain unverified in actual client sessions.**
- One persistent localhost Studio daemon, plus independent lightweight stdio clients. Supported ChatGPT, Claude and Codex clients can read the **same opt-in observations** without competing for the Studio port.
- A private per-user token handoff for local clients. Run `npm run session` to view the active token locally; never share it with an AI.
- Dependency-free Node.js stdio MCP server with thirty tools: list/read Studio snapshots, propose/review script edits, propose/review narrowly restricted Instance actions, and check reported status. list/read opted-in script snapshots, propose whole-source or exact-span changes, check proposal status, and list/read bounded Studio hierarchy snapshots.
- **Read-only capability/verification matrix:** native MCP capabilities, LAZY overlaps, conservative verification status, test pointers and a strict human-submitted evidence-record schema. No new privileged Studio tool endpoints.
- **Reusable project briefs:** explicit per-project creative direction, preservation rules, constraints, imported reference IDs and source-link provenance feed subsequent plans without silently replacing user decisions.
- **Competency planning and evidence checks:** task-specific methods/anti-patterns, art style profiles, suggested asset ownership boundaries, official sources and a multi-discipline quality rubric. Current tools can check retained evidence IDs but cannot grade art or claim unavailable audio/performance tests passed.
- **Audit and motion-cue hardening:** capture cancellation is honored even if clicked while screenshot permission is pending or while waiting on a screenshot. The image decoder now measures **visible alpha-weighted RGB changes**, so fully transparent color changes no longer count as movement. Existing reference/sequence reads include thresholded visual-change onset, peak, possible quiet period and observed timing cadence. These are not semantic detection of impact, anticipation or recovery and carry no quality grade.
- **Timed Studio visual observation:** a user-clicked capture of **six** sequential 3D viewport frames at a nominal 0.5s gap (actual capture-request offsets recorded). Each frame is reviewed locally before explicit Share. At most 240×160 pixels/frame are transferred, six frames total; the bridge keeps three temporary sequences and exposes real PNG keyframes plus per-frame measured change. It does not record continuously or guarantee a video frame rate.
- **Reference-to-Studio temporal comparison:** `lazydev_compare_sequence_reference` matches the sampled sequence with a manually imported GIF or PNG at nearest normalized elapsed time, reporting color/brightness/edge statistics and temporal-change peaks. There is **no pose alignment, movement reconstruction, artistic score, or automated pass verdict**.
- **Visual and animated references:** user-chosen local PNG, GIF, JPEG and WebP files are explicitly imported via `npm run reference:import -- "path/to/file.gif" --label "Impact reference"`. The local bridge can inspect image dimensions, samples, GIF frame durations and top visual-change beats. GIFs expose up to 3 real composited PNG keyframes; JPEG/WebP are returned as original images without claiming pixel metrics in this dependency-free implementation.
- **Measured quality evidence:** color palette buckets, sampled luminance/contrast/saturation, alpha coverage, local edge density and GIF frame-to-frame changes. `lazydev_compare_reference_viewport` reports **numeric** differences between a user-imported PNG/GIF frame and an explicitly approved Studio image, never a single objective quality score or asserted camera alignment.
- **Reference deconstruction workflow:** [Reference analysis and quality rubric](docs/PHASE-8-REFERENCES-AND-QUALITY.md) and [reference-review skill](skills/reference-review/SKILL.md) guide a vision-capable AI to distinguish visually observed layout/layers/timing from inferred implementation, and prioritize improvements against an approved creative target.
- **Sine VFX runtime integration evidence:** inspect `ReplicatedStorage.SineVFX` and one selected Instance's tags/`Properties` folder without requiring plugin code or copying source. Preview locally before sharing; read from MCP with `lazydev_list_sine_inspections` and `lazydev_read_sine_inspection`. This does **not** control Sine's editor, transform effects, or invoke the client's runtime.
- **Official Roblox Studio MCP coexistence:** `npm run native:mcp:check` is a local, read-only check for an official Studio MCP launcher and optional host config file. It does not read config contents, register servers or prove connection. Native Studio MCP should be connected independently when its broader tools are needed.
- **User-reviewed viewport frames:** an explicit StudioCaptureService screenshot permission prompt, local ImageLabel/EditableImage preview, and a separate Share action for the **same RGBA frame**. The daemon converts the pixels to PNG and returns actual image content via `lazydev_read_viewport`. The frame is downscaled to at most 480×300 pixels, bounded in memory, not a continuous stream, and is not a screenshot of the entire desktop.
- **User-initiated Studio test reports:** buttons for a solo **Play** or script-only **Run** session using Roblox's native `StudioTestService`; the test returns when it ends, then Output warnings/errors become a **local preview**, with a second manual Share action. Reports record the time window, API return state, and Output history coverage, **never a fabricated passed/failed verdict**. MCP clients can list/read user-shared reports.
- **Preview-first Studio Output diagnostics:** inspect current Output warnings/errors locally, review the messages, then explicitly share a frozen, bounded snapshot with MCP. No background polling, automatic logging, general logs, telemetry, or playtest control. Use `lazydev_list_diagnostics` and `lazydev_read_diagnostics` after sharing.
- Explicitly approved Instance actions: create a Folder, Model, Part, ScreenGui, Frame or TextLabel under compatible observed parents, or edit an allowlisted Part/GUI property. Each request is a **single action**, not an arbitrary command or Lua script. Studio checks the original selected object and inspected properties again before attempting the change, then records an Undo step.
- Optional exact-span edit proposals reject missing or repeated matches; the result is still a complete-source proposal that must be reviewed and explicitly approved in Studio.
- Read-only hierarchy snapshots: up to 128 Instances and depth 4, with a narrow allowlist of BasePart and GUI properties. Names and class identities are collected, but **no script source, arbitrary properties, or runtime values** are collected by this feature.
- Token-protected localhost HTTP bridge for a manually operated Studio plugin.
- Studio plugin source providing a **manual** inspect, proposal review, approve, or reject flow; source changes use `ScriptEditorService:UpdateSourceAsync` and Studio undo recording.
- SHA-256 snapshot preconditions, exact-source check inside the plugin, single pending proposal per snapshot, size limits, loopback binding, and no autonomous application.
- Node unit and HTTP integration tests (`npm test`).

**Runtime evidence:** A Windows Studio user verified a real ChatGPT-read hierarchy, manually approved script edit, and Undo/Redo with V0.3. **Not yet verified in a real Studio session:** V0.4 Instance actions, V0.5 Output diagnostics, V0.6 native test launches, V0.7 screenshot capture/local preview, and V0.8 Sine runtime inspection; actual Claude/Codex integration, direct specialist editor control, desktop automation, and gameplay behavior.

## Run the local bridge

Requirements: Node.js 20+ and Roblox Studio for the optional local plugin. No npm dependencies.

```bash
npm test
npm start
```

The daemon listens on `127.0.0.1:43187`. Run `npm start` once to keep the Studio observations and proposals alive. It prints a new token to stderr and saves a private per-user handoff file. Paste the token into the Studio review panel only. MCP clients launch `node src/stdio-client.mjs`, which uses the same daemon, does not bind a port, and never puts credentials into MCP settings.

For Claude Desktop, Claude Code and Codex, generate path-correct settings using `node scripts/print-client-config.mjs claude-desktop`, `claude-code`, or `codex`. Direct single-client mode remains possible with `npm run mcp:direct`, but cannot coexist with a daemon on the same port. All snapshots remain in memory until the daemon exits. Real client compatibility remains to be verified.

## Desktop connection (experimental)

The root `plugin.json` and `mcp.json` describe a local stdio MCP plugin. The repo marketplace is `.agents/plugins/marketplace.json`. ChatGPT Desktop plugin support depends on your client, plan and workspace; this is a **local development package**, not a public Directory listing or a proven ChatGPT connection.

Run the shared daemon **once** using `npm start`. Each supported local MCP host starts its own `src/stdio-client.mjs` relay, which shares the daemon's state and cannot apply script edits independently. The token remains inside the Windows user profile; never include it in screenshots or chat. See [Desktop connection](docs/DESKTOP-CONNECTION.md) for per-client configuration.

See [Desktop connection](docs/DESKTOP-CONNECTION.md) for exact test gates and limitations.

## Local Studio plugin: manual test workflow

1. Open a disposable Roblox Studio place. Use Studio's local-plugin workflow to install `studio/LAZYDevKit.plugin.lua` as a plugin Script. Do **not** paste it into a live game's runtime scripts.
2. Start the shared bridge daemon with `npm start`. Open **LAZY DevKit** from the Studio Plugins toolbar and paste the private token shown in that terminal. MCP hosts connect through separate stdio relays.
3. To inspect structure without sending script source, select exactly one root Instance and click **Inspect selected hierarchy (no script source)**. The snapshot is bounded to 128 nodes and 4 descendant levels. The agent can call `lazydev_list_structures` and `lazydev_read_structure`. Every hierarchy capture requires a manual button click.
4. To share script source, select exactly one `Script`, `LocalScript`, or `ModuleScript` in Explorer. Click **Inspect selected script**. This deliberately sends its edit-time source to the local bridge; no source is shared by default.
5. Use an MCP-capable agent in that **same bridge process**. Call `lazydev_list_observations`, then `lazydev_read_observation`. Prefer `lazydev_propose_scoped_edit` for narrow fixes: provide the exact unique `beforeText`, `afterText`, matching `snapshotId`, `expectedSha256`, and `rationale`. Use `lazydev_propose_script_edit` only when a whole-source replacement is justified.
6. In Studio, click **Check for a proposed edit**. Compare the complete current and replacement source in the read-only panel. Click **Reject** or **Approve and apply with Studio undo**. An approved edit is not an automated functional test.
7. Verify the change in Studio, use Edit → Undo if necessary, and test the game manually. Ask the agent for `lazydev_get_proposal_status`. That status reflects Studio's reported action, **not** proof of correctness.

If `HttpService` asks for permission to contact `127.0.0.1`, approve it for this plugin only if you trust this source and local process. Roblox's local networking rules and permissions may vary by Studio configuration. Network errors should not be interpreted as successful edits.

## Instance-action test (V0.4, not yet Studio-tested)

1. After pulling the updated repository, **stop and restart the one daemon** and **reinstall the updated Studio local plugin**. Existing local Studio installations are not updated by Git.
2. In an empty place, select the `Workspace.DevKit Probe` Folder and click **Inspect selected hierarchy**.
3. In the connected ChatGPT client, call `lazydev_list_structures` and `lazydev_read_structure`, then propose `lazydev_propose_scene_action` with `structureId`, `action: "create_child"`, `targetNodeId: 0`, `className: "Part"`, `name: "DevKitBlock"`, and a clear `rationale`.
4. With the **same root Folder still selected**, click **Check for proposed Instance action** in Studio. Review the exact class, name, parent and rationale, then choose Approve or Reject.
5. If approved, verify that a child Part exists, use **Edit → Undo**, then **Redo**. Re-inspect the hierarchy before asking the agent for another action.
6. For a separate property test, inspect the Part and use `action: "set_property"`, `targetNodeId: 0`, `property: "Anchored"`, `value: true`. Review and approve, then test Undo/Redo. Use `lazydev_get_scene_proposal_status` to read the Studio-reported receipt.

See [Phase 3 Instance actions](docs/PHASE-3-INSTANCE-ACTIONS.md) for allowlists, security assumptions, and remaining checks.

## Output diagnostics workflow (V0.5, not yet Studio-tested)

1. Pull the new `main`, stop/restart the one bridge daemon and reinstall the updated `studio/LAZYDevKit.plugin.lua` local plugin. Git changes do **not** update installed Studio plugins.
2. Run a playtest manually in an empty/disposable place, stop the playtest, and open the LAZY DevKit panel.
3. Click **Preview Studio Output warnings/errors locally**. The panel displays at most 80 warnings and errors from the current Studio Output history (older/long messages may be truncated or omitted). No data is sent yet.
4. **Read the preview carefully.** Logs can contain private data, tokens, names, or untrusted text. Click **Discard local Output preview** if anything should not be shared.
5. Click **Share previewed Output with MCP** only if you approve. Then your connected AI can call `lazydev_list_diagnostics` and `lazydev_read_diagnostics` to analyze the frozen snapshot.
6. This does not prove a playtest ran or that the logs include every client/server error. Capture time, missing messages and limitations must be reported.

See [Phase 4 diagnostics](docs/PHASE-4-DIAGNOSTICS.md) for the exact data contract and verification boundaries.

## Studio Play/Run report workflow (V0.6, not yet Studio-tested)

1. Update the repository and reinstall the updated local Studio plugin. Restart the one bridge daemon after updating. Work in a **disposable place**: Play/Run executes any enabled game scripts, which can have side effects.
2. In LAZY DevKit's panel, click **Launch solo Play test** (includes client) or **Launch Run simulation** (server script/physics simulation, not an avatar client).
3. Stop the session manually using Roblox Studio's **Stop** control. LAZY DevKit's plugin uses native `StudioTestService` and waits for it to return; the plugin does not silently stop Play or auto-run tests.
4. Read the resulting local report. The app distinguishes a Studio Test API return from actual pass/fail assertions, and marks Output that might contain older messages.
5. Choose **Share reviewed test report with MCP** or **Discard local test report preview**. Nothing is transmitted before the Share click. The AI can then call `lazydev_list_playtests` and `lazydev_read_playtest`.
6. An empty diagnostic list does **not** mean the test passed. These snapshots are not complete client/server telemetry or video captures.

See [Phase 5 Play/Run reports](docs/PHASE-5-PLAYTEST-REPORTS.md) for the evidence contract and limitations.

## Studio viewport capture (V0.7, not yet Studio-tested)

1. Update the repository, restart the shared local bridge, and **reinstall the updated Studio local plugin**. The old installed plugin will not update from `git pull`.
2. In an active disposable place, open LAZY DevKit and click **Capture & preview current 3D viewport**. Roblox may ask you to grant screenshot permission to the plugin. If permission is refused, capture is unavailable.
3. Review the image **inside the plugin panel**. It is the same frozen pixels used for sharing. The capture can include in-game UI (not the entire desktop) and may reveal private information.
4. Choose **Share previewed viewport image with MCP** or **Discard local viewport frame**. Preview and Discard do not send screenshots to the bridge.
5. Once shared, call `lazydev_list_viewports` and `lazydev_read_viewport` in a connected AI client. The read result includes actual capture time, separate bridge receipt time, and a real `image/png` MCP image content block. Host clients must support MCP image responses to display/analyze it.
6. An image is evidence of what the camera showed at one instant, not proof of what exists off-screen, what gameplay functions correctly, or what a real player sees.

See [Phase 6 viewport observation](docs/PHASE-6-VIEWPORT-OBSERVATION.md) for API choices, limits, and manual verification gates.

## Sine runtime inspection + official Studio MCP (V0.8; not yet Studio-tested)

1. Refresh the local daemon and reinstall the updated Studio plugin from `studio/LAZYDevKit.plugin.lua`; Git updates do not replace locally installed Studio plugin source.
2. In LAZY DevKit, select one candidate Sine effect (or select nothing), and click **Preview Sine runtime and selected effect (read-only)**. This only checks whether a `ReplicatedStorage.SineVFX` ModuleScript exists and reports the selected Instance's tags and direct `Properties` folder. No scripts are required, executed, or automatically inspected.
3. Review the local preview, then click **Share previewed Sine inspection with MCP** or **Discard**. The agent can call `lazydev_list_sine_inspections` and `lazydev_read_sine_inspection`. Treat tags as project data, not a guarantee the target is a working Sine effect.
4. The documented **Sine client runtime** exposes `VFX.emit(target)`, `VFX.enable(target)`, `VFX.disable(target)` after requiring `ReplicatedStorage.SineVFX` from a LocalScript. Its `shared.sv` shortcut is registered by the client runtime, **not** a documented remote editor-control API. Use existing read/edit approval tools for any LocalScript changes. Re-plant Sine's runtime after changing authored effects.
5. To use broader native Roblox Studio MCP capabilities, connect the **official** `Roblox_Studio` server separately through Roblox Studio's own Assistant → MCP Servers settings. Run `npm run native:mcp:check` for a file-presence preflight (not a connection test). Do not register duplicate official MCP servers or assume LAZY DevKit proxies them.

See [Phase 7 Sine and native MCP](docs/PHASE-7-SINE-AND-NATIVE-MCP.md) for exact documented interfaces, design boundaries and verification.

## Reference images, GIFs, and visual review (V0.9, Node-tested)

1. Start the local bridge (`npm start`) after updating the repo. Explicitly import one PNG/JPEG/WebP/GIF file already on **your PC**:
   ```powershell
   npm run reference:import -- "C:\\path\\to\\effect.gif" --label "Effect reference"
   ```
   The CLI reads *only the named file* (max 8 MiB). Do not paste bridge tokens or ask an agent to scan your files. The upload goes to the authenticated `127.0.0.1` bridge, not a public server.
2. In an MCP client call `lazydev_list_references`, then `lazydev_read_reference` using the returned `referenceId`. A vision-capable client receives image content; for GIFs, three keyframes at most, including the biggest observed visual change. Frame timing and visual measurements accompany the images.
3. With a separately user-shared Studio capture from v0.7, call `lazydev_compare_reference_viewport` with its `viewportId` and the imported `referenceId`, optionally specifying a GIF `frameIndex`.
4. Interpret differences relative to the requested style, silhouette and action. The numbers are proxies, **not** proof of fidelity, gameplay quality, rendering performance, or original construction methods. Provide human-readable deconstruction and a shortlist of changes, marking source reconstruction as inference.
5. This version supports **local file import**, not an automatic ChatGPT attachment downloader or unrestricted filesystem tool. References live in the bridge's memory (up to six) and vanish on restart. The AI client may retain shared images under its own data settings.

See [Phase 8 reference analysis](docs/PHASE-8-REFERENCES-AND-QUALITY.md) for formats, decode budgets and what quality measures mean.

## Timed viewport sequence (V1.0; Studio integration pending)

1. Update the local Node bridge and reinstall the latest `studio/LAZYDevKit.plugin.lua` before use. Start the local bridge once; the already-installed Studio plugin is not automatically replaced when GitHub updates.
2. In a disposable Studio place, position your camera on the desired effect or animation. Click **Capture 6-frame viewport sequence (manual start)**. Roblox may request permission to capture screenshots.
3. LAZY DevKit captures six separate frames, with a nominal 0.5-second gap and actual request times recorded. It does **not** initiate game actions or start a playtest for you, and its captures may fail if Studio cannot provide the active 3D viewport.
4. Review all six local frames using **Review next/previous sequence frame**. **Cancel capture / Discard local sequence** prevents sharing. The Share button refuses upload until all frames have been previewed.
5. If you approve, click **Share entire reviewed sequence with MCP**. The authenticated localhost bridge receives six RGBA frames in one bounded request and stores only a few recent sequences in memory.
6. The connected AI can call `lazydev_list_sequences` and `lazydev_read_sequence`. After you import a reference GIF with `npm run reference:import`, it can call `lazydev_compare_sequence_reference` with the returned IDs.
7. Interpret normalized-time differences in the context of actual footage and art direction, and re-capture the result after iteration. Sampling is approximate; no smooth motion or exact-frame synchronization is claimed.

See [Phase 9 temporal observations](docs/PHASE-9-TEMPORAL-OBSERVATION.md) for the frame contract and remaining checks.

## V1.1 audit and event-candidate review

The code and official Roblox Creator Hub APIs were rechecked on November 15, 2026. See [Verification audit](docs/AUDIT-2026-11-15.md) for confirmed source behavior, real Studio evidence, newly corrected defects and still-open verification gates.

For reference GIFs or shared Studio sequences, call the existing `lazydev_read_reference` or `lazydev_read_sequence` tool. Both now return `motionEvidence`: possible onset and highest visible-change frames, a possible low-activity interval afterward, observed frame spacing, and explicit limits. `lazydev_compare_sequence_reference` reports motion evidence from both sides separately. No new permissions or tools are needed.

A peak in changed pixels can be caused by the **camera, lighting, UI, background or compression** rather than a combat impact. The agent should read the actual returned images and review the user's target before proposing an original edit. This is a visual clue, not a semantic event classifier or benchmark score.

## Safety and limitations

- The session handoff file is convenient, not a credential vault. Other applications under your Windows account may read it; stop the bridge to invalidate the token, and don't use shared Windows accounts.
- Localhost is **not** automatically trustworthy. A separate bearer token protects every HTTP route and browser-origin requests are rejected; a local process with the token still has the session's privileges. Do not bind this service to a public interface.
- Sequence captures occur only after an explicit Studio button click; locally review all frames before sharing. The bridge does not silently start a camera recording, a playtest or another plugin operation.
- Reference images are imported only via an explicit local CLI command; the MCP tools cannot open arbitrary paths or fetch URLs. Local source bytes stay in ephemeral bridge memory and are sent to the connected MCP client only when read.
- Sine inspections share only optional selected Instance metadata, not runtime ModuleScript source; they never call Sine functions or change the editor. The separate native Studio MCP may have powerful mutating tools, subject to its own permissions.
- Screenshot capture is entirely opt-in, requires Studio screenshot permission and a local preview, and shares a bounded image only after a separate click. The daemon stores at most four PNGs in memory until restart; it never records the desktop or runs background capture.
- Play/Run testing executes your existing game scripts. It may trigger external operations, DataStore writes, or other side effects; opt in only with a disposable place and safe test data. The test service returning does not certify behavior.
- Output snapshots contain log text that may include secrets or prompt-injection attempts. Always review before sharing; AI clients must treat logs as untrusted data and never obey instructions inside log messages.
- The model can **propose** script or Instance actions, but cannot directly apply them. Instance creation uses safe default Roblox properties; setting properties requires a second opt-in inspection and separate approval.
- No unrestricted instance deletion, reparenting, methods, script creation, attributes, or arbitrary commands are available through the scene-action API.
- The model can **propose** script source, but cannot directly apply it. The Studio user chooses when to share source and whether to commit a proposal.
- Exact-span edits are calculated against the captured script source, then delivered as full replacements to the Studio plugin. This is **not** an AST-based patch or collaborative merge. Exact-span matching refuses missing and ambiguous text; Studio must also reject changes to the source after inspection.
- Structure inspection deliberately captures only a bounded subset of Instances and allowlisted properties; a truncated tree must never be mistaken for a complete project scan. All captured names and scripts must be treated as untrusted inputs.
- Studio source recording is an undo mechanism, not a durable backup or guaranteed rollback after a crash. Use version control and test in a disposable place first.
- The bridge never executes user-submitted source, loads assets, or controls third-party plugins. It receives only opt-in screenshots from the Studio plugin and never captures the desktop or contacts external endpoints.

## Next evidence gates

Validate V0.4 scene actions, V0.5 Output sharing, V0.6 test launch/reporting, V0.7 screenshots and V0.8 Sine inspection in real Windows Studio. V0.9 reference import/metrics, V1.0 temporal contracts, V1.1 cancellation/visibility/cue regressions and V1.2 competence routing/gate evidence checks are Node-tested; verify actual Studio screenshot timing/UI, AI-host frame rendering, and quality review with an authorized reference. Then consider explicit game assertions, controlled multi-client testing, and user-reviewed visual diffs. Specialist plugin automation and background screen capture are not implemented.

See [Phase 2 implementation](docs/PHASE-2-IMPLEMENTATION.md) for the data contract and verification boundaries. Don't add desktop-input automation without scoped permissions and an emergency stop.
