import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {analyzeWav,AudioInputError} from '../src/artifacts/audio.mjs';
import {normalizeAudit,ArtifactAuditStore,AuditInputError} from '../src/artifacts/audits.mjs';
import {importAuditFile} from '../scripts/import-artifact.mjs';
import {DevKitState,InputError} from '../src/state.mjs';
import {createStudioServer} from '../src/http.mjs';
import {handleRpc} from '../src/mcp.mjs';

const script=fileURLToPath(new URL('../scripts/inspect-artifact.mjs',import.meta.url));
function pcm16(samples,{channels=1,rate=16000}={}){
  if(samples.length%channels!==0)throw Error('Bad fixture');
  const data=Buffer.alloc(samples.length*2);
  samples.forEach((x,i)=>data.writeInt16LE(x,i*2));
  const bytes=Buffer.alloc(44+data.length);
  bytes.write('RIFF',0);bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);
  bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);
  bytes.writeUInt16LE(channels,22);bytes.writeUInt32LE(rate,24);
  bytes.writeUInt32LE(rate*channels*2,28);bytes.writeUInt16LE(channels*2,32);
  bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(data.length,40);
  data.copy(bytes,44);return bytes;
}
const timestamp='2026-11-17T20:00:00Z';
function wavReport(peak=.999969){
  return {schema:'lazydev.creative_audit.v1',kind:'wav',sourceLabel:'hit.wav',
    generatedAt:timestamp,tool:'lazydev.wav-inspector.v1',
    facts:{encoding:'PCM',channels:1,sampleRate:16000,bitDepth:16,frames:4,durationSeconds:0.00025,
      channelPeaks:[peak],channelRms:[.5],channelDc:[0],clipPercent:[25],overallPeak:peak},
    warnings:['Check loudness against actual game sound mix']};
}
function blenderReport({objects=[
  {name:'Roof',type:'MESH',parent:null,collections:['Building / Roof'],
   vertexCount:24,faceCount:6,uvLayers:1,materialSlots:1,modifierTypes:['BEVEL'],
   armatureBones:0,actionName:null},
  {name:'Walls',type:'MESH',parent:null,collections:['Building / Structure'],
   vertexCount:32,faceCount:12,uvLayers:0,materialSlots:1,modifierTypes:[],
   armatureBones:0,actionName:null},
]}={}){
  return {schema:'lazydev.creative_audit.v1',kind:'blender',sourceLabel:'house.blend',
    generatedAt:timestamp,tool:'lazydev.blender-inspector.v1',
    facts:{blenderVersion:'4.5.0',objectCount:objects.length,meshCount:objects.filter(o=>o.type==='MESH').length,
      vertexCount:objects.reduce((n,o)=>n+o.vertexCount,0),
      faceCount:objects.reduce((n,o)=>n+o.faceCount,0),
      armatureCount:0,actionCount:0,objects,truncated:false},
    warnings:[]};
}
function rpc(state,name,args={}){
  const r=handleRpc(state,{jsonrpc:'2.0',id:7,method:'tools/call',params:{name,arguments:args}});
  assert.equal(r.result?.isError,false,JSON.stringify(r));
  return JSON.parse(r.result.content[0].text);
}

test('WAV measures actual mono/stereo sample peaks, RMS, clipping and DC',()=>{
  const wav=pcm16([0,32767,-32768,0],{rate:8000});
  const s=analyzeWav(wav);
  assert.equal(s.encoding,'PCM');assert.equal(s.channels,1);
  assert.equal(s.bitDepth,16);assert.equal(s.frames,4);
  assert.equal(s.durationSeconds,.0005);assert.equal(s.overallPeak,1);
  assert.equal(s.clipPercent[0],50);
  assert.ok(s.channelRms[0]>.7&&s.channelRms[0]<.71);
  assert.ok(s.warnings[0].includes('clipping'));
  const stereo=analyzeWav(pcm16([10000,0,10000,0],{channels:2}));
  assert.equal(stereo.channels,2);assert.equal(stereo.channelPeaks[1],0);
  assert.ok(stereo.channelDc[0]>.3);
  assert.ok(stereo.warnings.some(x=>x.includes('DC offset')));
});

test('WAV strict parser rejects malicious lengths, truncated samples and unsupported formats',()=>{
  const good=pcm16([0,1]);
  const bad=[Buffer.alloc(7),Buffer.from(good.subarray(0,43)),Buffer.from(good),
    Buffer.from(good),Buffer.from(good),Buffer.from(good)];
  bad[2].write('RIFX',0);
  bad[3].writeUInt32LE(10000,40);
  bad[4].writeUInt16LE(9,20);
  bad[5].writeUInt16LE(2,32);
  for(const x of bad)assert.throws(()=>analyzeWav(x),AudioInputError);
});

test('audit schema retains only bounded source facts, not raw files or paths',()=>{
  const sample=normalizeAudit(blenderReport());
  assert.equal(sample.facts.objects.length,2);
  assert.equal(sample.verification,'not_independently_verified');
  assert.equal(sample.qualityVerdict,'not_assessed');
  assert.deepEqual(sample.facts.objects[0].collections,['Building / Roof']);
  for(const mutation of [
    {sourceLabel:'C:\\private\\data.wav'}, {sourceLabel:'secret/path.blend'},
    {tool:'node /run'}, {rawAudio:'base64blob'},
    {warnings:['bad\nprompt']},{kind:'unknown'},
  ]){
    assert.throws(()=>normalizeAudit({...blenderReport(),...mutation}),AuditInputError);
  }
  const invalid=blenderReport();
  invalid.facts.objects[1].name=invalid.facts.objects[0].name;
  assert.throws(()=>normalizeAudit(invalid),/Duplicate Blender object/);
  const oversized=blenderReport();
  oversized.facts.objects=Array.from({length:129},(_,i)=>({...oversized.facts.objects[0],name:'object'+i}));
  assert.throws(()=>normalizeAudit(oversized),AuditInputError);
});

test('WAV report rejects inconsistent signal readings and channel lengths',()=>{
  assert.equal(normalizeAudit(wavReport()).facts.channelPeaks[0],.999969);
  const bad=wavReport();bad.facts.overallPeak=.2;
  assert.throws(()=>normalizeAudit(bad),/Inconsistent peak/);
  const bad2=wavReport();bad2.facts.clipPercent=[];
  assert.throws(()=>normalizeAudit(bad2),AuditInputError);
});

test('CLI WAV inspector creates an explicit JSON report and refuses overwrites',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'lazy-artifact-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  const file=join(dir,'original.wav'),out=join(dir,'check.json');
  await writeFile(file,pcm16([0,32767,-32768,0]));
  const response=execFileSync(process.execPath,[script,'wav',file,'--out',out],{encoding:'utf8'});
  assert.match(response,/Created/);
  const report=JSON.parse(await readFile(out,'utf8'));
  assert.equal(report.sourceLabel,'original.wav');assert.equal(report.kind,'wav');
  assert.equal(report.facts.overallPeak,1);
  assert.ok(!JSON.stringify(report).includes(dir));
  assert.throws(()=>execFileSync(process.execPath,[script,'wav',file,'--out',out],{stdio:'pipe'}));
  const raw=execFileSync(process.execPath,[script,'wav',file],{encoding:'utf8'});
  assert.equal(JSON.parse(raw).kind,'wav');
});

test('MCP imports user-submitted audit, allows compare, and never marks quality passed',()=>{
  const state=new DevKitState();
  const a=rpc(state,'lazydev_record_artifact_audit',blenderReport());
  assert.equal(a.kind,'blender');
  const updated=blenderReport();
  updated.facts.objects[0].vertexCount=40;updated.facts.vertexCount=72;
  const b=rpc(state,'lazydev_record_artifact_audit',updated);
  const cmp=rpc(state,'lazydev_compare_artifact_audits',{beforeId:a.auditId,afterId:b.auditId});
  assert.equal(cmp.changes.vertexCountDifference,16);
  assert.deepEqual(cmp.changes.changed,['Roof']);
  assert.ok(cmp.warning.includes('No art'));
  assert.equal(rpc(state,'lazydev_list_artifact_audits').length,2);
  const audit=rpc(state,'lazydev_read_artifact_audit',{auditId:a.auditId});
  assert.equal(audit.qualityVerdict,'not_assessed');
  const plan=state.createCompetencyPlan({task:'Build house mesh',disciplines:['modeling','building']});
  const review=state.assessCompetencyPlan({planId:plan.planId,evidence:[
    {gateId:'modeling:authoring-data',kind:'blender-audit',id:a.auditId},
    {gateId:'building:authoring-data',kind:'blender-audit',id:a.auditId},
  ]});
  assert.equal(review.gates.find(x=>x.gateId==='modeling:authoring-data').evidenceStatus,'ready_for_review');
  assert.equal(review.gates.find(x=>x.gateId==='building:authoring-data').qualityVerdict,'not_assessed');
  assert.ok(review.gates.find(x=>x.gateId==='modeling:silhouette').evidenceStatus==='evidence_missing');
  assert.equal(review.overallVerdict,'not_assessed');
});

test('conditional Blender/WAV gates do not punish Studio-only or non-WAV tasks',()=>{
  const state=new DevKitState();
  const plan=state.createCompetencyPlan({task:'Animation and sound',disciplines:['animation','sfx']});
  const review=state.assessCompetencyPlan({planId:plan.planId,evidence:[]});
  assert.equal(review.gates.find(x=>x.gateId==='animation:authoring-data').evidenceStatus,'conditional_unverified');
  assert.equal(review.gates.find(x=>x.gateId==='sfx:signal').evidenceStatus,'conditional_unverified');
  assert.equal(review.gates.find(x=>x.gateId==='sfx:mix').evidenceStatus,'instrumentation_unavailable');
  assert.equal(review.overallVerdict,'not_assessed');
});

test('audit store expires old runs, forbids mismatched sources or types, and validates changes',()=>{
  const store=new ArtifactAuditStore();
  const a=store.record(wavReport());
  const newer=wavReport(.5);newer.facts.channelPeaks=[.5];
  const b=store.record(newer);
  const diff=store.compare({beforeId:a.auditId,afterId:b.auditId});
  assert.equal(diff.changes.compatible,true);
  assert.ok(diff.changes.channelPeakDifferences[0]<0);
  assert.throws(()=>store.compare({beforeId:a.auditId,afterId:store.record(blenderReport()).auditId}),AuditInputError);
  const spoof=wavReport();spoof.sourceLabel='new.wav';
  assert.throws(()=>store.compare({beforeId:a.auditId,afterId:store.record(spoof).auditId}),AuditInputError);
  for(let i=0;i<22;i++)store.record(wavReport());
  assert.equal(store.list().length,20);
  assert.throws(()=>store.read(a.auditId),/expired/);
});

test('HTTP audit importer requires bearer auth and rejects browser origin and fake payload',async t=>{
  const state=new DevKitState();
  const {server,token}=createStudioServer(state,{token:'a'.repeat(64)});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const url='http://127.0.0.1:'+server.address().port+'/v1/artifacts/import';
  const send=(data,headers={})=>fetch(url,{method:'POST',headers:{
    'Content-Type':'application/json',...headers},body:JSON.stringify(data)});
  assert.equal((await send(wavReport())).status,401);
  assert.equal((await send(wavReport(),{Authorization:'Bearer '+token,Origin:'https://evil.invalid'})).status,403);
  assert.equal((await send({schema:'fake',kind:'wav'}, {Authorization:'Bearer '+token})).status,400);
  const response=await send(wavReport(),{Authorization:'Bearer '+token});
  assert.equal(response.status,201);
  const saved=await response.json();
  assert.equal(state.readArtifactAudit(saved.auditId).kind,'wav');
  assert.equal(state.readArtifactAudit(saved.auditId).verification,'not_independently_verified');
});

test('local import sends only normalized metadata after explicit file selection',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'lazy-artifact-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  const f=join(dir,'report.json');
  await writeFile(f,JSON.stringify(wavReport()));
  let request;
  const result=await importAuditFile([f],{
    readSessionFn:()=>({port:43187,token:'fake-token'}),
    post:async(url,args)=>{
      request={url,...args};
      return {ok:true,json:async()=>({auditId:'ok'})};
    },
  });
  assert.equal(result.auditId,'ok');
  assert.match(request.url,/127\.0\.0\.1/);
  const payload=JSON.parse(request.body);
  assert.ok(!('provenance' in payload));
  assert.ok(!request.body.includes(dir));
  assert.equal(payload.kind,'wav');
});
