import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DevKitState } from '../src/state.mjs';
import { createStudioServer } from '../src/http.mjs';
import { attachStdioRelay } from '../src/relay.mjs';
import { publishSession, clearSession } from '../src/session.mjs';

const item = { rootPath:'Workspace.DevKitProbe', truncated:false, nodes:[
  {id:0,parentId:null,depth:0,name:'DevKitProbe',className:'Folder',
    path:'Workspace.DevKitProbe',properties:{}},
  {id:1,parentId:0,depth:1,name:'Marker',className:'Part',
    path:'Workspace.DevKitProbe.Marker',properties:{Anchored:true}}
] };

function connection(sessionFile) {
  const input = new PassThrough(), output = new PassThrough();
  let buffer = '';
  output.setEncoding('utf8');
  output.on('data', data => { buffer += data; });
  const relay = attachStdioRelay(input,output,{sessionFile});
  return {
    send(method,id,params={}) {
      input.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');
    },
    notify(method) { input.write(JSON.stringify({jsonrpc:'2.0',method})+'\n'); },
    async results() {
      await new Promise(resolve=>setImmediate(resolve));
      await relay.drain();
      return buffer.trim().split('\n').filter(Boolean).map(JSON.parse);
    },
    close() {relay.reader.close(); input.destroy(); output.destroy();}
  };
}

test('two MCP stdio clients share one HTTP daemon and its Studio observations', async t => {
  const state = new DevKitState();
  const {server,token} = createStudioServer(state,{token:'d'.repeat(64)});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const dir=mkdtempSync(join(tmpdir(),'lazy-devkit-relay-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const file=join(dir,'session.json');
  publishSession({token,port:server.address().port},file);
  t.after(()=>clearSession(token,file));
  const a=connection(file), b=connection(file);
  t.after(()=>{a.close();b.close();});
  a.send('initialize',1,{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'claude-test',version:'1.0'}});
  a.notify('notifications/initialized');
  a.send('tools/list',2);
  const initial=await a.results();
  assert.equal(initial.length,2);
  assert.equal(initial[0].result.protocolVersion,'2025-06-18');
  assert.equal(initial[1].result.tools.length,9);
  const inspect=await fetch('http://127.0.0.1:'+server.address().port+'/v1/studio/inspect-tree',{
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify(item),
  });
  assert.equal(inspect.status,201);
  const meta=await inspect.json();
  a.send('tools/call',3,{name:'lazydev_list_structures',arguments:{}});
  b.send('tools/call',4,{name:'lazydev_read_structure',arguments:{structureId:meta.structureId}});
  const ar=await a.results(), br=await b.results();
  const aList=JSON.parse(ar.at(-1).result.content[0].text);
  const bTree=JSON.parse(br.at(-1).result.content[0].text);
  assert.equal(aList[0].structureId,meta.structureId);
  assert.equal(bTree.nodes[1].name,'Marker');
  assert.equal(bTree.nodeCount,2);
});

test('scoped proposal from one host is visible to another without Studio apply access', async t => {
  const state = new DevKitState();
  const snapshot=state.inspect({instanceId:'local-script',className:'ModuleScript',
    path:'ReplicatedStorage.Config',source:'return 1'});
  const {server,token}=createStudioServer(state,{token:'e'.repeat(64)});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const dir=mkdtempSync(join(tmpdir(),'lazy-devkit-proposal-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const file=join(dir,'session.json');
  publishSession({token,port:server.address().port},file);
  const a=connection(file),b=connection(file);
  t.after(()=>{a.close();b.close();clearSession(token,file);});
  a.send('tools/call',5,{name:'lazydev_propose_scoped_edit',arguments:{
    snapshotId:snapshot.snapshotId,expectedSha256:snapshot.sha256,
    beforeText:'return 1',afterText:'return 2',rationale:'local test',
  }});
  const proposal=JSON.parse((await a.results())[0].result.content[0].text);
  b.send('tools/call',6,{name:'lazydev_get_proposal_status',arguments:{proposalId:proposal.id}});
  const status=JSON.parse((await b.results())[0].result.content[0].text);
  assert.equal(status.kind,'scoped');
  assert.equal(status.status,'pending');
  assert.equal(state.readObservation(snapshot.snapshotId).source,'return 1');
});

test('relay returns host-safe errors instead of secrets if daemon is absent', async t => {
  const dir=mkdtempSync(join(tmpdir(),'lazy-devkit-absent-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const c=connection(join(dir,'not-present.json'));
  t.after(()=>c.close());
  c.send('initialize',17,{protocolVersion:'2025-11-25'});
  const response=(await c.results())[0];
  assert.equal(response.id,17);
  assert.equal(response.error.code,-32000);
  assert.match(response.error.message,/Start npm start/);
  assert.ok(!JSON.stringify(response).includes('Authorization'));
});

test('localhost MCP endpoint rejects unauthenticated and browser-origin calls', async t => {
  const state=new DevKitState();
  const {server,token}=createStudioServer(state,{token:'f'.repeat(64)});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const url='http://127.0.0.1:'+server.address().port+'/v1/mcp';
  const body=JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list'});
  const run=(headers)=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...headers},body});
  assert.equal((await run({})).status,401);
  assert.equal((await run({Authorization:'Bearer '+token,Origin:'http://example.test'})).status,403);
  const good=await run({Authorization:'Bearer '+token});
  assert.equal(good.status,200);
  assert.equal((await good.json()).reply.result.tools.length,9);
});

test('portable manifest launches shared relay, not a second Studio daemon', () => {
  const mcp=JSON.parse(readFileSync(new URL('../mcp.json',import.meta.url),'utf8'));
  assert.equal(mcp.mcpServers['lazy-devkit'].type,'stdio');
  assert.equal(mcp.mcpServers['lazy-devkit'].args[0],
    '${PLUGIN_ROOT}/src/stdio-client.mjs');
});
