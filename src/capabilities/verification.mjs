import { CAPABILITIES } from './registry.mjs';
const known=new Set(CAPABILITIES.map(x=>x.id));
export class VerificationInputError extends Error{
  constructor(message){super(message);this.name='VerificationInputError';}
}
const bad=m=>{throw new VerificationInputError(m);};
const isObj=o=>o!==null&&typeof o==='object'&&!Array.isArray(o);
const text=(s,label,max)=>{if(typeof s!=='string'||!s.trim()||s.length>max)bad('Invalid '+label);return s.trim();};
export function normalizeVerificationRecord(input){
  const keys=['capabilityId','result','testedCommit','studioBuild','os','host','hostVersion','observedAt','evidencePaths','notes'];
  if(!isObj(input)||Object.keys(input).some(k=>!keys.includes(k)))bad('Unexpected fields');
  const capabilityId=text(input.capabilityId,'capabilityId',100);
  if(!known.has(capabilityId))bad('Unknown capabilityId');
  const result=text(input.result,'result',20);
  if(!['pass','fail','blocked','inconclusive'].includes(result))bad('Invalid result');
  const testedCommit=text(input.testedCommit,'testedCommit',40);
  if(!/^[a-f0-9]{40}$/.test(testedCommit))bad('Commit must be full SHA-1');
  const studioBuild=text(input.studioBuild,'studioBuild',100);
  const os=text(input.os,'os',100);
  const host=text(input.host,'host',100);
  const hostVersion=text(input.hostVersion,'hostVersion',100);
  const observedAt=text(input.observedAt,'observedAt',40);
  const date=new Date(observedAt);
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(observedAt)||
      !Number.isFinite(date.getTime())||date.toISOString().slice(0,19)!==observedAt.slice(0,19))bad('Invalid observedAt');
  if(!Array.isArray(input.evidencePaths)||input.evidencePaths.length<1||input.evidencePaths.length>12)bad('Evidence paths required');
  const evidencePaths=input.evidencePaths.map(x=>{
    const value=text(x,'evidencePath',240);
    if(!/^docs\/verification\/evidence\/[A-Za-z0-9._/-]+$/.test(value)||
       value.split('/').some(p=>p==='..'||p==='.')||value.endsWith('/'))bad('Invalid relative evidence path');
    return value;
  });
  if(new Set(evidencePaths).size!==evidencePaths.length)bad('Duplicate evidence path');
  return {capabilityId,result,testedCommit,studioBuild,os,host,hostVersion,observedAt,evidencePaths,
    notes:input.notes===undefined?null:text(input.notes,'notes',500),
    assertion:'user_supplied_unreviewed',reviewStatus:'pending_human_review',
    versionBoundStudioVerified:false,
    warning:'Schema validation does not examine evidence files or prove execution in Studio; a reviewer must verify each artifact separately.',
  };
}
