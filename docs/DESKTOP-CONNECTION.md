# Desktop connection: local-first V0.3

**Status:** Experimental package, not yet verified in ChatGPT Desktop. Windows-first. Roblox Studio and the MCP bridge must run on the same PC and Windows user account.

## Observed evidence

- One real Windows Roblox Studio inspection successfully sent a selected two-node hierarchy to the localhost bridge. This establishes the Studio-to-Node HTTP path for that test.
- Existing Node tests validate MCP stdio tools and simulated Studio HTTP payloads. They do not validate MCP client import or edit approval inside Roblox Studio.

## Packaging

- Root `plugin.json` is the portable Agent Plugins manifest.
- Root `mcp.json` configures a local stdio server launched with `node ${PLUGIN_ROOT}/src/main.mjs`.
- `.agents/plugins/marketplace.json` contains a local repo marketplace entry referencing the repository root, so the server files are not duplicated.
- `skills/studio-connection/SKILL.md` describes safe opt-in inspection and review.
- `src/session.mjs` provides a temporary per-user session token handoff for hosts that hide stderr, accessible locally via `npm run session`.

OpenAI documents local plugin marketplaces and MCP packaging in https://developers.openai.com/plugins/build/plugins. Public listing of local MCP plugins separately requires approved partner status: https://developers.openai.com/plugins/deploy/desktop-only. This package is **not** a public ChatGPT plugin.

## PC test procedure

1. Save your Studio place and keep Studio open. In PowerShell, stop the manually launched bridge with Ctrl+C before allowing a desktop host to start a new bridge on port 43187.
2. Pull `main` and run `npm test` on your PC.
3. In ChatGPT Desktop, open Plugins and look for the LAZY DevKit local marketplace plugin if your client supports repo marketplace discovery. This is **not guaranteed** to be available for every user, version or workspace.
4. If the local plugin installs and starts, run `npm run session` from the checked-out repository to see the active token on your PC. Paste it privately into the existing Studio plugin.
5. In Studio, select `Workspace.DevKitProbe` and click `Inspect selected hierarchy (no script source)`.
6. In the MCP-enabled desktop chat, ask for `lazydev_list_structures`, then `lazydev_read_structure` with the returned structureId. Verify the folder and Marker appear, and compare the node count.
7. For script edits, use only a disposable place and follow the separate manual approval checklist.

## If unavailable

- A browser ChatGPT chat and regular mobile chat cannot directly access your PC's 127.0.0.1 server. Do not expose the existing Studio HTTP port to the public internet.
- If the local marketplace entry is not discoverable, use an approved supported local MCP client for testing or report the blocker. Do not assert that the connection works.
- Opening a second Node process while the manual bridge is active causes a port conflict. Stop the first process before trying again.

## Security

- The session file is in the current user profile at `~/.lazy-devkit/session.json`, and contains a bearer token. Other software running as your Windows account can potentially read it.
- Never send a session token in chat, commit it to GitHub, or include it in a screenshot. Restarting the bridge rotates it.
- Installed Roblox Studio local plugins are not automatically updated by `git pull`; reinstall the plugin script when changed.
- The MCP client cannot claim gameplay or editor correctness from a Studio-reported receipt. The Studio integration and undo behavior still need real end-to-end verification.
