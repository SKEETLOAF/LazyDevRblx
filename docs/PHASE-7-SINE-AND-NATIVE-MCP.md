# Phase 7: Sine runtime evidence and official Studio MCP coexistence (V0.8)

## Design reason

LAZY DevKit has a working V0.3 user-confirmed inspection/script-approval/Undo/Redo workflow, with V0.4–V0.7 newer capabilities passing Node tests but still awaiting real Studio UI verification. This release adds a **small actual specialist integration** without falsely claiming proprietary editor control.

Roblox's own MCP server now supports hierarchy/script inspection, console diagnostics, viewport images, `execute_luau`, `multi_edit`, asset/animation generation, simulated input and playtesting. Rather than proxy or duplicate it, DevKit's specialist layer remains a **separate** local MCP plugin for opt-in evidence, review, compatibility decisions and narrow adapters.

Authoritative current sources:
- [Roblox official Studio MCP plugin](https://github.com/Roblox/roblox-studio-agent-plugin) and [Creator MCP documentation](https://create.roblox.com/docs/studio/mcp)
- [Sine runtime API, developer repository](https://github.com/RoPotat0/Sine-VFX/blob/main/docs-site/docs/api.md)
- [Sine runtime installation, developer repository](https://github.com/RoPotat0/Sine-VFX/blob/main/docs-site/docs/module.md)
- [Sine transformed-object structure](https://github.com/RoPotat0/Sine-VFX/blob/main/docs-site/docs/transform.md)
- [Eclipse Animator store description](https://create.roblox.com/store/asset/86116556258301) and [Eclipse Blender add-on source](https://github.com/riftkuro/eclipse-blender)

## Critical correction: What Sine's shared.sv actually does

Sine's documentation says that **planting** the runtime writes `ReplicatedStorage.SineVFX`. When a **client** requires it, the module registers `shared.sv` with `emit(target)`, `enable(target)`, and `disable(target)`. These effects render per-client; running them from a server context is not supported. `shared.sv` is **not documented as an editor-control API for Sine's windows**.

Do not call `shared.sv` from the LAZY DevKit Studio plugin. Do not `require` the planted runtime as an inspection trick. Authoring is still done with Sine's own editor until a verified editor-specific interoperability surface exists. Developer docs say to re-plant the module after authoring changes to refresh the shipped snapshot.

A normal client-side example, after Sine has planted the module and the target has replicated:

```lua
-- LocalScript example, not code the DevKit inspector executes
local VFX = require(game.ReplicatedStorage:WaitForChild("SineVFX"))
local target = workspace:WaitForChild("Fireball"):WaitForChild("Explosion")
VFX.emit(target)
-- VFX.enable(target) -- for a continuing effect
-- VFX.disable(target) -- to stop the continuing effect
```

Only insert such a script through a separately reviewed source proposal, or via the official Studio MCP with the developer's permission.

## What V0.8 actually implements

In the Studio plugin, **Preview Sine runtime and selected effect (read-only)** collects only:
- The class of the `ReplicatedStorage.SineVFX` child, or `none` if absent; a ModuleScript means `module_present`, **not** proof of correct runtime behavior
- Zero or one selected DataModel object's path and class
- Up to 16 CollectionService tag names on that selection, with a truncation marker
- Whether the selected object has an immediate child `Properties` of class Folder

Preview is local. **Share previewed Sine inspection with MCP** posts this frozen evidence to an authenticated loopback `POST /v1/studio/specialist/sine` endpoint. **Discard** sends nothing.

The server validates the exact schema, limits text/tags, stores at most 20 temporary reports, and exposes two read-only tools:
- `lazydev_list_sine_inspections` returns metadata without code
- `lazydev_read_sine_inspection` returns selected evidence plus static usage guidance with explicit non-verification caveats

No source, assets, arbitrary attributes, methods, ModuleScript contents or plugin settings are exported. No game modifications, plugin calls or effects are triggered. Tag or folder presence is a clue, not sufficient proof of a correctly transformed effect.

## Official native Studio MCP: complement, do not replace

`npm run native:mcp:check` is an **optional offline check**: on Windows it looks for `%LOCALAPPDATA%\\Roblox\\mcp.bat` and the existence of `~/.codex/config.toml`; on macOS it checks common app bundle locations. It prints only booleans and `connection: not_tested`; it **does not read host config contents, expose secrets, install, register, start or test native MCP**.

Actual native MCP setup belongs to Roblox Studio Assistant → Manage MCP Servers / Quick Connect, which has its own permissions and may already be registered as `Roblox_Studio`. LAZY DevKit's `lazy-devkit` server should remain separate. Do not launch a second native Studio server or silently raise authorization levels.

## Eclipse Animator status

Eclipse advertises a module exporter and Blender interchange; its developer's `riftkuro/eclipse-blender` repository documents companion controls and exchange formats. V0.8 adds **no Eclipse editor control** because no safe, general external editor API has yet been verified. A future adapter may validate a specific exported ModuleScript or known interchange file, compare poses/timings, and support read-only animation evidence before offering edits.

## Verification boundaries and next steps

Node tests confirm inspection schemas, source rejection, caps, authentication, MCP reads, bounded retention, and the offline preflight. The Studio plugin interaction itself is not yet verified, nor is an end-to-end Sine runtime playback, official native MCP coexistence, or any direct Eclipse/Sine editor integration.

Next practical work: verify a Sine-tagged disposable effect in Studio; observe actual playback **in a client**; compare expected timing/appearance with captured visual evidence; evaluate Eclipse export interchange against original frames. Never claim a third-party plugin was operated without testing that particular integration.
