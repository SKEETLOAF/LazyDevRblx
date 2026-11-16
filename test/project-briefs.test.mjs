import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProjectBriefStore, BriefInputError, normalizeProjectBrief } from '../src/competency/briefs.mjs';
import { buildCompetencyPlan, CompetencyInputError } from '../src/competency/engine.mjs';
import { DevKitState, InputError } from '../src/state.mjs';
import { handleRpc } from '../src/mcp.mjs';
import { encodeRgbaPng } from '../src/viewport.mjs';

function rpc(state,name,args={}) {
  const r=handleRpc(state,{jsonrpc:'2.0',id:2,method:'tools/call',params:{name,arguments:args}});
  assert.equal(r.result?.isError,false,JSON.stringify(r));
  return JSON.parse(r.result.content[0].text);
}
const link={
  title:'Example effects article',
  kind:'tutorial',
  url:'https://example.com/vfx-techniques',
  rightsClaim:'reference_only',
  note:'Observe timing principles, not copy assets',
};
const brief=()=>({
  projectName:'ORBIT! example test fixture',
  creativeDirection:'Cosmic gravity, intentional angular forms and readable player movement',
  style:'hybrid',
  preserve:['Keep existing Grab control','Keep user-created character proportions'],
  avoid:['Generic blue energy balls'],
  constraints:['Roblox-scale readable gameplay','No unapproved plugin control'],
  sourceLinks:[link],
});

test('a reusable brief keeps developer direction while retaining provenance and no fake source verification',()=>{
  const state=new DevKitState();
  const created=rpc(state,'lazydev_create_project_brief',brief());
  assert.equal(created.projectName,'ORBIT! example test fixture');
  assert.equal(created.style,'hybrid');
  assert.deepEqual(created.preserve,brief().preserve);
  assert.equal(created.sourceLinks[0].retrievalStatus,'not_fetched');
  assert.equal(created.sourceLinks[0].rightsVerification,'not_independently_verified');
  assert.equal(created.sourceLinks[0].rightsClaim,'reference_only');
  const listed=rpc(state,'lazydev_list_project_briefs');
  assert.equal(listed.length,1);
  assert.equal(listed[0].briefId,created.briefId);
  assert.equal(rpc(state,'lazydev_read_project_brief',{briefId:created.briefId}).creativeDirection,brief().creativeDirection);
  const plan=rpc(state,'lazydev_plan_competency_task',{
    task:'Build an animated gravity impact with VFX',projectBriefId:created.briefId,
  });
  assert.equal(plan.projectContext.briefId,created.briefId);
  assert.deepEqual(plan.projectContext.preserve,brief().preserve);
  assert.equal(plan.artDirection.id,'hybrid');
  assert.equal(plan.artDirection.notesSource,'project_brief');
  assert.equal(plan.artDirection.styleSource,'project_brief');
  assert.equal(plan.artDirection.notes,brief().creativeDirection);
  assert.equal(plan.resourcePolicy.mode,'curated_plus_user_declared');
  const supplied=plan.sources.find(x=>x.provenance==='user_supplied_link');
  assert.equal(supplied.retrievalStatus,'not_fetched');
  assert.equal(supplied.rightsVerification,'not_independently_verified');
  assert.equal(supplied.url,link.url);
  assert.equal(plan.qualityGates.every(g=>g.verdict==='not_assessed'),true);
});

test('explicit per-task art direction overrides project defaults without deleting original brief',()=>{
  const state=new DevKitState();
  const b=state.createProjectBrief(brief());
  const plan=state.createCompetencyPlan({
    task:'Build clean interface',disciplines:['ui'],assetKind:'interface',
    projectBriefId:b.briefId,style:'voxel',styleNotes:'UI should use flat monochrome icons',
  });
  assert.equal(plan.artDirection.id,'voxel');
  assert.equal(plan.artDirection.styleSource,'explicit_task');
  assert.equal(plan.artDirection.notesSource,'explicit_task');
  assert.equal(plan.artDirection.notes,'UI should use flat monochrome icons');
  assert.equal(plan.projectContext.creativeDirection,brief().creativeDirection);
  assert.equal(state.readProjectBrief(b.briefId).style,'hybrid');
  assert.deepEqual(plan.selection.disciplines,['ui']);
});

test('brief can link existing imported image/GIF IDs but cannot invent them',()=>{
  const state=new DevKitState();
  const pixels=Buffer.from([200,0,0,255,0,20,220,255]);
  const image=encodeRgbaPng(pixels,2,1);
  const ref=state.ingestReference(image,{label:'Effect reference',mediaType:'image/png'});
  const b=state.createProjectBrief({...brief(),referenceIds:[ref.referenceId]});
  const plan=state.createCompetencyPlan({task:'Recreate timing principles',projectBriefId:b.briefId});
  assert.deepEqual(plan.projectContext.referenceIds,[ref.referenceId]);
  assert.equal(plan.projectContext.verification,'not_independently_verified');
  assert.throws(()=>state.createProjectBrief({...brief(),referenceIds:['fake-id']}),InputError);
  assert.throws(()=>state.createCompetencyPlan({task:'animation',projectBriefId:'fake-id'}),InputError);
  assert.throws(()=>buildCompetencyPlan({task:'animation',projectBriefId:b.briefId}),CompetencyInputError);
  const fresh=new DevKitState();
  assert.equal(fresh.listProjectBriefs().length,0,'Brief is only present in current daemon session');
});

test('untrusted resource links, metadata and forged permissions are rejected',()=>{
  const bad=[
    null,[],{}, {...brief(),projectName:' '},
    {...brief(),secretToken:'sk-123'},
    {...brief(),preserve:['Same','same']},
    {...brief(),constraints:['x'.repeat(500)]},
    {...brief(),style:'invented'},
    {...brief(),referenceIds:['not-loaded']},
    {...brief(),sourceLinks:[{...link,url:'javascript:alert(1)'}]},
    {...brief(),sourceLinks:[{...link,url:'http://example.com/'}]},
    {...brief(),sourceLinks:[{...link,url:'https://example.com@evil.com/',kind:'tutorial'}]},
    {...brief(),sourceLinks:[{...link,licenseVerified:true}]},
    {...brief(),sourceLinks:[{...link,rightsClaim:'verified_open_source'}]},
    {...brief(),sourceLinks:[link,link]},
    {...brief(),sourceLinks:'https://example.com'},
    {...brief(),sourceLinks:[{...link,kind:'shell-command'}]},
  ];
  for(const input of bad){
    assert.throws(()=>normalizeProjectBrief(input),BriefInputError,JSON.stringify(input)?.slice(0,200));
  }
});

test('brief snapshots are immutable, bounded and never auto-update older task plans',()=>{
  const store=new ProjectBriefStore();
  const first=store.create(brief());
  first.preserve[0]='corrupted';
  first.sourceLinks[0].rightsClaim='user_claims_permission';
  assert.equal(store.read(first.briefId).preserve[0],'Keep existing Grab control');
  assert.equal(store.read(first.briefId).sourceLinks[0].rightsClaim,'reference_only');
  for(let i=0;i<18;i++)store.create({...brief(),projectName:'Test '+i});
  assert.equal(store.list().length,16);
  assert.throws(()=>store.read(first.briefId),/expired/);
});

test('project brief use cannot claim that evidence or project changes were verified',()=>{
  const state=new DevKitState();
  const b=state.createProjectBrief(brief());
  const plan=state.createCompetencyPlan({task:'Visual effect',disciplines:['vfx'],projectBriefId:b.briefId});
  assert.equal(plan.completionPolicy.includes('No gate passes'),true);
  assert.equal(plan.projectContext.provenance,'developer_supplied');
  const a=state.assessCompetencyPlan({planId:plan.planId,evidence:[]});
  assert.equal(a.overallVerdict,'not_assessed');
  assert.equal(a.counts.evidenceReady,0);
});
