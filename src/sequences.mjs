import { createHash, randomUUID } from 'node:crypto';
import { encodeRgbaPng } from './viewport.mjs';
import { analyzePixels } from './references.mjs';
import { analyzeMotionCues } from './motion-cues.mjs';

// A small, user-triggered series of viewport snapshots, not live video.
// Each frame is inspected locally before one explicit upload.
export const SEQUENCE_MAX_WIDTH = 240;
export const SEQUENCE_MAX_HEIGHT = 160;
export const SEQUENCE_MIN_FRAMES = 2;
export const SEQUENCE_MAX_FRAMES = 6;
export const SEQUENCE_MAX_BYTES = SEQUENCE_MAX_WIDTH * SEQUENCE_MAX_HEIGHT * 4 * SEQUENCE_MAX_FRAMES;
const RETAIN = 3;
const metricKeys = ['luminanceMean','luminanceStdDev','saturationMean','alphaCoverage','edgeFraction'];
const round = n => Math.round(n * 10000) / 10000;

export class SequenceInputError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
function invalid(message) { throw new SequenceInputError(message); }
function validInt(n, min, max) { return Number.isInteger(n) && n >= min && n <= max; }
function checkInput({width,height,pixels,offsetsMs,capturedTimestamp}) {
  const now = Math.floor(Date.now() / 1000);
  if (!validInt(width,1,SEQUENCE_MAX_WIDTH) || !validInt(height,1,SEQUENCE_MAX_HEIGHT)) {
    invalid('Invalid sequence frame dimensions');
  }
  if (!Array.isArray(offsetsMs) ||
      offsetsMs.length < SEQUENCE_MIN_FRAMES || offsetsMs.length > SEQUENCE_MAX_FRAMES ||
      offsetsMs[0] !== 0) invalid('Sequence requires 2-6 frames and a zero initial offset');
  for (let i = 1; i < offsetsMs.length; i++) {
    if (!validInt(offsetsMs[i],1,30000) || offsetsMs[i] <= offsetsMs[i-1]) {
      invalid('Sequence frame offsets must be strictly increasing milliseconds, up to 30s');
    }
  }
  if (!Buffer.isBuffer(pixels) || pixels.length !== width*height*4*offsetsMs.length ||
      pixels.length > SEQUENCE_MAX_BYTES) invalid('Incorrect RGBA sequence byte count');
  if (!validInt(capturedTimestamp, now-86400, now+60)) {
    invalid('Sequence capture timestamp missing, invalid or more than 24h old');
  }
}

function deltaMetrics(a,b) {
  return Object.fromEntries(metricKeys.map(k=>[k,round(a[k]-b[k])]));
}

export class SequenceStore {
  constructor() { this.items = new Map(); }
  inspect(input) {
    checkInput(input);
    const {width,height,pixels,offsetsMs,capturedTimestamp} = input;
    const bytesPerFrame = width * height * 4;
    let previous = null;
    let peakChange = null;
    const frames = [];
    for (let i = 0; i < offsetsMs.length; i++) {
      const current = Buffer.from(pixels.subarray(i*bytesPerFrame,(i+1)*bytesPerFrame));
      const measurements = analyzePixels(current,width,height,previous);
      const png = encodeRgbaPng(current,width,height);
      frames.push({
        index:i,offsetMs:offsetsMs[i],width,height,
        sha256:createHash('sha256').update(png).digest('hex'),
        ...measurements,png,
      });
      if (i > 0 && (peakChange === null || measurements.changedSampleFraction > peakChange.changedSampleFraction)) {
        peakChange = {frameIndex:i,offsetMs:offsetsMs[i],
          changedSampleFraction:measurements.changedSampleFraction};
      }
      previous = current;
    }
    const item = {
      sequenceId:randomUUID(),kind:'studio_viewport_sequence',width,height,
      capturedAt:new Date(capturedTimestamp*1000).toISOString(),
      receivedAt:new Date().toISOString(),
      durationMs:offsetsMs.at(-1),frameCount:frames.length,
      nominalSampling:'sequential_user_started',peakChange,frames,
    };
    this.items.set(item.sequenceId,item);
    while(this.items.size>RETAIN)this.items.delete(this.items.keys().next().value);
    return this.metadata(item);
  }
  metadata(item) {
    return {
      sequenceId:item.sequenceId,kind:item.kind,width:item.width,height:item.height,
      capturedAt:item.capturedAt,receivedAt:item.receivedAt,
      durationMs:item.durationMs,frameCount:item.frameCount,
      nominalSampling:item.nominalSampling,peakChange:item.peakChange,
      verdict:'not_assessed',timingNote:'Captured sequentially; offsets are observed clock times, not guaranteed fixed-FPS playback or synchronized reference frames.',
    };
  }
  list() { return [...this.items.values()].map(x=>this.metadata(x)); }
  get(id) {
    const x=this.items.get(id);
    if (!x) throw new SequenceInputError('Viewport sequence missing or expired',404);
    return x;
  }
  read(id) {
    const item=this.get(id);
    const sampleIndices=[...new Set([0,item.peakChange?.frameIndex??0,item.frameCount-1])].sort((a,b)=>a-b);
    const motionEvidence=analyzeMotionCues(item.frames);
    return {
      metadata:this.metadata(item),
      analysis:{
        frames:item.frames.map(({png,...frame})=>({...frame})),
        keyframeIndices:sampleIndices,peakVisualChange:item.peakChange,
        motionEvidence,
        verdict:'not_assessed',
        limitations:'Sampled viewport frames are not video or continuous motion capture. Visual change may reflect camera movement, particles, UI, or scene changes; no animation-quality verdict is inferred.',
      },
      images:sampleIndices.map(i=>({
        frameIndex:i,offsetMs:item.frames[i].offsetMs,
        mimeType:'image/png',bytes:Buffer.from(item.frames[i].png),
      })),
    };
  }
  compare(referenceStore,referenceId,sequenceId) {
    const seq=this.get(sequenceId);
    const ref=referenceStore.get(referenceId);
    if (!ref.quantitativeAvailable || ref.frames.length===0) {
      throw new SequenceInputError('Temporal comparison requires a decoded PNG or GIF reference',409);
    }
    const refLastMs=ref.frames.at(-1).atMs;
    const matches=seq.frames.map(frame=>{
      const normalized=seq.durationMs > 0 ? frame.offsetMs/seq.durationMs : 0;
      const targetMs=normalized*refLastMs;
      const match=ref.frames.reduce((best,current)=>
        Math.abs(current.atMs-targetMs)<Math.abs(best.atMs-targetMs)?current:best,ref.frames[0]);
      return {
        sequenceFrameIndex:frame.index,sequenceOffsetMs:frame.offsetMs,
        normalizedProgress:round(normalized),
        referenceFrameIndex:match.index,referenceAtMs:match.atMs,
        referenceSize:{width:ref.width,height:ref.height},
        referenceMeasurements:Object.fromEntries(metricKeys.map(k=>[k,match[k]])),
        sequenceMeasurements:Object.fromEntries(metricKeys.map(k=>[k,frame[k]])),
        sequenceMinusReference:deltaMetrics(frame,match),
      };
    });
    const sequenceMotionEvidence=analyzeMotionCues(seq.frames);
    const referenceMotionEvidence=analyzeMotionCues(ref.frames,{timeKey:'atMs'});
    return {
      sequenceId,referenceId,sequenceMotionEvidence,referenceMotionEvidence,comparisonMode:'normalized_time_nearest_reference_frame_unaligned_summary_statistics',
      referenceDurationMs:ref.totalDurationMs,sequenceDurationMs:seq.durationMs,
      referencePeak:ref.peakChange,sequencePeak:seq.peakChange,
      matches,qualityVerdict:'not_assessed',
      warning:'Both sequences are sampled and aligned only by normalized elapsed time, not motion events, subject pose, camera, lighting, or color space. Measurements do not establish visual fidelity, artistic quality or gameplay correctness.',
    };
  }
}
