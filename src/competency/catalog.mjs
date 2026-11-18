// Curated, versioned competency descriptors. These are not generated assets,
// live search results, or guarantees that a specific tool is available.
export const CATALOG_VERSION = '2026-11-16.1';
export const RESOURCE_CHECKED_ON = '2026-11-16';
const official = (title,path,why) => ({
  title,url:'https://create.roblox.com/docs/'+path,
  publisher:'Roblox Creator Hub',type:'official_documentation',
  why,checkedOn:RESOURCE_CHECKED_ON,liveAvailability:'not_checked_at_request_time',
  licenseNote:'Documentation is a learning resource, not permission to copy third-party assets.',
});
const gate=(id,question,requiredKinds,review,appliesWhen='always') => ({
  id,question,requiredKinds,review,appliesWhen,
  verdict:'not_assessed',
});

export const COMPETENCIES = [
  {
    id:'modeling',label:'3D modeling and asset construction',
    aliases:['model','modeling','mesh','creature','character','topology','rig','quad','polygon','sculpt','uv','meshpart','antler','animal','weapon','prop'],
    purpose:'Choose appropriate geometry and build deliberate silhouettes and maintainable meshes, not primitive piles.',
    methods:[
      'Choose mesh versus Parts versus texture detail based on silhouette, interaction, camera distance and reuse.',
      'Block out primary volumes, then refine silhouette, anatomical transitions, purposeful edge flow and material boundaries.',
      'Design topology around deformation; test normals, shading, self-intersections, UVs, scale and pivots.',
      'Keep conceptual modules independently editable without splitting every contiguous surface into a new mesh.',
    ],
    antiPatterns:[
      'Disconnected bubbly primitives standing in for coherent anatomy.',
      'Using added geometry where a texture or normal map would suffice.',
      'Joining rig-critical pieces without testing deformation or preserving pivots.',
    ],
    resourceIds:['meshes','importer','characters'],
    gates:[
      gate('modeling:silhouette','Does the asset read clearly from relevant angles and gameplay distance?',['viewport'],'human_visual_review'),
      gate('modeling:construction','Are independently manipulated pieces, pivots and reusable sections organized intentionally?',['structure'],'human_structural_review'),
      gate('modeling:reference','Does shape language, surface treatment and detail placement match approved direction?',['reference','viewport'],'human_art_direction_review'),
      gate('modeling:rig','If deforming, have topology and rig motion been verified under representative poses?',['sequence'],'human_animation_review'),
      gate('modeling:authoring-data','For Blender-authored assets, do mesh, modifier, UV and collection data support the intended construction?',['blender-audit'],'human_source_review','when_blender_authored'),
    ],
  },
  {
    id:'building',label:'Environment design and modular construction',
    aliases:['build','building','house','roof','wall','garden','yard','terrain','city','environment','architecture','level','room','floor','tree','fence','map'],
    purpose:'Make independently maintainable places with coherent style, readable navigation and reusable components.',
    methods:[
      'Separate structure, fixtures, terrain, landscaping and gameplay logic by editing responsibility.',
      'Decide reusable modules and pivots before merging meshes; distinguish organization from physical mesh connectivity.',
      'Validate traversal scale, sightlines, collision, access and occlusion from player-height camera views.',
      'Use packages or reusable prefabs where variations and repeated structures warrant them.',
    ],
    antiPatterns:[
      'Grouping a whole yard into a house mesh, or fusing walls and roof when separate manipulation is needed.',
      'Using a universal folder tree without considering ownership, streaming and reuse.',
      'Detailing hidden geometry while gameplay routes and composition remain untested.',
    ],
    resourceIds:['meshes','packages','performance'],
    gates:[
      gate('building:organization','Can structure, roof, openings and surrounding environment be revised independently?',['structure'],'human_structural_review'),
      gate('building:navigation','Are scale, entrances, camera views and movement routes legible?',['viewport','playtest'],'human_gameplay_review'),
      gate('building:style','Does the environment match approved style, palette and shape language?',['reference','viewport'],'human_art_direction_review'),
      gate('building:performance','Have streaming, draw cost and device performance been measured?',['performance'],'performance_instrumentation_required'),
      gate('building:authoring-data','For Blender-authored environments, are reusable object and collection boundaries apparent in source?',['blender-audit'],'human_source_review','when_blender_authored'),
    ],
  },
  {
    id:'animation',label:'Animation, rigging and motion direction',
    aliases:['animate','animation','animator','keyframe','pose','easing','ik','fk','stride','walk','run','idle','turn','attack','motion','rigging'],
    purpose:'Communicate intention, weight and timing with rig-consistent animation.',
    methods:[
      'Identify required rig, pivot and joint relationships before posing.',
      'Define intention, anticipation, action, impact, follow-through and recovery only where the motion needs them.',
      'Use keyframes, easing, additive layers and procedural support intentionally, not uniformly.',
      'Compare playback at game speed and across direction changes; synchronize events to actual animation markers.',
    ],
    antiPatterns:[
      'Rigid poses and uniform timing disguised by particle effects.',
      'Foot sliding, broken contacts and non-looping loops.',
      'Treating sampled pixel changes as proof of a correct motion curve.',
    ],
    resourceIds:['animation','animation-editor','performance'],
    gates:[
      gate('animation:motion','Is movement readable and coherent across sampled frames?',['sequence'],'human_motion_review'),
      gate('animation:rig','Do animated poses preserve contacts, pivots and deformation?',['sequence','structure'],'human_rig_review'),
      gate('animation:reference','Does timing and body language follow the intended reference principles?',['sequence','reference'],'human_art_direction_review'),
      gate('animation:playback','Does playback behave properly in-game, including priorities and loops?',['playtest'],'functional_test_needed'),
      gate('animation:authoring-data','For Blender-authored motion, are rigs and action references present and inspectable?',['blender-audit'],'human_source_review','when_blender_authored'),
    ],
  },
  {
    id:'vfx',label:'Visual effects and technical art',
    aliases:['vfx','effect','effects','particle','particles','trail','beam','spark','explosion','flash','aura','impact','emitter','sine','shader','burst'],
    purpose:'Build layered, readable effects whose timing, shapes and rendering cost serve gameplay.',
    methods:[
      'Separate anchor and emission sources, core effect, secondary motion, debris, lighting and cleanup.',
      'Choose particles, beams, trails, mesh animation and screen effects based on what should move or deform.',
      'Time visible cues to game events, not merely to a convenient arbitrary duration.',
      'Prototype at gameplay camera distance, then review close-up appearance and runtime particle cost.',
    ],
    antiPatterns:[
      'Indiscriminate emitter spam and bloom obscuring hitboxes or player attention.',
      'Long-lived visual debris without cleanup ownership.',
      'Assuming an installed Sine editor exposes undocumented remote automation.',
    ],
    resourceIds:['effects','animation','performance'],
    gates:[
      gate('vfx:readability','Are anticipation, contact and aftermath legible without obstructing gameplay?',['sequence'],'human_effect_review'),
      gate('vfx:reference','Does the visual language and layering follow the approved reference?',['sequence','reference'],'human_art_direction_review'),
      gate('vfx:organization','Are emitters, attachments, light sources and cleanup ownership separated?',['structure'],'human_structural_review'),
      gate('vfx:performance','Have device frame time and emitter counts been measured?',['performance'],'performance_instrumentation_required'),
      gate('vfx:mesh-source','For mesh-driven VFX made in Blender, are source objects and collections inspectable?',['blender-audit'],'human_source_review','when_blender_authored'),
    ],
  },
  {
    id:'sfx',label:'Sound design, music cues and spatial audio',
    aliases:['audio','sfx','sound','music','soundscape','mix','spatial','foley','reverb','audacity','voice','loudness','footstep'],
    purpose:'Build intelligible, synchronized and accessible sound layers with correct spatial routing.',
    methods:[
      'Design transient attack, body and tail separately when the sound concept needs multiple layers.',
      'Match sound events to animation/gameplay markers; consider distances and repeat rates.',
      'Choose the current Roblox audio-graph approach where appropriate; avoid assuming legacy Sound is the only option.',
      'Test loudness, masking, clipping, attenuation and player volume settings on actual devices.',
    ],
    antiPatterns:[
      'One over-loud sample replacing all timing, spatial behavior and frequency hierarchy.',
      'Using constant non-spatial sound for every localized interaction.',
      'Claiming the mix passed without listening to approved playback evidence.',
    ],
    resourceIds:['audio','sound','animation'],
    gates:[
      gate('sfx:timing','Are cues synchronized to the intended events and free of accidental repetition?',['playtest'],'functional_test_needed'),
      gate('sfx:mix','Do balance, clipping, dynamics and tonal layering work across target devices?',['audio'],'audio_review_tool_required'),
      gate('sfx:signal','For WAV-authored SFX, what do peaks, RMS, offset and potential clipping indicate?',['wav-audit'],'signal_evidence_review','when_wav_source'),
      gate('sfx:space','Do positional and nonpositional sounds behave as intended?',['playtest'],'functional_test_needed'),
      gate('sfx:accessibility','Are important cues also communicated without relying on sound alone?',['viewport','playtest'],'human_accessibility_review'),
    ],
  },
  {
    id:'ui',label:'UI, HUD, interaction and accessibility',
    aliases:['ui','hud','interface','menu','inventory','button','panel','shop','overlay','icon','layout','tooltip','mobile','controller','typography','ux'],
    purpose:'Communicate state and interaction clearly across screen sizes and inputs.',
    methods:[
      'Define information priority, states, flows and interactions before decorating screens.',
      'Use flexible layouts and consistent tokens for spacing, type, color and interaction states.',
      'Test touch, mouse, controller and keyboard input, plus localization and small screens.',
      'Keep HUD, menus, reusable components, theme tokens and gameplay bindings independently editable.',
    ],
    antiPatterns:[
      'Fixed-pixel mockup copied directly to every screen size.',
      'Visual polish hiding missing states, feedback or navigation.',
      'Inaccessible contrast or interactions with no nonvisual fallback.',
    ],
    resourceIds:['ui','performance'],
    gates:[
      gate('ui:hierarchy','Are hierarchy and action priority clear at realistic viewing scale?',['viewport'],'human_visual_review'),
      gate('ui:organization','Are reusable components, screens, bindings and tokens independently maintainable?',['structure'],'human_structural_review'),
      gate('ui:interaction','Do interaction states, navigation and input methods actually work?',['playtest'],'functional_test_needed'),
      gate('ui:devices','Has responsive behavior been checked on target viewports and controls?',['device'],'device_test_required'),
    ],
  },
  {
    id:'scripting',label:'Luau engineering, security and maintainability',
    aliases:['script','scripting','luau','code','programming','module','server','client','remote','network','api','replication','save','datastore','bug','refactor'],
    purpose:'Implement maintainable behavior with correct server authority, state and testability.',
    methods:[
      'Inspect existing responsibilities and dependencies before adding or replacing modules.',
      'Keep server-authoritative validation at trust boundaries and structure client prediction separately.',
      'Prefer testable small modules, explicit interfaces and consistent naming over accidental framework churn.',
      'Review performance-sensitive allocations and connection cleanup; test actual replication scenarios.',
    ],
    antiPatterns:[
      'Trusting client remote arguments or assuming client-side anti-cheat is authoritative.',
      'Replacing project architecture without knowing existing dependencies.',
      'Considering a clean Output log proof of correct behavior.',
    ],
    resourceIds:['security','performance'],
    gates:[
      gate('scripting:behavior','Are specified behaviors covered by actual test assertions or playtest evidence?',['playtest'],'functional_test_needed'),
      gate('scripting:security','Have client-server trust boundaries been inspected in the affected source?',['observation'],'human_code_review'),
      gate('scripting:integration','Do changed modules integrate without breaking related systems?',['playtest','diagnostics'],'integration_review'),
      gate('scripting:performance','Have relevant client/server hotspots been profiled?',['performance'],'performance_instrumentation_required'),
    ],
  },
  {
    id:'game-design',label:'Gameplay, systems and experience design',
    aliases:['gameplay','game','mechanic','combat','quest','progression','economy','balance','tutorial','controls','pvp','tower','simulator','level-design','retention'],
    purpose:'Make interactions legible, meaningful and testable, with balanced player agency.',
    methods:[
      'Specify the player decision, system state, feedback and success/failure conditions.',
      'Design for actual player input and iteration before tying systems to large content requirements.',
      'Test ease of learning, meaningful choice, accessibility and edge cases.',
      'Separate balance assumptions from observed player/test results; keep tuning data maintainable.',
    ],
    antiPatterns:[
      'Content quantity standing in for a satisfying loop.',
      'Adding systems that create unnecessary player management burden.',
      'Assuming player understanding or balance from code compilation.',
    ],
    resourceIds:['ui','security','performance'],
    gates:[
      gate('game-design:communication','Can players see system intent, consequences and state changes?',['viewport','playtest'],'human_playtest_review'),
      gate('game-design:rules','Have edge cases, failure and recovery been exercised?',['playtest'],'functional_test_needed'),
      gate('game-design:balance','Are tuning decisions grounded in representative results rather than guesses?',['gameplay-data'],'playtest_metrics_required'),
      gate('game-design:coherence','Do mechanics support the documented player fantasy and project direction?',['reference'],'human_design_review'),
    ],
  },
];
export const SOURCES = Object.freeze({
  meshes: official('Custom 3D assets','art/modeling','Mesh/Part choice, custom geometry and MeshPart usage'),
  importer: official('3D and media importer','studio/importer','FBX/glTF/OBJ import, textures, rigs and warnings'),
  characters: official('Characters','characters','Rigs, skinning and character-specific import tools'),
  packages: official('Reusable packages','projects/assets/packages','Modularity, reuse and updating related instances'),
  animation: official('Animation in Roblox','animation','Event markers, inverse kinematics and animation concepts'),
  'animation-editor': official('Animation Editor','animation/editor','Rig, pose, keyframe, playback, timing and priority'),
  effects: official('Effects','effects','Emitters, trails, beams, lighting and attachment semantics'),
  audio: official('Modular audio objects','audio/objects','Current audio routing and dynamic sound graphs'),
  sound: official('Sound objects','sound','Legacy sound groups, placement and attenuation considerations'),
  ui: official('User interface','ui','Layout, styling, interactive frameworks and hierarchy'),
  security: official('Client-server security','scripting/security/security-tactics','Authority and untrusted client inputs'),
  performance: official('Identify performance issues','performance-optimization/identify','Profilers, counters, memory and frame pacing'),
});
export const STYLES = Object.freeze({
  unspecified:{label:'Not selected',principles:[],avoid:[],status:'needs_project_direction'},
  bloxy:{label:'Classic bloxy',principles:['Intentional block proportions and recognizable Roblox geometry','Consistent geometric rhythm and proportions','Use complexity only where function or silhouette requires it'],avoid:['Treating simplicity as permission for careless spacing','Inconsistent form scale']},
  voxel:{label:'Voxel',principles:['Choose a consistent grid and purposeful step size','Control silhouette clusters and shape scale','Coordinate material and animation quantization with geometry'],avoid:['Random incompatible voxel sizes','Unplanned noisy silhouettes']},
  toy:{label:'Toy / miniature',principles:['Purposeful exaggerated proportions and toy-material logic','Readable seams and assembly boundaries','Color hierarchy coherent with miniature scale'],avoid:['Lumpy forms with no construction purpose','Every material having the same shine']},
  stylized:{label:'Stylized / faceted',principles:['Designed primary silhouettes and intentional shape exaggeration','Facets and edge flow that communicate form','Materials and details supporting one visual hierarchy'],avoid:['Disconnected bubble/clay primitive piles','Arbitrary triangles and spikes']},
  anime:{label:'Animated / anime-inspired',principles:['Expressive silhouettes, intentional exaggeration and motion poses','Illustrative shading and clear action rhythm','Coordinate visual effects, animation and UI language'],avoid:['Excess bloom obscuring anatomy or hit cues','Inconsistent line and color treatment']},
  realistic:{label:'Realistic / high fidelity',principles:['Physically plausible scale, construction and surface logic','Material definition, light response and believable detailing','Performance-conscious fidelity by camera distance'],avoid:['High-frequency noise instead of material logic','Asset-level realism disconnected from game lighting']},
  hybrid:{label:'Hybrid / project-defined',principles:['Document which elements borrow from each visual language','Keep intentional consistency across assets, animation, UI and effects','Compare outliers against approved project exemplars'],avoid:['Unexplained style drift between components','Assuming one preset determines the whole style']},
});
export const ASSET_KINDS = Object.freeze({
  general:{
    label:'General task',root:'Deliverable',
    components:['Visual or functional elements','Editability boundaries','Runtime ownership','Verification evidence'],
    guidance:['Define separately modifiable responsibilities before merging assets or code.','Do not split every surface or file automatically; preserve coherent structure.'],
  },
  building:{
    label:'Building / property',root:'Property',
    components:['Building / Structure / Walls','Building / Roof','Building / Doors and Windows','Building / Interior','Site / Yard and Landscaping','Site / Paths and Fences'],
    guidance:['Yard and building are sibling responsibilities even when displayed together.','Walls and roof stay separately selectable unless a justified import or runtime need dictates otherwise.','Group Instances for manipulation; physical meshes can remain continuous where topology requires it.'],
  },
  creature:{
    label:'Character / creature',root:'Creature',
    components:['Body and anatomical forms','Head and facial pieces','Appendages and ornaments','Rig and attachment points','Visual-effect anchors','Animation and audio event hooks'],
    guidance:['Preserve coherent anatomy across joined surfaces; ornaments may be separate for iteration.','Choose deformation boundaries before topology and rig decisions.','Do not model a creature solely as disconnected primitives.'],
  },
  environment:{
    label:'Environment / region',root:'Region',
    components:['Terrain and foundation','Architectural sets','Reusable props','Natural set dressing','Lighting and atmosphere','Gameplay collision and triggers'],
    guidance:['Do not fuse entire region into one replacement-proof asset.','Separate reusable modules from location-specific placement and navigation logic.'],
  },
  interaction:{
    label:'Interactable / mechanism',root:'Interactable',
    components:['Visible geometry','Moving parts and pivots','Interaction logic','Animation states','VFX and sound cues','UI feedback and tests'],
    guidance:['Separate visual mechanism from authoritative gameplay state.','Moving components require correct pivots and predictable ownership.'],
  },
  ability:{
    label:'Ability / effect',root:'Ability',
    components:['Gameplay state and validation','Rig animation','Visual effect modules','Sound cues','Camera and HUD feedback','Cleanup and performance tests'],
    guidance:['Authoritative gameplay logic must not depend on cosmetic effect success.','Each artistic discipline remains independently tunable and replaceable.'],
  },
  interface:{
    label:'Interface / HUD',root:'Interface',
    components:['Screen layouts','Reusable widgets','Theme and tokens','Input/navigation handlers','Gameplay state bindings','Feedback and accessibility'],
    guidance:['Keep layouts, state and reusable components separately editable.','Support multiple viewports; avoid flattening an editable HUD into one texture.'],
  },
});
