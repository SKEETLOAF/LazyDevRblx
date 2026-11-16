// Frame-derived *candidate* temporal cues only. Not semantic recognition.
// Pixel changes can arise from camera movement, UI, lighting, or compression.
const round=n=>Math.round(n*10000)/10000;
const ONSET=0.08;
const QUIET=0.025;

export function analyzeMotionCues(frames,{timeKey='offsetMs'}={}) {
  if (!Array.isArray(frames) || !['offsetMs','atMs'].includes(timeKey)) {
    throw new TypeError('Motion cue analysis requires frames and an allowed time key');
  }
  if (!frames.length) {
    return {status:'no_frames',candidateOnset:null,candidatePeakChange:null,
      candidateQuietAfterPeak:null,transitionCount:0,
      interpretation:'No frames; cannot infer movement or events.'};
  }
  const transitions=[];
  for(let i=1;i<frames.length;i++){
    const now=frames[i],prev=frames[i-1];
    const ms=now[timeKey]-prev[timeKey];
    const fraction=now.changedSampleFraction;
    if (!Number.isFinite(ms)||ms<0 ||
        typeof fraction!=='number'||!Number.isFinite(fraction)||fraction<0||fraction>1) {
      throw new TypeError('Invalid motion cue frame timing or changed-pixel metric');
    }
    transitions.push({
      frameIndex:i,atMs:now[timeKey],durationSincePreviousMs:ms,
      changedSampleFraction:fraction,
      changedFractionPerSecond:ms>0?round(fraction*1000/ms):null,
    });
  }
  const significant=transitions.filter(x=>x.changedSampleFraction>=ONSET);
  const peak=transitions.reduce((best,curr)=>
    !best||curr.changedSampleFraction>best.changedSampleFraction?curr:best,null);
  const onset=significant[0]??null;
  const quiet=peak&&peak.changedSampleFraction>=ONSET ?
    transitions.find(x=>x.frameIndex>peak.frameIndex&&x.changedSampleFraction<=QUIET)??null:null;
  const chosen=significant.length>0 ? 'visible_change_detected' : 'no_significant_change_in_samples';
  return {
    status:chosen,
    transitionCount:transitions.length,
    significantTransitionCount:significant.length,
    candidateOnset:onset,
    candidatePeakChange:peak&&peak.changedSampleFraction>=ONSET?peak:null,
    candidateQuietAfterPeak:quiet,
    thresholds:{onsetChangedFraction:ONSET,quietChangedFraction:QUIET},
    cadence:transitions.length?{
      minIntervalMs:Math.min(...transitions.map(x=>x.durationSincePreviousMs)),
      maxIntervalMs:Math.max(...transitions.map(x=>x.durationSincePreviousMs)),
      meanIntervalMs:round(transitions.reduce((s,x)=>s+x.durationSincePreviousMs,0)/transitions.length),
      timingQuality:'observed_request_or_encoded_delay_not_verified_playback',
    }:null,
    confidence:frames.length<8?'very_limited_samples':'pixel_evidence_only',
    interpretation:'Onset, peak and quiet are thresholded pixel-change candidates, NOT detected semantic buildup, impact, pose, or recovery. Camera/UI/lighting changes and variable delays can dominate. No artistic score.',
  };
}
