import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePlaytestReport, PlaytestStore } from '../src/playtests.mjs';
import { DevKitState, InputError } from '../src/state.mjs';
import { handleRpc } from '../src/mcp.mjs';
import { createStudioServer } from '../src/http.mjs';

const entry = (message, type='MessageWarning', timestamp=1800000012) =>
  ({message,type,timestamp});
const sample = (entries=[entry('Studio playtest warning'),
  entry('ServerScriptService.Script:4 error','MessageError')]) => ({
  kind:'studio_playtest',mode:'play',returnState:'returned',
  startedAt:1800000000,endedAt:1800000020,historyScope:'new_suffix',
  truncated:false,entries,
});
function tool(state,name,args={}) {
  const response=handleRpc(state,{jsonrpc:'2.0',id:5,method:'tools/call',
    params:{name,arguments:args}});
  assert.equal(response.result.isError,false,JSON.stringify(response));
  return JSON.parse(response.result.content[0].text);
}

test('a returned Play test is never marked passed; records bounded errors and Output scope', () => {
  const state=new DevKitState();
  const metadata=state.inspectPlaytest(sample());
  assert.equal(metadata.verdict,'not_assessed');
  assert.equal(metadata.returnState,'returned');
  assert.equal(metadata.mode,'play');
  assert.equal(metadata.durationSeconds,20);
  assert.equal(metadata.warningCount,1);
  assert.equal(metadata.errorCount,1);
  assert.equal(metadata.historyScope,'new_suffix');
  const listed=tool(state,'lazydev_list_playtests');
  assert.equal(listed.length,1);
  assert.equal(listed[0].playtestId,metadata.playtestId);
  const report=tool(state,'lazydev_read_playtest',{playtestId:metadata.playtestId});
  assert.equal(report.entries[1].message,'ServerScriptService.Script:4 error');
  assert.equal(report.verdict,'not_assessed');
  assert.equal(state.listDiagnostics().length,0,'Playtest report should not become an unrelated Output inspection');
});

test('Run mode, API error and unfiltered Output history are distinguishable', () => {
  const normalized=normalizePlaytestReport({...sample([]),
    mode:'run',returnState:'start_error',historyScope:'unfiltered_history',truncated:true});
  assert.equal(normalized.mode,'run');
  assert.equal(normalized.returnState,'start_error');
  assert.equal(normalized.historyScope,'unfiltered_history');
  assert.equal(normalized.truncated,true);
  assert.equal(normalized.entries.length,0);
});

test('playtest reports reject extra fields, invalid modes, timestamps, and raw log categories', () => {
  const state=new DevKitState();
  const bad=[
    {...sample(),verdict:'passed'},
    {...sample(),source:'print(1)'},
    {...sample(),result:'Success!'},
    {...sample(),mode:'multiplayer'},
    {...sample(),returnState:'passed'},
    {...sample(),historyScope:'complete_test'},
    {...sample(),endedAt:1799999999},
    {...sample(),endedAt:1800000000+5*60*60},
    {...sample(),startedAt:Infinity},
    {...sample(),truncated:'false'},
    {...sample(),entries:[entry('print','MessageOutput')]},
    {...sample(),entries:[{...entry('ok'),context:{password:'do not send'}}]},
    {...sample(),entries:[entry('x'.repeat(1601))]},
    {...sample(),entries:Array.from({length:81},()=>entry('x'))},
  ];
  for (const input of bad) assert.throws(()=>state.inspectPlaytest(input),InputError);
  assert.equal(state.listPlaytests().length,0);
});

test('saved report is immutable after local capture and store expires oldest snapshots', () => {
  const store=new PlaytestStore();
  const original=sample();
  const first=store.inspect(original);
  original.entries[0].message='mutated after share';
  assert.equal(store.read(first.playtestId).entries[0].message,'Studio playtest warning');
  for(let i=0;i<25;i++)store.inspect(sample([entry('new '+i)]));
  assert.equal(store.list().length,20);
  assert.throws(()=>store.read(first.playtestId),/expired/);
});

test('Studio playtest report POST requires local auth and is accessible over MCP', async t => {
  const state=new DevKitState();
  const {server,token}=createStudioServer(state,{token:'playtest-bridge-test-token'});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const url='http://127.0.0.1:'+server.address().port+'/v1/studio/playtest-report';
  const put=(headers,payload=sample())=>fetch(url,{method:'POST',
    headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(payload)});
  assert.equal((await put({})).status,401);
  assert.equal((await put({Authorization:'Bearer '+token,Origin:'https://example.com'})).status,403);
  const ok=await put({Authorization:'Bearer '+token});
  assert.equal(ok.status,201);
  const saved=await ok.json();
  assert.equal(saved.verdict,'not_assessed');
  const report=tool(state,'lazydev_read_playtest',{playtestId:saved.playtestId});
  assert.equal(report.errorCount,1);
  assert.equal(report.entries[0].type,'MessageWarning');
  assert.equal((await put({Authorization:'Bearer '+token},{...sample(),verdict:'passed'})).status,400);
});
