# Phase 13: Knowledge and controlled benchmark foundations (V1.5)

**Implementation:** Local, read-only source metadata (19 records), eight disciplinary method packs, bounded task-oriented retrieval and five **unrun** controlled baseline-versus-informed benchmark definitions. The existing competency plan now includes related knowledge and benchmark candidates. All data is project-agnostic.

**Not implemented:** live web retrieval, asset ingestion, source/code copying, live Studio/Blender tests, measurement instruments, persistent benchmark results, automated artistic scoring or ownership of Eclipse/Sine plugin editor UIs.

Sources include official Roblox docs/resources, original source repositories, artist production records, primary tutorials, genuine feedbacked devlogs and first-party game development postmortems. Each record has creator, primary URL, disciplines, evidence tier (A inspectable and scrutinized, B primary but limited independent scrutiny, C observational shipped-game acclaim), techniques, caveats, checked-on date and restrictive rights. **No catalog listing grants copying, redistribution or embedding permission.** See [the creator register](research/CREATOR-STUDY-2026-11.md).

## Commands

```sh
npm test
npm run knowledge -- list
npm run knowledge -- query "Build a sword effect" --disciplines animation,vfx --limit 5
npm run knowledge -- benchmarks
npm run knowledge -- benchmark vfx-audio
npm run competency:plan -- "Create an animated effect" --disciplines animation,vfx,sfx
```

The same discovery and query operations are available as **read-only MCP tools** `lazydev_list_knowledge`, `lazydev_query_knowledge`, `lazydev_list_benchmarks`, and `lazydev_plan_benchmark`.

## The five research-led tests

`movement-authority`: traversal response and client-server security. `animation-contact`: rig contact and expressive action. `environment-kit`: original modular environments and construction tradeoffs. `vfx-audio`: anticipation, impact and audio at real gameplay distance. `blind-onboarding`: actual player understanding and revision.

Each definition specifies the shared task, raw objective measures to collect, human-review questions and needed instruments. Compare **the same task, game, hardware and rubric** in uninformed and informed conditions. Record artifact IDs, source/commit versions, tool versions, real measurements and reviewer notes. An informed attempt can lose. No outcome is asserted by the definitions.

## Next phase

Execute one controlled animation/VFX benchmark in a disposable Studio place after obtaining local user permission. Require actual playtest/capture evidence before discussing quality; desktop integration and specialist tool APIs are still unverified. The official Roblox Blender add-on v1.0.5 release specifically targets Blender 5.0/5.1 and may not be compatible with older versions, so check **installed version** before use. Sine's public repository rights are unverified; do not ingest bundled assets. Spray carries MPL-2.0, not MIT.

**Research provenance date:** 2026-11-16. No network checks occur when retrieving recommendations.
