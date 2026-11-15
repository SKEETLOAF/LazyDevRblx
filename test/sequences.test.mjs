import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { SequenceStore, SequenceInputError, SEQUENCE_MAX_BYTES } from '../src/sequences.mjs';
import { ReferenceStore } from '../src/references.mjs';
import { DevKitState, InputError } from '../src/state.mjs';
import { createStudioServer } from '../src/http.mjs';
import { handleRpc } from '../src/mcp.mjs';
import { encodeRgbaPng } from '../src/viewport.mjs';

const frame=(r,g,b)=>Buffer.from([
  r,g,b,255,r,g,b,255,
  r,g,b,255,r,g,b,255,
]);
const red=frame(235,20,25),blue=frame(20,25,235);
const offsetsMs=[0,190,370,580,850,1250];
const build=(frames=[red,blue,blue,blue,blue,blue])=>({
  width:2,height:2,pixels:Buffer.concat(frames),
  capturedTimestamp:Math.floor(Date.now()/1000),offsetsMs:[...offsetsMs],
});
const tinyGif=Buffer.from('R0lGODlhAgABAIEAAP8AAAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQICAAAACwAAAAAAgABAAAIBQABAAgIACH5BAgQAAAALAAAAAACAAEAgQAA/wAAAAAAAAAAAAgFAAEACAgAOw==','base64');
function rpc(state,name,args={}){
  const r=handleRpc(state,{jsonrpc:'2.0',id:7,method:'tools/call',
    params:{name,arguments:args}});
  assert.equal(r.result?.isError,false,JSON.stringify(r));
  return r.result.content;
}

test('sequence preserves observed nonuniform timing, returns keyframe PNG pixels and measured change',()=>{
  const state=new DevKitState();
  const input=build();
  const meta=state.inspectSequence(input);
  input.pixels[0]=0;input.offsetsMs[1]=999;
  assert.equal(meta.frameCount,6);
  assert.equal(meta.durationMs,1250);
  assert.equal(meta.verdict,'not_assessed');
  const read=state.readSequence(meta.sequenceId);
  assert.deepEqual(read.analysis.frames.map(f=>f.offsetMs),offsetsMs);
  assert.equal(read.analysis.peakVisualChange.frameIndex,1);
  assert.equal(read.analysis.peakVisualChange.changedSampleFraction,1);
  assert.deepEqual(read.analysis.keyframeIndices,[0,1,5]);
  assert.equal(read.images.length,3);
  assert.deepEqual(read.images.map(x=>x.offsetMs),[0,190,1250]);
  const contents=rpc(state,'lazydev_read_sequence',{sequenceId:meta.sequenceId});
  assert.equal(contents.length,4);
  assert.equal(contents[0].type,'text');
  assert.deepEqual(JSON.parse(contents[0].text).analysis.keyframeIndices,[0,1,5]);
  for(const image of contents.slice(1)) {
    assert.equal(image.type,'image');
    assert.equal(image.mimeType,'image/png');
    assert.equal(Buffer.from(image.data,'base64')[0],137);
  }
  const listed=JSON.parse(rpc(state,'lazydev_list_sequences')[0].text);
  assert.equal(listed[0].sequenceId,meta.sequenceId);
  assert.equal(state.listViewports().length,0);
});

test('two-frame and all-static six-frame sequences are reported without fabricated video insight',()=>{
  const store=new SequenceStore();
  const simple=build([red,red]);simple.offsetsMs=[0,500];
  const a=store.inspect(simple);
  assert.equal(store.read(a.sequenceId).images.length,2);
  assert.equal(store.read(a.sequenceId).analysis.peakVisualChange.changedSampleFraction,0);
  const b=store.inspect(build([red,red,red,red,red,red]));
  assert.deepEqual(store.read(b.sequenceId).analysis.keyframeIndices,[0,1,5]);
  assert.equal(store.read(b.sequenceId).analysis.verdict,'not_assessed');
});

test('reject malformed/oversized frame sequences, bad clocks and impossible timing',()=>{
  const store=new SequenceStore();
  const original=build();
  const bad=[
    {...original,width:0},{...original,height:161},
    {...original,width:241},{...original,pixels:Buffer.alloc(0)},
    {...original,pixels:new Uint8Array(original.pixels)},
    {...original,pixels:Buffer.concat([original.pixels,Buffer.from([0])])},
    {...original,offsetsMs:[0]},{...original,offsetsMs:[0,1,2,3,4,5,6]},
    {...original,offsetsMs:[1,200,300,400,500,600]},
    {...original,offsetsMs:[0,300,300,400,500,600]},
    {...original,offsetsMs:[0,100,50,400,500,600]},
    {...original,offsetsMs:[0,100,200,300,400,30001]},
    {...original,offsetsMs:[0,100.5,200,300,400,600]},
    {...original,capturedTimestamp:1},
    {...original,capturedTimestamp:Math.floor(Date.now()/1000)+100000},
  ];
  for(const item of bad)assert.throws(()=>store.inspect(item),SequenceInputError);
  assert.equal(store.list().length,0);
  assert.equal(SEQUENCE_MAX_BYTES,240*160*4*6);
});

test('sequence vs imported GIF compares by nearest relative time, without an aesthetic score',()=>{
  const state=new DevKitState();
  const seq=state.inspectSequence(build());
  const reference=state.ingestReference(tinyGif,{label:'Two phase impact',mediaType:'image/gif'});
  const compared=JSON.parse(rpc(state,'lazydev_compare_sequence_reference',{
    sequenceId:seq.sequenceId,referenceId:reference.referenceId})[0].text);
  assert.equal(compared.qualityVerdict,'not_assessed');
  assert.equal(compared.matches.length,6);
  assert.equal(compared.referenceDurationMs,240);
  assert.equal(compared.sequenceDurationMs,1250);
  assert.equal(compared.matches[0].referenceFrameIndex,0);
  assert.equal(compared.matches.at(-1).referenceFrameIndex,1);
  assert.equal(compared.matches[0].normalizedProgress,0);
  assert.equal(compared.matches.at(-1).normalizedProgress,1);
  assert.match(compared.warning,/not motion events, subject pose/);
  const still=state.ingestReference(encodeRgbaPng(red,2,2),{label:'still',mediaType:'image/png'});
  assert.equal(state.compareSequenceReference({
    sequenceId:seq.sequenceId,referenceId:still.referenceId}).matches.at(-1).referenceFrameIndex,0);
  assert.throws(()=>state.compareSequenceReference({
    sequenceId:'expired',referenceId:still.referenceId}),InputError);
  assert.throws(()=>state.compareSequenceReference({
    sequenceId:seq.sequenceId,referenceId:'expired'}),InputError);
});

test('sequence store keeps three copies in memory and evicts expired reports',()=>{
  const state=new DevKitState();
  const first=state.inspectSequence(build());
  for(let i=0;i<4;i++)state.inspectSequence(build());
  assert.equal(state.listSequences().length,3);
  assert.throws(()=>state.readSequence(first.sequenceId),/expired/);
});

test('HTTP requires local token and exact frame payload, then MCP exposes approved frames',async t=>{
  const state=new DevKitState();
  const {server,token}=createStudioServer(state,{token:'sequence-http-test-token'});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base='http://127.0.0.1:'+server.address().port+'/v1/studio/sequence';
  const body=build().pixels;
  const headers={
    Authorization:'Bearer '+token,
    'Content-Type':'application/octet-stream',
    'X-Sequence-Width':'2','X-Sequence-Height':'2',
    'X-Sequence-Captured-At':String(Math.floor(Date.now()/1000)),
    'X-Sequence-Offsets':'0,190,370,580,850,1250',
  };
  const post=(b=body,h={})=>fetch(base,{method:'POST',headers:{...headers,...h},body:b});
  assert.equal((await post(body,{Authorization:''})).status,401);
  assert.equal((await post(body,{Origin:'https://evil.example'})).status,403);
  assert.equal((await post(body,{'Content-Type':'application/json'})).status,415);
  assert.equal((await post(body,{'X-Sequence-Width':'999'})).status,413);
  assert.equal((await post(body,{'X-Sequence-Offsets':'0,200,190,500,600,700'})).status,400);
  assert.equal((await post(body,{'X-Sequence-Offsets':'0,250,500'})).status,400);
  assert.equal((await post(Buffer.concat([body,Buffer.alloc(1)]))).status,413);
  assert.equal((await post(body.subarray(0,body.length-1))).status,400);
  assert.equal((await post(body,{'X-Sequence-Captured-At':'1'})).status,400);
  assert.equal(state.listSequences().length,0);
  const accepted=await post();
  assert.equal(accepted.status,201);
  const metadata=await accepted.json();
  assert.equal(metadata.frameCount,6);
  assert.equal(metadata.durationMs,1250);
  assert.equal(rpc(state,'lazydev_read_sequence',{sequenceId:metadata.sequenceId})[1].mimeType,'image/png');
});
