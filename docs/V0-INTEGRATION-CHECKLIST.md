# V0 Studio integration verification (not yet executed)

Record Studio version, OS, plugin installation method, date, and evidence for each test. Do not mark a check as passed based only on Node tests.

- [ ] Local plugin opens a dock panel; no source is transmitted before explicit Inspect.
- [ ] Loopback request and user permission work on a fresh Studio installation.
- [ ] Selecting exactly one script sends the editor-visible unsaved source (not an out-of-date `Script.Source`).
- [ ] Unauthorized or wrong-token HTTP requests fail and do not disclose source/proposals.
- [ ] MCP client can initialize, list tools, read an opted-in snapshot, and queue a proposal in the same process.
- [ ] The Studio panel shows the full old and proposed source before approval.
- [ ] Reject leaves source unchanged and returns a rejected receipt.
- [ ] Approve changes the intended script, records one Undo action, and never runs the script as a side effect.
- [ ] Editing source after Inspect but before Approve produces a stale result without overwriting manual edits.
- [ ] Modify an open Script Editor during the callback race; verify `UpdateSourceAsync` cancellation does not overwrite newer edits.
- [ ] Simulate bridge disconnect after a committed update; verify the plugin reports an uncertain receipt, not false success to the MCP agent.
- [ ] Restart the bridge; prior in-memory snapshots are absent, not silently reused.

Until these are confirmed, the Studio plugin is **source-reviewed but untested in Studio**.
