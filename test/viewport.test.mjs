import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { DevKitState, InputError } from '../src/state.mjs';
import { createStudioServer } from '../src/http.mjs';
import { handleRpc } from '../src/mcp.mjs';
import {
  encodeRgbaPng, ViewportStore, ViewportInputError,
  VIEWPORT_MAX_WIDTH, VIEWPORT_MAX_HEIGHT, VIEWPORT_MAX_BYTES,
} from '../src/viewport.mjs';

const small=Buffer.from([
  255,0,0,255,0,255,0,255,
  0,0,255,255,255,255,255,255,
]);
function pngChunks(png) {
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  const chunks=[];
  let offset=8;
  while(offset<png.length) {
    const size=png.readUInt32BE(offset);
    const type=png.toString('ascii',offset+4,offset+8);
    assert.ok(offset+12+size<=png.length,'PNG chunk length must fit');
    chunks.push({type,data:png.subarray(offset+8,offset+8+size)});
    offset+=size+12;
  }
  assert.equal(offset,png.length);
  return chunks;
}
function tool(state,name,args={}) {
  const response=handleRpc(state,{jsonrpc:'2.0',id:9,method:'tools/call',
    params:{name,arguments:args}});
  assert.equal(response.result?.isError,false,JSON.stringify(response));
  return response.result.content;
}

test('RGBA pixels are converted to a real PNG losslessly with valid dimensions', () => {
  const png=encodeRgbaPng(small,2,2);
  const chunks=pngChunks(png);
  assert.deepEqual(chunks.map(c=>c.type),['IHDR','IDAT','IEND']);
  assert.equal(chunks[0].data.readUInt32BE(0),2);
  assert.equal(chunks[0].data.readUInt32BE(4),2);
  assert.equal(chunks[0].data[8],8);
  assert.equal(chunks[0].data[9],6);
  const pixels=inflateSync(chunks[1].data);
  assert.deepEqual(pixels,Buffer.concat([
    Buffer.from([0]),small.subarray(0,8),
    Buffer.from([0]),small.subarray(8),
  ]));
});

test('viewport store retains only four immutable images and exposes metadata', () => {
  const state=new DevKitState();
  const pixels=Buffer.from(small);
  const first=state.inspectViewport({pixels,width:2,height:2});
  pixels[0]=0;
  assert.equal(first.kind,'studio_3d_viewport');
  assert.equal(first.width,2);
  assert.equal(first.height,2);
  assert.equal(first.sha256.length,64);
  assert.equal(state.listViewports().length,1);
  const content=tool(state,'lazydev_read_viewport',{viewportId:first.viewportId});
  assert.equal(content[0].type,'text');
  const metadata=JSON.parse(content[0].text);
  assert.equal(metadata.viewportId,first.viewportId);
  assert.equal(content[1].type,'image');
  assert.equal(content[1].mimeType,'image/png');
  const bytes=Buffer.from(content[1].data,'base64');
  assert.equal(bytes[0],137);
  assert.equal(inflateSync(pngChunks(bytes)[1].data)[1],255);
  for(let i=0;i<5;i++)state.inspectViewport({pixels:small,width:2,height:2});
  assert.equal(state.listViewports().length,4);
  assert.throws(()=>state.readViewport(first.viewportId),/expired/);
});

test('viewport rejects malformed pixels, dimensions, and excessive frames', () => {
  const store=new ViewportStore();
  assert.throws(()=>store.inspect({pixels:small,width:2,height:3}),ViewportInputError);
  assert.throws(()=>store.inspect({pixels:new Uint8Array(small),width:2,height:2}),ViewportInputError);
  assert.throws(()=>store.inspect({pixels:small,width:0,height:2}),ViewportInputError);
  assert.throws(()=>store.inspect({pixels:small,width:Infinity,height:2}),ViewportInputError);
  assert.throws(()=>store.inspect({pixels:small,width:2.5,height:2}),ViewportInputError);
  assert.throws(()=>store.inspect({pixels:small,width:VIEWPORT_MAX_WIDTH+1,height:1}),ViewportInputError);
  assert.throws(()=>store.inspect({pixels:small,width:2,height:VIEWPORT_MAX_HEIGHT+1}),ViewportInputError);
  const max=Buffer.alloc(VIEWPORT_MAX_BYTES,127);
  const png=encodeRgbaPng(max,VIEWPORT_MAX_WIDTH,VIEWPORT_MAX_HEIGHT);
  assert.ok(png.length<max.length,'repeated pixels should compress');
  assert.equal(pngChunks(png)[0].data.readUInt32BE(0),VIEWPORT_MAX_WIDTH);
});

test('HTTP requires authenticated binary RGBA pixels, with exact size and strict media type', async t => {
  const state=new DevKitState();
  const {server,token}=createStudioServer(state,{token:'viewport-local-test-token'});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base='http://127.0.0.1:'+server.address().port;
  const path='/v1/studio/viewport';
  const send=(body,headers={})=>fetch(base+path,{
    method:'POST',headers:{
      Authorization:'Bearer '+token,'Content-Type':'application/octet-stream',
      'X-Viewport-Width':'2','X-Viewport-Height':'2',...headers,
    },body,
  });
  assert.equal((await fetch(base+path,{method:'POST',headers:{
    'Content-Type':'application/octet-stream','X-Viewport-Width':'2','X-Viewport-Height':'2'
  },body:small})).status,401);
  assert.equal((await send(small,{Origin:'https://example.com'})).status,403);
  assert.equal((await send(small,{'Content-Type':'application/json'})).status,415);
  assert.equal((await send(small.subarray(0,12))).status,400);
  assert.equal((await send(Buffer.concat([small,Buffer.from([1])]))).status,413);
  assert.equal((await send(small,{'X-Viewport-Width':'3'})).status,400);
  assert.equal((await send(small,{'X-Viewport-Width':'999'})).status,413);
  assert.equal((await send(small,{'X-Viewport-Width':'2.0'})).status,400);
  const good=await send(small);
  assert.equal(good.status,201);
  const metadata=await good.json();
  assert.equal(metadata.width,2);
  assert.equal(metadata.height,2);
  assert.equal(metadata.bytes>32,true);
  assert.equal(tool(state,'lazydev_list_viewports')[0].type,'text');
  assert.equal(tool(state,'lazydev_read_viewport',{viewportId:metadata.viewportId})[1].mimeType,'image/png');
  assert.equal(state.listViewports().length,1);
});

test('MCP image is returned by shared stdio relay without dropping pixels', async t => {
  const {PassThrough}=await import('node:stream');
  const {mkdtempSync,rmSync}=await import('node:fs');
  const {tmpdir}=await import('node:os');
  const {join}=await import('node:path');
  const {publishSession,clearSession}=await import('../src/session.mjs');
  const {attachStdioRelay}=await import('../src/relay.mjs');
  const state=new DevKitState();
  const meta=state.inspectViewport({pixels:small,width:2,height:2});
  const {server,token}=createStudioServer(state,{token:'v'.repeat(64)});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const dir=mkdtempSync(join(tmpdir(),'lazy-devkit-viewport-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const file=join(dir,'session.json');
  publishSession({token,port:server.address().port},file);
  t.after(()=>clearSession(token,file));
  const input=new PassThrough(),output=new PassThrough();
  let data='';
  output.setEncoding('utf8');
  output.on('data',chunk=>data+=chunk);
  const relay=attachStdioRelay(input,output,{sessionFile:file});
  t.after(()=>relay.reader.close());
  input.write(JSON.stringify({jsonrpc:'2.0',id:5,method:'tools/call',
    params:{name:'lazydev_read_viewport',arguments:{viewportId:meta.viewportId}}})+'\n');
  await new Promise(resolve=>setImmediate(resolve));
  await relay.drain();
  const reply=JSON.parse(data.trim());
  assert.equal(reply.result.content[1].mimeType,'image/png');
  assert.equal(reply.result.content[0].type,'text');
  assert.equal(Buffer.from(reply.result.content[1].data,'base64')[0],137);
});
