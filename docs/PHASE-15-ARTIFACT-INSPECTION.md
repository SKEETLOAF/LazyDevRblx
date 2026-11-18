# Phase 15: Creative artifact inspection (V1.7)

## Scope

The V1.2–V1.6 development competency system can now receive **real local source-asset facts** in addition to previously authorized Roblox Studio hierarchy, viewport, reference and playback observations. This is deliberately narrow: the tool does not build models, modify rigs, drive Moon/Eclipse/Sine, listen to sound, edit UI or certify professional quality. It does, however, give the agent inspectable Blender geometry/organization metadata and WAV signal measurements instead of guessing.

## Exact opt-in workflow

On your own trusted project, use Node >=20. Blender must be on PATH or specified with \`--blender\`.

\`\`\`powershell
npm run artifact:inspect -- wav "C:/Project/audio/impact.wav" --out "C:/Project/reviews/impact.json"

npm run artifact:inspect -- blender "C:/Project/models/creature.blend" --out "C:/Project/reviews/creature-audit" --previews
# For custom installation: append --blender "C:/Program Files/Blender Foundation/Blender 4.5/blender.exe"

npm start
# In another terminal, when you decide to share only the report:
npm run artifact:import -- "C:/Project/reviews/creature-audit/audit.json"
\`\`\`

The Blender inspection launches a subprocess with \`--background --factory-startup --disable-autoexec\` and a fixed, shipped read-only inspection script. It opens **only the selected .blend file**, does not save it, and writes \`audit.json\` in an intentionally **new** output folder. With \`--previews\`, it attempts three 512px Workbench renders \`front.png\`, \`side.png\` and \`three-quarter.png\`. These are automated diagnostic angles, not exact artist views. \`--disable-autoexec\` reduces embedded-script risk but is **not a sandbox**: only open trusted Blender sources. Blender render compatibility is not tested in CI or in the user's installation.

The JSON describes object names, parent and collection relationships, mesh vertex/face totals, UV layer count, material slots, modifier types, armature bone count and associated action names. It **does not** reveal detailed edge topology, animation curves, weighting quality or visual appearance. For the agent to see actual renders, the user must separately import approved preview PNGs with \`npm run reference:import -- "C:/Project/reviews/creature-audit/front.png" --label "Diagnostic front"\` after inspecting them locally.

WAV inspection accepts supported little-endian RIFF PCM or IEEE float files: 8–64 bit depending on encoding, up to eight channels, 384 kHz, 10 minutes and 32 MiB. It reports sample peaks, RMS, DC offset and candidate clipping. It does **not** play audio, detect subjective distortion reliably, judge timbre/mix or transcribe content. Compressed WAV and some extended formats are intentionally unsupported.

The audit-importer explicitly reads just the named JSON report, validates it, and sends metadata only to the existing authenticated localhost daemon. **No .blend, WAV or PNG bytes are uploaded by this command.** No automatic project scanning is done.

## New MCP integration

Four new tools: \`lazydev_record_artifact_audit\`, \`lazydev_list_artifact_audits\`, \`lazydev_read_artifact_audit\`, and \`lazydev_compare_artifact_audits\`. Their audit IDs are bounded to a **session-local store of up to 20 reports**. The comparison shows Blender object-name/structure/count changes or WAV peak/RMS/duration differences for the same filename and format. Renames show as one removed and one added object, not as persistent object identity. Reports have \`verification: not_independently_verified\` and \`qualityVerdict: not_assessed\`.

Competency plans now support \`blender-audit\` or \`wav-audit\` evidence kinds for conditional source checks in modeling, building, animation, mesh VFX and WAV SFX. Without one, their status is \`conditional_unverified\`, not universal failure. With a matching stored audit ID, the status is \`ready_for_review\`, **never automatically passed**. Studio-only workflows need no Blender source, and non-WAV audio production does not require conversion.

Use audits to investigate whether a roof and walls remain independently editable, whether meshes have UV layers, whether an authored animation actually has an action assigned, whether geometry exploded in count, or whether a sound may clip. Judgments about shape, motion, coherent artistic direction, audio experience, performance, interactivity, and actual gameplay still require images, playback, tests and human evaluation.

## Documentation and testing

Relevant Blender primary references:
- [Blender command-line options](https://docs.blender.org/manual/en/latest/advanced/command_line/arguments.html)
- [Scripting and security](https://docs.blender.org/manual/en/latest/advanced/scripting/security.html)
- [Blender Python API](https://docs.blender.org/api/current/index.html)

Automated Node tests cover WAV samples, malformed chunk rejection, schema validation, data caps, explicit CLI output, local bridge authentication, report comparison and expiration, read-only metadata, and evidence-only gate semantics. **Actual Blender executable, render compatibility, meshes and audio audition are not present in CI**. A real Windows Studio/Blender smoke test is still required.

## Next capability

Add supported real editor actions and user-approved iterative visual review. Native Studio MCP is the preferred Studio actuator where it has official support; safe Blender automation will need per-operation approval, a diff/revert strategy, and real testing before it can be used on the developer's projects.
