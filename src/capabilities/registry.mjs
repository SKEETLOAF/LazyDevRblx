// Declarative inventory only. This module never connects to Studio or executes tools.
export const REGISTRY_VERSION='2026-11-17.1';
const NATIVE='https://create.roblox.com/docs/studio/mcp';
const TEST='https://create.roblox.com/docs/reference/engine/classes/StudioTestService';
const OWN='https://github.com/SKEETLOAF/LazyDevRblx';
const v03={date:'2026-11-14',source:'docs/V0-INTEGRATION-CHECKLIST.md',
  classification:'user_reported_live',testedCommit:null,studioBuild:null,hostVersion:null};
const d=(id,title,provider,route,risk,implemented,tests=[],source=NATIVE,report=null,note='')=>
  ({id,title,provider,route,risk,implemented,tests,source,
    sourceCheckedOn:'2026-11-16',userReport:report,studioEvidence:null,hostEvidence:null,note});
export const CAPABILITIES=Object.freeze([
  d('studio.script.inspect','Inspected source','both','native_first','read_sensitive',true,
    ['test/phase2.test.mjs','test/bridge.test.mjs'],NATIVE,v03,'V0.3 user test limited to selected scripts'),
  d('studio.script.edit','Reviewed script edit','both','native_first','write_local',true,
    ['test/phase2.test.mjs','test/bridge.test.mjs'],NATIVE,v03,'V0.3 exact-span edit and Undo/Redo were user-reported'),
  d('studio.hierarchy.inspect','Read hierarchy','both','native_first','read_sensitive',true,
    ['test/bridge.test.mjs'],NATIVE,v03,'V0.3 selected two-node hierarchy user report'),
  d('studio.scene.create','Allowlisted Instance creation','both','native_first','write_local',true,
    ['test/scene.test.mjs'],NATIVE,null,'Newer plugin flow not live-tested'),
  d('studio.scene.property','Allowlisted Instance property edits','both','native_first','write_local',true,
    ['test/scene.test.mjs'],NATIVE,null,'Newer plugin flow not live-tested'),
  d('studio.output.preview','Review and share diagnostics','both','native_first','read_sensitive',true,
    ['test/diagnostics.test.mjs'],NATIVE,null,'Studio log API integration unverified'),
  d('studio.playtest.solo','Launch Play/Run report','both','native_first','test_runtime',true,
    ['test/playtests.test.mjs'],TEST,null,'StudioTestService integration unverified'),
  d('studio.viewport.capture','Capture 3D viewport','both','native_first','read_sensitive',true,
    ['test/viewport.test.mjs'],NATIVE,null,'Studio permission and preview integration unverified'),
  d('studio.viewport.sequence','User-reviewed six-frame series','lazy','lazy_specialist','read_sensitive',true,
    ['test/sequences.test.mjs','test/audit-motion.test.mjs'],OWN+'/blob/main/docs/PHASE-9-TEMPORAL-OBSERVATION.md',null,'Sampled stills, not continuous video'),
  d('studio.sine.inspect','Sine runtime/tags inspection','lazy','lazy_specialist','read_sensitive',true,
    ['test/sine.test.mjs'],'https://github.com/RoPotat0/Sine-VFX/blob/main/docs-site/docs/api.md',null,'Not editor automation'),
  d('reference.import','Explicit image/GIF import','lazy','lazy_specialist','read_sensitive',true,
    ['test/references.test.mjs'],OWN+'/blob/main/docs/PHASE-8-REFERENCES-AND-QUALITY.md'),
  d('reference.motion','Measured GIF change cues','lazy','lazy_specialist','read_only',true,
    ['test/references.test.mjs','test/audit-motion.test.mjs'],OWN+'/blob/main/docs/PHASE-8-REFERENCES-AND-QUALITY.md',null,'Not semantic motion interpretation'),
  d('reference.sequence.compare','Sequence/reference measurement','lazy','lazy_specialist','read_only',true,
    ['test/sequences.test.mjs'],OWN+'/blob/main/docs/PHASE-9-TEMPORAL-OBSERVATION.md',null,'Not a visual quality score'),
  d('competency.plan','Discipline routing and quality gates','lazy','lazy_specialist','read_only',true,
    ['test/competency.test.mjs'],OWN+'/blob/main/docs/PHASE-10-COMPETENCY-SYSTEM.md'),
  d('competency.evidence','Check evidence IDs exist','lazy','lazy_specialist','read_only',true,
    ['test/competency.test.mjs'],OWN+'/blob/main/docs/PHASE-10-COMPETENCY-SYSTEM.md',null,'Presence is not success'),
  d('knowledge.query','Curated task retrieval','lazy','lazy_specialist','read_only',true,
    ['test/knowledge.test.mjs'],OWN+'/blob/main/docs/PHASE-13-KNOWLEDGE-BENCHMARKS.md',null,'Metadata, not live fetched'),
  d('benchmark.plan','Controlled benchmark planning','lazy','lazy_specialist','read_only',true,
    ['test/knowledge.test.mjs'],OWN+'/blob/main/docs/PHASE-13-KNOWLEDGE-BENCHMARKS.md',null,'Experiments not run'),
  d('project.brief','Session-local project direction','lazy','lazy_specialist','read_only',true,
    ['test/project-briefs.test.mjs'],OWN+'/blob/main/docs/PHASE-11-PROJECT-BRIEFS.md',null,'Not persistent across daemon restarts'),
  d('native.execute.luau','Native Luau execution','native','native_first','execute_code',false,[],NATIVE,null,'Official tool documented; LAZY does not proxy it'),
  d('native.simulate.input','Native mouse/keyboard actions','native','native_first','write_local',false,[],NATIVE,null,'Native user permission needed'),
  d('native.generate.asset','Native mesh/animation/material generation','native','native_first','asset_create',false,[],NATIVE,null,'No LAZY integration; output quality unverified'),
  d('native.multiplayer.test','Multiplayer Studio test','native','native_first','test_runtime',false,[],TEST,null,'Documented service, no LAZY integration'),
  d('external.blender.adapter','Structured Blender automation','external','research_candidate','external_write',false,[],
    'https://github.com/Roblox/roblox-blender-plugin',null,'Official add-on exists; no LAZY adapter'),
  d('external.eclipse.editor','Eclipse timeline automation','external','unavailable','external_write',false,[],
    'https://create.roblox.com/store/asset/86116556258301',null,'No supported external editor API established'),
  d('external.moon.editor','Moon timeline automation','external','unavailable','external_write',false,[],
    'https://create.roblox.com/store/asset/4725618216',null,'No supported external editor API established'),
]);
const ROUTES=new Set(['native_first','lazy_specialist','research_candidate','unavailable']);
const RISKS=new Set(['read_only','read_sensitive','write_local','test_runtime','execute_code','asset_create','external_write']);
export function validateCapabilityCatalog(){
  const ids=new Set();
  for(const c of CAPABILITIES){
    if(!/^(?:[a-z]+\.)+[a-z]+$/.test(c.id)||ids.has(c.id))throw Error('Bad/duplicate capability id '+c.id);
    ids.add(c.id);
    if(!ROUTES.has(c.route)||!RISKS.has(c.risk)||!['native','lazy','both','external'].includes(c.provider))throw Error('Bad policy '+c.id);
    if(typeof c.implemented!=='boolean'||!Array.isArray(c.tests)||(!c.implemented&&c.tests.length))throw Error('Bad implementation metadata '+c.id);
    if(c.tests.some(p=>!/^test\/[a-z0-9-]+\.test\.mjs$/.test(p)))throw Error('Invalid test file pointer '+c.id);
    if(c.studioEvidence||c.hostEvidence)throw Error('Live verification cannot be hard-coded in catalog '+c.id);
  }
  return {valid:true,total:CAPABILITIES.length};
}
export function getCapabilityMatrix(){
  validateCapabilityCatalog();
  return {registryVersion:REGISTRY_VERSION,
    sourcePolicy:'Curated source links checked 2026-11-16, NOT fetched or verified during this request',
    capabilities:CAPABILITIES.map(c=>({
      ...structuredClone(c),
      checks:{
        documented:!!c.source,
        implementedInLazy:c.implemented,
        hasAutomatedTestPointers:c.tests.length>0,
        ciPass:'not_checked_by_registry',
        liveUserReported:!!c.userReport,
        versionBoundStudioVerified:false,
        versionBoundHostVerified:false,
      },
    })),
    warning:'This inventory is not a live Studio probe. Test files and historical user reports are pointers, not independent proof of current Studio compatibility. Native documented tools are not necessarily connected, approved or working in this environment.',
  };
}
