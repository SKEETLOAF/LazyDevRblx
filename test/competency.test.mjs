import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DevKitState, InputError } from '../src/state.mjs';
import { handleRpc } from '../src/mcp.mjs';
import {
  buildCompetencyPlan, CompetencyStore, CompetencyInputError,
  listCompetencies,
} from '../src/competency/engine.mjs';

function rpc(state,name,arguments_={}){
  const response=handleRpc(state,{
    jsonrpc:'2.0',id:11,method:'tools/call',
    params:{name,arguments:arguments_},
  });
  assert.equal(response.result?.isError,false,JSON.stringify(response));
  return JSON.parse(response.result.content[0].text);
}
const ids=plan=>new Set(plan.competencies.map(x=>x.id));

test('catalog spans eight development disciplines and supported Roblox art directions',()=>{
  const catalog=listCompetencies();
  assert.equal(catalog.disciplines.length,8);
  for(const domain of ['modeling','building','animation','vfx','sfx','ui','scripting','game-design']){
    assert.ok(catalog.disciplines.some(x=>x.id===domain));
  }
  assert.ok(catalog.styles.some(x=>x.id==='voxel'));
  assert.ok(catalog.styles.some(x=>x.id==='bloxy'));
  assert.ok(catalog.styles.some(x=>x.id==='anime'));
  assert.ok(catalog.styles.some(x=>x.id==='realistic'));
  assert.ok(catalog.assetKinds.some(x=>x.id==='building'));
  assert.ok(catalog.evidenceKindsSupported.includes('sequence'));
  assert.ok(!catalog.evidenceKindsSupported.includes('performance'));
});

test('house planning separates roof, walls and yard with meaningful construction guidance',()=>{
  const plan=buildCompetencyPlan({
    task:'Build a stylized house with a yard, removable roof and modular walls.',
    disciplines:['building','modeling'],
    style:'stylized',assetKind:'building',
  });
  assert.equal(plan.kind,'competency_task_plan');
  assert.equal(plan.asset.kind,'building');
  assert.ok(plan.asset.suggestedResponsibilities.includes('Site / Yard and Landscaping'));
  assert.ok(plan.asset.suggestedResponsibilities.includes('Building / Roof'));
  assert.ok(plan.asset.suggestedResponsibilities.includes('Building / Structure / Walls'));
  assert.match(plan.asset.caveat,/not an instruction to merge parts/);
  assert.ok(plan.competencies.find(c=>c.id==='modeling').methods.some(s=>s.includes('topology')));
  assert.ok(plan.competencies.find(c=>c.id==='building').antiPatterns.some(s=>s.includes('yard')));
  assert.ok(plan.qualityGates.some(g=>g.id==='building:organization'));
  assert.ok(plan.sources.some(x=>x.url==='https://create.roblox.com/docs/projects/assets/packages'));
  assert.equal(plan.resourcePolicy.mode,'curated_offline');
  assert.ok(plan.sources.every(s=>s.type==='official_documentation'&&s.liveAvailability==='not_checked_at_request_time'));
});

test('multidisciplinary ability planning routes animation, SFX, VFX, UI and server work',()=>{
  const plan=buildCompetencyPlan({
    task:'Animate a creature attack with a VFX impact, sound, HUD indicator and server validation.',
    style:'anime',assetKind:'ability',
  });
  for(const id of ['modeling','animation','vfx','sfx','ui','scripting'])assert.ok(ids(plan).has(id),id);
  assert.equal(plan.selection.source,'inferred_from_task');
  assert.equal(plan.asset.kind,'ability');
  assert.ok(plan.asset.suggestedResponsibilities.includes('Gameplay state and validation'));
  assert.ok(plan.asset.suggestedResponsibilities.includes('Visual effect modules'));
  assert.ok(plan.asset.suggestedResponsibilities.includes('Sound cues'));
  assert.equal(plan.artDirection.id,'anime');
  assert.ok(plan.artDirection.principles.length>0);
  assert.ok(plan.qualityGates.some(g=>g.id==='sfx:mix'&&g.missingInfrastructure.includes('audio')));
  assert.ok(plan.qualityGates.some(g=>g.id==='vfx:performance'&&g.missingInfrastructure.includes('performance')));
  assert.equal(plan.completionPolicy.includes('No gate passes'),true);
});

test('unknown task does not fabricate a specific art style or pretend confident routing',()=>{
  const plan=buildCompetencyPlan({task:'Help me make something new'});
  assert.equal(plan.artDirection.id,'unspecified');
  assert.equal(plan.artDirection.status,'needs_user_or_project_reference');
  assert.equal(plan.selection.inferenceConfidence,'low');
  assert.match(plan.selection.warning,/provisional/);
  assert.equal(plan.asset.kind,'general');
});

test('explicit hybrid style preserves user notes; plans do not auto-swap a chosen domain',()=>{
  const plan=buildCompetencyPlan({
    task:'Design a combat interface with SFX',
    disciplines:['ui'],style:'hybrid',
    styleNotes:'Voxel world, flat illustrated HUD with restrained effects',
    assetKind:'interface',
  });
  assert.deepEqual([...ids(plan)],['ui']);
  assert.equal(plan.artDirection.notes,'Voxel world, flat illustrated HUD with restrained effects');
  assert.equal(plan.selection.source,'explicit');
  assert.ok(plan.asset.suggestedResponsibilities.includes('Theme and tokens'));
});

test('strict request contract rejects invalid style, duplicates and arbitrary metadata',()=>{
  const invalid=[
    null, [], {task:''}, {task:'x'.repeat(1601)},
    {task:'house',style:'clay blobs'},
    {task:'house',assetKind:'all'},
    {task:'house',disciplines:['modeling','modeling']},
    {task:'house',disciplines:[]},
    {task:'house',disciplines:['arbitrary-shell']},
    {task:'house',styleNotes:'x'.repeat(401)},
    {task:'house',path:'C:\\Users\\Secrets'},
    {task:'house',authorization:'token'},
  ];
  for(const x of invalid)assert.throws(()=>buildCompetencyPlan(x),CompetencyInputError);
});

test('plan store retains immutable snapshots and expires oldest entries',()=>{
  const store=new CompetencyStore();
  const p=store.create({task:'model a creature',style:'toy'});
  const read=store.read(p.planId);
  read.asset.suggestedResponsibilities[0]='corrupted';
  read.qualityGates[0].question='tampered';
  assert.notEqual(store.read(p.planId).asset.suggestedResponsibilities[0],'corrupted');
  assert.notEqual(store.read(p.planId).qualityGates[0].question,'tampered');
  for(let i=0;i<25;i++)store.create({task:'Test building '+i});
  assert.equal(store.list().length,20);
  assert.throws(()=>store.read(p.planId),/expired/);
});

test('quality review checks real evidence ID presence without issuing a false pass',()=>{
  const state=new DevKitState();
  const plan=rpc(state,'lazydev_plan_competency_task',{
    task:'Model a creature mesh',disciplines:['modeling'],style:'stylized',assetKind:'creature',
  });
  assert.ok(plan.planId);
  const viewport=state.inspectViewport({
    pixels:Buffer.alloc(2*2*4,255),width:2,height:2,
  });
  const assessed=rpc(state,'lazydev_assess_competency_plan',{
    planId:plan.planId,evidence:[
      {gateId:'modeling:silhouette',kind:'viewport',id:viewport.viewportId},
      {gateId:'modeling:reference',kind:'viewport',id:viewport.viewportId},
      {gateId:'modeling:construction',kind:'structure',id:'expired-id'},
    ],
  });
  assert.equal(assessed.overallVerdict,'not_assessed');
  assert.equal(assessed.counts.total,5);
  assert.equal(assessed.counts.evidenceReady,1);
  const silhouette=assessed.gates.find(x=>x.gateId==='modeling:silhouette');
  assert.equal(silhouette.evidenceStatus,'ready_for_review');
  assert.equal(silhouette.qualityVerdict,'not_assessed');
  assert.equal(silhouette.evidence[0].present,true);
  const reference=assessed.gates.find(x=>x.gateId==='modeling:reference');
  assert.ok(reference.missingKinds.includes('reference'));
  const construction=assessed.gates.find(x=>x.gateId==='modeling:construction');
  assert.equal(construction.evidence[0].present,false);
  assert.equal(construction.evidenceStatus,'evidence_missing');
  assert.equal(state.listCompetencyPlans().length,1);
  assert.equal(state.readCompetencyPlan(plan.planId).planId,plan.planId);
  assert.equal(rpc(state,'lazydev_list_competencies').disciplines.length,8);
});

test('unsupported performance/audio/device metrics remain instrumentation gaps',()=>{
  const state=new DevKitState();
  const plan=state.createCompetencyPlan({
    task:'build sound, VFX and responsive HUD',
    disciplines:['vfx','sfx','ui'],
  });
  const assessed=state.assessCompetencyPlan({planId:plan.planId,evidence:[]});
  assert.equal(assessed.overallVerdict,'not_assessed');
  assert.equal(assessed.gates.find(g=>g.gateId==='sfx:mix').evidenceStatus,'instrumentation_unavailable');
  assert.equal(assessed.gates.find(g=>g.gateId==='vfx:performance').evidenceStatus,'instrumentation_unavailable');
  assert.equal(assessed.gates.find(g=>g.gateId==='ui:devices').evidenceStatus,'instrumentation_unavailable');
  assert.ok(assessed.counts.instrumentationUnavailable>=3);
  assert.equal(plan.qualityGates.find(g=>g.id==='sfx:mix').verdict,'not_assessed');
});

test('assessment refuses duplicate, mismatched and fabricated gate evidence',()=>{
  const state=new DevKitState();
  const plan=state.createCompetencyPlan({task:'build a UI',disciplines:['ui']});
  const ref={gateId:'ui:hierarchy',kind:'viewport',id:'fake'};
  const invalid=[
    {planId:plan.planId,evidence:[ref,ref]},
    {planId:plan.planId,evidence:[{...ref,kind:'playtest'}]},
    {planId:plan.planId,evidence:[{...ref,gateId:'ui:imaginary'}]},
    {planId:plan.planId,evidence:[{...ref,outcome:'passed'}]},
    {planId:plan.planId,evidence:[{...ref,kind:'performance'}]},
    {planId:plan.planId,evidence:'a screenshot was good'},
    {planId:plan.planId,passed:true},
  ];
  for(const x of invalid)assert.throws(()=>state.assessCompetencyPlan(x),InputError);
  assert.throws(()=>state.readCompetencyPlan('invalid'),InputError);
});

test('CLI creates useful offline plans and supports discovery without a daemon',()=>{
  const file=fileURLToPath(new URL('../scripts/plan-competency.mjs',import.meta.url));
  const listed=JSON.parse(execFileSync(process.execPath,[file,'--list'],{encoding:'utf8'}));
  assert.equal(listed.disciplines.length,8);
  const result=JSON.parse(execFileSync(process.execPath,[
    file,'Create a house','--style','voxel','--asset-kind','building',
    '--disciplines','building,modeling',
  ],{encoding:'utf8'}));
  assert.equal(result.asset.kind,'building');
  assert.equal(result.artDirection.id,'voxel');
  assert.equal(result.selection.source,'explicit');
  assert.ok(result.qualityGates.length>=4);
});
