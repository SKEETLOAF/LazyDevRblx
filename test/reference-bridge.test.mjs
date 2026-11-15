import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DevKitState} from '../src/state.mjs';
import {createStudioServer} from '../src/http.mjs';
import {handleRpc} from '../src/mcp.mjs';
import {encodeRgbaPng} from '../src/viewport.mjs';
import {importReferenceFile} from '../src/reference-cli.mjs';

const image=encodeRgbaPng(Buffer.from([
  230,20,20,255, 20,230,20,255,
  20,20,230,255, 240,240,240,255,
]),2,2);
const mime='image/png';
const label=Buffer.from('Two-color effect reference').toString('base64url');
const rpc=(state,name,parameters={})=>{
  const r=handleRpc(state,{jsonrpc:'2.0',id:7,method:'tools/call',
    params:{name,arguments:parameters}});
  assert.equal(r.result.isError,false,JSON.stringify(r));
  return r.result.content;
};

test('authenticated binary image import remains opt-in, bounded, and accessible to MCP clients',async t=>{
  const state=new DevKitState();
  const {server,token}=createStudioServer(state,{token:'reference-bridge-test-token'});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base='http://127.0.0.1:'+server.address().port;
  const path='/v1/references/import';
  const post=(bytes,headers={})=>fetch(base+path,{method:'POST',headers:{
    Authorization:'Bearer '+token,'Content-Type':mime,'X-Reference-Label':label,
    ...headers},body:bytes});
  assert.equal(state.listReferences().length,0);
  assert.equal((await post(image,{Authorization:''})).status,401);
  assert.equal((await post(image,{Origin:'https://malicious-site.example'})).status,403);
  assert.equal((await post(image,{'Content-Type':'image/svg+xml'})).status,415);
  assert.equal((await post(image,{'X-Reference-Label':'###'})).status,400);
  assert.equal((await post(image,{'Content-Type':'image/gif'})).status,400);
  assert.equal((await post(Buffer.from('garbage'),'Content-Type' in {}?{}:{})).status,400);
  assert.equal(state.listReferences().length,0);
  const received=await post(image);
  assert.equal(received.status,201);
  const metadata=await received.json();
  assert.equal(metadata.format,'png');
  assert.equal(metadata.width,2);
  assert.equal(metadata.height,2);
  const items=rpc(state,'lazydev_list_references');
  assert.equal(JSON.parse(items[0].text)[0].referenceId,metadata.referenceId);
  const details=rpc(state,'lazydev_read_reference',{referenceId:metadata.referenceId});
  assert.equal(details[0].type,'text');
  assert.equal(JSON.parse(details[0].text).analysis.qualityAssessment,'not_assessed');
  assert.equal(details[1].type,'image');
  assert.equal(details[1].mimeType,'image/png');
  assert.equal(Buffer.from(details[1].data,'base64').subarray(0,8).toString('hex'),
    '89504e470d0a1a0a');
  const view=state.inspectViewport({pixels:Buffer.from([
    100,100,100,255, 100,100,100,255,
    100,100,100,255, 100,100,100,255,
  ]),width:2,height:2});
  const diff=JSON.parse(rpc(state,'lazydev_compare_reference_viewport',{
    referenceId:metadata.referenceId,viewportId:view.viewportId})[0].text);
  assert.equal(diff.qualityVerdict,'not_assessed');
  assert.equal(diff.comparisonMode,'summary_statistics_only');
  assert.equal(diff.referenceSize.width,2);
  assert.equal(diff.viewportSize.width,2);
});

test('explicit local import CLI reads only chosen file and never prints the token',async t=>{
  const state=new DevKitState();
  const {server,token}=createStudioServer(state,{token:'cli-test-secret-token'});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const dir=mkdtempSync(join(tmpdir(),'lazy-reference-test-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const file=join(dir,'visual.png');
  writeFileSync(file,image);
  let authUsed=false;
  const response=await importReferenceFile([file,'--label','UI match'],{
    readSessionFn:()=>({token,port:server.address().port}),
    post:async (...args)=>{
      authUsed=args[1]?.headers?.Authorization==='Bearer '+token;
      return fetch(...args);
    },
  });
  assert.equal(authUsed,true);
  assert.equal(response.label,'UI match');
  assert.equal(response.format,'png');
  assert.equal(state.listReferences().length,1);
  await assert.rejects(importReferenceFile([file,'--unknown'],{
    readSessionFn:()=>{throw Error('must not contact session');},
  }),/Usage:/);
  await assert.rejects(importReferenceFile(['https://example.com/sneaky.png'],{
    readSessionFn:()=>{throw Error('must not contact session');},
  }));
});
