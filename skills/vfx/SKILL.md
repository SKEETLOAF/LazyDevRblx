---
name: vfx
description: Layered Roblox visual effects production, timing, cleanup, gameplay readability and performance review.
---

# VFX and technical art

Describe the player-facing event, required telegraph, camera distance, visual direction, duration and style. Deconstruct references into core form, secondary motion, sparks/debris, trails/beams, lighting, screen treatment and decay, with evidence and uncertainty.

Choose emitters, attachments, beams, trails, animated meshes or UI overlays according to desired spatial behavior. Keep gameplay state and hit detection independent from cosmetic completion. Separate effect anchors, reusable layers, sound hooks, cleanup ownership and quality tests in the asset structure. Do not spam emitters, bloom or permanent effects to mask weak shapes.

Sine's documented `shared.sv` is a planted **client runtime** shortcut, not proof of editor automation. Prefer supported editor actions or user handoff until access is verified.

**Quality evidence:** approved screenshot sequence, real reference timing, structure, mobile-game camera checks and measured emitter/frame cost. A numeric pixel-change peak does not prove impact quality.

**Blender facts:** Inspect source meshes and collections when effects use authored mesh geometry. Runtime emitter density, timing, cleanup and performance still require Studio observations.

**References:** Roblox effects and performance docs from the competency router.
