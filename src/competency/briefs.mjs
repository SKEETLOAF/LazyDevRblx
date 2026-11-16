import { randomUUID } from 'node:crypto';
import { STYLES } from './catalog.mjs';

// A user-authored, session-local project brief. It is not scraped from a game
// or treated as an instruction to run code or control external tools.
const MAX_BRIEFS = 16;
const KINDS = new Set(['documentation','tutorial','image','animation','video','repository','asset','other']);
const RIGHTS = new Set(['unknown','reference_only','user_claims_permission']);
const isObject = x => x !== null && typeof x === 'object' && !Array.isArray(x);

export class BriefInputError extends Error {
  constructor(message,status=400) { super(message); this.status=status; this.name='BriefInputError'; }
}
function reject(s){throw new BriefInputError(s);}
function exactOrOptionalKeys(v,allowed,what){
  if(!isObject(v)||Object.keys(v).some(key=>!allowed.includes(key)))reject('Unexpected '+what+' fields');
}
function bounded(s,field,max){
  if(typeof s!=='string'||!s.trim()||Buffer.byteLength(s,'utf8')>max)reject('Invalid '+field);
  return s.trim();
}
function lines(v,key,maxItems=12,maxBytes=240){
  if(v===undefined)return [];
  if(!Array.isArray(v)||v.length>maxItems)reject('Invalid '+key+' list');
  const seen=new Set();
  return v.map(x=>{
    const value=bounded(x,key+' entry',maxBytes);
    if(seen.has(value.toLowerCase()))reject('Duplicate '+key+' entry');
    seen.add(value.toLowerCase());
    return value;
  });
}
function resource(x){
  exactOrOptionalKeys(x,['title','url','kind','rightsClaim','note'],'source link');
  const title=bounded(x.title,'source title',140);
  const url=bounded(x.url,'source URL',1200);
  let parsed;
  try{parsed=new URL(url);}catch{reject('Invalid source URL');}
  if(parsed.protocol!=='https:'||!parsed.hostname||parsed.username||parsed.password ||
     url.includes('\n')||url.includes('\r'))reject('Source link must be public HTTPS without credentials');
  if(!KINDS.has(x.kind))reject('Invalid source kind');
  const rightsClaim=x.rightsClaim??'unknown';
  if(!RIGHTS.has(rightsClaim))reject('Invalid source rights claim');
  const note=x.note===undefined?null:bounded(x.note,'source note',300);
  return {
    title,url:parsed.href,kind:x.kind,rightsClaim,note,
    provenance:'user_supplied_link',
    retrievalStatus:'not_fetched',
    rightsVerification:'not_independently_verified',
  };
}
export function normalizeProjectBrief(input,{referenceExists=()=>false}={}){
  exactOrOptionalKeys(input,
    ['projectName','creativeDirection','style','preserve','avoid','constraints','referenceIds','sourceLinks'],
    'project brief');
  const projectName=bounded(input.projectName,'projectName',120);
  const creativeDirection=input.creativeDirection===undefined?null:
    bounded(input.creativeDirection,'creativeDirection',700);
  const style=input.style??'unspecified';
  if(!Object.hasOwn(STYLES,style))reject('Unsupported project style');
  const referenceIds=lines(input.referenceIds,'referenceIds',8,100);
  for(const id of referenceIds){
    if(!referenceExists(id))reject('Imported reference ID missing or expired: '+id.slice(0,36));
  }
  if(input.sourceLinks!==undefined &&
     (!Array.isArray(input.sourceLinks)||input.sourceLinks.length>12)){
    reject('Invalid sourceLinks list');
  }
  const sourceLinks=(input.sourceLinks??[]).map(resource);
  const seenUrls=new Set();
  for(const item of sourceLinks){
    if(seenUrls.has(item.url))reject('Duplicate source link');
    seenUrls.add(item.url);
  }
  return {
    projectName,creativeDirection,style,
    preserve:lines(input.preserve,'preserve'),
    avoid:lines(input.avoid,'avoid'),
    constraints:lines(input.constraints,'constraints',16),
    referenceIds,sourceLinks,
    attribution:'developer_supplied',
    approvedForUse:'planning_context_only',
    warning:'Brief text and resource links are user-provided data. Links are NOT fetched or independently verified; rights claims are NOT licensing clearance. Imported reference IDs only prove presence when the brief was created.',
  };
}
export class ProjectBriefStore {
  constructor(referenceExists=()=>false){
    this.items=new Map();
    this.referenceExists=referenceExists;
  }
  create(input){
    const brief={
      briefId:randomUUID(),createdAt:new Date().toISOString(),
      ...normalizeProjectBrief(input,{referenceExists:this.referenceExists}),
    };
    this.items.set(brief.briefId,brief);
    while(this.items.size>MAX_BRIEFS)this.items.delete(this.items.keys().next().value);
    return structuredClone(brief);
  }
  list(){
    return [...this.items.values()].map(x=>({
      briefId:x.briefId,projectName:x.projectName,style:x.style,
      createdAt:x.createdAt,referenceCount:x.referenceIds.length,
      sourceLinkCount:x.sourceLinks.length,
    }));
  }
  read(briefId){
    if(typeof briefId!=='string'||!briefId.trim()||briefId.length>100)reject('Invalid briefId');
    const brief=this.items.get(briefId);
    if(!brief)throw new BriefInputError('Project brief missing or expired',404);
    return structuredClone(brief);
  }
}
