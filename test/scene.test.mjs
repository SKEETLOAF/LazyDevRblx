import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DevKitState, InputError } from '../src/state.mjs';
import { normalizeSceneAction } from '../src/scene.mjs';
import { createStudioServer } from '../src/http.mjs';
import { handleRpc } from '../src/mcp.mjs';

function snapshot(state = new DevKitState(), rootPath = 'Workspace.DevKitProbe') {
  const metadata = state.inspectStructure({rootPath,truncated:false,nodes:[
    {id:0,parentId:null,depth:0,path:rootPath,name:'DevKitProbe',
      className:'Folder',properties:[]},
    {id:1,parentId:0,depth:1,path:rootPath+'.Marker',name:'Marker',
      className:'Part',properties:{ Anchored:false, CanCollide:true, Size:[4,1,2],
        Position:[0,1.5,0], Color:[0.64,0.635,0.647], Material:'Plastic',
        Transparency:0 }}
  ]});
  return {state,metadata};
}
function tool(state,name,args) {
  const response=handleRpc(state,{jsonrpc:'2.0',id:9,method:'tools/call',
    params:{name,arguments:args}});
  assert.equal(response.result.isError,false,JSON.stringify(response));
  return JSON.parse(response.result.content[0].text);
}
function invalidTool(state,name,args) {
  const response=handleRpc(state,{jsonrpc:'2.0',id:9,method:'tools/call',
    params:{name,arguments:args}});
  assert.equal(response.result.isError,true,'Expected MCP error');
  return response.result.content[0].text;
}

test('creating a Part, Folder or Model only queues a Studio review', () => {
  const {state,metadata}=snapshot();
  for(const className of ['Part','Folder','Model']) {
    const p=tool(state,'lazydev_propose_scene_action',{
      structureId:metadata.structureId,action:'create_child',targetNodeId:0,
      className,name:'Test'+className,rationale:'Small test'
    });
    assert.equal(p.status,'pending');
    assert.equal(p.path,'Workspace.DevKitProbe');
    assert.equal(p.className,className);
    assert.equal(state.pendingScene(metadata.structureId).id,p.id);
    assert.equal(state.sceneStatus(p.id).status,'pending');
    const decision=state.finishSceneAction(p.id,{structureId:metadata.structureId,
      outcome:'rejected',note:'User declined'});
    assert.equal(decision.status,'rejected');
  }
  assert.equal(state.listStructures().length,1,'Planning must not mutate observations');
});

test('only allowlisted classes and sensible parent-child pairs can be created', () => {
  const {state,metadata}=snapshot();
  const args={structureId:metadata.structureId,action:'create_child',targetNodeId:0,
    className:'Part',name:'Allowed Part',rationale:'test'};
  for(const className of ['Script','LocalScript','ModuleScript','RemoteEvent','ObjectValue']) {
    assert.match(invalidTool(state,'lazydev_propose_scene_action',{...args,className}),/cannot be created/);
  }
  for(const name of ['','A.B','../../bad','0bad','A\nB','A'.repeat(80)]) {
    assert.match(invalidTool(state,'lazydev_propose_scene_action',{...args,name}),/name/i);
  }
  assert.match(invalidTool(state,'lazydev_propose_scene_action',{...args,targetNodeId:1}),
    /cannot be created/);
  assert.match(invalidTool(state,'lazydev_propose_scene_action',{...args,property:'Parent'}),
    /separate proposals/);
  assert.match(invalidTool(state,'lazydev_propose_scene_action',{...args,targetNodeId:99}),
    /observed node/);
});

test('property proposal uses inspected value and rejects unsafe property changes', () => {
  const {state,metadata}=snapshot();
  const args={structureId:metadata.structureId,action:'set_property',targetNodeId:1,
    property:'Anchored',value:true,rationale:'Keep test part in place'};
  const proposal=tool(state,'lazydev_propose_scene_action',args);
  assert.equal(proposal.beforeValue,false);
  assert.equal(proposal.value,true);
  assert.equal(state.pendingScene(metadata.structureId).expectedProperties.Anchored,false);
  assert.equal(state.sceneStatus(proposal.id).status,'pending');
  assert.match(invalidTool(state,'lazydev_propose_scene_action',args),/already awaiting approval/);
  state.finishSceneAction(proposal.id,{structureId:metadata.structureId,outcome:'rejected'});
  assert.match(invalidTool(state,'lazydev_propose_scene_action',{...args,property:'Source',value:'abc'}),
    /not editable/);
  assert.match(invalidTool(state,'lazydev_propose_scene_action',{...args,property:'Parent',value:'Workspace'}),
    /not editable/);
  assert.match(invalidTool(state,'lazydev_propose_scene_action',{...args,value:false}),
    /No property change/);
  assert.match(invalidTool(state,'lazydev_propose_scene_action',{...args,value:'true'}),
    /Invalid or unsafe/);
  assert.match(invalidTool(state,'lazydev_propose_scene_action',{...args,property:'Transparency',value:100}),
    /Invalid or unsafe/);
  assert.match(invalidTool(state,'lazydev_propose_scene_action',{...args,property:'Size',value:[-1,1,1]}),
    /Invalid or unsafe/);
  assert.match(invalidTool(state,'lazydev_propose_scene_action',{...args,property:'Color',value:[255,0,0]}),
    /Invalid or unsafe/);
  assert.match(invalidTool(state,'lazydev_propose_scene_action',{...args,property:'Material',value:'Unknown'}),
    /Invalid or unsafe/);
});

test('stale hierarchy inspection prevents new actions and hides old pending actions', () => {
  const {state,metadata}=snapshot();
  const args={structureId:metadata.structureId,action:'create_child',
    targetNodeId:0,className:'Part',name:'Block',rationale:'demo'};
  const proposal=state.proposeSceneAction(args);
  snapshot(state); // same root newly observed
  assert.equal(state.pendingScene(metadata.structureId),null);
  assert.throws(()=>state.proposeSceneAction(args),/stale/i);
  assert.throws(()=>state.finishSceneAction(proposal.id,{structureId:metadata.structureId,
    outcome:'applied'}),/re-inspected/i);
  const status=state.finishSceneAction(proposal.id,{
    structureId:metadata.structureId,outcome:'stale',note:'Snapshot superseded'});
  assert.equal(status.status,'stale');
});

test('GUI classes and values are validated without allowing arbitrary UI/script access', () => {
  const state=new DevKitState();
  const structureId=state.inspectStructure({rootPath:'StarterGui',truncated:false,nodes:[
    {id:0,parentId:null,depth:0,name:'StarterGui',path:'StarterGui',
      className:'StarterGui',properties:[]},
    {id:1,parentId:0,depth:1,name:'Interface',path:'StarterGui.Interface',
      className:'ScreenGui',properties:{Enabled:true}},
    {id:2,parentId:1,depth:2,name:'Panel',path:'StarterGui.Interface.Panel',
      className:'Frame',properties:{Visible:true,GuiSize:{xScale:0.5,xOffset:0,yScale:0.5,yOffset:0},
        GuiPosition:{xScale:0,xOffset:0,yScale:0,yOffset:0},ZIndex:1,BackgroundTransparency:0}}
  ]}).structureId;
  const create=state.proposeSceneAction({structureId,action:'create_child',
    targetNodeId:0,className:'ScreenGui',name:'Hud',rationale:'demo'});
  assert.equal(create.status,'pending');
  state.finishSceneAction(create.id,{structureId,outcome:'rejected'});
  const frame=state.proposeSceneAction({structureId,action:'create_child',
    targetNodeId:1,className:'Frame',name:'Contents',rationale:'demo'});
  assert.equal(frame.status,'pending');
  state.finishSceneAction(frame.id,{structureId,outcome:'rejected'});
  const edit=state.proposeSceneAction({structureId,action:'set_property',
    targetNodeId:2,property:'GuiSize',
    value:{xScale:0.8,xOffset:0,yScale:0.4,yOffset:0},rationale:'Resize'});
  assert.equal(edit.beforeValue.xScale,0.5);
  assert.throws(()=>normalizeSceneAction({structureId,action:'set_property',
    targetNodeId:2,property:'GuiSize',value:{xScale:0.5,yScale:0.8},rationale:'x'},
    state.readStructure(structureId)),/Invalid or unsafe/);
});

test('authenticated HTTP and MCP share a pending scene action with a user decision receipt', async t => {
  const {state,metadata}=snapshot();
  const {server,token}=createStudioServer(state,{token:'token-for-test'});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base='http://127.0.0.1:'+server.address().port;
  const get=(h)=>fetch(base+'/v1/studio/scene/pending?structureId='+metadata.structureId,{headers:h});
  const jsonHeaders={'Content-Type':'application/json',Authorization:'Bearer '+token};
  assert.equal((await get({})).status,401);
  const proposed=tool(state,'lazydev_propose_scene_action',{
    structureId:metadata.structureId,action:'set_property',
    targetNodeId:1,property:'CanCollide',value:false,rationale:'Test'});
  assert.equal((await get({Origin:'https://evil.example',Authorization:'Bearer '+token})).status,403);
  const pending=await (await get(jsonHeaders)).json();
  assert.equal(pending.proposal.id,proposed.id);
  assert.equal(pending.proposal.beforeValue,true);
  const outcome=await fetch(base+'/v1/studio/scene/proposals/'+proposed.id+'/decision',{
    method:'POST',headers:jsonHeaders,body:JSON.stringify({
      structureId:metadata.structureId,outcome:'applied',note:'Applied in Studio'
    })
  });
  assert.equal(outcome.status,200);
  const receipt=tool(state,'lazydev_get_scene_proposal_status',{proposalId:proposed.id});
  assert.equal(receipt.status,'studio_reported_applied');
  assert.equal((await (await get(jsonHeaders)).json()).proposal,null);
  assert.equal((await fetch(base+'/v1/studio/scene/proposals/'+proposed.id+'/decision',{
    method:'POST',headers:jsonHeaders,body:JSON.stringify({
      structureId:metadata.structureId,outcome:'applied'
    })
  })).status,409);
});
