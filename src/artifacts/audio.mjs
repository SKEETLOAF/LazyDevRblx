// Offline WAV facts only. No audio is played or uploaded.
export const WAV_MAX_BYTES=32*1024*1024;
export class AudioInputError extends Error{
  constructor(message){super(message);this.name='AudioInputError';}
}
const fail=m=>{throw new AudioInputError(m);};
const rounded=x=>Number(x.toFixed(6));
export function analyzeWav(bytes){
  if(!Buffer.isBuffer(bytes)||bytes.length<44||bytes.length>WAV_MAX_BYTES)fail('Expected a WAV file within 32 MiB');
  if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE')fail('Only little-endian RIFF/WAVE is supported');
  const riffSize=bytes.readUInt32LE(4)+8;
  if(riffSize>bytes.length||riffSize<44)fail('Invalid RIFF declared size');
  let cursor=12,fmt=null,pcm=null,chunkCount=0;
  while(cursor+8<=riffSize){
    if(++chunkCount>512)fail('Excessive WAV chunks');
    const kind=bytes.toString('ascii',cursor,cursor+4);
    const size=bytes.readUInt32LE(cursor+4);
    const start=cursor+8,end=start+size;
    if(end>riffSize||end<start)fail('Chunk exceeds WAV boundary');
    if(kind==='fmt '){
      if(fmt||size<16)fail('Invalid or duplicate format chunk');
      const code=bytes.readUInt16LE(start);
      const channels=bytes.readUInt16LE(start+2);
      const sampleRate=bytes.readUInt32LE(start+4);
      const byteRate=bytes.readUInt32LE(start+8);
      const blockAlign=bytes.readUInt16LE(start+12);
      const bits=bytes.readUInt16LE(start+14);
      const allowed=code===1?[8,16,24,32]:code===3?[32,64]:[];
      if(!allowed.includes(bits)||channels<1||channels>8||sampleRate<8000||sampleRate>384000||
        blockAlign!==channels*(bits/8)||byteRate!==sampleRate*blockAlign)fail('Unsupported or inconsistent uncompressed PCM/float WAV format');
      fmt={encoding:code===1?'PCM':'IEEE_FLOAT',channels,sampleRate,bits,blockAlign};
    }
    if(kind==='data'){
      if(pcm)fail('Multiple data chunks are unsupported');
      pcm={start,size};
    }
    cursor=end+(size&1);
  }
  if(!fmt||!pcm||pcm.size===0||pcm.size%fmt.blockAlign!==0)fail('Missing or unaligned audio payload');
  const frames=pcm.size/fmt.blockAlign;
  if(frames>fmt.sampleRate*600)fail('WAV exceeds ten-minute inspection limit');
  const peak=Array(fmt.channels).fill(0),sum=Array(fmt.channels).fill(0),
    dc=Array(fmt.channels).fill(0),clipped=Array(fmt.channels).fill(0);
  const depth=fmt.bits/8;
  for(let frame=0;frame<frames;frame++)for(let c=0;c<fmt.channels;c++){
    const i=pcm.start+frame*fmt.blockAlign+c*depth;
    let v=0;
    if(fmt.encoding==='IEEE_FLOAT'){
      v=fmt.bits===32?bytes.readFloatLE(i):bytes.readDoubleLE(i);
      if(!Number.isFinite(v))fail('Non-finite floating point sample');
    }else if(fmt.bits===8)v=(bytes[i]-128)/128;
    else if(fmt.bits===16)v=bytes.readInt16LE(i)/32768;
    else if(fmt.bits===24){
      const x=bytes[i]|(bytes[i+1]<<8)|(bytes[i+2]<<16);
      v=(x&0x800000?x-0x1000000:x)/8388608;
    }else v=bytes.readInt32LE(i)/2147483648;
    const a=Math.abs(v);
    peak[c]=Math.max(peak[c],a);
    sum[c]+=v*v;dc[c]+=v;
    if(a>=0.999)clipped[c]++;
  }
  const channelPeaks=peak.map(rounded),channelRms=sum.map(x=>rounded(Math.sqrt(x/frames)));
  const channelDc=dc.map(x=>rounded(x/frames));
  const clipPercent=clipped.map(x=>rounded(x*100/frames));
  const warnings=[];
  if(clipped.some(x=>x>0))warnings.push('Samples near or above full-scale detected; investigate potential clipping with listening and a waveform editor.');
  if(channelDc.some(x=>Math.abs(x)>0.01))warnings.push('DC offset above 1% of full scale detected.');
  if(peak.every(x=>x<0.001))warnings.push('Audio appears nearly silent by signal amplitude.');
  return {
    encoding:fmt.encoding,channels:fmt.channels,sampleRate:fmt.sampleRate,bitDepth:fmt.bits,
    frames,durationSeconds:rounded(frames/fmt.sampleRate),
    channelPeaks,channelRms,channelDc,clipPercent,
    overallPeak:rounded(Math.max(...peak)),warnings,
  };
}
