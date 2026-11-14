# LAZY DevKit

A public, local-first, model-independent experiment for safer AI-assisted Roblox development. **V0 is an executable inspection and permissioned script-edit proposal bridge, not a finished visual development agent.**

Start with [docs/START-HERE.md](docs/START-HERE.md) for product decisions. The implementation below is deliberately smaller than the long-term vision.

## What works in V0

- Dependency-free Node.js stdio MCP server with four tools: list inspected scripts, read one opted-in source snapshot, propose a complete replacement, and check proposal status.
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

The bridge listens on `127.0.0.1:43187`. It prints a **new random token to stderr** at startup. Paste that token into the plugin review panel. Do not commit or share the token. When an MCP client launches `npm start` as a stdio server, its stdout remains reserved for newline-delimited JSON-RPC. The MCP client and Studio plugin must connect to the **same running process**; launching a second server on the same port will fail.

Example *conceptual* MCP stdio client command: `node /absolute/path/to/LazyDevRblx/src/main.mjs`. Exact client configuration varies and is **not yet host-certified**. The bridge exits when its hosting process is stopped; all observations and proposals are in memory only.

## Local Studio plugin: manual test workflow

1. Open a disposable Roblox Studio place. Use Studio's local-plugin workflow to install `studio/LAZYDevKit.plugin.lua` as a plugin Script. Do **not** paste it into a live game's runtime scripts.
2. Start the local bridge from a terminal or from your MCP host. Open **LAZY DevKit** from the Studio Plugins toolbar and enter the session token shown in the process's stderr.
3. Select exactly one `Script`, `LocalScript`, or `ModuleScript` in Explorer. Click **Inspect selected script**. This deliberately sends its edit-time source to the local bridge; no source is shared by default.
4. Use an MCP-capable agent in that **same bridge process**. Call `lazydev_list_observations`, then `lazydev_read_observation`. Propose a safe change with `lazydev_propose_script_edit`, passing the matching `snapshotId`, `sha256` as `expectedSha256`, the complete proposed source, and a reason.
5. In Studio, click **Check for a proposed edit**. Compare the complete current and replacement source in the read-only panel. Click **Reject** or **Approve and apply with Studio undo**. An approved edit is not an automated functional test.
6. Verify the change in Studio, use Edit → Undo if necessary, and test the game manually. Ask the agent for `lazydev_get_proposal_status`. That status reflects Studio's reported action, **not** proof of correctness.

If `HttpService` asks for permission to contact `127.0.0.1`, approve it for this plugin only if you trust this source and local process. Roblox's local networking rules and permissions may vary by Studio configuration. Network errors should not be interpreted as successful edits.

## Safety and limitations

- Localhost is **not** automatically trustworthy. A separate bearer token protects every HTTP route and browser-origin requests are rejected; a local process with the token still has the session's privileges. Do not bind this service to a public interface.
- The model can **propose** script source, but cannot directly apply it. The Studio user chooses when to share source and whether to commit a proposal.
- Editing is a complete-source replacement, not a semantic patch. Do not use it for large scripts or simultaneous collaborators. A stale edit is rejected if the editor source no longer matches the inspected source.
- Studio source recording is an undo mechanism, not a durable backup or guaranteed rollback after a crash. Use version control and test in a disposable place first.
- The bridge never executes user-submitted source, loads assets, controls third-party plugins, captures screens, or contacts external endpoints.

## Next evidence gates

Validate installation, local HTTP permission, the editor update callback under concurrent source changes, and Studio undo on an actual Windows Studio build. Once proven, expand to structured instance inspection, narrow diffs, event-driven observations, and optional screenshot collection. Don't add desktop-input automation without scoped permissions and an emergency stop.
