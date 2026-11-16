import { randomUUID } from 'node:crypto';
import { decodeReference, ReferenceMediaError } from './reference-media.mjs';
import { encodeRgbaPng } from './viewport.mjs';
import { analyzeMotionCues } from './motion-cues.mjs';

const LIMIT = 6;
const MAX_LABEL_BYTES = 100;
const rnd = (x) => Math.round(x * 10000) / 10000;
export class ReferenceInputError extends Error {
  constructor(message, status=400){super(message);this.status=status;}
}
function fail(message){throw new ReferenceInputError(message);}
function scalePixels(src,width,height,limitWidth=480,limitHeight=300) {
  const scale=Math.min(1,limitWidth/width,limitHeight/height);
  const outWidth=Math.max(1,Math.floor(width*scale));
  const outHeight=Math.max(1,Math.floor(height*scale));
  const result=Buffer.alloc(outWidth*outHeight*4);
  for(let y=0;y<outHeight;y++)for(let x=0;x<outWidth;x++){
    const sx=Math.min(width-1,Math.floor((x+0.5)*width/outWidth));
    const sy=Math.min(height-1,Math.floor((y+0.5)*height/outHeight));
    src.copy(result,(y*outWidth+x)*4,(sy*width+sx)*4,(sy*width+sx)*4+4);
  }
  return {pixels:result,width:outWidth,height:outHeight};
}
const labelValid = v => typeof v === 'string' && v.trim().length>0 &&
  Buffer.byteLength(v,'utf8')<=MAX_LABEL_BYTES && !/[\u0000-\u001f\u007f]/u.test(v);

export function analyzePixels(pixels,width,height,previous=null) {
  // Evaluate fixed spatial samples, not a fabricated aesthetic score.
  // Sampling lets GIF analysis remain bounded even with hundreds of frames.
  const gridW=Math.min(width,64),gridH=Math.min(height,64);
  const luma=new Float64Array(gridW*gridH),vis=new Float64Array(gridW*gridH);
  const palette=new Map(), cells=Array.from({length:9},()=>({sum:0,count:0}));
  let sum=0,sum2=0,saturation=0,visible=0,changes=0,compareCount=0;
  for(let y=0;y<gridH;y++)for(let x=0;x<gridW;x++){
    const sx=Math.min(width-1,Math.floor((x+0.5)*width/gridW));
    const sy=Math.min(height-1,Math.floor((y+0.5)*height/gridH));
    const i=(sy*width+sx)*4,k=y*gridW+x;
    const a=pixels[i+3]/255;
    const r=pixels[i]/255,g=pixels[i+1]/255,b=pixels[i+2]/255;
    const Y=(0.2126*r+0.7152*g+0.0722*b)*a;
    luma[k]=Y;vis[k]=a;
    sum+=Y;sum2+=Y*Y;visible+=a;
    const mx=Math.max(r,g,b),mn=Math.min(r,g,b);
    saturation+=(mx===0?0:(mx-mn)/mx)*a;
    const key=[r,g,b].map(t=>Math.min(255,Math.floor(t*255/32)*32)).join(',');
    palette.set(key,(palette.get(key)||0)+a);
    const cell=Math.min(2,Math.floor(y*3/gridH))*3+Math.min(2,Math.floor(x*3/gridW));
    cells[cell].sum+=Y;cells[cell].count++;
    if(previous){
      const p=previous[i+3]/255;
      // Compare visible premultiplied RGB. Fully transparent pixels may
      // contain arbitrary hidden colors, which cannot be counted as motion.
      const diff=(Math.abs(pixels[i]*a-previous[i]*p)+
        Math.abs(pixels[i+1]*a-previous[i+1]*p)+
        Math.abs(pixels[i+2]*a-previous[i+2]*p))/(3*255);
      if(Math.abs(a-p)>0.15 || diff>0.15)changes++;
      compareCount++;
    }
  }
  let edges=0,tests=0;
  for(let y=0;y<gridH;y++)for(let x=0;x<gridW;x++){
    const k=y*gridW+x;
    if(x+1<gridW){if(Math.abs(luma[k]-luma[k+1])>0.12)edges++;tests++;}
    if(y+1<gridH){if(Math.abs(luma[k]-luma[k+gridW])>0.12)edges++;tests++;}
  }
  const n=gridW*gridH,mean=sum/n;
  return {
    luminanceMean:rnd(mean),luminanceStdDev:rnd(Math.sqrt(Math.max(0,sum2/n-mean*mean))),
    saturationMean:rnd(saturation/n),alphaCoverage:rnd(visible/n),
    edgeFraction:rnd(tests?edges/tests:0),
    // 3×3 cell means are measurable layout proxies, not object recognition.
    luminanceGrid3x3:cells.map(c=>rnd(c.count?c.sum/c.count:0)),
    paletteTop5:[...palette.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5)
      .map(([rgb,weight])=>({rgb8:rgb.split(',').map(Number),sampleFraction:rnd(weight/n)})),
    changedSampleFraction:previous?rnd(changes/compareCount):null,
  };
}
function describeMedia(decoded,buffer){
  const n=decoded.frames.length;
  const frames=[];
  const samples=[];
  let previous=null,peakChange=null,totalMs=0;
  for(let i=0;i<n;i++){
    const f=decoded.frames[i];
    const m=analyzePixels(f.pixels,decoded.width,decoded.height,previous);
    const data={index:i,atMs:f.timeMs,durationMs:f.durationMs,...m};
    frames.push(data);
    totalMs+=f.durationMs;
    if(i>0 && (peakChange===null||m.changedSampleFraction>peakChange.changeFraction)){
      peakChange={frameIndex:i,atMs:f.timeMs,changeFraction:m.changedSampleFraction};
    }
    previous=f.pixels;
  }
  if(n>0){
    const sampleIndices=n<=3?Array.from({length:n},(_,i)=>i):
      [...new Set([0,peakChange?.frameIndex??Math.floor((n-1)/2),n-1])].sort((a,b)=>a-b);
    for(const i of sampleIndices){
      const scaled=scalePixels(decoded.frames[i].pixels,decoded.width,decoded.height);
      samples.push({frameIndex:i,atMs:decoded.frames[i].timeMs,width:scaled.width,height:scaled.height,
        mimeType:'image/png',bytes:encodeRgbaPng(scaled.pixels,scaled.width,scaled.height)});
    }
  }
  if(n===0){samples.push({frameIndex:0,atMs:0,width:decoded.width,height:decoded.height,
    mimeType:`image/${decoded.format==='jpeg'?'jpeg':'webp'}`,bytes:Buffer.from(buffer)});}
  return {
    format:decoded.format,width:decoded.width,height:decoded.height,sha256:decoded.sha256,
    frameCount:n||1,loopCount:decoded.loopCount,totalDurationMs:n?totalMs:null,
    quantitativeAvailable:n>0,frames,peakChange,samples,
    limitations:n===0?
      'JPEG/WebP pixel metrics are not computed in this dependency-free version. The actual image is returned for model visual inspection.':
      'Palette, contrast, saturation, edges, and frame changes are spatial-sample proxies, not aesthetic scores or source reconstruction.',
  };
}

export class ReferenceStore {
  constructor(){this.references=new Map();}
  ingest(bytes,{label,mediaType}={}) {
    if(!labelValid(label))fail('Reference label must be 1-100 UTF-8 bytes with no control characters');
    try {
      const decoded=decodeReference(bytes,mediaType);
      const content=describeMedia(decoded,bytes);
      const item={referenceId:randomUUID(),label,importedAt:new Date().toISOString(),
        ...content};
      this.references.set(item.referenceId,item);
      while(this.references.size>LIMIT)this.references.delete(this.references.keys().next().value);
      return this.metadata(item);
    }catch(error){
      if(error instanceof ReferenceMediaError)throw new ReferenceInputError(error.message,error.status);
      throw error;
    }
  }
  metadata(item){
    const {referenceId,label,importedAt,format,width,height,frameCount,loopCount,
      totalDurationMs,sha256,quantitativeAvailable,limitations}=item;
    return {referenceId,label,importedAt,format,width,height,frameCount,
      loopCount,totalDurationMs,sha256,quantitativeAvailable,limitations};
  }
  list(){return [...this.references.values()].map(item=>this.metadata(item));}
  get(id){const r=this.references.get(id);
    if(!r)throw new ReferenceInputError('Reference not found or expired',404);
    return r;
  }
  read(id){
    const r=this.get(id);
    return {metadata:this.metadata(r),
      analysis:{
        frameMetrics:r.frames,peakVisualChange:r.peakChange,
        motionEvidence:r.quantitativeAvailable?analyzeMotionCues(r.frames,{timeKey:'atMs'}):null,
        keyframeIndices:r.samples.map(s=>s.frameIndex),
        qualityDimensions:['silhouette/readability','color hierarchy','motion timing','impact and anticipation','effect layering','camera/context','performance'],
        qualityAssessment:'not_assessed',
        referenceDeconstruction:'Measured color/contrast/timing and returned keyframe images support qualitative decomposition by a vision-capable AI. The original rigs, particle systems and source files cannot be recovered from pixels.',
      },
      images:r.samples.map(s=>({...s,bytes:Buffer.from(s.bytes)})),
    };
  }
  compare(referenceId,viewportId,viewportStore,{frameIndex=null}={}){
    const r=this.get(referenceId);
    if(!r.quantitativeAvailable)throw new ReferenceInputError('Pixel comparison requires a PNG or decoded GIF reference',409);
    if(frameIndex!==null && (!Number.isInteger(frameIndex)||frameIndex<0||frameIndex>=r.frames.length)){
      fail('Invalid reference frameIndex');
    }
    const frame=r.frames[frameIndex??(r.peakChange?.frameIndex??0)];
    const viewport=viewportStore.read(viewportId);
    const pixels=decodeReference(viewport.png,'image/png');
    const v=analyzePixels(pixels.frames[0].pixels,pixels.width,pixels.height);
    const fields=['luminanceMean','luminanceStdDev','saturationMean','alphaCoverage','edgeFraction'];
    const delta=Object.fromEntries(fields.map(key=>[key,rnd(v[key]-frame[key])]));
    return {
      referenceId,viewportId,referenceFrameIndex:frame.index,
      referenceSize:{width:r.width,height:r.height},
      viewportSize:{width:pixels.width,height:pixels.height},
      referenceMeasurements:Object.fromEntries(fields.map(k=>[k,frame[k]])),
      viewportMeasurements:Object.fromEntries(fields.map(k=>[k,v[k]])),
      viewportMinusReference:delta,
      comparisonMode:'summary_statistics_only',
      qualityVerdict:'not_assessed',
      warning:'No camera, subject, frame timing, or spatial alignment was established. Metric differences do not score visual quality or prove reference fidelity. Review both images and art direction manually.',
    };
  }
}
