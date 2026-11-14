-- LAZY DevKit Studio review panel (V0.4 experimental; script and scene approvals).
-- Install as a local Studio plugin Script. Never paste a session token into game scripts.
local HttpService = game:GetService("HttpService")
local Selection = game:GetService("Selection")
local ScriptEditorService = game:GetService("ScriptEditorService")
local ChangeHistoryService = game:GetService("ChangeHistoryService")

local BRIDGE = "http://127.0.0.1:43187"
local MAX_SOURCE_BYTES = 128 * 1024
local MAX_NODES = 128
local MAX_TREE_DEPTH = 4
local tracked = nil
local proposal = nil
local trackedStructure = nil
local sceneProposal = nil
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

showButton.Click:Connect(function()
    widget.Enabled = not widget.Enabled
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
        ChangeHistoryService:FinishRecording(recording, Enum.FinishRecordingOperation.Commit)
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
