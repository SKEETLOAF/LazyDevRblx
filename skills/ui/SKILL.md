---
name: ui
description: HUD, menus, responsive layout, interaction states, information hierarchy and accessible Roblox UI systems.
---

# UI / HUD / UX

Begin with the player question: what must they see, decide, or act upon right now? Identify information priority, interaction flow, state changes and target devices. Split HUD, menus, reusable components, style tokens, input navigation, bindings and feedback by maintainable responsibility.

Use Roblox-supported layout systems and reusable style definitions where suitable. Avoid copying static image mockups as fixed-pixel runtime screens. Test small screens, safe areas, controller focus, keyboard, touch, localization, text overflow, contrast and feedback states.

Choose a visual language compatible with the game's geometry, animation and effect design while keeping UI-specific readability. Don't make every icon or panel identical merely for consistency; focus hierarchy matters.

**Quality evidence:** approved viewport at actual target scale, structure snapshot and functional input tests across device sizes. A single desktop screenshot is not a mobile/controller compatibility test.

**References:** Roblox UI and performance docs in the competency plan.
