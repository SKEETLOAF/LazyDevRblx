# Phase 9: Opt-in temporal viewport observation (V1.0 experimental, V1.1 corrections)

## Purpose

The user wants agents to observe animation/VFX **over time**, study GIF references and apply genuine quality checks rather than only inspect a single screenshot. This release adds a deliberately small sampling workflow using the native, plugin-secured [StudioCaptureService](https://create.roblox.com/docs/reference/engine/classes/StudioCaptureService) and [StudioScreenshotCapture](https://create.roblox.com/docs/reference/engine/classes/StudioScreenshotCapture).

**This is not full video.** Studio's documented screenshot interface captures individual frames, with asynchronous completion and possible capture delays. We report the actual elapsed time at each capture request and do not assume a precise frame rate, perfect reference sync, or continuous motion. Roblox screenshot permission is required.

## Studio recording and privacy

- Click **Capture 6-frame viewport sequence (manual start)**. The plugin requests screenshot permission and captures up to **six** frames with a nominal **0.5 second** gap between completed captures. The request timestamps are measured with `os.clock()`, with `os.time()` recording the initial Unix second.
- Frames are downscaled to max **240×160 RGBA8** pixels, preserving source aspect ratio. If the viewport aspect changes mid-capture, the sequence fails instead of distorting later frames. All frames must have the same width/height.
- The plugin temporarily stores the pixels in its memory, shows a read-only exact-pixel `EditableImage` preview, and exposes Previous/Next navigation. The Share button requires the user to view **every** frame. The Cancel/Discard control can end an in-progress sequence or discard the frozen preview.
- **No network request or tool action occurs during capture or preview.** Only clicking **Share entire reviewed sequence with MCP** makes one POST. Capture does not start gameplay, activate Eclipse/Sine, automate camera movement, or execute arbitrary scripts.
- The plugin checks for cancellation between capture steps. Studio closure, missing plugin permission, capture errors, aspect changes or an unexpected buffer length produce no shareable sequence.
- A human should avoid sharing captured in-experience UI, names or private text they do not want transmitted to their connected AI client.

## Binary transport and retained evidence

The new token-protected `POST /v1/studio/sequence` endpoint receives a single `application/octet-stream` body containing **six concatenated RGBA frames**, with restricted `X-Sequence-Width`, `X-Sequence-Height`, `X-Sequence-Captured-At` and `X-Sequence-Offsets` headers. The server validates pixel dimensions, 2–6 frames, strict monotonic offsets ≤30,000ms, and exact byte count; the maximum possible upload is **921,600 bytes** (6 × 240 × 160 × 4).

The bridge converts each frame to a small lossless PNG using the existing encoder, computes the same bounded spatial metrics as v0.9, and retains at most **three** sequences in daemon memory. All disappear on daemon restart. Each sequence includes `capturedAt`, `receivedAt`, exact observed frame `offsetMs` values, per-frame image hashes, and `peakVisualChange` (max sampled changed-pixel fraction). The peak is a **pixel change**, not necessarily the intended impact frame.

Three new read-only MCP tools:
- `lazydev_list_sequences`: metadata, count, timing and observed change peak only
- `lazydev_read_sequence`: actual PNG image content for first/peak-change/last frames and full six-frame numeric summaries with frame offsets
- `lazydev_compare_sequence_reference`: compares a user-imported PNG/GIF to the captured series with nearest reference frames selected by **normalized elapsed time**. Reports per-pair luminance, contrast variation, saturation, alpha and edge-density differences, reference/sequence change peaks and unassessed quality

The total is **23 MCP tools**.

## Quality evaluation

The numerical measurements describe visible brightness, saturation, edges and change; they do not establish subject/pose/camera alignment or an artistic score. GIF delays may be clamped by actual players. Camera motion, bloom, UI changes, color grading, particles or Studio performance can change pixels without changing the core animation.

For useful iteration, set a developer-approved visual target, compare roughly equivalent viewing conditions and discuss:

- **Motion phrasing:** buildup, anticipation, energy release, impact, recoil, hold and decay
- **Silhouette and readability:** can players identify intent at Roblox-scale camera distances?
- **Layering:** core volume, secondary debris/trails, sparks, light bloom, residual particles and motion arcs
- **Gameplay communication:** telegraph timing and unobscured hit/contact cues
- **Performance/accessibility:** actual device/Studio microprofiler data, particle counts, flashing or excessive shake when such evidence is available

An AI review must separate *observed frames*, *measured differences*, *inferred implementation*, *unknown timing/poses* and *recommended revisions*. No hidden reference assets, rigs, particle settings, source files or plugin project files are recovered from video pixels.

## November 15, 2026 audit corrections (V1.1)

- Sequence cancellation is now set before the yielding Roblox screenshot-permission prompt and checked after it returns. A user cancellation during that prompt no longer gets accidentally reset by starting the recording.
- Pending screenshot-buffer waits check the same cancellation flag. The plugin is therefore designed to abort between permission, capture, and resampling; runtime validation is still needed.
- Both GIF and Studio sequence pixel-change measurements use **alpha-premultiplied RGB**, eliminating false activity from RGB variations in completely transparent pixels.
- Analysis adds **threshold-based candidate onset, peak-change and quiet-after-peak** and observed cadence. These cues are *not* anticipation, impact, attack or recovery detectors. A 6-frame sample is classified as very limited evidence and should be visually inspected.
- No new arbitrary camera, native input or specialist editor permissions are added. Read-only MCP outputs remain on the existing approved media paths.

## Verification

Windows/Linux automated Node tests verify sequence input constraints, PNG keyframe content, monotonic timing, memory eviction, authenticated localhost upload, prior feature regressions, and normalized-time matching to imported GIFs.

**Unverified until actual Studio testing:** the plugin's new controls, screenshot capture during playback, EditableImage frame previews, true session cadence under load, and specific AI client's image presentation. V0.4–V0.9 Studio/UI integration checks also remain separate.

The design intentionally uses only official documented screenshot APIs. Any future continuous recording, per-frame input injection, Sine/Eclipse editor control, viewport camera automation, optical flow and full reference frame alignment require their own permission boundaries and evidence.
