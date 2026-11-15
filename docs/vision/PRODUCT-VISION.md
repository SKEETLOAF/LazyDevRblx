# LAZY DevKit: Product Vision

## What we are building

A **local-first, model-independent Roblox AI development enhancement** that makes an existing AI agent more capable as a researcher, planner, creative collaborator, developer, and reviewer.

It consists of portable agent skills and instructions; a local MCP bridge; an optional Roblox Studio plugin; and an optional desktop companion for permissioned observation and control of third-party applications. These components may be used separately when possible.

It is **not** a proprietary AI model, a Claude/Codex subscription reseller, a prompt-only gimmick, a mandatory asset generator, or a replacement for Studio.

## Problems to solve

1. **Blind execution:** AI writes scripts or assets without checking how the end result behaves or looks.
2. **Specialist-tool disconnect:** Developer tools such as Eclipse, Moon Animator and Sine often expose no stable API that a general-purpose agent can call.
3. **Generic creative output:** AI repeatedly converges on familiar mechanics, layouts, art direction and templates even when prompts are detailed.
4. **Loss of project identity:** Agents rebuild or rename existing structures rather than preserving conventions and decisions.
5. **Uncritical assistance:** An agent follows instructions but fails to independently research, critique, compare, propose and refine.
6. **Waste:** Excessive tool calls, repeated full-context loading and continual screenshot/model polling.

## Four pillars

### 1. Perception: Eyes and senses

Use both **structural signals** (instances, scripts, rigs, animations, effects, runtime logs, performance) and **visual signals** (Studio viewport, authorized plugin-window screenshots, frame samples, UI device previews, visual annotations). Optionally integrate audio signals when the capability is truly implemented. Never say something was 'seen' unless actually observed.

### 2. Judgment: Useful independent thinking

Ask the relevant questions internally, research credible sources when needed, challenge weaknesses, compare genuinely distinct solutions using shared criteria, and recommend a path with reasoning. Don't impose arbitrary sets of 3 or 5 answers. Challenge AI-generated ideas as seriously as user-generated ideas. Provide evidence and mark assumptions.

### 3. Capability: Tools, not wishful prompts

Provide actual operations via official Roblox APIs and Studio MCP, documented external interfaces, interoperable formats, or opt-in visual desktop automation. When an interface is unavailable, use manual handoff rather than fake success.

### 4. Iteration: Observe, adapt and verify

**Understand → Propose → Preview → Act → Observe → Critique → Correct → Approve.**

The agent should preserve manual corrections; compare actual output against references and functional expectations; respect approval checkpoints; and support cancellation and safe rollback when possible.

## Who it helps

- **Beginners:** Build a distinctive first prototype while learning what the tools are doing.
- **Solo developers:** Accomplish multi-disciplinary work without forcing one AI-generated visual identity.
- **Established projects:** Make narrow, safe improvements preserving conventions, architecture and user-authored work.
- **Artists and animators:** Preview and selectively refine assets, animation and effects with specialist tools.
- **Teams:** Review grounded changes and retain evidence/decisions across sessions.

## Creative direction

There is no default 'LAZY visual style'. The project's artistic identity comes from the developer's intentions, references, actual existing assets and approved experiments. Compare silhouette, composition, proportions, material logic, color, readability, variation, movement, feedback and performance in the context of that identity.

References should inspire **principles and adaptations**, not copying protected assets or blindly matching a source's appearance. Present diverse meaningful directions when they exist, not padded alternatives.

## Work with what developers have

Do not require a paid Eclipse, Moon, Sine or other plugin. These can act as optional production tools. Do not require a new project structure or rewrite a project around DevKit. Offer Rojo/editor integration where supported and straightforward native Studio workflows as fallback.

## Efficiency and trust

One main coordinator, small deterministic actions, event-driven captures, task-relevant context retrieval, finite retries, explicit permissions, user-visible state, and an emergency stop for desktop control. Supported AI clients bring their own accounts, credentials and quotas. Do not bypass provider limits or service rules.

## References and evidence-based quality

Use opt-in still-image and animation references as examples of visual principles, not instructions to clone a protected production asset. Deconstruct observable layering, silhouette, palette, lighting, camera, timing and effect rhythms, and propose implementation hypotheses marked as such. Verify the finished project in its own gameplay context. Separate quantitative characteristics from a developer-approved artistic rubric; numerical similarity does not guarantee quality.

## Quality bar

A workflow counts as complete only when the system can substantiate what it did and what it verified. Correct structure does not automatically mean good visuals. Beautiful screenshots do not automatically mean functioning gameplay. When a review requires a human artistic choice, show the trade-off rather than invent an objective verdict.

## Out of scope for V0

Full ForgeGUI-style asset generation, automated control of arbitrary proprietary plugins, remote cloud accounts, user billing, continuous video streaming to AI models, fully autonomous publication, and universal compatibility with all AI chat interfaces.

**Product status:** Vision established; capabilities are targets, not completed features.