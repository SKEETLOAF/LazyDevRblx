import {createHash,randomUUID} from 'node:crypto';
export const AUDIT_SCHEMA='lazydev.creative_audit.v1';
const MAX_RECORDS=20;
const isObj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
export class AuditInputError extends Error{
  constructor(message,status=400){super(message);this.status=status;this.name='AuditInputError';}
}
const bad=m=>{throw new AuditInputError(m);};
function keys(value,allowed,context){
  if(!isObj(value)||Object.keys(value).some(x=>!allowed.includes(x)))bad('Unexpected '+context+' fields');
}
function label(value,context,max=160){
  if(typeof value!=='string'||!value.trim()||Buffer.byteLength(value,'utf8')>max||
    /[\u0000-\u001f\u007f]/u.test(value))bad('Invalid '+context);
  return value.trim();
}
const number=(n,k,max=1e12)=>{
  if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>max)bad('Invalid '+k);
  return n;
};
const count=(n,k,max=1e12)=>{
  number(n,k,max);if(!Number.isSafeInteger(n))bad('Invalid integer '+k);
  return n;
};
function timestamp(s){
  label(s,'generatedAt',50);
  const d=new Date(s);
  if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(s)||
      !Number.isFinite(d.getTime())||d.toISOString().slice(0,19)!==s.slice(0,19))bad('Invalid timestamp');
  return s;
}
function list(v,n,labelName,max=128,mapper=x=>x){
  if(!Array.isArray(v)||v.length>max||v.length!==n)bad('Invalid '+labelName+' count');
  return v.map(mapper);
}
function wavFacts(f){
  keys(f,['encoding','channels','sampleRate','bitDepth','frames','durationSeconds',
    'channelPeaks','channelRms','channelDc','clipPercent','overallPeak'],'WAV facts');
  if(!['PCM','IEEE_FLOAT'].includes(f.encoding))bad('Invalid encoding');
  const channels=count(f.channels,'channels',8);
  if(channels<1)bad('No audio channels');
  const rate=count(f.sampleRate,'sampleRate',384000);
  if(rate<8000)bad('Invalid sample rate');
  const bits=count(f.bitDepth,'bitDepth',64);
  if(!((f.encoding==='PCM'&&[8,16,24,32].includes(bits))||
    (f.encoding==='IEEE_FLOAT'&&[32,64].includes(bits))))bad('Invalid audio bit depth');
  const frames=count(f.frames,'frames',rate*600);
  if(frames<1||Math.abs(frames/rate-number(f.durationSeconds,'durationSeconds',600))>0.00001)bad('Inconsistent duration');
  const bounded=(key,max)=>list(f[key],channels,key,8,x=>number(x,key,max));
  const channelPeaks=bounded('channelPeaks',10),channelRms=bounded('channelRms',10),
    clipPercent=bounded('clipPercent',100);
  const channelDc=list(f.channelDc,channels,'channelDc',8,x=>{
    if(typeof x!=='number'||!Number.isFinite(x)||Math.abs(x)>10)bad('Invalid channelDc');
    return x;
  });
  const overallPeak=number(f.overallPeak,'overallPeak',10);
  if(Math.abs(Math.max(...channelPeaks)-overallPeak)>0.00001)bad('Inconsistent peak');
  return {encoding:f.encoding,channels,sampleRate:rate,bitDepth:bits,frames,
    durationSeconds:f.durationSeconds,channelPeaks,channelRms,channelDc,clipPercent,overallPeak};
}
function blenderFacts(f){
  keys(f,['blenderVersion','objectCount','meshCount','vertexCount','faceCount',
    'armatureCount','actionCount','objects','truncated'],'Blender facts');
  const blenderVersion=label(f.blenderVersion,'blenderVersion',60);
  const objectCount=count(f.objectCount,'objectCount',10000000);
  const meshCount=count(f.meshCount,'meshCount',objectCount);
  const vertexCount=count(f.vertexCount,'vertexCount',1000000000);
  const faceCount=count(f.faceCount,'faceCount',1000000000);
  const armatureCount=count(f.armatureCount,'armatureCount',objectCount);
  const actionCount=count(f.actionCount,'actionCount',1000000);
  if(typeof f.truncated!=='boolean')bad('Invalid truncated marker');
  if(!Array.isArray(f.objects)||f.objects.length>128||
      (!f.truncated&&f.objects.length!==objectCount)||
      (f.truncated&&f.objects.length>=objectCount))bad('Inconsistent object count');
  const objects=f.objects.map(o=>{
    keys(o,['name','type','parent','collections','vertexCount','faceCount','uvLayers','materialSlots','modifierTypes','armatureBones','actionName'],'Blender object');
    const name=label(o.name,'object name',160);
    const type=label(o.type,'object type',40);
    const parent=o.parent===null?null:label(o.parent,'object parent',160);
    if(!Array.isArray(o.collections)||o.collections.length>20)bad('Invalid object collections');
    const collections=o.collections.map(x=>label(x,'collection name',160));
    if(new Set(collections).size!==collections.length)bad('Duplicate collection');
    const v=count(o.vertexCount,'object vertexCount',1000000000);
    const faces=count(o.faceCount,'object faceCount',1000000000);
    const uvLayers=count(o.uvLayers,'uvLayers',1024);
    const materialSlots=count(o.materialSlots,'materialSlots',1024);
    const armatureBones=count(o.armatureBones,'armatureBones',1000000);
    if(!Array.isArray(o.modifierTypes)||o.modifierTypes.length>64)bad('Invalid modifiers');
    const modifierTypes=o.modifierTypes.map(x=>label(x,'modifier type',40));
    const actionName=o.actionName===null?null:label(o.actionName,'actionName',160);
    return {name,type,parent,collections,vertexCount:v,faceCount:faces,uvLayers,materialSlots,modifierTypes,armatureBones,actionName};
  });
  if(new Set(objects.map(x=>x.name)).size!==objects.length)bad('Duplicate Blender object');
  return {blenderVersion,objectCount,meshCount,vertexCount,faceCount,armatureCount,actionCount,objects,truncated:f.truncated};
}
export function normalizeAudit(input){
  keys(input,['schema','kind','sourceLabel','generatedAt','tool','facts','warnings'],'audit');
  if(input.schema!==AUDIT_SCHEMA)bad('Unknown audit schema');
  const kind=input.kind;
  if(!['wav','blender'].includes(kind))bad('Invalid audit kind');
  const sourceLabel=label(input.sourceLabel,'sourceLabel',120);
  if(sourceLabel.includes('/')||sourceLabel.includes('\\')||sourceLabel==='.'||sourceLabel==='..')bad('Source label must be basename only');
  const generatedAt=timestamp(input.generatedAt);
  if(typeof input.tool!=='string'||input.tool!==('lazydev.'+kind+'-inspector.v1'))bad('Unknown audit producer');
  const facts=kind==='wav'?wavFacts(input.facts):blenderFacts(input.facts);
  if(!Array.isArray(input.warnings)||input.warnings.length>12)bad('Invalid warnings list');
  const warnings=input.warnings.map(x=>label(x,'warning',400));
  return {
    schema:AUDIT_SCHEMA,kind,sourceLabel,generatedAt,tool:input.tool,facts,warnings,
    provenance:'user_submitted_local_tool_report',
    verification:'not_independently_verified',
    qualityVerdict:'not_assessed',
  };
}
function compareWav(a,b){
  if(a.channels!==b.channels||a.sampleRate!==b.sampleRate||a.encoding!==b.encoding)
    return {compatible:false,reason:'Channel count, rate or format differs; numeric channel comparison withheld'};
  return {
    compatible:true,
    durationDifferenceSeconds:Number((b.durationSeconds-a.durationSeconds).toFixed(6)),
    channelPeakDifferences:b.channelPeaks.map((n,i)=>Number((n-a.channelPeaks[i]).toFixed(6))),
    channelRmsDifferences:b.channelRms.map((n,i)=>Number((n-a.channelRms[i]).toFixed(6))),
  };
}
function compareBlender(a,b){
  const before=new Map(a.objects.map(x=>[x.name,x]));
  const after=new Map(b.objects.map(x=>[x.name,x]));
  const added=[...after.keys()].filter(n=>!before.has(n));
  const removed=[...before.keys()].filter(n=>!after.has(n));
  const changed=[...after.keys()].filter(n=>before.has(n)).filter(n=>{
    return JSON.stringify(before.get(n))!==JSON.stringify(after.get(n));
  });
  return {
    objectCountDifference:b.objectCount-a.objectCount,
    vertexCountDifference:b.vertexCount-a.vertexCount,
    faceCountDifference:b.faceCount-a.faceCount,
    objectChangesIncomplete:a.truncated||b.truncated,
    added:added.slice(0,128),removed:removed.slice(0,128),changed:changed.slice(0,128),
    note:'Object names are identifiers, not stable GUIDs; rename is reported as remove+add.',
  };
}
export class ArtifactAuditStore{
  constructor(){this.items=new Map();}
  record(input){
    const data=normalizeAudit(input);
    const canonical=JSON.stringify(data);
    const item={
      auditId:randomUUID(),receivedAt:new Date().toISOString(),
      sha256:createHash('sha256').update(canonical).digest('hex'),
      ...data,
    };
    this.items.set(item.auditId,item);
    while(this.items.size>MAX_RECORDS)this.items.delete(this.items.keys().next().value);
    return this.metadata(item);
  }
  metadata(item){
    const {auditId,kind,sourceLabel,generatedAt,receivedAt,sha256,provenance,verification,qualityVerdict}=item;
    return {auditId,kind,sourceLabel,generatedAt,receivedAt,sha256,provenance,verification,qualityVerdict};
  }
  list(){return [...this.items.values()].map(x=>this.metadata(x));}
  read(id){
    if(typeof id!=='string'||id.length>100)bad('Invalid auditId');
    const item=this.items.get(id);
    if(!item)throw new AuditInputError('Audit missing or expired',404);
    return structuredClone(item);
  }
  compare({beforeId,afterId}={}){
    const a=this.read(beforeId),b=this.read(afterId);
    if(a.kind!==b.kind)bad('Audit kinds differ');
    if(a.sourceLabel!==b.sourceLabel)bad('Source labels differ; comparison requires same named artifact');
    return {
      beforeId,afterId,kind:a.kind,sourceLabel:a.sourceLabel,
      changes:a.kind==='wav'?compareWav(a.facts,b.facts):compareBlender(a.facts,b.facts),
      warning:'Observed metadata difference only. No art, rig, mix, animation or gameplay quality is scored.',
    };
  }
}
