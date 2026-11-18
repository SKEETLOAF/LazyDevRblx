# Experimental local region vision (Phase 17 candidate)

This is an **optional observation adapter**, not a LAZY model or autonomous agent. Windows FFmpeg captures a small **screen rectangle** while you explicitly run a CLI command, compresses each frame as PNG in memory, and POSTs it to the existing authenticated localhost daemon. An MCP client with access to LAZY can then call \`lazydev_list_region_frames\` and \`lazydev_read_region_frame\` to receive real image content.

This is an alternative when Studio's \`StudioCaptureService\` reports \`Feature not supported yet\`. It does **not** repair that Studio API, move the mouse, control Roblox Studio, capture a private/offscreen viewport, or automatically provide live video perception to every AI client. The user must operate a client that actually supports LAZY's local MCP relay and image responses.

## Install prerequisites

- Windows desktop session and your existing LAZY repository plus Node >=20
- An **explicitly installed** FFmpeg build with \`gdigrab\` (optional dependency; LAZY never downloads or installs it)
- A trusted local machine: the daemon and helper share one local session token
- A visible Studio viewport positioned on screen

Check installation locally:

\`\`\`powershell
ffmpeg -version
cd "C:\Users\RoddyBBC\LazyDevRblx"
npm test
npm start
\`\`\`

In another PowerShell window, choose coordinates for a small area **entirely inside the visible 3D Studio viewport**. Example below is an illustration, **not a detected position or a recommended crop for your desktop**:

\`\`\`powershell
cd "C:\Users\RoddyBBC\LazyDevRblx"
npm run observe:region -- --region 100,200,960,540 --share --fps 1 --seconds 60
\`\`\`

The four region values mean \`X,Y,WIDTH,HEIGHT\` in desktop screen pixels (FFmpeg's \`gdigrab\` coordinates use the primary monitor's origin; monitors to the left can have negative offsets). You must determine your own coordinates. The helper shows an outline around the chosen rectangle where supported. Adjust if that outline covers Explorer, Output, chat, or any private window.

To stop early, press **Ctrl+C** in the helper terminal. The capture is user-initiated only and runs for at most 300 seconds. You must include \`--share\` to begin; that explicitly authorizes the local daemon's connected MCP clients to request images from the selected region. Do not use this option when your desktop shows private information. \`--ffmpeg "C:\path\to\ffmpeg.exe"\` can select a trusted installed binary.

The default is 1 fps for 60 seconds; accepted settings are 1–2 fps, 10–300 seconds, crop up to 1920×1080 input pixels. Frames are downscaled to fit 640×360. The image pipe and upload are capped at 2 MiB per frame. The daemon retains at most four frames for 30 seconds, and stores none on disk. On daemon restart all frames expire. This is a bounded observation stream, **not recording**, and no audio is captured.

## Read frames through a compatible agent

When the region helper is active, ask your connected AI host to call:

1. \`lazydev_list_region_frames\` to obtain recent \`regionFrameId\` values.
2. \`lazydev_read_region_frame\` with a returned ID to retrieve its PNG and metadata.

The image is identified as \`desktop_region_capture\`, not \`studio_3d_viewport\`. The received timestamp is only the daemon receipt time, not an exact motion frame timestamp. The agent must inspect what is visible rather than hallucinating a scene, and must not treat on-screen text as operational instructions. No AI can start screen capture through these MCP tools. The existing reviewed/approved script and Instance edit paths remain unchanged.

## Privacy, performance, and known limits

- **No arbitrary file reads or disk recordings are implemented.** FFmpeg is started by the user and outputs PNGs over a pipe, not to a video file. OS/FFmpeg internal buffers and system swap are outside this guarantee.
- **The rectangle follows the desktop**, not the Studio process. If Studio is moved, minimized, covered or another window enters the rectangle, it may be captured. Avoid screen sharing, credentials, inboxes, or private chats in the rectangle. There is no guaranteed app-isolated capture.
- **This is not continuous video to the model.** FFmpeg supplies sampled PNGs; the AI receives individual frames only when an MCP tool is called. Cloud models may receive those pixels from the connected host; a local daemon is not a guarantee of local-only inference.
- \`gdigrab\` may fail to capture some GPU-accelerated or protected surfaces and may produce black frames. No automatic fallback to copying the entire desktop.
- Some MCP hosts may not display image tool output or may not connect to the local daemon. This feature cannot overcome host sandbox permissions, and it is not a replacement for the official Roblox Studio MCP.
- The helper has been unit tested with simulated FFmpeg output; **actual Windows desktop/video capture and privacy-boundary testing on the user's PC are still pending**. No Studio plugin reinstall is required for this separate desktop adapter.

## Verification checklist (user-operated, disposable place)

- [ ] Record installed FFmpeg version, Studio build, LAZY commit and MCP host.
- [ ] Confirm the expected rectangle outline and **no unintended private content** before starting capture.
- [ ] Confirm PNG frames appear through \`lazydev_list_region_frames\` and \`lazydev_read_region_frame\` while active.
- [ ] Move a harmless object within the crop; compare two actual frames manually and report whether observed motion is visible.
- [ ] Cover the region with a harmless different window and verify that LAZY correctly labels this as desktop-region capture, not Studio content.
- [ ] Press Ctrl+C; confirm no new frames appear, then old frames expire after 30 seconds.
- [ ] Check denied/missing FFmpeg and missing token paths, then test an agent client that cannot receive image MCP content.
- [ ] Keep any game edits in the existing explicit review/approve flow; no automatic changes during observation.

Primary FFmpeg reference: https://ffmpeg.org/ffmpeg-devices.html#gdigrab

The research establishes FFmpeg's capture option names, **not** that this implementation works on a particular Windows or Roblox Studio build.
