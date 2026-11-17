// Local metadata, not scraped text or licensed assets. Source checks are historic.
export const VERSION='2026-11-17.1';
export const REVIEWED='2026-11-16';
const r=(id,who,title,url,fields,tier,license,techniques,limits=[],kind='inspectable')=>({
 id,who,title,url,fields,tier,license,techniques,limits,kind,
 checkedOn:REVIEWED,liveVerified:false,readOnly:true,
 rights:{assets:'not_authorized',code:'not_authorized',checkExactLicense:true}
});
export const SOURCES=Object.freeze([
 r('roblox-docs','Roblox','Creator Docs','https://github.com/Roblox/creator-docs',['scripting','modeling','building','animation','vfx','sfx','ui','game-design'],'A','CC BY 4.0 prose; MIT samples',['Current APIs','Client-server security'],['Recheck engine compatibility']),
 r('roblox-resources','Roblox','Reference experiences','https://github.com/Roblox/resources',['scripting','ui','game-design'],'A','MIT',['Production code samples','Testable patterns'],['Review per-project requirements']),
 r('nevermore','Quenty','Nevermore Engine','https://github.com/Quenty/NevermoreEngine',['scripting'],'A','MIT',['Cleanup and module architecture','Dependency ownership'],['High abstraction cost']),
 r('rbxutil','Sleitnick','RbxUtil','https://github.com/Sleitnick/RbxUtil',['scripting'],'A','Per-module; Trove MIT',['Connection cleanup','Remote contracts'],['Knit is a separate archived framework']),
 r('fusion','dphfox','Fusion','https://github.com/dphfox/Fusion',['ui','scripting'],'A','MIT',['Reactive UI lifecycle','State graph ownership'],['Native UI may be simpler']),
 r('egomoose','EgoMoose','Variable-thickness 3D outlines','https://devforum.roblox.com/t/an-outline-technique-with-variable-thickness-for-3d-models/3950556',['vfx','modeling'],'A','unknown',['Geometry-driven outlines','Tradeoff analysis'],['No implied asset reuse']),
 r('aeresei','Aeresei','R6 IK/FK Blender Rig','https://devforum.roblox.com/t/r6-ik-fk-blender-rig-v25/3586405',['animation','modeling'],'A/B','unknown',['IK/FK and contact poses','Parent switching'],['R6 only; version-sensitive']),
 r('blender-studio','Blender Studio','Original production files','https://studio.blender.org/vault/',['animation','modeling','building','vfx'],'A','Per asset; often CC BY',['Rig/weight paint','Modular production','Camera/pose revisions'],['Some access paid; verify each asset license']),
 r('sine','RoPotat0','Sine VFX documentation','https://github.com/RoPotat0/Sine-VFX',['vfx'],'B','unknown',['Runtime effect structure','Timing and grouping'],['No verified editor automation or reusable asset rights']),
 r('spray','Mastodore','Spray particles','https://github.com/mastedore/spray',['vfx','ui'],'A','MPL-2.0',['Deterministic 2D particle control','Reproducible performance comparisons'],['Not a 3D effects toolkit']),
 r('pahot','Pahot','Environment art portfolio','https://devforum.roblox.com/t/for-hire-3d-modeler-former-korean-game-industry-open/4986460',['building','modeling'],'B','unknown',['Modular kitbash workflows','Collision planning'],['Self-reported portfolio experience']),
 r('hoven','Hovenx9','Environment portfolio','https://devforum.roblox.com/t/hovenx9-environment-artist-portfolio/4742052',['building','modeling'],'B','unknown',['Environment composition','Import fidelity'],['Team attribution not independently established']),
 r('sound-loops','Roblox Staff','Creating Perfect Audio Loops','https://devforum.roblox.com/t/creating-perfect-audio-loops/2849057',['sfx'],'A','unknown',['Loop seams','Listening and editing in Reaper'],['No recorded audio reuse right']),
 r('tunic-audio','Kevin Regamey','TUNIC Audio Talk','https://www.gdcvault.com/play/1029369/The-TUNIC-Audio',['sfx','game-design'],'B','unknown',['Game-led sound direction','Interactive layering'],['Talk and slides not licensed for repackaging']),
 r('vfx-direction','GDC','Art Directing VFX for Stylized Games','https://gdcvault.com/play/1024715/Art-Directing-VFX-for-Stylized',['vfx','animation'],'B','unknown',['Art direction pillars','Gameplay-first visual hierarchies'],['Do not copy visual assets']),
 r('max-parkour','MaxDevLol','Parkour feedback and code','https://github.com/MaxDevLol/Roblox-Parkour-System-by-max',['animation','scripting','game-design'],'A','MIT',['Critique then revise','Movement edge cases'],['Author warns code is dated']),
 r('gmtk','Mark Brown','Mind Over Magnet postmortem','https://gmtk.substack.com/p/what-its-like-to-launch-a-game-on',['game-design','ui'],'A','unknown',['Blind playtest','Confusion-based iteration'],['Audience confounds sales']),
 r('hades','Supergiant Games','Hades development documentary','https://www.supergiantgames.com/blog/hades-noclip-bluray/',['sfx','animation','game-design'],'A','unknown',['Multidisciplinary production','Community feedback'],['Team scale does not transfer directly']),
 r('awards','Roblox','2026 Innovation Awards','https://about.roblox.com/newsroom/2026/09/2026-roblox-innovation-awards',['game-design','ui','vfx','sfx'],'C','unknown',['Shipped-game observation','Competitive readability'],['No private source, profiling or causal design evidence'],'observation_only')
]);
const p=(id,methods,failures,human,objective)=>({id,methods,failures,human,objective});
export const PACKS=Object.freeze([
 p('animation',['Establish rig/contact constraints','Plan anticipation, impact and recovery','Inspect Studio playback and event markers'],['Contact sliding','Uniform timing','Unverified animator API'],['Silhouette','Weight','Motion clarity'],['Contact drift','Loop boundary','Event timing']),
 p('vfx',['Set effect role/art pillars','Stage onset, peak, decay, cleanup','Inspect readability at gameplay distance'],['Target-obscuring bloom','Orphaned emitters','Unlicensed assets'],['Visual hierarchy','Style fit','Telegraph clarity'],['Cleanup','Particle counts','Frame-time change']),
 p('modeling',['Block silhouette','Design pivots/topology/deformation','Verify imported geometry'],['Disconnected primitive anatomy','Excess hidden geometry'],['Shape language','Deformation','Construction logic'],['Import dimensions','Collision','Mesh budget']),
 p('building',['Start from camera routes','Plan reusable kit and pivot ownership','Compare detail against performance'],['Monolithic geometry','Repetitive dressing'],['Composition','Navigation','Personality'],['Reuse counts','Collision','Measured memory']),
 p('sfx',['Define gameplay purpose','Align transient/loop with events','Listen on target devices'],['Audible loop seam','Unbalanced mix'],['Clarity','Tonal coherence','Fatigue'],['Waveform peak','Loop discontinuity','Event offset']),
 p('ui',['Establish information hierarchy','Choose minimal state architecture','Test each target input device'],['Tiny touch controls','Missing focus states'],['Clarity','Visual identity','Cognitive load'],['Overflow','Focus navigation','Cleanup']),
 p('scripting',['Inspect original dependencies','Validate untrusted client requests','Test cleanup and failure modes'],['Client-authoritative rewards','Premature framework churn'],['Readability','Proportionate architecture'],['Remote rejection','Regression tests','Connection disposal']),
 p('game-design',['Define decision/action/reward loop','Observe unprompted players','Revise a hypothesis and retest'],['Unnecessary systems','Popularity-as-proof'],['Choice','Playfulness','Confusion'],['Failure points','Completion timing','Real observations'])
]);
