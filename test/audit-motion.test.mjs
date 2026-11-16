import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyzeMotionCues } from '../src/motion-cues.mjs';
import { analyzePixels, ReferenceStore } from '../src/references.mjs';
import { SequenceStore } from '../src/sequences.mjs';
import { encodeRgbaPng } from '../src/viewport.mjs';

const sample=(changedSampleFraction,offsetMs)=>({changedSampleFraction,offsetMs});
const gif=Buffer.from('R0lGODlhAgABAIEAAP8AAAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQICAAAACwAAAAAAgABAAAIBQABAAgIACH5BAgQAAAALAAAAAACAAEAgQAA/wAAAAAAAAAAAAgFAAEACAgAOw==','base64');

test('transparent RGB changes cannot masquerade as visible motion',()=>{
  const a=Buffer.from([255,0,0,0, 0,0,0,0]);
  const b=Buffer.from([0,0,255,0, 255,255,255,0]);
  const invisible=analyzePixels(b,2,1,a);
  assert.equal(invisible.changedSampleFraction,0);
  assert.equal(invisible.luminanceMean,0);
  assert.equal(invisible.alphaCoverage,0);
  const opaqueA=Buffer.from([255,0,0,255,0,0,0,255]);
  const opaqueB=Buffer.from([0,0,255,255,0,0,0,255]);
  assert.equal(analyzePixels(opaqueB,2,1,opaqueA).changedSampleFraction,0.5);
});

test('candidate visual change onset, peak and possible settle are only pixel cues',()=>{
  const frames=[
    sample(null,0),sample(0.02,150),sample(0.24,330),
    sample(0.92,570),sample(0.01,1200),sample(0,1700),
  ];
  const cues=analyzeMotionCues(frames);
  assert.equal(cues.status,'visible_change_detected');
  assert.equal(cues.candidateOnset.frameIndex,2);
  assert.equal(cues.candidatePeakChange.frameIndex,3);
  assert.equal(cues.candidatePeakChange.changedSampleFraction,0.92);
  assert.equal(cues.candidateQuietAfterPeak.frameIndex,4);
  assert.equal(cues.confidence,'very_limited_samples');
  assert.equal(cues.cadence.minIntervalMs,150);
  assert.equal(cues.cadence.maxIntervalMs,630);
  assert.match(cues.interpretation,/NOT detected semantic/);
});

test('static frames, sparse samples and zero-delay GIFs do not invent impact/velocity',()=>{
  const same=analyzeMotionCues([
    sample(null,0),sample(0,0),sample(0,0),sample(0,40),
  ]);
  assert.equal(same.status,'no_significant_change_in_samples');
  assert.equal(same.candidateOnset,null);
  assert.equal(same.candidatePeakChange,null);
  assert.equal(same.candidateQuietAfterPeak,null);
  assert.equal(same.cadence.minIntervalMs,0);
  const zero=analyzeMotionCues([{atMs:0,changedSampleFraction:null},
    {atMs:0,changedSampleFraction:0.7}],{timeKey:'atMs'});
  assert.equal(zero.candidatePeakChange.changedFractionPerSecond,null);
  assert.equal(analyzeMotionCues([]).status,'no_frames');
  assert.throws(()=>analyzeMotionCues([{offsetMs:0},{offsetMs:-10,changedSampleFraction:0.5}]),TypeError);
  assert.throws(()=>analyzeMotionCues([{offsetMs:0},{offsetMs:10,changedSampleFraction:1.2}]),TypeError);
  assert.throws(()=>analyzeMotionCues([{offsetMs:0}],{timeKey:'other'}),TypeError);
});

test('reference GIF and sampled Studio sequence expose matching bounded cue evidence',()=>{
  const refs=new ReferenceStore(),seqs=new SequenceStore();
  const ref=refs.ingest(gif,{label:'Two-frame impact',mediaType:'image/gif'});
  const refEvidence=refs.read(ref.referenceId).analysis.motionEvidence;
  assert.equal(refEvidence.candidatePeakChange.frameIndex,1);
  const pixelA=Buffer.from([200,0,0,255,200,0,0,255]);
  const pixelB=Buffer.from([0,0,220,255,0,0,220,255]);
  const meta=seqs.inspect({width:2,height:1,
    offsetsMs:[0,150,500],
    pixels:Buffer.concat([pixelA,pixelB,pixelB]),
    capturedTimestamp:Math.floor(Date.now()/1000),
  });
  const read=seqs.read(meta.sequenceId);
  assert.equal(read.analysis.motionEvidence.candidatePeakChange.frameIndex,1);
  assert.equal(read.analysis.motionEvidence.candidateQuietAfterPeak.frameIndex,2);
  assert.equal(read.analysis.verdict,'not_assessed');
  const compare=seqs.compare(refs,ref.referenceId,meta.sequenceId);
  assert.equal(compare.sequenceMotionEvidence.candidatePeakChange.frameIndex,1);
  assert.equal(compare.referenceMotionEvidence.candidatePeakChange.frameIndex,1);
  assert.equal(compare.qualityVerdict,'not_assessed');
});

test('Studio source-level contract: cancellation is not reset after permission prompt',()=>{
  // This is a static regression check. It does NOT prove actual Studio UI
  // or a functioning screenshot permission prompt on a real installation.
  const code=readFileSync(new URL('../studio/LAZYDevKit.plugin.lua',import.meta.url),'utf8');
  const start=code.indexOf('sequenceCaptureButton.MouseButton1Click:Connect');
  const end=code.indexOf('sequencePreviousButton.MouseButton1Click:Connect',start);
  assert.ok(start>=0&&end>start);
  const scope=code.slice(start,end);
  const reset=scope.indexOf('sequenceCancel = false');
  const prompt=scope.indexOf('StudioCaptureService:RequestScreenshotPermissionAsync()');
  const cancelled=scope.indexOf('if sequenceCancel then',prompt);
  const recording=scope.indexOf('sequenceRecording = true');
  assert.ok(reset>=0&&reset<prompt,'Cancellation reset must happen before yielding for permission');
  assert.ok(prompt<cancelled&&cancelled<recording,'Cancellation must be checked before recording');
  assert.equal(scope.slice(prompt).includes('sequenceCancel = false'),false,
    'Never re-arm a capture after the user cancelled while permission was pending');
  assert.equal((scope.match(/waitForCapture\(capture, function\(\) return sequenceCancel end\)/g)||[]).length,2);
  assert.ok(code.includes('if shouldCancel and shouldCancel() then error("Sequence capture cancelled") end'));
});
