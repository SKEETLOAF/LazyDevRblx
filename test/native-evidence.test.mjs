import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DevKitState, InputError } from '../src/state.mjs';
import { handleRpc } from '../src/mcp.mjs';

const input = (kind='playtest') => ({
  kind, provider:'Roblox_Studio',
  sourceTool: {
    playtest:'start_stop_play', viewport:'screen_capture',
    structure:'search_game_tree', diagnostics:'get_console_output',
    observation:'script_read',
  }[kind],
  sourceReference:'codex-smoke-test-01',
  capturedAt:new Date().toISOString(),
  placeId:0, universeId:0, placeName:'Untitled Experience',
  sessionLabel:'codex_color_platform_1', captureMode:'play',
  summary:'Operator reports the E proximity interaction was verified in Play.',
  operatorConsent:true,
});

function tool(state,name,args={}) {
  const r=handleRpc(state,{jsonrpc:'2.0',id:12,method:'tools/call',
    params:{name,arguments:args}});
  assert.equal(r.result?.isError,false,JSON.stringify(r));
  return JSON.parse(r.result.content[0].text);
}

test('native pointer is session-local, place-labeled, and not represented as content',()=>{
  const state=new DevKitState();
  const item=tool(state,'lazydev_record_native_evidence',input());
  assert.equal(item.kind,'playtest');
  assert.equal(item.verification,'not_independently_verified');
  assert.equal(item.contentStored,false);
  assert.equal(item.placeContext.placeId,0);
  assert.equal(item.placeContext.sessionLabel,'codex_color_platform_1');
  assert.equal(tool(state,'lazydev_list_native_evidence')[0].evidenceId,item.evidenceId);
  assert.equal(tool(state,'lazydev_read_native_evidence',{evidenceId:item.evidenceId}).sourceTool,'start_stop_play');
  assert.equal(state.competencyEvidencePresent('playtest',item.evidenceId),false,
    'Unverified native pointer must not masquerade as local playtest evidence');
});

test('quality assessment keeps native pointer separate from validated local evidence IDs',()=>{
  const state=new DevKitState();
  const plan=state.createCompetencyPlan({task:'Script a platform with server validation',
    disciplines:['scripting']});
  const native=state.recordNativeEvidence(input());
  const reviewed=state.assessCompetencyPlan({
    planId:plan.planId,
    evidence:[{gateId:'scripting:behavior',kind:'playtest',id:native.evidenceId}],
    notApplicable:[{gateId:'scripting:performance',
      reason:'This tiny isolated interaction has no measured or suspected performance hotspot.'}],
  });
  const behavior=reviewed.gates.find(g=>g.gateId==='scripting:behavior');
  assert.equal(behavior.evidenceStatus,'external_evidence_linked_for_review');
  assert.equal(behavior.evidence[0].provenance,'operator_reported_native_mcp_unverified');
  assert.equal(behavior.evidence[0].verification,'not_independently_verified');
  assert.equal(behavior.qualityVerdict,'not_assessed');
  const performance=reviewed.gates.find(g=>g.gateId==='scripting:performance');
  assert.equal(performance.evidenceStatus,'not_applicable_proposed');
  assert.equal(performance.applicabilityReview,'operator_proposed_not_verified');
  assert.equal(reviewed.counts.externalLinked,1);
  assert.equal(reviewed.counts.notApplicableProposed,1);
  assert.equal(reviewed.counts.evidenceReady,0);
  assert.equal(reviewed.overallVerdict,'not_assessed');
});

test('N/A cannot conceal contradictory evidence or bypass unknown gate validation',()=>{
  const state=new DevKitState();
  const plan=state.createCompetencyPlan({task:'Build a UI',disciplines:['ui']});
  const na=[{gateId:'ui:devices',reason:'The test is not targeting a small-screen device yet.'}];
  assert.throws(()=>state.assessCompetencyPlan({
    planId:plan.planId,notApplicable:[...na,...na]
  }),InputError);
  assert.throws(()=>state.assessCompetencyPlan({
    planId:plan.planId,notApplicable:[{gateId:'ui:unknown',reason:na[0].reason}]
  }),InputError);
  assert.throws(()=>state.assessCompetencyPlan({
    planId:plan.planId,notApplicable:[{gateId:'ui:devices',reason:'no'}]
  }),InputError);
  assert.throws(()=>state.assessCompetencyPlan({
    planId:plan.planId,notApplicable:na,
    evidence:[{gateId:'ui:devices',kind:'device',id:'foo'}],
  }),InputError);
});

test('recording native pointers rejects untrusted sources, local paths and absent approval',()=>{
  const state=new DevKitState();
  const invalid=[
    {...input(),operatorConsent:false},
    {...input(),sourceTool:'screen_capture'},
    {...input(),provider:'ropilot'},
    {...input(),sourceReference:'C:\\Users\\Tester\\secret.jpg'},
    {...input(),sourceReference:'https://server.test/private?token=x'},
    {...input(),sourceReference:'a..b'},
    {...input(),capturedAt:'2099-01-01T00:00:00Z'},
    {...input(),placeId:-1},
    {...input(),sessionLabel:'../../bad'},
    {...input(),extra:'unexpected'},
    {...input(),summary:'x'.repeat(501)},
  ];
  for(const bad of invalid)assert.throws(()=>state.recordNativeEvidence(bad),InputError);
});

test('native pointer can only satisfy its own kind and all stored evidence expires with daemon',()=>{
  const state=new DevKitState();
  const evidence=state.recordNativeEvidence(input('viewport'));
  const plan=state.createCompetencyPlan({task:'Visual review',disciplines:['ui']});
  const result=state.assessCompetencyPlan({
    planId:plan.planId,evidence:[{gateId:'ui:hierarchy',kind:'viewport',id:evidence.evidenceId}],
  });
  assert.equal(result.gates.find(g=>g.gateId==='ui:hierarchy').evidenceStatus,
    'external_evidence_linked_for_review');
  assert.equal(state.nativeEvidence.lookup('playtest',evidence.evidenceId),null);
  assert.equal(new DevKitState().listNativeEvidence().length,0);
  assert.throws(()=>state.readNativeEvidence('nonexistent'),InputError);
});

test('existing local Studio bridge evidence still reaches its original review status',()=>{
  const state=new DevKitState();
  const plan=state.createCompetencyPlan({task:'Review an original mesh',disciplines:['modeling']});
  const viewport=state.inspectViewport({pixels:Buffer.alloc(16,255),width:2,height:2});
  const result=state.assessCompetencyPlan({
    planId:plan.planId,
    evidence:[{gateId:'modeling:silhouette',kind:'viewport',id:viewport.viewportId}],
  });
  assert.equal(result.gates.find(g=>g.gateId==='modeling:silhouette').evidenceStatus,
    'ready_for_review');
  assert.equal(result.counts.externalLinked,0);
});
