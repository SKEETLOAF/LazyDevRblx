import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DevKitState, InputError } from '../src/state.mjs';
import { normalizeDiagnostics, DIAGNOSTIC_LIMIT, DIAGNOSTIC_MESSAGE_LIMIT } from '../src/diagnostics.mjs';
import { handleRpc } from '../src/mcp.mjs';
import { createStudioServer } from '../src/http.mjs';

const entry = (message, type='MessageError', timestamp=12345) => ({message,type,timestamp});
const snapshot = (entries=[entry('ServerScriptService.A:7: Expected identifier'),
  entry('Missing texture', 'MessageWarning')]) => ({
  kind:'studio_output', capturedTimestamp:1731561111, truncated:false, entries,
});

function tool(state, name, arguments_={}) {
  const reply=handleRpc(state,{jsonrpc:'2.0',id:3,method:'tools/call',
    params:{name,arguments:arguments_}});
  assert.equal(reply.result.isError,false,JSON.stringify(reply));
  return JSON.parse(reply.result.content[0].text);
}

test('manual diagnostic snapshots expose only typed warnings/errors, never live state', () => {
  const state=new DevKitState();
  const saved=state.inspectDiagnostics(snapshot());
  assert.equal(saved.entryCount,2);
  assert.equal(saved.errorCount,1);
  assert.equal(saved.warningCount,1);
  assert.equal(saved.kind,'studio_output');
  assert.equal(tool(state,'lazydev_list_diagnostics')[0].diagnosticsId,saved.diagnosticsId);
  const data=tool(state,'lazydev_read_diagnostics',{diagnosticsId:saved.diagnosticsId});
  assert.equal(data.entries[0].message,'ServerScriptService.A:7: Expected identifier');
  assert.equal(data.entries[1].type,'MessageWarning');
  assert.equal(data.entries.length,2);
  assert.equal(state.listStructures().length,0);
  assert.equal(state.listObservations().length,0);
  assert.equal(tool(state,'lazydev_list_diagnostics').length,1);
  const empty=state.inspectDiagnostics(snapshot([]));
  assert.equal(empty.entryCount,0);
  assert.equal(empty.errorCount,0);
});

test('diagnostics reject arbitrary metadata, status, oversized and unsafe log types', () => {
  const state=new DevKitState();
  const rejects=[
    snapshot([entry('oops','MessageOutput')]),
    snapshot([entry('not an error','MessageInfo')]),
    snapshot([{...entry('ok'),source:'private.lua'}]),
    snapshot([{...entry('ok'),context:{secret:'abc'}}]),
    snapshot([{...entry('ok'),timestamp:Infinity}]),
    snapshot([{...entry('ok'),timestamp:-5}]),
    snapshot([entry('')]),
    snapshot([entry('x'.repeat(DIAGNOSTIC_MESSAGE_LIMIT+1))]),
    snapshot(Array.from({length:DIAGNOSTIC_LIMIT+1},()=>entry('warning','MessageWarning'))),
    {...snapshot(),kind:'arbitrary'},
    {...snapshot(),source:'secret'},
    {...snapshot(),truncated:'false'},
    {...snapshot(),capturedTimestamp:-5},
  ];
  for(const payload of rejects) assert.throws(()=>state.inspectDiagnostics(payload),InputError);
  assert.equal(state.listDiagnostics().length,0);
});

test('diagnostic snapshot is immutable after user shares it and is bounded in memory', () => {
  const state=new DevKitState();
  const src=snapshot([entry('first error')]);
  const metadata=state.inspectDiagnostics(src);
  src.entries[0].message='changed later';
  assert.equal(state.readDiagnostics(metadata.diagnosticsId).entries[0].message,'first error');
  for(let i=0;i<24;i++)state.inspectDiagnostics(snapshot([entry('warning '+i,'MessageWarning')]));
  assert.equal(state.listDiagnostics().length,20);
  assert.throws(()=>state.readDiagnostics(metadata.diagnosticsId),/expired/);
});

test('diagnostics HTTP rejects unauthenticated/browser-origin, then MCP reads explicit snapshot', async t => {
  const state=new DevKitState();
  const {server,token}=createStudioServer(state,{token:'diagnostics-test-token'});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const url='http://127.0.0.1:'+server.address().port+'/v1/studio/diagnostics';
  const send=(headers, payload=snapshot())=>fetch(url,{
    method:'POST',headers:{'Content-Type':'application/json',...headers},
    body:JSON.stringify(payload)});
  assert.equal((await send({})).status,401);
  assert.equal((await send({Authorization:'Bearer '+token,Origin:'http://localhost'})).status,403);
  const good=await send({Authorization:'Bearer '+token});
  assert.equal(good.status,201);
  const {diagnosticsId}=await good.json();
  const received=tool(state,'lazydev_read_diagnostics',{diagnosticsId});
  assert.equal(received.entries[0].type,'MessageError');
  assert.equal(received.entries[0].timestamp,12345);
  const invalid=await send({Authorization:'Bearer '+token},
    snapshot([entry('print is not shared','MessageOutput')]));
  assert.equal(invalid.status,400);
});
