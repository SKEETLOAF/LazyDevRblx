# Phase 14: Session-local benchmark evidence ledger

**Implemented:** bounded session-local recording of operator-supplied benchmark attempts, required links to existing LAZY evidence IDs, and conservative baseline/informed numeric comparisons. **Not implemented:** live Studio automation, real benchmark completion, automatic quality grading, persistent run history or independent verification of operator-supplied measurements.

## Run a controlled experiment

Use the five benchmark plans from [Phase 13](PHASE-13-KNOWLEDGE-BENCHMARKS.md). Begin with `animation-contact` or `vfx-audio` in a **disposable Roblox Studio place**. Capture a user-approved viewport/sequence/playtest using LAZY's existing bridge. For each attempt, explicitly record the benchmark ID, baseline/informed role, git commit, actual Studio build, hardware, tester label, present evidence IDs and optional numeric readings with units and measurement method.

Three additional MCP tools:
- `lazydev_record_benchmark_run`: stores a declared run **only if at least one evidence ID is present in this active local daemon session**. It makes no Studio changes.
- `lazydev_list_benchmark_runs`: lists local run metadata.
- `lazydev_compare_benchmark_runs`: only compares matching measurement names, units and methods from one baseline and one informed run of the same task. It reports differences and control mismatches, never a quality verdict.

Session records expire and are deleted when the daemon exits; at most 20 are retained. Do not enter personal secrets, local paths or proprietary material into free-text notes. A reported metric is **not** a measured metric until a reviewer inspects its origin. A viewport ID existing proves only that it was recorded, not that content meets a gate.

## First live handoff

1. Open an original disposable place in Roblox Studio on the user's machine.
2. Confirm the currently installed Studio build and LAZY bridge's actual Studio connection, plus authorized tools. Do not claim official Studio MCP and LAZY are integrated unless tested.
3. Choose `animation-contact`: produce a brief original action using native Roblox animation tools. Collect a frame sequence and rig structure if supported; repeat with research-informed contact control.
4. Record both attempts only after evidence has been explicitly captured and reviewed. If the user prefers `vfx-audio`, inspect effect cleanup/readability and listen to original audio; there is no automatic audio-quality test yet.
5. Compare the operator-supplied measurements under the same device/method and gather actual human feedback. Report failures and unavailable instruments honestly.

**Never** copy licensed third-party rigs, asset libraries or effects to create the test. Never infer access to Eclipse/Moon/Sine editor UIs from plugin marketing.
