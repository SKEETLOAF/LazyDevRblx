# LAZY DevKit Studio integration verification (V0.3 tested; V0.4/V0.5 pending)

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

## Evidence recorded from first real Windows Studio session (2026-11-14)

- A user-operated local Studio plugin successfully captured `Workspace.DevKit Probe` and its `Marker` Part (two nodes); the connected ChatGPT MCP client read that stored snapshot with its reported property values.
- The user inspected a disposable script in `ServerStorage`. ChatGPT proposed changing `local value = 10` to `local value = 20`; a screenshot showed old and proposed source in Studio's manual review panel.
- The user reported the edit was applied without a visible error and separately confirmed both **Undo and Redo** worked.
- These checks validate one tested read/propose/apply/undo/redo path. They do **not** establish general safety under concurrent editing, crash recovery, performance, or arbitrary client/plugin compatibility.
- Real Studio re-inspection after Redo, and verification of proposal status via MCP, remain useful additional evidence.

**Remaining boxes above are deliberately open.** Passing Node CI or one successful Studio session does not certify every editor scenario, browser/desktop MCP host, or third-party plugin integration.

