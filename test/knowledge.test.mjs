import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {DevKitState} from '../src/state.mjs';
import {handleRpc} from '../src/mcp.mjs';
import {SOURCES,PACKS} from '../src/knowledge/catalog.mjs';
import {validateKnowledge,listKnowledge,retrieveKnowledge,listBenchmarks,planBenchmark,KnowledgeInputError} from '../src/knowledge/engine.mjs';
const rpc=(s,name,args={})=>{
 const r=handleRpc(s,{jsonrpc:'2.0',id:4,method:'tools/call',params:{name,arguments:args}});
 assert.equal(r.result?.isError,false,JSON.stringify(r));
 return JSON.parse(r.result.content[0].text);
};
test('curated sources remain reference-only and source rights are restrictive',()=>{
 const checked=validateKnowledge();assert.equal(checked.valid,true);assert.ok(checked.sourceCount>=18);
 assert.equal(PACKS.length,8);assert.equal(listKnowledge().packs.length,8);
 const ids=SOURCES.map(s=>s.id);assert.equal(new Set(ids).size,ids.length);
 for(const s of SOURCES){assert.equal(s.liveVerified,false);assert.equal(s.rights.assets,'not_authorized');assert.equal(s.rights.code,'not_authorized');}
 assert.equal(SOURCES.find(s=>s.id==='spray').license,'MPL-2.0');
 assert.equal(SOURCES.find(s=>s.id==='sine').license,'unknown');
});
test('bounded domain-specific source selection keeps standards and caveats',()=>{
 const result=retrieveKnowledge({task:'Original stylized VFX impact and attack animation',disciplines:['vfx','animation'],limit:7});
 assert.equal(result.sources.length,7);assert.ok(result.packs.some(p=>p.id==='vfx'));assert.ok(result.packs.some(p=>p.id==='animation'));
 assert.ok(result.sources.some(s=>s.id==='vfx-direction'));assert.ok(!result.packs.some(p=>p.id==='scripting'));
 assert.equal(result.status,'reference_only');
 const unknown=retrieveKnowledge({task:'Something unexpected'});
 assert.deepEqual(unknown.sources,[]);assert.deepEqual(unknown.packs,[]);
});
test('strict retrieval and benchmark validation',()=>{
 const invalid=[null,[],{task:''},{task:'x',limit:0},{task:'x',limit:11},{task:'x',disciplines:[]},{task:'x',disciplines:['vfx','vfx']},{task:'x',disciplines:['bad']},{task:'x',authorization:'secret'},{task:'x'.repeat(1601)}];
 for(const obj of invalid)assert.throws(()=>retrieveKnowledge(obj),KnowledgeInputError);
 for(const obj of [{benchmarkId:'made-up'}, {benchmarkId:'vfx-audio',passed:true},{}])assert.throws(()=>planBenchmark(obj),KnowledgeInputError);
});
test('five benchmark definitions are unrun and ungraded',()=>{
 assert.equal(listBenchmarks().benchmarks.length,5);
 const p=planBenchmark({benchmarkId:'vfx-audio'});assert.equal(p.verdict,'not_assessed');assert.equal(p.liveStatus,'not_run');
 assert.ok(p.benchmark.human.length>0&&p.benchmark.objective.length>0);
});
test('MCP list/read calls are local and safe',()=>{
 const s=new DevKitState();
 const names=handleRpc(s,{jsonrpc:'2.0',id:3,method:'tools/list'}).result.tools.map(x=>x.name);
 for(const name of ['lazydev_list_knowledge','lazydev_query_knowledge','lazydev_list_benchmarks','lazydev_plan_benchmark'])assert.ok(names.includes(name));
 assert.equal(rpc(s,'lazydev_query_knowledge',{task:'VFX',disciplines:['vfx'],limit:2}).sources.length,2);
 assert.equal(rpc(s,'lazydev_plan_benchmark',{benchmarkId:'animation-contact'}).liveStatus,'not_run');
 const bad=handleRpc(s,{jsonrpc:'2.0',id:4,method:'tools/call',params:{name:'lazydev_query_knowledge',arguments:{task:'test',limit:999}}});
 assert.equal(bad.result.isError,true);
});
test('standalone CLI can retrieve and list plans',()=>{
 const q=JSON.parse(execFileSync(process.execPath,['scripts/knowledge.mjs','query','Create an animation','--disciplines','animation','--limit','3'],{encoding:'utf8'}));
 assert.equal(q.sources.length,3);
 const p=JSON.parse(execFileSync(process.execPath,['scripts/knowledge.mjs','benchmark','blind-onboarding'],{encoding:'utf8'}));
 assert.equal(p.liveStatus,'not_run');
});
