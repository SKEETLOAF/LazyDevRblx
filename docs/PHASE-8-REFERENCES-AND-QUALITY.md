# Phase 8: image/GIF reference deconstruction and quality evidence (V0.9 experimental)

## Objective and trust boundaries

LAZY DevKit needs **visual and temporal references**, not just prompts. This release adds manual import of still images and animated GIFs and exposes the results to compatible MCP clients for reference-guided VFX, animation, environments, and UI work.

A **reference deconstruction** is a hypothesis-driven breakdown of visible technique, not reverse engineering original Luau, particle emitters, rigs, proprietary animation source files, or the creator's editing history. Image pixels do not uniquely determine the original construction. Mark every observation and suggestion as *observed*, *inferred*, or *unknown*. Use provided references only for authorized analysis and original adaptation, not exact copying of protected assets.

### Workflow

1. Update local LAZY DevKit Node code and start `npm start` (no Studio plugin change is required solely for this new import function).
2. A user explicitly runs `npm run reference:import -- "C:\\path\\to\\demo.gif" --label "Orb blast"` on their own PC. The CLI reads **only that file** and sends it to the authenticated `127.0.0.1` bridge. It neither crawls directories nor accepts URL fetches from agents.
3. Call `lazydev_list_references` and `lazydev_read_reference`. Returned data includes verified format, dimensions, source SHA-256, GIF total duration and per-frame timestamps, observed frame-change measures, and actual image blocks.
4. For animation, review the first, visually largest-change, and last composited keyframes (at most 3). Use the full timing and change data to identify plausible anticipation, action, hold, and decay intervals, acknowledging that three stills cannot prove velocity curves or precise motion paths.
5. Ask the user to share an actual Studio viewport screenshot if comparing to the implemented result. Call `lazydev_compare_reference_viewport` for numeric summary differences and visually compare the reference and screenshot at a comparable camera/framing and temporal beat.
6. Produce a **reference anatomy**: image subject/silhouette, depth layers, material/lighting logic, color hierarchy, negative space, camera framing, intended action, approximate animation beats, candidate Roblox techniques, performance hazards, confidence levels and alternative implementations.
7. Recommend original work and measurable iteration targets, then review at gameplay scale and confirm changes with the developer.

### Decoding and limits

Accepted MIME/file signatures: PNG (8-bit, non-interlaced grayscale/RGB/RGBA/indexed), GIF87a/GIF89a (composited frames, palette, LZW, transparency, common disposal methods), JPEG, WebP. Source limit **8 MiB**, width or height **1024 pixels** maximum, combined frame area **320,000 pixels**, up to **180 GIF frames**, and cumulative decoded GIF pixels at most **18 million**. Unsupported PNG variants are rejected rather than silently misdecoded. JPEG/WebP are retained and sent to the vision client **without** in-process pixel scoring; dimensions are parsed from the respective headers.

Images are imported and retained only in the local bridge's volatile memory (six references). The localhost endpoint checks the bridge token, origin and media signatures. AI-facing MCP tools offer read/list/compare actions but **cannot open arbitrary local paths or scan the desktop**. Shared images may still be stored by the user's AI client under its own privacy settings. Bridge data expires on restart.

### Quantitative evidence, not an aesthetic oracle

For decoded PNG/GIF frame pixels, the tool reports spatial-sample measurements:

| Measure | Meaning | What it cannot prove |
| --- | --- | --- |
| Luminance mean | Sampled brightness | Correct exposure or cinematic lighting |
| Luminance standard deviation | Bright/dark variation | Subject readability or good contrast placement |
| Saturation mean | Color intensity | Palette harmony |
| Alpha coverage | Visible/transparent sample fraction | Intended silhouette correctness |
| Edge fraction | Local luminance difference above a fixed threshold | Object detail, texture quality or actual Roblox performance |
| 3×3 luminance grid | Broad frame-wise light/dark distribution | Camera/subject alignment |
| Top five quantized RGB buckets | Approximate dominant palette | Precise matching under differing tone mapping |
| GIF per-frame changed-sample fraction | Pixels changing materially between successive decoded frames | Semantic motion, action anticipation, speed curves, FPS or game animation timing |

GIF total duration uses the **encoded GIF delays**; browser playback may clamp very short/zero delays. Frame-change measures are affected by camera movement, post-processing, particles and compression as well as intended subject motion. A high change fraction is not automatically good.

`lazydev_compare_reference_viewport` compares brightness, contrast proxy, saturation, alpha, and edge density between a PNG/GIF reference frame and a Studio viewport snapshot. It explicitly states **no camera, subject, scale, lighting or time alignment** has been established. It returns **no universal similarity score** and never infers a passing quality verdict. A JPEG/WebP reference can be viewed but does not yet support this numeric comparison.

### Human/AI quality rubric

Use a qualitative score only when the user has established the intended result, and attach evidence and a concrete fix for low scores. Suggested dimensions (do not average into a universal grade):

- **Silhouette/readability:** subject separates from environment and action communicates at expected viewing distance
- **Composition/focal clarity:** hierarchy, contrast placement, negative space and camera framing direct attention
- **Style and design coherence:** assets, color, animation and effects fit the actual project's identity
- **Motion phrasing:** anticipation, acceleration, holds, impact, recoil, settling and temporal transitions make sense
- **VFX layering:** core shape, secondary trails, flashes, sparks, debris, lighting, decay and screen effects have hierarchy and restraint
- **Gameplay communication:** hitboxes, telegraphs, effects and UI don't obscure needed information
- **Technical behavior:** actual playtest diagnostics, GPU/particle counts and frame performance when available; never infer from stills
- **Accessibility:** sufficient readable contrast and avoidance of unnecessarily aggressive flashes or camera shake

Record **observed evidence**, **hypotheses**, **unknowns**, **priority**, **proposed change**, and **verification method** for each dimension. The developer makes the final aesthetic call.

### Non-goals and future iterations

This is not automatic online media scraping, real-time GIF capture from Roblox Studio, proprietary plugin automation, literal asset/source decompilation, 3D mesh reconstruction, image-to-code generation, frame-aligned optical flow, or visual regression certification. Potential next steps: safe richer decode support, human-chosen crop/ROI annotations, capture sequences with permission, alignment-aware comparisons, user-defined thresholds, performance instrumentation, and export of a storyboard/implementation plan.

**Verification status:** Node decoder, reference metrics, CLI and bridge tests must pass across Windows and Linux. Actual Studio screenshot alignment and specific AI-host image interpretation remain user-dependent, with no automatic creative-quality certification.
