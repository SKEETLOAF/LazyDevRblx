# LAZY DevKit Studio integration verification (V0.3 tested; V0.4–V0.9 pending)

Record Studio version, OS, plugin installation method, date, and evidence for each test. Do not mark a check as passed based only on Node tests.

- [ ] Local plugin opens a dock panel; no source is transmitted before explicit Inspect.
- [ ] Loopback request and user permission work on a fresh Studio installation.
- [ ] Selecting exactly one script sends the editor-visible unsaved source (not an out-of-date `Script.Source`).
- [ ] Explicit hierarchy inspection sends at most 128 nodes (depth 0–4), reports truncation and never includes a script's Source property.
- [ ] Hierarchy inspection of a large/complex place does not freeze Studio; report the selected root and partial coverage.
- [ ] GUI and BasePart properties match the allowlist and serialize in the expected types.
- [ ] Unauthorized or wrong-token HTTP requests fail and do not disclose source/proposals.
- [x] ChatGPT MCP client listed/read a Studio-shared hierarchy and submitted a scoped script edit proposal in one connected session (user-reported and screenshots, 2026-11-14).
- [ ] Desktop client discovers or imports the local plugin package and launches the bridge.
- [x] ChatGPT MCP client read the user-selected two-node `DevKit Probe`/`Marker` hierarchy and its Part properties from the running bridge (user-provided tool output, 2026-11-14).
- [ ] `npm run session` retrieves a live bridge token locally and refuses to display a stale token.
- [ ] Restarting the daemon rotates the token, and stopping it cleans up the session handoff.
- [ ] ChatGPT, Claude, and Codex stdio clients initialize against one daemon and read the same snapshot without binding a second Studio port.
- [ ] Each local AI client's installation and tool discovery is verified with actual host software, not inferred from Node tests.
- [x] Studio panel displayed both original and proposed **two-line test script** before approval (screenshot, 2026-11-14).
- [ ] Studio panel correctly handles review of longer scripts and visibly highlights changed spans.
- [ ] Reject leaves source unchanged and returns a rejected receipt.
- [x] A unique exact-match change from `local value = 10` to `local value = 20` reached Studio and was approved/applied in a disposable ModuleScript (user report and screenshot, 2026-11-14).
- [ ] Real Studio workflow rejects missing or ambiguous matches before review (covered by Node tests, not separately verified in Studio).
- [ ] An inspected hierarchy cannot be used by the agent to request a script modification without a separate source inspection.
- [x] User verified the intended script update, then successfully used Studio **Undo** and **Redo** (user report, 2026-11-14).
- [ ] Verify that approval never executes the script and records exactly one Undo action in more complex cases.
- [ ] Editing source after Inspect but before Approve produces a stale result without overwriting manual edits.
- [ ] Modify an open Script Editor during the callback race; verify `UpdateSourceAsync` cancellation does not overwrite newer edits.
- [ ] Simulate bridge disconnect after a committed update; verify the plugin reports an uncertain receipt, not false success to the MCP agent.
- [ ] Restart the bridge; prior in-memory snapshots are absent, not silently reused.

## V0.4 Instance action checks (not yet executed in Studio)

- [ ] Install the updated V0.4 Roblox Studio local plugin, restart the single local daemon, and reconnect ChatGPT.
- [ ] Selecting `Workspace.DevKit Probe` and clicking Inspect produces a fresh structure ID.
- [ ] AI can propose creating one `Part` under the observed Folder; Studio shows action, name, class, target, and reason before approval.
- [ ] Rejecting an Instance action leaves the hierarchy unchanged and reports rejection.
- [ ] Approving the Part creation produces exactly one child, then Undo removes it and Redo restores it.
- [ ] Trying to create a duplicate child name fails safely without an unwanted extra Instance.
- [ ] Re-inspecting a hierarchy invalidates proposals made against the older observation.
- [ ] A stale parent rename, replacement, changed property, or changed selection prevents application.
- [ ] Inspecting a Part, proposing `Anchored=true`, approving, undoing and redoing works.
- [ ] Studio rejects unsupported classes, arbitrary `Source`, `Parent`, and other dangerous property updates.
- [ ] Studio UI/receipts handle daemon disconnect after an applied change without applying twice.
- [ ] GUI creation under StarterGui/ScreenGui and GUI property edits work in a disposable place.
- [ ] Check Lua syntax/API support of new UI and approval handler in the currently installed Windows Studio build.

## V0.5 Output diagnostics (not yet executed in Studio)

- [ ] The new local plugin has a **Preview Studio Output warnings/errors locally** action and a separate **Share previewed Output with MCP** action.
- [ ] Before Share is clicked, neither ChatGPT nor another MCP client receives this Output capture.
- [ ] Preview displays only error/warning messages from Studio Output, at most 80 messages, and reports truncated history/messages.
- [ ] Discard clears the local preview without altering the actual Studio Output window.
- [ ] A known disposable Lua warning and error appear in the preview after a manual Studio playtest.
- [ ] After explicit Share, the AI can list/read the frozen diagnostic snapshot and distinguish captured timestamps from live monitoring.
- [ ] Output containing private data or token strings can be previewed and discarded before sharing; no secrets are automatically transmitted.
- [ ] Restarting the daemon clears diagnostic observations; missing or inaccessible history is reported as an error, not made-up test results.
- [ ] Verify LogService:GetLogHistory() behavior and plugin permissions in the actual Windows Studio version.

## V0.6 Native Studio Play/Run test reports (not yet executed in Studio)

- [ ] Updated Studio plugin shows distinct **Launch solo Play test** and **Launch Run simulation** controls.
- [ ] Clicking Play starts the real Studio solo Play session; Stop ends it, and the plugin regains control.
- [ ] Clicking Run starts the real Studio Run simulation; Stop ends it, and the plugin regains control.
- [ ] The plugin refuses to launch another test while a session is active or Studio is already testing.
- [ ] No test report is accessible to MCP before the user explicitly clicks Share.
- [ ] A known test warning/error appears in the reviewed report if present in the plugin-visible Output history.
- [ ] A report with no visible logs states **not assessed**, never passed.
- [ ] If Output history was reset or changed, historyScope is `unfiltered_history` and the UI warns that earlier messages might be included.
- [ ] Test API failure is recorded as `start_error`, without treating it as a passing test or sharing raw exception strings.
- [ ] Discard leaves Studio Output unchanged and sends nothing.
- [ ] A shared report is accessible through `lazydev_list_playtests` and `lazydev_read_playtest`, with duration, mode, verdict, warnings and errors.
- [ ] Restarting the daemon removes prior in-memory test reports.
- [ ] Test on disposable place without real DataStore/external side effects; do not extrapolate runtime behavior to production.

## V0.7 reviewed viewport screenshot checks (not yet executed in Studio)

- [ ] Local plugin requests `StudioCaptureService` screenshot permission only after clicking Capture; denial leaves nothing ready to share.
- [ ] Capturing a disposable viewport creates an exact local image preview in the plugin panel (EditableImage availability may vary by device/settings).
- [ ] Image capture fails closed if preview creation, screenshot permission, or buffer conversion is unavailable.
- [ ] Captured frame is bounded to 480×300 pixels and preserves the viewport's aspect ratio.
- [ ] Preview alone does not send any image to the daemon. Clicking Discard clears the frozen image without changing Studio.
- [ ] A separate, deliberate Share posts the exact previewed pixels to the authenticated localhost bridge.
- [ ] The MCP client can list the capture and read one `image/png` content item alongside truthful metadata.
- [ ] Studio screenshots capture visible 3D view and game UI, not unrelated application windows or the operating system desktop.
- [ ] Missing/expired image IDs return an error, not hallucinated visuals or an auto-recapture.
- [ ] Revoking screenshot permission prevents subsequent captures without breaking unrelated LAZY DevKit functionality.
- [ ] Test the actual Studio-build API/security behavior for `StudioCaptureService`, `AssetService:CreateEditableImage`, and `ImageLabel.ImageContent`.

## V0.8 specialist interoperability checks (not yet executed in Studio)

- [ ] The Sine preview button reports `ReplicatedStorage.SineVFX` missing when no planted ModuleScript exists.
- [ ] With a user-planted Sine runtime, the preview shows ModuleScript present (without requiring or running its code).
- [ ] With one selected transformed effect, the preview shows exact selected path, class, direct `Properties` folder presence and bounded CollectionService tags.
- [ ] Multiple selected Instances cause an error rather than an arbitrary first-target choice.
- [ ] Previewing or discarding a Sine inspection does not send metadata to the MCP client.
- [ ] Explicit Share results in `lazydev_list_sine_inspections` and `lazydev_read_sine_inspection` returning the opt-in snapshot.
- [ ] No Sine plugin editor methods, transforms, or runtime `shared.sv` functions are called in the Studio plugin during inspection.
- [ ] Status remains `module_present` rather than a claimed functional VFX success; replant and client runtime behavior need independent testing.
- [ ] `npm run native:mcp:check` detects the native launcher on Windows without parsing host secrets or claiming a connection.
- [ ] When native Studio MCP and LAZY DevKit are both installed, they do not compete for the same process/port or register duplicate `Roblox_Studio` servers.

## V0.9 image/GIF and quality-analysis verification (not yet end-to-end verified on user's PC)

- [ ] A user-supplied local PNG can be explicitly imported without giving MCP clients filesystem read permissions.
- [ ] A two-frame animated GIF imports with accurate frame durations, order, frame compositing, and exact observed peak-change position.
- [ ] Local JPEG and WebP imports return valid original images but clearly report `quantitativeAvailable=false`.
- [ ] Oversized, corrupt, mismatched-MIME, and excessive-frame files are rejected before being retained.
- [ ] MCP `lazydev_read_reference` returns actual image content and measured statistics; no arbitrary image source was hallucinated.
- [ ] At most three GIF keyframe samples are present, including first, largest-change frame, and last (when distinct).
- [ ] `lazydev_compare_reference_viewport` uses a separately approved Studio viewport capture; labels differences as unaligned measured proxies, not proof of quality.
- [ ] User/agent reference deconstruction separates observed elements, likely implementation choices, unknowns, quality criteria, and revisions.
- [ ] Restarting the local daemon expires imported references; secrets and local file paths are not exposed in tool results.
- [ ] Measure edge/readability behavior at real Roblox viewing scale and record human judgment separately from automatic metrics.

## Evidence recorded from first real Windows Studio session (2026-11-14)

- A user-operated local Studio plugin successfully captured `Workspace.DevKit Probe` and its `Marker` Part (two nodes); the connected ChatGPT MCP client read that stored snapshot with its reported property values.
- The user inspected a disposable script in `ServerStorage`. ChatGPT proposed changing `local value = 10` to `local value = 20`; a screenshot showed old and proposed source in Studio's manual review panel.
- The user reported the edit was applied without a visible error and separately confirmed both **Undo and Redo** worked.
- These checks validate one tested read/propose/apply/undo/redo path. They do **not** establish general safety under concurrent editing, crash recovery, performance, or arbitrary client/plugin compatibility.
- Real Studio re-inspection after Redo, and verification of proposal status via MCP, remain useful additional evidence.

**Remaining boxes above are deliberately open.** Passing Node CI or one successful Studio session does not certify every editor scenario, browser/desktop MCP host, or third-party plugin integration.

