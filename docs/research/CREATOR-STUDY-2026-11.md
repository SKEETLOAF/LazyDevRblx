# Creator study register: original work, community feedback, and shipped design

**Research cut: 2026-11-16.** Initial curated sources for LAZY DevKit's future professional knowledge packs. This is a **research register**, not an autonomous training pipeline, a license to reproduce someone else's game, or evidence LAZY can already operate a third-party editor. This register is project-agnostic.

## Selection policy

Prefer, in order:
1. **Inspectable original work:** official documentation, original author repository, source files, primary talks, technical postmortems, recorded work-in-progress and before/after revisions.
2. **Genuine external scrutiny:** review comments tied to visible work, maintained issue trackers, bug fixes, player tests or awards with an identifiable awarding body. Popularity alone is not a technical validation.
3. **Professional production evidence:** shipped work, attributable roles, asset pipelines, game-playing observations and concrete trade-offs. Distinguish creator self-report from outside corroboration.
4. **Transferable skill:** can the method be tested and applied to original Roblox deliverables, and what proof would confirm it worked?
5. **Freshness:** record publication date and recheck changing Roblox engine APIs, plugin versions and package interfaces at use time. An old explanation of physics may remain useful while its code/API usage does not.
6. **Low AI-content contamination:** do not use anonymous scraped/SEO tutorial compilations as authoritative sources. Prefer direct recordings, original code, commits, discussion with actual creators, and traceable citations. AI assistance disclosed by a creator is not automatically disqualifying, but cannot be mistaken for a human-origin design technique without evidence.

**Two independent ratings, never combined into a synthetic number:** *study strength* (inspectable primary artifact and practical details) and *recognition* (shipped success, expert evaluation, community votes). A winner can be great to play but a weak source of internal code; a small devlog can be an excellent engineering study despite limited popularity. All study assignments below are proposed original exercises, not author-endorsed recipes.

## Group A: technical developers with inspectable methods

### A1. Quenty: Nevermore Engine

- **Primary:** https://github.com/Quenty/NevermoreEngine
- **Evidence:** public code, documentation, issues, release history, reusable modules; author says it has powered more than a billion play sessions (a repository **self-report**, not audited traffic).
- **Study:** dependency lifecycle and Maid/Binder patterns; spatial querying with Octree; Spring; composition boundaries; module documentation, test practices and complexity tradeoffs. Inspect a *small selected module*, not the entire 278-package ecosystem.
- **Limit:** high adoption does not make every abstraction appropriate for a solo project; compare native APIs and package weight. Never auto-add a dependency.

### A2. Stephen Leitnick (Sleitnick): RbxUtil

- **Primary:** https://github.com/Sleitnick/RbxUtil
- **Original docs:** https://github.com/Sleitnick/RbxUtil/blob/main/docs/intro.md
- **Evidence:** MIT-licensed public source and tests, named utilities such as Trove, Signal, TypedRemote, Component, Spring, Shake and Timer, public repository issue history.
- **Study:** resource cleanup, lifecycle safety, type-checked remote contracts and testable modular design. Write a new tiny script that creates and cleans up connections; check for leaks and misuse.
- **Limit:** Knit, a *different* Sleitnick repository, is archived; do not teach archived framework setup as the current universal default. Check each RbxUtil module's versions separately.

### A3. EgoMoose: technical tutorials grounded in implementations

- **Original geometry/visual article (2025):** https://devforum.roblox.com/t/an-outline-technique-with-variable-thickness-for-3d-models/3950556
- **Original projectiles tutorial and discussion:** https://devforum.roblox.com/t/modeling-a-projectiles-motion/176677
- **Evidence:** clear mathematical derivations, illustrative artifacts, construction limitations and community discussions.
- **Study:** ballistic trajectories/impacts and visual outline construction. Independently implement a moving projectile, predict an impact and check outcomes against instrumented hit positions; separately reproduce a *new* variable-outline experiment.
- **Limit:** mathematics may remain durable; do not blindly port 2018–2019 engine code into a 2026 game without updating collision/network behavior.

### A4. Daniel Fox (dphfox): Fusion

- **Primary:** https://github.com/dphfox/Fusion
- **Evidence:** open MIT-licensed reactive Luau library with source, documentation, tests and public contribution history.
- **Study:** state-to-UI bindings, lifecycle cleanup, dependency graphs and predictable UI updates; compare with current Roblox native layout and Universal Styling capabilities.
- **Limit:** use only where complexity pays off. Framework popularity says nothing about game-specific HUD readability on touchscreens.

### A5. RoPotat0: Sine VFX runtime and real plugin feedback

- **Original creator discussion and user comments (Aug. 2026 onward):** https://devforum.roblox.com/t/plugin-sine-vfx-a-vfx-plugin-for-roblox-studio-and-library-with-14k-assets/4803771
- **First-party runtime API:** https://github.com/RoPotat0/Sine-VFX/blob/main/docs-site/docs/api.md
- **Creator Store:** https://create.roblox.com/store/asset/96645663824840/Sine-VFX
- **Evidence:** described runtime verbs and transformed-object structure; publicly visible owner-gated reviews on Creator Store (at research time approximately 21 reviews / 40+ votes, a dynamic value). Creator acknowledges some AI assistance in building the plugin, so do **not** automatically treat its UI design as independently authored masterwork.
- **Study:** particle layering, runtime `emit`/`enable`/`disable`, effect inspection and client playback; compare frame time and readability at gameplay camera. Examine real bug/feature feedback for tool ergonomics.
- **Limit:** published runtime API is **not** evidence of direct control over Sine's editor windows. Asset library rights must be checked separately before any reuse.

### A6. Mastodore: Spray, 2D particles as a source-backed case

- **Original September 2026 post:** https://devforum.roblox.com/t/spray-the-high-performance-easy-to-use-2d-particleemitter-library/4905086
- **Evidence:** creator describes motivation, plugin/playground and open-source GitHub/Wally entry points. Promising live comparison, but not yet established broad professional acclaim.
- **Study:** 2D vs 3D particle rendering, GUI readability, performance on weak hardware and data-driven effect authoring. Compare with native Roblox GUI and Sine runtime where appropriate.
- **Limit:** classify as **technical candidate**, not a validated best-of-class production tool.

## Group B: creators whose iteration and player feedback are visible

### B1. Max (maxgamer123games): Roblox parkour movement devlog

- **Original, feedbacked community thread:** https://devforum.roblox.com/t/building-a-parkour-system-cuz-im-boreddevlog/4073003
- **Evidence:** progress videos, technical comments, acknowledged bugs, later public source/place file announcement (creator says MIT; inspect exact linked repo and license before importing). Early reader critique specifically asked for level design to contextualize the movement. The creator subsequently described smoothing ledge-climb timing, raycast-based fixes, animation and new interactions.
- **Study:** how to iterate on movement feel without confusing a movement tech demo with a fun game; inspect a wallrun/climb test in context, test edge cases, tune camera feel, and invite people unfamiliar with the controls to play.
- **Limit:** explicit creator warning says parts of their code are dated/chaotic. Treat as an honest **feedback/iteration case study**, not current architecture authority.

### B2. Mark Brown: Game Maker's Toolkit, *Developing* / *Mind Over Magnet*

- **First-person development/postmortem:** https://gmtk.substack.com/p/what-its-like-to-launch-a-game-on
- **Feedback episode:** https://www.youtube.com/watch?v=2G84mU3WPaE
- **Shipped game and developer commentary:** https://gmtk.itch.io/mind-over-magnet
- **Evidence:** releases, real playtester complaints, revisions, bugs, commercial outcome and frank discussion of the advantage his existing audience provided.
- **Study:** record a blind playtest, watch players rather than explaining the intended solution, translate each confusion into a hypothesis, retest revised controls/onboarding, separate game merit from marketing reach.
- **Limit:** do not extrapolate a large established channel's sales to a new solo Roblox creator.

### B3. Supergiant Games: *Hades* and documented Early Access development

- **Creator's account of the Noclip documentary series:** https://www.supergiantgames.com/blog/hades-noclip-bluray/
- **Firsthand interview about community feedback:** https://www.pcgamer.com/a-journey-through-early-access-helped-make-hades-a-masterpiece/
- **First-party GDC presentation on writing/audio systems:** https://www.gdcvault.com/play/1026975/Breathing-Life-into-Greek-Myth
- **Evidence:** publicly documented extended production process, post-release outcomes, playtest feedback, iteration during Early Access and cross-disciplinary collaboration.
- **Study:** feedback triage, balancing repeatable challenge, content production rhythms, integrated narrative/audio. Construct a *new* repeatable challenge and test whether a second session still feels meaningful.
- **Limit:** AAA/indie team-size resource differences; take transferable mechanisms, not staffing or content-volume expectations.

### B4. Maddy Thorson and Celeste team: level-design workshop

- **GDC first-person level-design workshop (2017):** https://www.gdcvault.com/play/1024307/Level-Design-Workshop-Designing-Celeste
- **Designer's primary production update:** https://maddythorson.medium.com/celeste-releasing-january-2018-23fbadd4172a
- **Evidence:** designer discusses hundreds of authored stages, pacing, mapping and storytelling through movement; published production decisions and trade-offs.
- **Study:** introduce one mechanic safely, then recombine it to create mastery, build forgiving retries, test what players infer without text prompts, and use level geometry as instruction.
- **Limit:** 2D precision platforming does not map one-for-one to Roblox 3D multiplayer movement; transfer principles, not exact numeric movement tuning.

## Group C: acclaimed *games* to examine, without pretending to possess their source or internal methods

Roblox's **September 12, 2026 Innovation Awards** provide a current, independently announced recognition signal:
https://about.roblox.com/newsroom/2026/09/2026-roblox-innovation-awards

| Game / studio | Award signal | What to evaluate firsthand | Evidence boundary |
| --- | --- | --- | --- |
| **RIVALS / Nosniy Games** | 2026 Best Shooter; Nosniy Games won Best Studio | First duel, aim/combat feel, precision feedback, clean repetition and competitive readability | Award and shipped gameplay, **not** private source or authoritative attribution of each design decision |
| **DOORS / LSPLASH** | 2026 Best Use of Audio | Telegraphing danger through sound, rising suspense, environmental signaling and team response | Award and player-observable behavior, not sound-engine internals |
| **Jujutsu Shenanigans / Tze's Shenanigans** | 2026 Best Action | Timing windows, hit communication, destructible action spectacle, player expression and counterplay | Award does not establish performance budgets or code implementation |
| **Animal Hospital / Animal Anomaly** | 2026 Best New Game, People's Choice and Creative Direction | Distinctive visual premise, how a new player discovers anomalies, reward pacing, atmosphere | Award is recognition; user tests still needed to support general design claims |
| **99 Nights in the Forest / Grandma's Favourite Games** | 2026 Best Survival Game | Social coordination, survival loops, shared short-term goals, return motivation | Popularity/award alone does not establish healthy long-term design |
| **TTK / Sable Digital** | 2026 Best Innovation in Tech | First-person rendering and interaction clarity; distinguish perceived polish from actual measured performance | No verified engine profiling data from award |

**Study protocol:** play or watch unedited gameplay; record events in the first 1/5/10 minutes; identify one meaningful decision, one failure/recovery loop, and one readable feedback cue; gather *specific* player reports of what confuses/frustrates them; then test a different, original implementation of the principle. Never label hypothesized internal source code as observed fact.

## Group D: production-grade art/animation/pipeline sources

### Blender Studio production team

- **Original maintained pipeline documentation:** https://studio.blender.org/tools/
- **Open movies and production files catalog:** https://studio.blender.org/films/
- **Production log and learning hub:** https://studio.blender.org/welcome/
- **Evidence:** genuine production-tested tooling, artists' source breakdowns and evolving rigs, assets, animation, modeling and production notes. As of November 2026 the studio published current rigging lessons and recent open-film project work.
- **Study:** topology and deformation, silhouette studies, rig/animation controls, staging, stylized lighting and export fidelity; build an independently authored Roblox-scale asset and compare it across three camera angles.
- **Limit:** some training and files require a paid membership. Do **not** copy/repackage footage, rigs, assets or textures without checking each item's actual license and access terms. Blender techniques are not a guarantee of Roblox import compatibility.

### Roblox official Creator documentation

- **Versionable, maintainer-authored documentation:** https://github.com/Roblox/creator-docs
- **Onboarding and instrumentation:** https://create.roblox.com/docs/production/game-design/onboarding
- **Analytics and playtesting:** https://create.roblox.com/docs/production/analytics/get-started
- **Evidence:** official maintained platform guidance with source history and issue/PR discussions. This repository declares CC BY 4.0 for prose and MIT for its code samples, subject to their stated terms.
- **Study:** reconcile every third-party technique against *current* engine APIs, permissions, accessibility, device behavior and source-control expectations.

## First four original LAZY benchmark exercises

1. **Movement feel with blind feedback:** inspect EgoMoose's collision reasoning and Max's transparent parkour iteration. Implement a fresh simple climb or guided throw in a disposable place; test immediate input response, contacts, camera, mobile button placement, frustrating edge cases and timed player trials. Compare pre/post, not screenshots alone.
2. **UI and responsiveness:** compare dphfox Fusion and current native UI docs; build an original small HUD in a disposable place. Verify scaling, touch targets, text overflow, gamepad focus, teardown, memory and a controlled preference change. Do not assume any framework is required.
3. **VFX/Audiovisual readability:** use Sine runtime documentation and a Blender Studio timing/FX breakdown to author an original brief effect. Capture sampled onset/peak/decay, view at gameplay distance, validate audio timing and compare frame-time delta on available hardware; separate aesthetics from measurable facts.
4. **First-time user experience:** study GMTK blind tests, Celeste's teaching-through-level design and Roblox's first-time-player analytics. Compare original baseline to one changed onboarding mechanic; collect at least several direct observed player sessions before claiming an improvement. Retention figures only if the game has enough real players to estimate them meaningfully.

**Stop rule:** A skill cannot be labeled a proven production skill merely because the source is acclaimed. It must have a demonstrable procedure, precise version/API constraints, observable outputs, negative tests and repeated results. A creator's endorsement or a 2026 award cannot replace that evidence.

## Follow-up verification, not assumed complete

- Resolve exact repositories and reuse rights linked from the Max and Spray threads, inspect changes/maintainer feedback.
- Identify additional credible **Roblox animator and environment artists** with attributable work plus constructive feedback, not just paid portfolio reels. Until then, Blender Studio is a stronger inspectable process source.
- Review source-specific asset licenses; copyright-safe analysis and original synthesis take priority over asset extraction.
- Record the date and actual public citations for *individual facts* when converting this register into LAZY's future machine-readable provenance catalog.
- Find original primary-case studies on sound design, accessibility and multiplayer network engineering; avoid filling these domains with anonymous AI-authored listicles.
