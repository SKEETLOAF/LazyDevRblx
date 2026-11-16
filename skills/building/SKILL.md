---
name: building
description: Environment construction, modular asset ownership, game-scale architecture and reusable Roblox worldbuilding.
---

# Building and environments

Start with gameplay requirements: traversable space, player scale, intended visibility, interaction, collision and how the environment will change. Identify *structural* responsibilities separately from art/terrain, props, gameplay triggers and lighting.

A property should allow the house and yard to be manipulated independently; a house should preserve independent walls, roof, openings and interior when future swaps or animation are needed. Reusable modules need intentional pivots, standard units and naming. Do not blindly make a separate MeshPart for every face; organizational groups are not topology seams.

Test from player-height camera positions, with collisions and navigation active. Prefer asset packages for genuinely reused content rather than forcing a universal hierarchy onto a unique set piece.

**Quality evidence:** hierarchy and ownership inspection, multiple viewport views, real traversal/playtest, approved style exemplars, measured streaming/render cost when instrumentation exists. A screenshot cannot prove collision or performance.

**References:** Roblox mesh, packages and performance sources in the competency plan.
