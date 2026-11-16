---
name: reference-review
description: Deconstruct explicitly imported still-image or animated GIF references into grounded Roblox art/VFX/animation implementation ideas and evidence-based quality checks.
---

# LAZY DevKit: Reference review

Only analyze media that the developer supplied or explicitly imported. List available assets using `lazydev_list_references`; read the exact `referenceId` with `lazydev_read_reference`. If no media is present, request user-initiated import rather than guessing. For current Studio output, inspect separately approved viewport evidence and read the returned image, not just metadata.

## Observed reference anatomy

Preserve the user's stated target and the actual media instead of replacing it with a generic anime/VFX recipe.

- For still images: subject and silhouette, depth/layers, material treatment, color hierarchy, highlights/shadows, focal point, framing, and legibility.
- For GIFs: duration, real delay values, first/peak-change/last frame samples; estimate visible anticipation, acceleration, action, impact, hold and recovery. Describe uncertainty when keyframes or encoded delays cannot establish the exact movement.
- For VFX: core/secondary layers, emit directions, trails, flashes, particles, decals, lighting, screen effects, and ways effects interact with motion and camera.
- For animations: possible rig poses, pose transitions, timing/easing hypotheses and IK/secondary motion; do not claim original keyframes or curves have been recovered.
- Separate three fields: **Observed**, **Inferred**, **Unknown**. Offer multiple implementations when the pixels cannot distinguish alternatives.

## Quality and recreation plan

Judge within the developer's project identity and gameplay use case. Compare silhouette/readability, composition, visual hierarchy, palette/style coherence, motion timing, effect layering, gameplay communication, accessibility, and actual performance evidence when available. Measured luminance/saturation/edges/frame changes are supporting proxies, not universal quality scores.

For each significant gap provide a proposed technique and how to verify it (e.g., viewport image at matched camera, actual playtest, timed frames, Studio Output, or particle counts). Provide concise prioritized fixes, not arbitrary lists. Include performance and copyright-safe original adaptation constraints.

Read `motionEvidence` from the reference and sequence results. Its onset/peak/quiet labels indicate changed pixels only, not semantic impact or recovery. In particular, static camera, lighting, exposure and UI must be considered before interpreting any peak. Do not fabricate video/GIF content beyond returned keyframes, assume a source asset's editing files are available, claim native Studio screenshots are synchronized to a GIF beat, or promote external Sine/Eclipse tools beyond their documented interfaces. The developer approves changes through existing Studio or native MCP permissions.
