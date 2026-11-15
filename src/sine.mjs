import { randomUUID } from 'node:crypto';

// Read-only evidence about Sine's *planted runtime*, never its editor UI.
// The public shared.sv API is registered when the client requires the runtime;
// no Sine functions are invoked by this bridge.
const MAX_OBSERVATIONS = 20;
const MAX_TAGS = 16;
const MAX_TAG_BYTES = 80;
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
export class SineInputError extends Error {
  constructor(message, status=400) { super(message); this.status=status; }
}
function bad(message) { throw new SineInputError(message); }
function exact(o, keys) {
  if (!object(o) || Object.keys(o).sort().join(',') !== [...keys].sort().join(',')) {
    bad('Unexpected Sine inspection fields');
  }
}
function validString(v,max,{empty=false}={}) {
  return typeof v === 'string' && (empty || v.trim().length>0) &&
    Buffer.byteLength(v,'utf8') <= max;
}

export function normalizeSineInspection(input) {
  exact(input, ['kind','runtimeClass','selection']);
  if(input.kind !== 'sine_runtime') bad('Expected Sine runtime inspection');
  if(!validString(input.runtimeClass,80)) bad('Invalid Sine runtime class');
  exact(input.selection, ['present','path','className','tags','tagsTruncated','propertiesFolder']);
  const s=input.selection;
  if (typeof s.present !== 'boolean' || typeof s.tagsTruncated !== 'boolean' ||
      typeof s.propertiesFolder !== 'boolean') bad('Invalid Sine selection flags');
  if (!Array.isArray(s.tags) || s.tags.length > MAX_TAGS) bad('Too many selected Instance tags');
  if (!s.tags.every(v => validString(v,MAX_TAG_BYTES)) ||
      new Set(s.tags).size !== s.tags.length) bad('Invalid or duplicate Instance tag');
  if (s.present) {
    if (!validString(s.path,600) || !validString(s.className,80)) {
      bad('Selected Instance path or class invalid');
    }
  } else if (s.path !== '' || s.className !== '' || s.tags.length !== 0 ||
             s.tagsTruncated || s.propertiesFolder) {
    bad('Unselected Sine report must contain no object evidence');
  }
  return {
    kind:'sine_runtime',
    runtimePath:'ReplicatedStorage.SineVFX',
    runtimeClass:input.runtimeClass,
    runtimeStatus:input.runtimeClass==='none' ? 'missing' :
      input.runtimeClass==='ModuleScript' ? 'module_present' : 'wrong_class',
    selection:{
      present:s.present,path:s.path,className:s.className,
      tags:[...s.tags],tagsTruncated:s.tagsTruncated,
      propertiesFolder:s.propertiesFolder,
    },
  };
}
export class SineStore {
  constructor(){this.observations=new Map();}
  inspect(input) {
    const normalized=normalizeSineInspection(input);
    const report={sineId:randomUUID(),capturedAt:new Date().toISOString(),...normalized};
    this.observations.set(report.sineId,report);
    while(this.observations.size>MAX_OBSERVATIONS) {
      this.observations.delete(this.observations.keys().next().value);
    }
    return this.metadata(report);
  }
  metadata(r) {
    return {
      sineId:r.sineId,kind:r.kind,capturedAt:r.capturedAt,
      runtimePath:r.runtimePath,runtimeStatus:r.runtimeStatus,
      selectedPath:r.selection.present?r.selection.path:null,
      tagCount:r.selection.tags.length,tagsTruncated:r.selection.tagsTruncated,
      propertiesFolder:r.selection.propertiesFolder,
      editorApiStatus:'not_inspected',
    };
  }
  list(){return [...this.observations.values()].map(r=>this.metadata(r));}
  read(id) {
    const r=this.observations.get(id);
    if(!r) throw new SineInputError('Sine inspection missing or expired',404);
    return {
      ...this.metadata(r),
      runtimeClass:r.runtimeClass,
      selection:{
        ...r.selection,tags:[...r.selection.tags],
      },
      guidance:{
        runtimeUsage:'Use require(game.ReplicatedStorage.SineVFX) from a client LocalScript, then call VFX.emit(target), VFX.enable(target), or VFX.disable(target).',
        statusMeaning:'Module presence does not prove that selected objects are Sine effects, that the module is current, or that any effect renders.',
        authoring:'Sine authoring tools and plugin windows have NOT been controlled; shared.sv is a client runtime convenience, not a documented editor automation API.',
      },
    };
  }
}
