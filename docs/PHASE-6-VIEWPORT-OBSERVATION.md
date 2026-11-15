# Phase 6: opt-in Studio viewport observations (V0.7 experimental)

## Evidence and product scope

Roblox now supplies a purpose-built Studio-only screenshot API, `StudioCaptureService`. It supports a user-facing permission request and `CaptureScreenshot`, returning a `StudioScreenshotCapture` with an RGBA8 buffer. The snapshot becomes readable only at `BufferStatus.Ready`. Roblox also exposes `EditableImage:WritePixelsBuffer` and `ImageLabel.ImageContent` for rendering the exact captured frame in an editable Studio plugin UI. Sources:

- [StudioCaptureService](https://create.roblox.com/docs/reference/engine/classes/StudioCaptureService)
- [StudioScreenshotCapture](https://create.roblox.com/docs/reference/engine/classes/StudioScreenshotCapture)
- [EditableImage](https://create.roblox.com/docs/reference/engine/classes/EditableImage)
- [HttpService:RequestAsync](https://create.roblox.com/docs/reference/engine/classes/HttpService)

**Implementation scope:** one manually captured, locally previewed 3D viewport frame (including in-experience UI if present), explicitly shared to the local daemon. No desktop screenshot, generic UI-window capture, visual agent, continuous screen streaming, camera controls, or automated screenshot triggers. A Studio capture's camera point of view is not proof of behavior or offscreen objects.

## Studio-side flow

1. User clicks **Capture & preview current 3D viewport**. The local Studio plugin calls `RequestScreenshotPermissionAsync()` and honors denial.
2. With permission and `CanCaptureScreenshot()`, request an RGBA8 screenshot with `UICaptureMode.All` to include game UI rendered in the 3D view.
3. Wait for `BufferStatus.Ready` (bounded ~12-second wait), and, if needed, `ScaleAsync` the returned screenshot to a maximum of **480 pixels wide × 300 pixels high** without distorting the source aspect ratio.
4. Confirm the buffer is exactly `width * height * 4` bytes. The plugin displays the frozen image using `AssetService:CreateEditableImage({Size = resolution})`, `WritePixelsBuffer`, and `ImageLabel.ImageContent = Content.fromObject(editableImage)`. If this local exact preview cannot be constructed, fail closed and do not enable sharing.
5. Only a second explicit **Share previewed viewport image with MCP** click transfers those same pixel bytes to the token-protected localhost bridge. **Discard local viewport frame** clears the local preview with no request.

Roblox `HttpService:RequestAsync` accepts binary request body strings. Use the `application/octet-stream` content type and restricted `X-Viewport-Width`/`X-Viewport-Height` headers plus a Unix-second `X-Viewport-Captured-At` header. This is preferable to JSON/base64 for the image payload and retains the exact approved RGBA data.

## Bridge and MCP implementation

The bridge `POST /v1/studio/viewport` endpoint requires the existing per-session bearer token and no browser Origin. It refuses unexpected content types, malformed dimensions, frames larger than 480×300, truncated/oversized bodies, and anything except exactly 4 bytes per pixel.

The Node server encodes the same RGBA pixels as a valid 8-bit PNG (no new dependency), records the PNG SHA-256, actual capture timestamp and separate bridge-received timestamp, and retains only **four** screenshots in daemon memory. The server does not call Roblox APIs and does not upload images to any public server.

New MCP tools:

- `lazydev_list_viewports`: metadata (ID, capture time, source, width/height, SHA-256, byte size) without sending image contents.
- `lazydev_read_viewport`: one text metadata item plus an MCP `{type:"image",mimeType:"image/png",data:"..."}` content item. It never silently captures Studio or edits the project.

The MCP client may process image pixels according to its own policies. The local bridge itself keeps the PNG only in RAM and sends it through the MCP client connection; it is not persistent or encrypted beyond local loopback security. The user's AI app may store or process shared images separately, depending on that app's settings.

## Explicit verification boundaries

- V0.7's bridge-side PNG, token-protected HTTP, and MCP image response are covered by Node tests on Windows and Linux.
- **Not yet verified:** Roblox Studio screenshot permission, camera capture, local EditableImage preview, raw HTTP binary transfer, and visual image rendering in each specific MCP host.
- If any Studio API is missing, permissions are denied, the camera/viewport cannot be captured, or preview creation fails, the plugin reports an error instead of pretending the image was shared.
- The plugin requires a real installed update. Updating the repo alone does not replace previously installed local Studio plugin source.
- Do not infer full project understanding from one camera frame. For semantic context, combine this image with explicitly inspected hierarchy and source snapshots.
