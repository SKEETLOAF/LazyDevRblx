---
name: scripting
description: Maintainable Luau systems, architecture, client-server security, replication, profiling and regression tests.
---

# Scripting and technical systems

Inspect nearby code and state ownership before editing. Record expected behavior, edge cases, relevant modules, data boundaries, constraints and rollback. Keep high-impact rules server-authoritative, validate RemoteEvent input, distinguish client visuals from gameplay state, and handle cleanup and disconnection.

Use small testable modules, clear interfaces, project conventions and scoped changes. Avoid rewrites that discard established architecture without evidence. Optimize based on real profiling instead of arbitrary 'performance' claims.

**Quality evidence:** reviewed source snapshot, actual playtest assertions, server/client replication checks, known Output diagnostics and profiler measurements where available. No warnings in Output is insufficient to prove correctness.

**References:** Roblox security tactics and performance diagnostics in the competency plan.
