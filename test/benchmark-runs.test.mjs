import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BenchmarkEvidenceStore,BenchmarkEvidenceError} from '../src/knowledge/runs.mjs';
import {DevKitState} from '../src/state.mjs';
import {handleRpc} from '../src/mcp.mjs';
const fixture=(variant='baseline')=>({benchmarkId:'animation-contact',variant,projectCommit:'b861e33',studioBuild:'local-build-unknown',device:'Windows desktop',operatorLabel:'human-tester',evidence:[{kind:'viewport',id:'capture-1'}],metrics:[{name:'contact_drift',value:3,unit:'stud',method:'manual contact probe'}]});
test('explicit evidence references are mandatory and session-scoped',()=>{
 const store=new BenchmarkEvidenceStore((kind,id)=>kind==='viewport'&&id==='capture-1');
 const baseline=store.record(fixture());
 assert.equal(baseline.status,'recorded_unverified');assert.equal(baseline.qualityVerdict,'not_assessed');
 baseline.evidence[0].id='tampered';
 assert.equal(store.read(baseline.runId).evidence[0].id,'capture-1');
 assert.throws(()=>store.record({...fixture(),evidence:[{kind:'viewport',id:'unobserved'}]}),BenchmarkEvidenceError);
 assert.throws(()=>store.record({...fixture(),evidence:[]}),BenchmarkEvidenceError);
});
test('comparisons report raw differences but never a pass or aesthetic grade',()=>{
 const store=new BenchmarkEvidenceStore(()=>true);
 const a=store.record(fixture()),b=store.record({...fixture('informed'),metrics:[{name:'contact_drift',value:2,unit:'stud',method:'manual contact probe'}]});
 const c=store.compare({baselineRunId:a.runId,informedRunId:b.runId});
 assert.equal(c.reportedMeasurements[0].difference,-1);
 assert.equal(c.reportedMeasurements[0].verified,false);
 assert.equal(c.qualityVerdict,'not_assessed');
 assert.throws(()=>store.compare({baselineRunId:b.runId,informedRunId:a.runId}),BenchmarkEvidenceError);
 const mismatch=store.record({...fixture('informed'),device:'Android',metrics:[{name:'contact_drift',value:1,unit:'pixels',method:'different'}]});
 const other=store.compare({baselineRunId:a.runId,informedRunId:mismatch.runId});
 assert.equal(other.reportedMeasurements.length,0);assert.ok(other.confounders.length);
});
test('rejects claims and forged metrics and unrecognized controls',()=>{
 const store=new BenchmarkEvidenceStore(()=>true);
 for(const v of [
  {...fixture(),passed:true},
  {...fixture(),metrics:[{name:'contact_drift',value:Infinity,unit:'stud',method:'manual'}]},
  {...fixture(),metrics:[{name:'drift',value:3,unit:'stud',method:'test'},{name:'drift',value:4,unit:'stud',method:'test'}]},
  {...fixture(),projectCommit:'invalid'},
  {...fixture(),evidence:[{kind:'performance',id:'none'}]},
 ])assert.throws(()=>store.record(v),BenchmarkEvidenceError);
});
test('state MCP cannot invent local evidence and exposes actual stored records',()=>{
 const state=new DevKitState();
 const list=handleRpc(state,{jsonrpc:'2.0',id:1,method:'tools/list'}).result.tools.map(x=>x.name);
 for(const n of ['lazydev_record_benchmark_run','lazydev_list_benchmark_runs','lazydev_compare_benchmark_runs'])assert.ok(list.includes(n));
 const request=name=>handleRpc(state,{jsonrpc:'2.0',id:2,method:'tools/call',params:{name,arguments:fixture()}});
 assert.equal(request('lazydev_record_benchmark_run').result.isError,true);
 const capture=state.inspectViewport({pixels:Buffer.alloc(2*2*4,255),width:2,height:2});
 const raw=handleRpc(state,{jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'lazydev_record_benchmark_run',arguments:{...fixture(),evidence:[{kind:'viewport',id:capture.viewportId}]}}});
 assert.equal(raw.result.isError,false,JSON.stringify(raw));
 const recorded=JSON.parse(raw.result.content[0].text);
 assert.equal(recorded.qualityVerdict,'not_assessed');
 assert.equal(state.listBenchmarkRuns().length,1);
});
