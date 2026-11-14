# LAZY DevKit: Windows PC multi-client connection

**Status:** Experimental, not yet verified in live ChatGPT Desktop, Claude Desktop, Claude Code, or Codex sessions. The user has confirmed one successful Studio-to-localhost hierarchy inspection with two nodes. The Node tests verify bridge and simulated multi-client traffic, not each AI client installation.

## Architecture

1. Run **one persistent daemon** on Windows using `npm start` in the LAZY DevKit repository. It owns the authenticated HTTP endpoint `127.0.0.1:43187` and the shared state.
2. The Roblox Studio plugin uses the daemon's private bearer token for manual hierarchy and source inspections, and for the Studio-side approval process.
3. Each supported MCP host launches a small stdio **client**, `src/stdio-client.mjs`. Clients read their token from the same Windows user-profile session file and relay calls through the daemon. They cannot directly apply script edits.
4. Stop the daemon to clear all in-memory observations and invalidate its token. Launching another daemon on the same port results in a clear conflict.

Do not install a second listening bridge per AI client. Do not expose the loopback port or copy its bearer token into prompts or committed settings.

## First Windows trial

1. Keep your disposable Studio place open. Stop the old bridge with Ctrl+C, update the checkout using `git pull origin main`, and run `npm test`.
2. Launch `npm start` once in PowerShell. Leave that one process running.
3. In another PowerShell tab, run `npm run session` and privately paste its verified token into the Studio LAZY DevKit panel. Do not send or screenshot the token.
4. If ChatGPT Desktop supports repo-local plugin marketplaces, install the repository plugin from `.agents/plugins/marketplace.json`. Root `mcp.json` launches the stdio relay, **not** the daemon. The current session still needs an actual ChatGPT Desktop tool-discovery test.
5. In Studio, select `Workspace.DevKitProbe`, press **Inspect selected hierarchy**, and request `lazydev_list_structures` and `lazydev_read_structure` from the MCP-enabled desktop client. The real 2-node folder/Marker result should appear.

## Claude Desktop, Claude Code and Codex

Use the same source files and running daemon. On the same PC, from the repository directory, generate path-correct setup snippets using:

```powershell
node scripts/print-client-config.mjs claude-desktop
node scripts/print-client-config.mjs claude-code
node scripts/print-client-config.mjs codex
```

- **Claude Desktop:** Merge the generated `mcpServers` object into the existing `%APPDATA%\Claude\claude_desktop_config.json`; preserve other entries. Restart Claude Desktop and inspect its MCP tools.
- **Claude Code:** Run the generated `claude mcp add` command; verify with `claude mcp list`. The configuration is independent of model subscription limits.
- **Codex CLI:** Add the generated `[mcp_servers.lazy-devkit]` block to the existing `~/.codex/config.toml` without overwriting unrelated entries; verify with `codex mcp list`.
- **ChatGPT Desktop / Codex plugin:** Import from the repo-local marketplace if that UI is available. Root `mcp.json` points at the same relay. This local plugin has not been submitted to the public directory.

Claude and Codex's local MCP capabilities and configuration instructions are documented by their providers: [Anthropic MCP](https://docs.anthropic.com/en/docs/mcp), [Codex MCP](https://learn.chatgpt.com/docs/extend/mcp), and [OpenAI plugin packaging](https://developers.openai.com/plugins/build/plugins). Client UIs and availability can change; if a client cannot load this package, record the exact error rather than claiming compatibility.

## Safety and verification

- Every AI can **inspect** opted-in observations and **propose** modifications. Only the Studio plugin can apply changes following explicit user approval. No client can bypass the script-review UI through the exposed MCP tools.
- The session file `~/.lazy-devkit/session.json` contains a secret and is only suitable for a trusted Windows user account. Other programs under the same account may be able to read it. `npm run session` prints it **locally**, not into an MCP result.
- GitHub updates do not automatically update your installed local Roblox Studio plugin. Reinstall it manually only when its Lua source changes.
- Each client needs real host testing: initialization, tool listing, shared snapshot read, disconnection recovery, and a disposable script proposal/rejection. Green Node CI is not a substitute.
- No screenshot, visual output, automated third-party animation/VFX plugin access, or actual script apply+undo test has been completed yet.

See [Studio integration checklist](V0-INTEGRATION-CHECKLIST.md) for remaining runtime gates.
