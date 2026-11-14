# LAZY DevKit

A public, local-first, model-independent experiment for safer AI-assisted Roblox development. **V0.3 adds experimental local desktop MCP packaging and token handoff to the script-review and structural inspection bridge. It is not a finished visual development agent.**

Start with [docs/START-HERE.md](docs/START-HERE.md) for product decisions. The implementation below is deliberately smaller than the long-term vision.

## What is implemented in V0.3

- Portable local MCP packaging and connection instructions for ChatGPT Desktop, Claude Desktop, Claude Code, and Codex. Individual-client installations remain **unverified**.
- One persistent localhost Studio daemon, plus independent lightweight stdio clients. Supported ChatGPT, Claude and Codex clients can read the **same opt-in observations** without competing for the Studio port.
- A private per-user token handoff for local clients. Run `npm run session` to view the active token locally; never share it with an AI.
- Dependency-free Node.js stdio MCP server with seven tools: list/read opted-in script snapshots, propose whole-source or exact-span changes, check proposal status, and list/read bounded Studio hierarchy snapshots.
- Optional exact-span edit proposals reject missing or repeated matches; the result is still a complete-source proposal that must be reviewed and explicitly approved in Studio.
- Read-only hierarchy snapshots: up to 128 Instances and depth 4, with a narrow allowlist of BasePart and GUI properties. Names and class identities are collected, but **no script source, arbitrary properties, or runtime values** are collected by this feature.
- Token-protected localhost HTTP bridge for a manually operated Studio plugin.
- Studio plugin source providing a **manual** inspect, proposal review, approve, or reject flow; source changes use `ScriptEditorService:UpdateSourceAsync` and Studio undo recording.
- SHA-256 snapshot preconditions, exact-source check inside the plugin, single pending proposal per snapshot, size limits, loopback binding, and no autonomous application.
- Node unit and HTTP integration tests (`npm test`).

**Not verified:** Running the Luau plugin inside a real Roblox Studio session, plugin installation on particular Studio releases, network permissions on users' machines, complete MCP host compatibility, visual inspection, desktop automation, third-party plugin control, and gameplay behavior. These require hands-on integration tests.

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

## Safety and limitations

- The session handoff file is convenient, not a credential vault. Other applications under your Windows account may read it; stop the bridge to invalidate the token, and don't use shared Windows accounts.
- Localhost is **not** automatically trustworthy. A separate bearer token protects every HTTP route and browser-origin requests are rejected; a local process with the token still has the session's privileges. Do not bind this service to a public interface.
- The model can **propose** script source, but cannot directly apply it. The Studio user chooses when to share source and whether to commit a proposal.
- Exact-span edits are calculated against the captured script source, then delivered as full replacements to the Studio plugin. This is **not** an AST-based patch or collaborative merge. Exact-span matching refuses missing and ambiguous text; Studio must also reject changes to the source after inspection.
- Structure inspection deliberately captures only a bounded subset of Instances and allowlisted properties; a truncated tree must never be mistaken for a complete project scan. All captured names and scripts must be treated as untrusted inputs.
- Studio source recording is an undo mechanism, not a durable backup or guaranteed rollback after a crash. Use version control and test in a disposable place first.
- The bridge never executes user-submitted source, loads assets, controls third-party plugins, captures screens, or contacts external endpoints.

## Next evidence gates

Validate the plugin, `inspect-tree` payload, HTTP permission, scoped proposals, concurrent editor changes and Studio undo on an actual Windows Studio build. Then extend the prototype with a proper side-by-side diff, runtime diagnostics, event-driven observations and optional screenshot collection. No screenshot capture or specialist tool automation is currently implemented.

See [Phase 2 implementation](docs/PHASE-2-IMPLEMENTATION.md) for the data contract and verification boundaries. Don't add desktop-input automation without scoped permissions and an emergency stop.
