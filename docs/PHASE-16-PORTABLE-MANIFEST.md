# Phase 16: Portable project context (V1.8 candidate)

## What problem this solves

In V1.3–V1.7, a project brief exists only in the running daemon. Restart the bridge and its project identity, preserve/avoid rules, style, constraints and user-supplied resource links are gone. This phase adds a **user-run**, versioned JSON import/export workflow so the same planning context can be restored later without an agent inventing or silently scraping decisions.

This is **not** automatic project memory, a project-file indexer, a web crawler, an editor controller or a persistent record of the user's Studio edits. It adds no MCP tool and no new Studio privileges. The saved manifest can be used with a different compatible local MCP host because the import goes through the existing authenticated local daemon.

## Workflow (run on your PC)

Start the daemon, create a brief through the existing MCP tool \`lazydev_create_project_brief\`, and copy its returned \`briefId\`. Then run:

\`\`\`powershell
npm run project:manifest -- export "BRIEF_ID_FROM_MCP" ".lazydev/project.json"
\`\`\`

The file is created exclusively: **export fails rather than overwriting an existing manifest**. Review it locally. On a later session or after restarting the daemon:

\`\`\`powershell
npm start
# In another terminal:
npm run project:manifest -- import ".lazydev/project.json"
\`\`\`

Import returns a **new session-local briefId**. Pass it as \`projectBriefId\` to \`lazydev_plan_competency_task\`. It never replaces earlier briefs or edits an existing project. Changing the stored brief is an explicit human edit of the JSON followed by another import, subject to the exact same strict validation as an MCP-created brief.

## Portable fields, provenance and privacy

Schema: \`lazydev.project.v1\`. The file stores only \`brief.projectName\`, \`creativeDirection\`, \`style\`, \`preserve\`, \`avoid\`, \`constraints\`, and bounded \`sourceLinks\` (\`title\`, \`url\`, \`kind\`, \`rightsClaim\`, \`note\`). Each link is reclassified by the daemon as **user_supplied_link / not_fetched / not_independently_verified**, even if a manifest attempts to claim more. Extra fields are rejected, including \`licenseVerified\` and ephemeral \`referenceIds\`.

Session-bound images and GIFs are **not saved**. The manifest records the number omitted at export but never reuses their stale IDs. Reimport approved media separately through \`npm run reference:import\` and create a new brief with the fresh IDs if they are needed. No image bytes, Studio snapshots, source code, audio, Blender assets, benchmark evidence, API keys, or authorization tokens enter the manifest.

Both CLI operations name a single file explicitly, read/write at most 24 KiB of manifest text, and use the existing authenticated localhost MCP relay. Import rejects symlink files and unknown schemas; export uses exclusive creation (\`wx\`) and a restrictive mode on compatible systems. **No folder scanning or background persistence** occurs. The directory may contain private creative information; keep it out of public repositories unless deliberately reviewed. A root \`.gitignore\` excludes \`.lazydev/\` by default.

## Verification and boundaries

Automated Node tests cover schema validation, rights/provenance stripping, exclusion of transient references, duplicate prevention, expiry/restart recovery, symlink refusal, no overwrite, and reuse in a competency plan. The test uses a mocked RPC route into a fresh \`DevKitState\`, not a live daemon. Real Windows filesystem permissions, local host connectivity and actual AI client behavior still require testing.

This is the **project continuity layer**, not evidence that the AI sees, understands, or evaluates gameplay accurately. The next critical milestone remains an observed end-to-end Studio session using native Studio MCP plus LAZY specialist evidence on one disposable place, followed by a genuinely reviewed animation/VFX iteration. Eclipse and Sine editor automation remain unverified.
