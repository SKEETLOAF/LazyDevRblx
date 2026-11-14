# V0 / V0.3 Studio integration verification (partially executed)

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

## Evidence recorded from first real Windows Studio session (2026-11-14)

- A user-operated local Studio plugin successfully captured `Workspace.DevKit Probe` and its `Marker` Part (two nodes); the connected ChatGPT MCP client read that stored snapshot with its reported property values.
- The user inspected a disposable script in `ServerStorage`. ChatGPT proposed changing `local value = 10` to `local value = 20`; a screenshot showed old and proposed source in Studio's manual review panel.
- The user reported the edit was applied without a visible error and separately confirmed both **Undo and Redo** worked.
- These checks validate one tested read/propose/apply/undo/redo path. They do **not** establish general safety under concurrent editing, crash recovery, performance, or arbitrary client/plugin compatibility.
- Real Studio re-inspection after Redo, and verification of proposal status via MCP, remain useful additional evidence.

**Remaining boxes above are deliberately open.** Passing Node CI or one successful Studio session does not certify every editor scenario, browser/desktop MCP host, or third-party plugin integration.

