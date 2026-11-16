-- LAZY DevKit Studio review panel (V1.0 experimental; reviewed script/scene, viewport sequence and references).
-- Install as a local Studio plugin Script. Never paste a session token into game scripts.
local HttpService = game:GetService("HttpService")
local Selection = game:GetService("Selection")
local ScriptEditorService = game:GetService("ScriptEditorService")
local ChangeHistoryService = game:GetService("ChangeHistoryService")
local LogService = game:GetService("LogService")
local StudioTestService = game:GetService("StudioTestService")
local StudioCaptureService = game:GetService("StudioCaptureService")
local AssetService = game:GetService("AssetService")
local CollectionService = game:GetService("CollectionService")

local BRIDGE = "http://127.0.0.1:43187"
local MAX_SOURCE_BYTES = 128 * 1024
local MAX_NODES = 128
local MAX_TREE_DEPTH = 4
local tracked = nil
local proposal = nil
local trackedStructure = nil
local sceneProposal = nil
local diagnosticsPreview = nil
local playtestPreview = nil
local viewportPreview = nil
local sequencePreview = nil
local sequenceRecording = false
local sequenceCancel = false
local sequenceIndex = 1
local sequencePreviewImage = nil
local sequenceSeen = {}
local sinePreview = nil
local playtestInProgress = false
local busy = false

local toolbar = plugin:CreateToolbar("LAZY DevKit")
local showButton = toolbar:CreateButton("LAZY DevKit", "Open LAZY DevKit review panel", "")
local widget = plugin:CreateDockWidgetPluginGuiAsync(
    "LAZYDevKitReviewV0",
    DockWidgetPluginGuiInfo.new(Enum.InitialDockState.Float, false, false, 620, 700, 460, 520)
)
widget.Title = "LAZY DevKit | Manual Review"

local panel = Instance.new("ScrollingFrame")
panel.Name = "ReviewPanel"
panel.Size = UDim2.fromScale(1, 1)
panel.BackgroundColor3 = Color3.fromRGB(30, 32, 38)
panel.BorderSizePixel = 0
panel.ScrollBarThickness = 8
panel.AutomaticCanvasSize = Enum.AutomaticSize.Y
panel.CanvasSize = UDim2.fromOffset(0, 0)
panel.Parent = widget

local layout = Instance.new("UIListLayout")
layout.SortOrder = Enum.SortOrder.LayoutOrder
layout.Padding = UDim.new(0, 8)
layout.Parent = panel

local function addLabel(text, height)
    local label = Instance.new("TextLabel")
    label.Size = UDim2.new(1, -18, 0, height)
    label.BackgroundTransparency = 1
    label.Text = text
    label.TextColor3 = Color3.fromRGB(232, 234, 240)
    label.TextSize = 14
    label.TextWrapped = true
    label.TextXAlignment = Enum.TextXAlignment.Left
    label.TextYAlignment = Enum.TextYAlignment.Top
    label.Parent = panel
    return label
end

local function addBox(placeholder, height, editable)
    local box = Instance.new("TextBox")
    box.Size = UDim2.new(1, -18, 0, height)
    box.BackgroundColor3 = Color3.fromRGB(18, 20, 24)
    box.BorderSizePixel = 0
    box.TextColor3 = Color3.fromRGB(225, 225, 225)
    box.TextSize = 13
    box.Font = Enum.Font.Code
    box.MultiLine = true
    box.TextWrapped = false
    box.TextXAlignment = Enum.TextXAlignment.Left
    box.TextYAlignment = Enum.TextYAlignment.Top
    box.ClearTextOnFocus = false
    box.TextEditable = editable
    box.PlaceholderText = placeholder
    box.Text = ""
    box.Parent = panel
    return box
end

local function addButton(text)
    local button = Instance.new("TextButton")
    button.Size = UDim2.new(1, -18, 0, 36)
    button.BackgroundColor3 = Color3.fromRGB(65, 78, 98)
    button.BorderSizePixel = 0
    button.TextColor3 = Color3.new(1, 1, 1)
    button.Font = Enum.Font.GothamMedium
    button.TextSize = 14
    button.Text = text
    button.Parent = panel
    return button
end

addLabel("Local bridge at 127.0.0.1:43187. Paste the one-session token printed by the Node bridge. No automatic polling or editing.", 52)
local tokenBox = addBox("Paste one-session token here", 35, true)
addLabel("Sine VFX runtime: inspect module presence and selected effect metadata, without running plugin code.", 45)
local sineInspectButton = addButton("Preview Sine runtime and selected effect (read-only)")
local sineInfoLabel = addLabel("No Sine runtime inspection previewed.", 48)
local sinePreviewBox = addBox("No Sine information collected", 110, false)
local sineShareButton = addButton("Share previewed Sine inspection with MCP")
local sineDiscardButton = addButton("Discard local Sine inspection")
addLabel("Viewport capture: explicit permission, local preview, then manual Share.", 32)
local viewportCaptureButton = addButton("Capture & preview current 3D viewport")
local viewportInfoLabel = addLabel("No viewport frame captured.", 44)
local viewportImage = Instance.new("ImageLabel")
viewportImage.Name = "ViewportPreview"
viewportImage.Size = UDim2.new(1, -18, 0, 260)
viewportImage.BackgroundColor3 = Color3.fromRGB(18, 20, 24)
viewportImage.BorderSizePixel = 0
viewportImage.ScaleType = Enum.ScaleType.Fit
viewportImage.ImageContent = Content.none
viewportImage.Parent = panel
local viewportShareButton = addButton("Share previewed viewport image with MCP")
local viewportDiscardButton = addButton("Discard local viewport frame")
addLabel("Timed viewport: six sequential frames, about 0.5 seconds apart; not continuous video.", 34)
local sequenceCaptureButton = addButton("Capture 6-frame viewport sequence (manual start)")
local sequenceInfoLabel = addLabel("No viewport sequence recorded.", 52)
local sequenceImage = Instance.new("ImageLabel")
sequenceImage.Name = "SequenceFramePreview"
sequenceImage.Size = UDim2.new(1, -18, 0, 200)
sequenceImage.BackgroundColor3 = Color3.fromRGB(18, 20, 24)
sequenceImage.BorderSizePixel = 0
sequenceImage.ScaleType = Enum.ScaleType.Fit
sequenceImage.ImageContent = Content.none
sequenceImage.Parent = panel
local sequencePreviousButton = addButton("Review previous sequence frame")
local sequenceNextButton = addButton("Review next sequence frame")
local sequenceShareButton = addButton("Share entire reviewed sequence with MCP")
local sequenceDiscardButton = addButton("Cancel capture / Discard local sequence")
local diagnosticsPreviewButton = addButton("Preview Studio Output warnings/errors locally")
local diagnosticsInfoLabel = addLabel("Output has not been previewed or shared.", 56)
local diagnosticsBox = addBox("No warnings/errors previewed", 160, false)
local diagnosticsShareButton = addButton("Share previewed Output with MCP (manual)")
local diagnosticsClearButton = addButton("Discard local Output preview (does not clear Studio Output)")
addLabel("Studio test reports: launches Play or Run only when you click below.", 34)
local playButton = addButton("Launch solo Play test (stop it manually in Studio)")
local runButton = addButton("Launch Run simulation (stop it manually in Studio)")
local playtestInfoLabel = addLabel("No Studio test report captured.", 60)
local playtestBox = addBox("Test report preview (no result has been shared)", 165, false)
local playtestShareButton = addButton("Share reviewed test report with MCP")
local playtestClearButton = addButton("Discard local test report preview")
local structureButton = addButton("Inspect selected hierarchy (no script source)")
local sceneCheckButton = addButton("Check for proposed Instance action")
local sceneInfoLabel = addLabel("Instance actions: no proposal loaded.", 60)
local scenePreview = addBox("Instance action preview", 100, false)
local sceneApproveButton = addButton("Approve Instance action (Studio Undo)")
local sceneRejectButton = addButton("Reject Instance action")
local inspectButton = addButton("1. Inspect selected script (share source)")
local checkButton = addButton("2. Check for a proposed edit")
local infoLabel = addLabel("No script inspected.", 56)
addLabel("Current source (read-only)", 22)
local currentBox = addBox("Inspect a single Script, LocalScript or ModuleScript", 160, false)
addLabel("Proposed replacement source (read-only)", 22)
local proposedBox = addBox("No pending edit", 160, false)
local approveButton = addButton("3. Approve and apply with Studio undo")
local rejectButton = addButton("Reject pending edit")
local statusLabel = addLabel("Idle. No source is sent until you click Inspect.", 64)

local function setStatus(message)
    statusLabel.Text = message
end

local function request(method, path, payload)
    if #tokenBox.Text < 16 then
        error("Enter the session token from the bridge terminal first")
    end
    local headers = { Authorization = "Bearer " .. tokenBox.Text }
    local options = { Url = BRIDGE .. path, Method = method, Headers = headers }
    if payload ~= nil then
        headers["Content-Type"] = "application/json"
        options.Body = HttpService:JSONEncode(payload)
    end
    local response = HttpService:RequestAsync(options)
    local data = HttpService:JSONDecode(response.Body)
    if not response.Success then
        error("Bridge HTTP " .. tostring(response.StatusCode) .. ": " .. tostring(data.error))
    end
    return data
end

local function safeAction(callback)
    if busy then
        setStatus("Another LAZY DevKit operation is still in progress")
        return
    end
    busy = true
    local ok, err = pcall(callback)
    busy = false
    if not ok then setStatus("Operation failed: " .. tostring(err)) end
end

local function clearViewportPreview()
    viewportPreview = nil
    viewportImage.ImageContent = Content.none
end

local function waitForCapture(capture, shouldCancel)
    -- BufferStatus is populated asynchronously. Sequence cancellation must
    -- also work while waiting for a pending screenshot.
    for _ = 1, 120 do
        if shouldCancel and shouldCancel() then error("Sequence capture cancelled") end
        if capture.BufferStatus == Enum.StudioCaptureBufferStatus.Ready then
            return
        end
        if capture.BufferStatus == Enum.StudioCaptureBufferStatus.Error then
            error("Viewport capture failed. Check screenshot permission and active place.")
        end
        task.wait(0.1)
    end
    error("Viewport capture timed out; nothing was shared")
end

viewportCaptureButton.MouseButton1Click:Connect(function()
    safeAction(function()
        clearViewportPreview()
        local granted = StudioCaptureService:RequestScreenshotPermissionAsync()
        if not granted then
            error("Screenshot permission was denied or globally disabled")
        end
        if not StudioCaptureService:CanCaptureScreenshot() then
            error("Cannot capture this Studio 3D viewport right now")
        end
        local capture = StudioCaptureService:CaptureScreenshot({
            Format = Enum.StudioCaptureScreenshotFormat.RGBA8,
            UICaptureMode = Enum.UICaptureMode.All,
        })
        waitForCapture(capture)
        local original = capture.Resolution
        if original.X <= 0 or original.Y <= 0 then
            error("Studio returned invalid screenshot dimensions")
        end
        local scale = math.min(1, 480 / original.X, 300 / original.Y)
        if scale < 1 then
            local outputSize = Vector2.new(
                math.max(1, math.floor(original.X * scale)),
                math.max(1, math.floor(original.Y * scale)))
            capture = capture:ScaleAsync(Enum.ResamplerMode.Default, outputSize)
            waitForCapture(capture)
        end
        local resolution = capture.Resolution
        local width, height = resolution.X, resolution.Y
        if width < 1 or height < 1 or width > 480 or height > 300 or
            width % 1 ~= 0 or height % 1 ~= 0 then
            error("Unsupported screenshot size")
        end
        local pixels = capture:GetBuffer()
        if buffer.len(pixels) ~= width * height * 4 then
            error("Screenshot RGBA buffer has an unexpected length")
        end
        -- A local, exact-pixel visual preview is mandatory. If EditableImage
        -- is not allowed on this Studio build, nothing becomes shareable.
        local previewImage = AssetService:CreateEditableImage({Size = resolution})
        if not previewImage then
            error("Cannot create local image preview; frame was not shared")
        end
        previewImage:WritePixelsBuffer(Vector2.zero, resolution, pixels)
        viewportImage.ImageContent = Content.fromObject(previewImage)
        viewportPreview = {
            pixels = pixels, width = width, height = height, image = previewImage,
            capturedTimestamp = os.time(),
        }
        viewportInfoLabel.Text = "Local preview: " .. width .. "x" .. height ..
            " pixels. No image has been shared."
        setStatus("Inspect this exact screenshot carefully. Click Share only if approved; " ..
            "the image may contain private in-game UI text.")
    end)
end)

viewportShareButton.MouseButton1Click:Connect(function()
    safeAction(function()
        if not viewportPreview then error("Capture and preview a viewport frame first") end
        if #tokenBox.Text < 16 then
            error("Enter the private bridge session token")
        end
        local snapshot = viewportPreview
        -- Consume the captured frame before the request: a slow or failed
        -- network receipt must not accidentally submit the same pixels twice.
        clearViewportPreview()
        local response = HttpService:RequestAsync({
            Url = BRIDGE .. "/v1/studio/viewport",
            Method = "POST",
            Headers = {
                Authorization = "Bearer " .. tokenBox.Text,
                ["Content-Type"] = "application/octet-stream",
                ["X-Viewport-Width"] = tostring(snapshot.width),
                ["X-Viewport-Height"] = tostring(snapshot.height),
                ["X-Viewport-Captured-At"] = tostring(snapshot.capturedTimestamp),
            },
            Body = buffer.tostring(snapshot.pixels),
        })
        local data = HttpService:JSONDecode(response.Body)
        if not response.Success then
            error("Viewport bridge HTTP " .. tostring(response.StatusCode) ..
                ": " .. tostring(data.error))
        end
        viewportInfoLabel.Text = "Shared " .. data.width .. "x" .. data.height ..
            " 3D viewport image, ID " .. data.viewportId
        setStatus("A frozen viewport image was shared. Ask the agent to call " ..
            "lazydev_list_viewports then lazydev_read_viewport. This is not live video.")
    end)
end)

viewportDiscardButton.MouseButton1Click:Connect(function()
    safeAction(function()
        clearViewportPreview()
        viewportInfoLabel.Text = "Local viewport capture discarded. Nothing shared."
        setStatus("Viewport image discarded.")
    end)
end)

-- Time samples use the capture-request clock, not a claimed video frame
-- rate. All six sampled images must be viewed before one explicit Share.
local SEQUENCE_FRAMES = 6
local SEQUENCE_GAP_SECONDS = 0.5
local SEQUENCE_MAX_W = 240
local SEQUENCE_MAX_H = 160

local function clearSequence()
    sequencePreview = nil
    sequenceIndex = 1
    sequenceSeen = {}
    sequencePreviewImage = nil
    sequenceImage.ImageContent = Content.none
end

local function showSequenceFrame(index)
    if not sequencePreview then error("Capture a sequence first") end
    if index < 1 or index > #sequencePreview.frames then error("No such frame") end
    local frame = sequencePreview.frames[index]
    local size = Vector2.new(frame.width, frame.height)
    local preview = AssetService:CreateEditableImage({ Size = size })
    if not preview then error("Cannot create an exact local preview of this frame") end
    preview:WritePixelsBuffer(Vector2.zero, size, frame.pixels)
    sequenceImage.ImageContent = Content.fromObject(preview)
    sequencePreviewImage = preview
    sequenceIndex = index
    sequenceSeen[index] = true
    local seenCount = 0
    for i = 1, #sequencePreview.frames do
        if sequenceSeen[i] then seenCount += 1 end
    end
    sequenceInfoLabel.Text = "Preview " .. index .. "/" .. #sequencePreview.frames ..
        " at " .. frame.offsetMs .. " ms, " .. seenCount .. " of " ..
        #sequencePreview.frames .. " frames reviewed. No pixels shared."
end

sequenceCaptureButton.MouseButton1Click:Connect(function()
    safeAction(function()
        if sequenceRecording then error("A sequence capture is already running") end
        clearSequence()
        sequenceCancel = false
        local granted = StudioCaptureService:RequestScreenshotPermissionAsync()
        -- Discard remains authoritative if clicked while Roblox's permission
        -- dialog is open. Never reset this flag after a yielding prompt.
        if sequenceCancel then
            sequenceInfoLabel.Text = "Sequence cancelled during permission request."
            return
        end
        if not granted or not StudioCaptureService:CanCaptureScreenshot() then
            error("Studio screenshot permission denied or active viewport unavailable")
        end
        sequenceRecording = true
        sequenceInfoLabel.Text = "Capturing up to 6 frames. Click Cancel to stop."
        task.spawn(function()
            local ok, failure = pcall(function()
                local frames = {}
                local startClock = os.clock()
                local capturedTimestamp = os.time()
                local targetW, targetH, aspect = nil, nil, nil
                for index = 1, SEQUENCE_FRAMES do
                    if sequenceCancel then error("Sequence capture cancelled") end
                    if not StudioCaptureService:CanCaptureScreenshot() then
                        error("Studio viewport became unavailable")
                    end
                    local offsetMs = index == 1 and 0 or
                        math.max(math.floor((os.clock() - startClock) * 1000 + 0.5),
                            frames[#frames].offsetMs + 1)
                    local capture = StudioCaptureService:CaptureScreenshot({
                        Format = Enum.StudioCaptureScreenshotFormat.RGBA8,
                        UICaptureMode = Enum.UICaptureMode.All,
                    })
                    waitForCapture(capture, function() return sequenceCancel end)
                    local original = capture.Resolution
                    if original.X < 1 or original.Y < 1 then
                        error("Invalid Studio screenshot resolution")
                    end
                    local currentAspect = original.X / original.Y
                    if aspect and math.abs(currentAspect - aspect) > 0.015 then
                        error("Viewport aspect ratio changed during recording; discard")
                    end
                    if not targetW then
                        local scale = math.min(1, SEQUENCE_MAX_W / original.X,
                            SEQUENCE_MAX_H / original.Y)
                        targetW = math.max(1, math.floor(original.X * scale))
                        targetH = math.max(1, math.floor(original.Y * scale))
                        aspect = currentAspect
                    end
                    if original.X ~= targetW or original.Y ~= targetH then
                        capture = capture:ScaleAsync(Enum.ResamplerMode.Default,
                            Vector2.new(targetW, targetH))
                        waitForCapture(capture, function() return sequenceCancel end)
                    end
                    local pixels = capture:GetBuffer()
                    if buffer.len(pixels) ~= targetW * targetH * 4 then
                        error("Unexpected RGBA byte count for sequence frame")
                    end
                    table.insert(frames, {
                        pixels = pixels,width = targetW,height = targetH,
                        offsetMs = offsetMs,
                    })
                    sequenceInfoLabel.Text = "Captured " .. index .. "/" ..
                        SEQUENCE_FRAMES .. " samples locally; nothing shared."
                    if index < SEQUENCE_FRAMES then
                        local waited = 0
                        while waited < SEQUENCE_GAP_SECONDS do
                            if sequenceCancel then error("Sequence capture cancelled") end
                            local dt = math.min(0.1,SEQUENCE_GAP_SECONDS - waited)
                            task.wait(dt)
                            waited += dt
                        end
                    end
                end
                if sequenceCancel then error("Sequence capture cancelled") end
                sequencePreview = {
                    capturedTimestamp = capturedTimestamp,
                    frames = frames,width = targetW,height = targetH,
                }
                showSequenceFrame(1)
                setStatus("Sequence captured locally. Review every frame using Next/Previous, " ..
                    "then decide whether to share or discard.")
            end)
            sequenceRecording = false
            if not ok then
                clearSequence()
                sequenceInfoLabel.Text = "No sequence ready to share: " .. tostring(failure):sub(1,150)
                setStatus("Sequence capture ended without sharing.")
            end
        end)
    end)
end)

sequencePreviousButton.MouseButton1Click:Connect(function()
    safeAction(function()
        if sequenceRecording then error("Capture in progress") end
        showSequenceFrame(math.max(1,sequenceIndex-1))
    end)
end)

sequenceNextButton.MouseButton1Click:Connect(function()
    safeAction(function()
        if sequenceRecording then error("Capture in progress") end
        if not sequencePreview then error("No sequence captured") end
        showSequenceFrame(math.min(#sequencePreview.frames,sequenceIndex+1))
    end)
end)

sequenceShareButton.MouseButton1Click:Connect(function()
    safeAction(function()
        if sequenceRecording then error("Stop or finish recording first") end
        local sequence = sequencePreview
        if not sequence or #sequence.frames ~= SEQUENCE_FRAMES then
            error("Six-frame preview required before sharing")
        end
        if #tokenBox.Text < 16 then error("Enter the local bridge session token") end
        for i = 1, #sequence.frames do
            if not sequenceSeen[i] then
                error("Review all six frames before sharing; frame " .. i .. " not viewed")
            end
        end
        local offsets = {}
        local stride = sequence.width * sequence.height * 4
        local body = buffer.create(stride * #sequence.frames)
        for i, frame in ipairs(sequence.frames) do
            offsets[i] = tostring(frame.offsetMs)
            buffer.copy(body,(i-1)*stride,frame.pixels,0,stride)
        end
        -- Consume the approved snapshot before POST. A timeout after server
        -- acceptance must not cause a duplicate upload on a double-click.
        clearSequence()
        local response = HttpService:RequestAsync({
            Url = BRIDGE .. "/v1/studio/sequence",Method = "POST",
            Headers = {
                Authorization = "Bearer " .. tokenBox.Text,
                ["Content-Type"] = "application/octet-stream",
                ["X-Sequence-Width"] = tostring(sequence.width),
                ["X-Sequence-Height"] = tostring(sequence.height),
                ["X-Sequence-Captured-At"] = tostring(sequence.capturedTimestamp),
                ["X-Sequence-Offsets"] = table.concat(offsets,","),
            },
            Body = buffer.tostring(body),
        })
        local data = HttpService:JSONDecode(response.Body)
        if not response.Success then
            error("Sequence upload failed: HTTP " .. tostring(response.StatusCode) ..
                " " .. tostring(data.error))
        end
        sequenceInfoLabel.Text = "Shared " .. data.frameCount .. " frames over " ..
            data.durationMs .. " ms. ID: " .. data.sequenceId
        setStatus("Frozen sequence available via lazydev_list_sequences and " ..
            "lazydev_read_sequence; no live video or automated quality verdict.")
    end)
end)

sequenceDiscardButton.MouseButton1Click:Connect(function()
    -- This control must remain available even during an active asynchronous capture.
    sequenceCancel = true
    if sequenceRecording then
        sequenceInfoLabel.Text = "Cancelling capture. No frames will be uploaded."
    else
        clearSequence()
        sequenceInfoLabel.Text = "Local sequence discarded; nothing shared."
    end
end)

showButton.Click:Connect(function()
    widget.Enabled = not widget.Enabled
end)

-- Explicit two-step diagnostics sharing: preview locally first, then share
-- that same frozen snapshot. We never subscribe to MessageOut or poll Studio.
local MAX_DIAGNOSTIC_ENTRIES = 80
local MAX_DIAGNOSTIC_BYTES = 1600

local function boundedDiagnosticMessage(message)
    if type(message) ~= "string" or message == "" then return nil, false end
    if #message <= MAX_DIAGNOSTIC_BYTES then
        if utf8.len(message) == nil then return nil, true end
        return message, false
    end
    local prefix = string.sub(message, 1, MAX_DIAGNOSTIC_BYTES - 24)
    while #prefix > 0 and utf8.len(prefix) == nil do
        prefix = string.sub(prefix, 1, #prefix - 1)
    end
    if prefix == "" then return nil, true end
    return prefix .. " [message truncated]", true
end

diagnosticsPreviewButton.MouseButton1Click:Connect(function()
    safeAction(function()
        diagnosticsPreview = nil
        diagnosticsBox.Text = ""
        local history = LogService:GetLogHistory()
        local selected = {}
        local truncated = false
        local errorCount, warningCount = 0, 0
        for _, entry in ipairs(history) do
            local kind
            if entry.messageType == Enum.MessageType.MessageError then
                kind = "MessageError"
            elseif entry.messageType == Enum.MessageType.MessageWarning then
                kind = "MessageWarning"
            end
            if kind then
                local message, shortened = boundedDiagnosticMessage(entry.message)
                if shortened then truncated = true end
                if message and message ~= "" then
                    local stamp = tonumber(entry.timestamp) or 0
                    if stamp < 0 or stamp > 1e12 then stamp = 0 end
                    table.insert(selected, { message = message, type = kind, timestamp = stamp })
                    if #selected > MAX_DIAGNOSTIC_ENTRIES then
                        table.remove(selected, 1)
                        truncated = true
                    end
                end
            end
        end
        local output = {}
        for i, entry in ipairs(selected) do
            if entry.type == "MessageError" then
                errorCount += 1
            else
                warningCount += 1
            end
            table.insert(output, tostring(i) .. ". [" .. entry.type .. "] " .. entry.message)
        end
        diagnosticsPreview = {
            kind = "studio_output",
            capturedTimestamp = os.time(),
            truncated = truncated,
            entries = selected,
        }
        diagnosticsBox.Text = #output > 0 and table.concat(output, "\n\n") or
            "No warnings or errors available in Studio Output."
        diagnosticsInfoLabel.Text = "Local preview: " .. errorCount .. " errors, " ..
            warningCount .. " warnings" .. (truncated and " (partial)" or "")
        setStatus("Review the Output preview for secrets or private data. " ..
            "Nothing has been shared. Press Share only if you approve this snapshot.")
    end)
end)

diagnosticsShareButton.MouseButton1Click:Connect(function()
    safeAction(function()
        if not diagnosticsPreview then
            error("Preview Studio Output before sharing; no automatic capture is enabled")
        end
        local preview = diagnosticsPreview
        local response = request("POST", "/v1/studio/diagnostics", preview)
        diagnosticsPreview = nil -- sharing is not repeatable by accidental double-click
        diagnosticsInfoLabel.Text = "Shared Studio Output snapshot: " .. response.entryCount ..
            " warnings/errors. ID: " .. response.diagnosticsId
        setStatus("A frozen, read-only Output snapshot was shared manually. " ..
            "Use lazydev_list_diagnostics / lazydev_read_diagnostics in the MCP client.")
    end)
end)

diagnosticsClearButton.MouseButton1Click:Connect(function()
    safeAction(function()
        diagnosticsPreview = nil
        diagnosticsBox.Text = ""
        diagnosticsInfoLabel.Text = "Local preview discarded. Studio Output unchanged."
        setStatus("No diagnostics sent. This button does not clear Studio Output.")
    end)
end)

-- StudioTestService is a documented plugin API. We do not inject scripts
-- into the game or stop a running test for the user. Only a button click starts
-- a test; its results are kept locally until a SECOND explicit Share click.
local function sameLogEntry(left, right)
    return left.message == right.message and left.messageType == right.messageType and
        left.timestamp == right.timestamp
end

local function createPlaytestPreview(mode, baseline, startedAt, endedAt, completed)
    local ok, history = pcall(function()
        return LogService:GetLogHistory()
    end)
    local first = 1
    local historyScope = "unfiltered_history"
    local truncated = not ok
    if ok then
        -- If the previous history remains an identical prefix, only collect the
        -- new suffix. Otherwise, share the bounded history with an explicit
        -- warning: it could include logs from before the Play/Run session.
        if #history >= #baseline then
            local equalPrefix = true
            for i = 1, #baseline do
                if not sameLogEntry(history[i], baseline[i]) then
                    equalPrefix = false
                    break
                end
            end
            if equalPrefix then
                first = #baseline + 1
                historyScope = "new_suffix"
            end
        end
    else
        history = {}
    end

    local entries = {}
    local shown = {}
    for i = first, #history do
        local entry = history[i]
        local kind
        if entry.messageType == Enum.MessageType.MessageError then
            kind = "MessageError"
        elseif entry.messageType == Enum.MessageType.MessageWarning then
            kind = "MessageWarning"
        end
        if kind then
            local message, shortened = boundedDiagnosticMessage(entry.message)
            if shortened then truncated = true end
            if message and message ~= "" then
                local stamp = tonumber(entry.timestamp) or 0
                if stamp < 0 or stamp > 1e12 then stamp = 0 end
                table.insert(entries, {message = message, timestamp = stamp, type = kind})
                if #entries > MAX_DIAGNOSTIC_ENTRIES then
                    table.remove(entries, 1)
                    truncated = true
                end
            end
        end
    end
    for _, entry in ipairs(entries) do
        table.insert(shown, "[" .. entry.type .. "] " .. entry.message)
    end
    local report = {
        kind = "studio_playtest",
        mode = mode,
        returnState = completed and "returned" or "start_error",
        startedAt = startedAt,
        endedAt = endedAt,
        historyScope = historyScope,
        truncated = truncated,
        entries = entries,
    }
    return report, #shown > 0 and table.concat(shown, "\n\n") or
        "No warnings or errors found in the captured Studio Output history."
end

local function launchPlaytest(mode)
    safeAction(function()
        if playtestInProgress then error("Finish the current test before launching another") end
        if not StudioTestService.EditModeActive then
            error("Studio is already testing. Stop the existing test first.")
        end
        -- The user explicitly requested a test, but local preview is cleared
        -- before starting. No test logs are sent to the daemon automatically.
        local baseline = LogService:GetLogHistory()
        playtestInProgress = true
        playtestPreview = nil
        playtestBox.Text = ""
        local startedAt = os.time()
        playtestInfoLabel.Text = "Test running: " .. mode ..
            ". Stop manually using Studio's Stop button."
        setStatus("Studio Test API started by your click. Waiting for the test to end; no logs shared.")
        task.spawn(function()
            local ok, errorMessage = pcall(function()
                if mode == "play" then
                    return StudioTestService:ExecutePlayModeAsync()
                end
                return StudioTestService:ExecuteRunModeAsync()
            end)
            local endedAt = os.time()
            local capturedOk, report, previewText = pcall(createPlaytestPreview,
                mode, baseline, startedAt, endedAt, ok)
            playtestInProgress = false
            if not capturedOk then
                playtestPreview = nil
                playtestInfoLabel.Text = "Test ended, but Output report collection failed."
                setStatus("Test report error: " .. tostring(report))
                return
            end
            playtestPreview = report
            playtestBox.Text = previewText
            local warningCount = 0
            local errorCount = 0
            for _, entry in ipairs(report.entries) do
                if entry.type == "MessageWarning" then
                    warningCount += 1
                else
                    errorCount += 1
                end
            end
            playtestInfoLabel.Text = mode .. " API " .. report.returnState .. "; " ..
                errorCount .. " errors, " .. warningCount .. " warnings; " ..
                (report.historyScope == "new_suffix" and "new Output only" or "possibly older Output")
            setStatus("Test API completed, NOT proof of passing. Review logs, then Share or Discard. " ..
                (ok and "" or ("Local error: " .. tostring(errorMessage):sub(1, 160))))
        end)
    end)
end

playButton.MouseButton1Click:Connect(function()
    launchPlaytest("play")
end)

runButton.MouseButton1Click:Connect(function()
    launchPlaytest("run")
end)

playtestShareButton.MouseButton1Click:Connect(function()
    safeAction(function()
        if playtestInProgress then error("Stop the test before sharing any report") end
        if not playtestPreview then error("Run a test and preview the report first") end
        local report = playtestPreview
        -- Clear the local pending report before sending. If a network timeout
        -- follows an accepted request, double-clicking cannot create duplicates.
        playtestPreview = nil
        local response = request("POST", "/v1/studio/playtest-report", report)
        playtestInfoLabel.Text = "Shared report " .. response.playtestId ..
            " / " .. response.mode .. ". Verdict: not assessed."
        setStatus("Read-only test report shared. Call lazydev_list_playtests then lazydev_read_playtest.")
    end)
end)

playtestClearButton.MouseButton1Click:Connect(function()
    safeAction(function()
        if playtestInProgress then error("Stop the test before discarding its report") end
        playtestPreview = nil
        playtestBox.Text = ""
        playtestInfoLabel.Text = "Local test report discarded. Studio Output unchanged."
        setStatus("No test report shared.")
    end)
end)

-- Sine's public docs describe shared.sv as an API registered by the
-- client-side *runtime module*. The editor plugin is NOT automated here.
-- We never require the module or access scripts' Source.
sineInspectButton.MouseButton1Click:Connect(function()
    safeAction(function()
        sinePreview = nil
        sinePreviewBox.Text = ""
        local planted = game:GetService("ReplicatedStorage"):FindFirstChild("SineVFX")
        local runtimeClass = planted and planted.ClassName or "none"
        local selected = Selection:Get()
        if #selected > 1 then
            error("Select at most one effect object, or clear selection for a runtime-only check")
        end
        local selection = {
            present = false,
            path = "",
            className = "",
            tags = {},
            tagsTruncated = false,
            propertiesFolder = false,
        }
        if #selected == 1 then
            local target = selected[1]
            if not target:IsDescendantOf(game) then
                error("Selected object is not a descendant of the open DataModel")
            end
            selection.present = true
            selection.path = target:GetFullName()
            selection.className = target.ClassName
            local properties = target:FindFirstChild("Properties")
            selection.propertiesFolder = properties ~= nil and properties:IsA("Folder")
            local allTags = CollectionService:GetTags(target)
            table.sort(allTags)
            for _, tag in ipairs(allTags) do
                if type(tag) == "string" and #tag > 0 and #tag <= 80 and
                    #selection.tags < 16 then
                    table.insert(selection.tags, tag)
                else
                    selection.tagsTruncated = true
                end
            end
        end
        sinePreview = {
            kind = "sine_runtime",
            runtimeClass = runtimeClass,
            selection = selection,
        }
        local label = runtimeClass == "ModuleScript" and "ModuleScript present" or
            (runtimeClass == "none" and "Missing" or "Unexpected " .. runtimeClass)
        sinePreviewBox.Text = "ReplicatedStorage.SineVFX: " .. label ..
            "\nSelected: " .. (selection.present and selection.path or "none") ..
            "\nClass: " .. selection.className ..
            "\nProperties folder: " .. tostring(selection.propertiesFolder) ..
            "\nTags: " .. table.concat(selection.tags, ", ") ..
            (selection.tagsTruncated and " (partial list)" or "") ..
            "\nNo Sine module required, editor commands invoked, or source transmitted."
        sineInfoLabel.Text = "Local read-only preview. No data shared."
        setStatus("Inspect this Sine runtime/effect evidence, then Share or Discard. " ..
            "Module presence does not prove correct animation or effect playback.")
    end)
end)

sineShareButton.MouseButton1Click:Connect(function()
    safeAction(function()
        if not sinePreview then
            error("Preview a Sine inspection before sharing")
        end
        local preview = sinePreview
        sinePreview = nil -- do not double-submit a potentially accepted request
        local result = request("POST", "/v1/studio/specialist/sine", preview)
        sineInfoLabel.Text = "Sine inspection shared: " .. result.sineId
        setStatus("Read-only Sine evidence shared. Call lazydev_list_sine_inspections and " ..
            "lazydev_read_sine_inspection in your MCP client.")
    end)
end)

sineDiscardButton.MouseButton1Click:Connect(function()
    safeAction(function()
        sinePreview = nil
        sinePreviewBox.Text = ""
        sineInfoLabel.Text = "Local Sine inspection discarded."
        setStatus("No Sine data shared.")
    end)
end)

local function vector3(value)
    return { value.X, value.Y, value.Z }
end

local function udim2(value)
    return {
        xScale = value.X.Scale, xOffset = value.X.Offset,
        yScale = value.Y.Scale, yOffset = value.Y.Offset,
    }
end

-- An intentionally small, explicit allowlist. No scripts' Source, attributes,
-- children-of-script contents or arbitrary Instance properties are transmitted.
local function visibleProperties(object)
    local result = {}
    if object:IsA("BasePart") then
        result.Anchored = object.Anchored
        result.CanCollide = object.CanCollide
        result.Size = vector3(object.Size)
        result.Position = vector3(object.Position)
        result.Color = { object.Color.R, object.Color.G, object.Color.B }
        result.Material = object.Material.Name
        result.Transparency = object.Transparency
    elseif object:IsA("GuiObject") then
        result.Visible = object.Visible
        result.GuiSize = udim2(object.Size)
        result.GuiPosition = udim2(object.Position)
        result.ZIndex = object.ZIndex
        result.BackgroundTransparency = object.BackgroundTransparency
    elseif object:IsA("ScreenGui") then
        result.Enabled = object.Enabled
    end
    return result
end

local function collectStructure(root)
    local nodes = {}
    local references = {}
    local truncated = false

    local function collect(object, parentId, depth)
        if #nodes >= MAX_NODES then
            truncated = true
            return
        end
        local id = #nodes -- zero-based ids, matching the bridge's input format
        local item = {
            id = id,
            depth = depth,
            name = object.Name,
            className = object.ClassName,
            path = object:GetFullName(),
            properties = visibleProperties(object),
        }
        -- Lua nil fields are omitted in JSON. The bridge accepts an absent
        -- parentId on the root and normalizes it to null.
        if parentId ~= nil then item.parentId = parentId end
        table.insert(nodes, item)
        references[id + 1] = object

        local children = object:GetChildren()
        table.sort(children, function(a, b)
            if a.Name == b.Name then return a.ClassName < b.ClassName end
            return a.Name < b.Name
        end)
        if depth >= MAX_TREE_DEPTH then
            if #children > 0 then truncated = true end
            return
        end
        for _, child in ipairs(children) do
            if #nodes >= MAX_NODES then
                truncated = true
                break
            end
            collect(child, id, depth + 1)
        end
    end

    collect(root, nil, 0)
    return { rootPath = root:GetFullName(), truncated = truncated, nodes = nodes }, references
end

structureButton.MouseButton1Click:Connect(function()
    safeAction(function()
        local selected = Selection:Get()
        if #selected ~= 1 then error("Select exactly one root Instance in Explorer") end
        local evidence, references = collectStructure(selected[1])
        local response = request("POST", "/v1/studio/inspect-tree", evidence)
        trackedStructure = {
            root = selected[1], structureId = response.structureId,
            evidence = evidence, references = references,
        }
        sceneProposal = nil
        scenePreview.Text = ""
        sceneInfoLabel.Text = "Inspected: " .. evidence.rootPath
        infoLabel.Text = "Hierarchy: " .. response.rootPath ..
            "\nNodes: " .. response.nodeCount ..
            (response.truncated and " (partial snapshot)" or " (complete within depth 4)")
        setStatus("Read-only hierarchy shared with bridge. No script source sent. " ..
            "Use lazydev_list_structures and lazydev_read_structure in your MCP client.")
    end)
end)

-- Scene editing is intentionally tiny. It cannot delete, move, reparent, or
-- create scripts. It is restricted to allowlisted creations and properties,
-- with one explicitly approved and Studio-undoable action per proposal.
local SCENE_PARENTS = {
    Folder = {Workspace=true, Folder=true, Model=true, ServerStorage=true, ReplicatedStorage=true},
    Model = {Workspace=true, Folder=true, Model=true, ServerStorage=true, ReplicatedStorage=true},
    Part = {Workspace=true, Folder=true, Model=true, ServerStorage=true, ReplicatedStorage=true},
    ScreenGui = {StarterGui=true},
    Frame = {ScreenGui=true, Frame=true},
    TextLabel = {ScreenGui=true, Frame=true},
}
local SCENE_PROPERTIES = {
    Anchored = {Part=true}, CanCollide = {Part=true}, Position = {Part=true},
    Size = {Part=true}, Color = {Part=true}, Material = {Part=true},
    Transparency = {Part=true}, Enabled = {ScreenGui=true},
    Visible = {Frame=true, TextLabel=true}, GuiSize = {Frame=true, TextLabel=true},
    GuiPosition = {Frame=true, TextLabel=true}, ZIndex = {Frame=true, TextLabel=true},
    BackgroundTransparency = {Frame=true, TextLabel=true},
}
local SCENE_MATERIALS = {
    Plastic=true, SmoothPlastic=true, Neon=true, Wood=true, Metal=true,
    Glass=true, Concrete=true, Slate=true, Fabric=true, Grass=true, Sand=true,
    Brick=true, ForceField=true,
}

local function valuesEqual(a, b)
    if type(a) ~= type(b) then return false end
    if type(a) ~= "table" then return a == b end
    for key, value in pairs(a) do
        if not valuesEqual(value, b[key]) then return false end
    end
    for key, _ in pairs(b) do
        if a[key] == nil then return false end
    end
    return true
end

local function numberIn(value, minValue, maxValue)
    return type(value) == "number" and value == value and
        value >= minValue and value <= maxValue
end

local function decodeSceneProperty(targetClass, property, value)
    if not (SCENE_PROPERTIES[property] and SCENE_PROPERTIES[property][targetClass]) then
        error("Property or Instance class is not permitted")
    end
    if property == "Anchored" or property == "CanCollide" or
        property == "Enabled" or property == "Visible" then
        if type(value) ~= "boolean" then error("Expected a boolean") end
        return value
    end
    if property == "Transparency" or property == "BackgroundTransparency" then
        if not numberIn(value, 0, 1) then error("Invalid transparency") end
        return value
    end
    if property == "ZIndex" then
        if not numberIn(value, 0, 1000) or value % 1 ~= 0 then error("Invalid ZIndex") end
        return value
    end
    if property == "Material" then
        if not SCENE_MATERIALS[value] then error("Material not allowed") end
        return Enum.Material[value]
    end
    if property == "Position" or property == "Size" or property == "Color" then
        if type(value) ~= "table" or #value ~= 3 then error("Expected vector of 3 numbers") end
        local minValue, maxValue = -100000, 100000
        if property == "Size" then minValue, maxValue = 0.05, 2048 end
        if property == "Color" then minValue, maxValue = 0, 1 end
        for _, component in ipairs(value) do
            if not numberIn(component, minValue, maxValue) then error("Invalid vector component") end
        end
        if property == "Color" then return Color3.new(value[1], value[2], value[3]) end
        return Vector3.new(value[1], value[2], value[3])
    end
    if property == "GuiSize" or property == "GuiPosition" then
        if type(value) ~= "table" or
            not numberIn(value.xScale, -100, 100) or
            not numberIn(value.yScale, -100, 100) or
            not numberIn(value.xOffset, -100000, 100000) or
            not numberIn(value.yOffset, -100000, 100000) then
            error("Invalid GUI dimensions")
        end
        return UDim2.new(value.xScale, value.xOffset, value.yScale, value.yOffset)
    end
    error("Unsupported property")
end

local function reportSceneOutcome(pending, outcome, note)
    -- Clear the local action before attempting the network receipt. If
    -- reporting fails after a committed change, never apply it twice.
    sceneProposal = nil
    scenePreview.Text = ""
    local success, result = pcall(function()
        return request("POST", "/v1/studio/scene/proposals/" .. pending.id .. "/decision", {
            structureId = pending.structureId, outcome = outcome, note = note,
        })
    end)
    if success then
        sceneInfoLabel.Text = "Studio reported " .. result.status
        setStatus(note)
    else
        setStatus("Studio action result: " .. outcome ..
            ". Receipt failed; do NOT reapply. " .. tostring(result))
    end
end

sceneCheckButton.MouseButton1Click:Connect(function()
    safeAction(function()
        if not trackedStructure then error("Inspect a hierarchy first") end
        local result = request("GET", "/v1/studio/scene/pending?structureId=" ..
            HttpService:UrlEncode(trackedStructure.structureId))
        sceneProposal = result.proposal
        if not sceneProposal then
            scenePreview.Text = ""
            setStatus("No Instance action pending for this hierarchy inspection.")
            return
        end
        if sceneProposal.structureId ~= trackedStructure.structureId then
            sceneProposal = nil
            error("Instance proposal targets a different inspection")
        end
        local pending = sceneProposal
        local summary = pending.action .. " in " .. pending.path
        if pending.action == "create_child" then
            summary = "Create " .. pending.className .. " named " .. pending.name ..
                " under " .. pending.path
        elseif pending.action == "set_property" then
            summary = "Change " .. pending.path .. "." .. pending.property
        end
        sceneInfoLabel.Text = summary
        scenePreview.Text = "Reason: " .. pending.rationale ..
            "\nAction: " .. pending.action ..
            "\nTarget: " .. pending.path ..
            (pending.action == "create_child" and
                ("\nNew: " .. pending.className .. " / " .. pending.name) or
                ("\nOld: " .. HttpService:JSONEncode(pending.beforeValue) ..
                "\nNew: " .. HttpService:JSONEncode(pending.value)))
        setStatus("No change has been applied. Review this single Instance action before approving.")
    end)
end)

sceneRejectButton.MouseButton1Click:Connect(function()
    safeAction(function()
        if not sceneProposal then error("No pending Instance action") end
        reportSceneOutcome(sceneProposal, "rejected", "Instance action rejected in Studio")
    end)
end)

sceneApproveButton.MouseButton1Click:Connect(function()
    safeAction(function()
        if not sceneProposal or not trackedStructure then error("No inspected Instance action") end
        local pending = sceneProposal
        local inspection = trackedStructure
        local selected = Selection:Get()
        if #selected ~= 1 or selected[1] ~= inspection.root then
            error("Reselect the inspected hierarchy root before approval")
        end
        if pending.structureId ~= inspection.structureId then
            error("Proposal belongs to an older inspection")
        end
        local root = inspection.root
        local node = inspection.evidence.nodes[pending.targetNodeId + 1]
        local target = inspection.references[pending.targetNodeId + 1]
        if not node or not target or not root:IsDescendantOf(game) or
            root:GetFullName() ~= inspection.evidence.rootPath or
            not (target == root or target:IsDescendantOf(root)) or
            target:GetFullName() ~= node.path or target.ClassName ~= node.className or
            pending.path ~= node.path or pending.targetClass ~= target.ClassName then
            reportSceneOutcome(pending, "stale", "Hierarchy changed after inspection; no action applied")
            return
        end
        if not valuesEqual(visibleProperties(target), pending.expectedProperties) then
            reportSceneOutcome(pending, "stale", "Target properties changed; inspect again")
            return
        end
        local prepared
        if pending.action == "create_child" then
            if not SCENE_PARENTS[pending.className] or
                not SCENE_PARENTS[pending.className][target.ClassName] or
                type(pending.name) ~= "string" or #pending.name > 64 or
                not string.match(pending.name, "^[%a_][%w_ %-]*$") then
                error("Requested creation is not permitted")
            end
            if target:FindFirstChild(pending.name) then
                reportSceneOutcome(pending, "stale", "Name already exists under parent; no action applied")
                return
            end
        elseif pending.action == "set_property" then
            if node.properties[pending.property] == nil or
                not valuesEqual(node.properties[pending.property], pending.beforeValue) then
                reportSceneOutcome(pending, "stale", "Original property value mismatch")
                return
            end
            prepared = decodeSceneProperty(target.ClassName, pending.property, pending.value)
        else
            error("Unknown Instance action; no edit attempted")
        end
        local recording = ChangeHistoryService:TryBeginRecording(
            "LAZYDevKitSceneAction", "LAZY DevKit approved Instance action")
        if not recording then error("Studio cannot start undo recording; nothing changed") end
        local success, changeError = pcall(function()
            if pending.action == "create_child" then
                local object = Instance.new(pending.className)
                object.Name = pending.name
                object.Parent = target
            else
                target[pending.property] = prepared
            end
        end)
        if not success then
            ChangeHistoryService:FinishRecording(recording, Enum.FinishRecordingOperation.Cancel)
            reportSceneOutcome(pending, "failed", "Studio rejected Instance change: " ..
                tostring(changeError):sub(1, 170))
            return
        end
        local committed, commitError = pcall(function()
            ChangeHistoryService:FinishRecording(recording, Enum.FinishRecordingOperation.Commit)
        end)
        if not committed then
            reportSceneOutcome(pending, "failed", "Instance mutation was attempted but Undo commit is uncertain. " ..
                "Inspect the result; do not apply again. " .. tostring(commitError):sub(1, 100))
            return
        end
        reportSceneOutcome(pending, "applied", "Instance action applied in Studio. Undo is available; re-inspect to verify.")
    end)
end)

inspectButton.MouseButton1Click:Connect(function()
    safeAction(function()
        local selected = Selection:Get()
        if #selected ~= 1 or not selected[1]:IsA("LuaSourceContainer") then
            error("Select exactly one Script, LocalScript, or ModuleScript in Explorer")
        end
        local scriptObject = selected[1]
        local source = ScriptEditorService:GetEditorSource(scriptObject)
        if #source > MAX_SOURCE_BYTES then error("Source exceeds the V0 128 KB limit") end
        local instanceId = HttpService:GenerateGUID(false)
        local response = request("POST", "/v1/studio/inspect", {
            instanceId = instanceId,
            path = scriptObject:GetFullName(),
            className = scriptObject.ClassName,
            source = source,
        })
        tracked = { scriptObject = scriptObject, instanceId = instanceId,
            snapshotId = response.snapshotId, source = source }
        proposal = nil
        currentBox.Text = source
        proposedBox.Text = ""
        infoLabel.Text = scriptObject:GetFullName() .. "\nObservation " .. response.snapshotId
        setStatus("Script shared with local bridge. Ask your MCP agent to inspect and propose an edit, then check proposals.")
    end)
end)

checkButton.MouseButton1Click:Connect(function()
    safeAction(function()
        if not tracked then error("Inspect a script first") end
        local result = request("GET", "/v1/studio/pending?instanceId=" .. HttpService:UrlEncode(tracked.instanceId))
        proposal = result.proposal
        if not proposal then
            proposedBox.Text = ""
            setStatus("No pending proposal for this inspection.")
            return
        end
        if proposal.snapshotId ~= tracked.snapshotId then
            proposal = nil
            error("Proposal is for a different inspection. Inspect again.")
        end
        proposedBox.Text = proposal.newSource
        infoLabel.Text = proposal.path .. "\nReason: " .. proposal.rationale
        setStatus("Review the complete old and new source. Nothing changes until you approve. Reinspect if the source changed.")
    end)
end)

local function reportOutcome(pending, outcome, note)
    local response = request("POST", "/v1/studio/proposals/" .. pending.id .. "/decision", {
        snapshotId = pending.snapshotId, outcome = outcome, note = note or "",
    })
    proposal = nil
    proposedBox.Text = ""
    setStatus("Studio reported " .. response.status .. ". " .. (note or ""))
end

rejectButton.MouseButton1Click:Connect(function()
    safeAction(function()
        if not proposal then error("No pending proposal") end
        reportOutcome(proposal, "rejected", "Rejected in Studio")
    end)
end)

approveButton.MouseButton1Click:Connect(function()
    safeAction(function()
        if not tracked or not proposal then error("No inspected script with a pending proposal") end
        if proposal.snapshotId ~= tracked.snapshotId or proposal.instanceId ~= tracked.instanceId then
            error("Proposal targets a different inspection")
        end
        local pending = proposal
        local target = tracked.scriptObject
        if not target:IsDescendantOf(game) then
            reportOutcome(pending, "stale", "Script is no longer in the DataModel")
            return
        end
        if ScriptEditorService:GetEditorSource(target) ~= tracked.source then
            reportOutcome(pending, "stale", "Source changed after inspection; no edit was applied")
            return
        end

        local recording = ChangeHistoryService:TryBeginRecording("LAZYDevKitScriptEdit", "LAZY DevKit approved script edit")
        if not recording then error("Studio cannot begin an undo recording. No change attempted.") end
        local ok, updateError = pcall(function()
            ScriptEditorService:UpdateSourceAsync(target, function(previous)
                if previous ~= tracked.source then return nil end
                return pending.newSource
            end)
        end)
        if not ok then
            ChangeHistoryService:FinishRecording(recording, Enum.FinishRecordingOperation.Cancel)
            reportOutcome(pending, "failed", "Studio editor rejected update: " .. tostring(updateError):sub(1, 200))
            return
        end
        local after = ScriptEditorService:GetEditorSource(target)
        if after ~= pending.newSource then
            ChangeHistoryService:FinishRecording(recording, Enum.FinishRecordingOperation.Cancel)
            reportOutcome(pending, "stale", "Editor source changed or update cancelled; reverted recording")
            return
        end
        ChangeHistoryService:FinishRecording(recording, Enum.FinishRecordingOperation.Commit)
        -- A source change in Studio is not a playtest or proof of correctness.
        currentBox.Text = after
        tracked.source = after
        reportOutcome(pending, "applied", "Source updated in Studio; use Studio Undo to revert. Not playtested.")
    end)
end)
