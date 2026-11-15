import { inflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';

export const MEDIA_MAX_BYTES = 8 * 1024 * 1024;
export const MEDIA_MAX_WIDTH = 1024;
export const MEDIA_MAX_HEIGHT = 1024;
export const GIF_MAX_FRAMES = 180;
export const GIF_MAX_TOTAL_PIXELS = 18_000_000;

export class ReferenceMediaError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const bad = message => { throw new ReferenceMediaError(message); };
const fixedSize = (width,height) => {
  if (!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||
    width>MEDIA_MAX_WIDTH||height>MEDIA_MAX_HEIGHT||width*height>320_000) {
    bad('Reference dimensions exceed decode budget (maximum 320,000 pixels and 1024 per side)');
  }
};

const SIG_PNG = Buffer.from('89504e470d0a1a0a','hex');
function png(buffer) {
  if (buffer.length<33 || !buffer.subarray(0,8).equals(SIG_PNG)) bad('Invalid PNG');
  let offset=8, width, height, depth, colorType, interlace, compressed=[], palette=null, transparency=null;
  let seenIhdr=false, seenEnd=false;
  while(offset+12<=buffer.length) {
    const length=buffer.readUInt32BE(offset);
    const end=offset+12+length;
    if(end>buffer.length || length>MEDIA_MAX_BYTES) bad('Malformed PNG chunk');
    const type=buffer.toString('ascii',offset+4,offset+8);
    const body=buffer.subarray(offset+8,offset+8+length);
    if(type==='IHDR') {
      if(seenIhdr || length!==13) bad('Malformed PNG IHDR');
      seenIhdr=true; width=body.readUInt32BE(0);height=body.readUInt32BE(4);
      fixedSize(width,height);
      depth=body[8];colorType=body[9];interlace=body[12];
      if(depth!==8 || ![0,2,3,4,6].includes(colorType) || body[10]!==0 || body[11]!==0 || interlace!==0) {
        bad('PNG bit depth, color, compression or interlacing not yet supported');
      }
    } else if(type==='PLTE') { palette=Buffer.from(body); }
    else if(type==='tRNS') { transparency=Buffer.from(body); }
    else if(type==='IDAT') { compressed.push(body); }
    else if(type==='IEND') {seenEnd=true;break;}
    offset=end;
  }
  if(!seenIhdr||!seenEnd||!compressed.length)bad('Incomplete PNG');
  const channels=({0:1,2:3,3:1,4:2,6:4})[colorType];
  const stride=width*channels;
  let inflated;
  try {inflated=inflateSync(Buffer.concat(compressed),{maxOutputLength:(stride+1)*height});}
  catch {bad('Invalid or oversized PNG image data');}
  if(inflated.length!==(stride+1)*height)bad('Wrong PNG decompressed byte count');
  if(colorType===3&&(!palette||palette.length%3!==0||palette.length>768))bad('Indexed PNG palette invalid');
  const pixelRows=Buffer.alloc(stride*height);
  for(let y=0;y<height;y++) {
    const rowOffset=y*(stride+1),f=inflated[rowOffset],dst=y*stride;
    if(f>4)bad('Unsupported PNG filter');
    for(let x=0;x<stride;x++) {
      const value=inflated[rowOffset+1+x];
      const a=x<channels?0:pixelRows[dst+x-channels];
      const b=y===0?0:pixelRows[dst-stride+x];
      const c=y===0||x<channels?0:pixelRows[dst-stride+x-channels];
      let p=0;
      if(f===1)p=a;
      if(f===2)p=b;
      if(f===3)p=Math.floor((a+b)/2);
      if(f===4){const pred=a+b-c;const da=Math.abs(pred-a),db=Math.abs(pred-b),dc=Math.abs(pred-c);
        p=da<=db&&da<=dc?a:db<=dc?b:c;}
      pixelRows[dst+x]=(value+p)&255;
    }
  }
  const rgba=Buffer.alloc(width*height*4);
  for(let i=0;i<width*height;i++){
    const s=i*channels,d=i*4;
    if(colorType===0)rgba.set([pixelRows[s],pixelRows[s],pixelRows[s],255],d);
    else if(colorType===2)rgba.set([pixelRows[s],pixelRows[s+1],pixelRows[s+2],255],d);
    else if(colorType===3){const ix=pixelRows[s],col=ix*3;if(col+2>=palette.length)bad('PNG palette index out of range');
      rgba.set([palette[col],palette[col+1],palette[col+2],transparency?.[ix]??255],d);}
    else if(colorType===4)rgba.set([pixelRows[s],pixelRows[s],pixelRows[s],pixelRows[s+1]],d);
    else rgba.set(pixelRows.subarray(s,s+4),d);
  }
  return {format:'png',width,height,frames:[{pixels:rgba,timeMs:0,durationMs:0}],loopCount:null};
}

function gifLzw(bytes, minSize, targetCount) {
  if(minSize<2||minSize>8)bad('Invalid GIF LZW code size');
  let bit=0, codeSize=minSize+1, next=(1<<minSize)+2;
  const clear=1<<minSize,end=clear+1, table=new Array(4096);
  const reset=()=>{codeSize=minSize+1;next=end+1;for(let i=0;i<clear;i++)table[i]=[i];};
  const read=()=>{if(bit+codeSize>bytes.length*8)return null;let n=0;
    for(let j=0;j<codeSize;j++)n|=((bytes[(bit+j)>>3]>>((bit+j)&7))&1)<<j;
    bit+=codeSize;return n;};
  reset();const output=Buffer.alloc(targetCount);let prev=null,used=0,safety=0;
  while(used<targetCount) {
    if(++safety>targetCount*3+4096)bad('GIF LZW operation limit exceeded');
    const code=read();if(code===null)bad('Truncated GIF pixel data');
    if(code===clear){reset();prev=null;continue;}
    if(code===end)break;
    let seq=code<next&&table[code]?table[code]:null;
    if(!seq&&code===next&&prev)seq=[...prev,prev[0]];
    if(!seq)bad('Invalid GIF LZW code');
    if(seq.length>targetCount-used)bad('GIF LZW overflow');
    for(let i=0;i<seq.length;i++)output[used++]=seq[i];
    if(prev&&next<4096){table[next++]=[...prev,seq[0]];
      if(next===(1<<codeSize)&&codeSize<12)codeSize++;}
    prev=seq;
  }
  if(used!==targetCount)bad('GIF missing pixel indices');
  return output;
}
function gif(buffer) {
  if(buffer.length<13||!['GIF89a','GIF87a'].includes(buffer.toString('ascii',0,6)))bad('Invalid GIF');
  const width=buffer.readUInt16LE(6),height=buffer.readUInt16LE(8);fixedSize(width,height);
  let at=13;
  const packed=buffer[10];
  const globalSize=(packed&0x80)?3*(1<<((packed&7)+1)):0;
  if(at+globalSize>buffer.length)bad('Truncated GIF palette');
  const globalPalette=buffer.subarray(at,at+globalSize);at+=globalSize;
  const canvas=Buffer.alloc(width*height*4);
  const frames=[];
  let gce={delay:0,transparent:null,disposal:0};
  let previous=null,loopCount=null,totalPixels=0,timeMs=0;
  function blocks() {let parts=[];for(;;){if(at>=buffer.length)bad('Truncated GIF sub-blocks');
    const len=buffer[at++];if(!len)break;
    if(at+len>buffer.length)bad('Truncated GIF block');parts.push(buffer.subarray(at,at+len));at+=len;}
    return Buffer.concat(parts);}
  function applyPrevious(){if(!previous)return;
    if(previous.disposal===2){for(let y=previous.top;y<previous.top+previous.height;y++)for(let x=previous.left;x<previous.left+previous.width;x++) {
      canvas.fill(0,(y*width+x)*4,(y*width+x)*4+4);
    }} else if(previous.disposal===3 && previous.saved){previous.saved.copy(canvas);}
  }
  let terminated=false;
  while(at<buffer.length){const sep=buffer[at++];
    if(sep===0x3b){terminated=true;break;}
    if(sep===0x21) {
      if(at>=buffer.length)bad('Truncated GIF extension');const type=buffer[at++];
      if(type===0xf9){if(at+6>buffer.length||buffer[at++]!==4)bad('Invalid GIF graphic extension');
        const p=buffer[at++],delay=buffer.readUInt16LE(at);at+=2;const trans=buffer[at++];
        if(buffer[at++]!==0)bad('Malformed GIF graphic extension');
        gce={delay:delay*10,transparent:(p&1)?trans:null,disposal:(p>>2)&7};
      }else if(type===0xff){if(at>=buffer.length)bad('Truncated GIF app extension');
        const len=buffer[at++];if(at+len>buffer.length)bad('Invalid GIF app extension');
        const app=buffer.toString('ascii',at,at+len);at+=len;
        const data=blocks();if(app.startsWith('NETSCAPE')&&data.length>=3&&data[0]===1)loopCount=data.readUInt16LE(1);
      }else blocks();
      continue;
    }
    if(sep!==0x2c)bad('Unknown GIF block type');
    if(at+9>buffer.length)bad('Truncated GIF image descriptor');
    const left=buffer.readUInt16LE(at),top=buffer.readUInt16LE(at+2);
    const fw=buffer.readUInt16LE(at+4),fh=buffer.readUInt16LE(at+6),flags=buffer[at+8];at+=9;
    if(!fw||!fh||left+fw>width||top+fh>height)bad('GIF frame exceeds canvas');
    totalPixels+=width*height;
    if(frames.length>=GIF_MAX_FRAMES||totalPixels>GIF_MAX_TOTAL_PIXELS)bad('GIF animation decode budget exceeded');
    const paletteSize=(flags&0x80)?3*(1<<((flags&7)+1)):0;
    if(at+paletteSize>buffer.length)bad('Truncated local GIF palette');
    const palette=paletteSize?buffer.subarray(at,at+paletteSize):globalPalette;at+=paletteSize;
    if(palette.length===0)bad('GIF frame missing color table');
    if(at>=buffer.length)bad('Truncated GIF image data');
    const minSize=buffer[at++],encoded=blocks();
    const indices=gifLzw(encoded,minSize,fw*fh);
    applyPrevious();
    const saved=gce.disposal===3?Buffer.from(canvas):null;
    const rowOrder=[];
    if(flags&0x40){for(const [start,step] of [[0,8],[4,8],[2,4],[1,2]])for(let y=start;y<fh;y+=step)rowOrder.push(y);}
    else for(let y=0;y<fh;y++)rowOrder.push(y);
    for(let yi=0;yi<fh;yi++)for(let x=0;x<fw;x++) {
      const idx=indices[yi*fw+x];if(idx===gce.transparent)continue;
      const j=idx*3;if(j+2>=palette.length)bad('GIF color index exceeds palette');
      const target=((top+rowOrder[yi])*width+left+x)*4;
      canvas[target]=palette[j];canvas[target+1]=palette[j+1];canvas[target+2]=palette[j+2];canvas[target+3]=255;
    }
    frames.push({pixels:Buffer.from(canvas),timeMs,durationMs:gce.delay});
    timeMs+=gce.delay;
    previous={left,top,width:fw,height:fh,disposal:gce.disposal,saved};
    gce={delay:0,transparent:null,disposal:0};
  }
  if(!terminated||!frames.length)bad('Incomplete GIF image');
  return {format:'gif',width,height,frames,loopCount};
}

function jpeg(buffer) {
  if(buffer.length<4||buffer[0]!==0xff||buffer[1]!==0xd8)bad('Invalid JPEG');
  let p=2,width=null,height=null;
  while(p+4<=buffer.length){if(buffer[p++]!==0xff)bad('Malformed JPEG marker');
    while(buffer[p]===0xff)p++;
    const marker=buffer[p++];if(marker===0xd9||marker===0xda)break;
    if([0x01,...Array.from({length:8},(_,i)=>0xd0+i)].includes(marker))continue;
    if(p+2>buffer.length)bad('Incomplete JPEG segment');
    const n=buffer.readUInt16BE(p);if(n<2||p+n>buffer.length)bad('Malformed JPEG segment');
    if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)){
      if(n<7)bad('Malformed JPEG frame header');height=buffer.readUInt16BE(p+3);width=buffer.readUInt16BE(p+5);break;
    }
    p+=n;
  }
  if(width===null||height===null)bad('JPEG dimensions not available');fixedSize(width,height);
  return {format:'jpeg',width,height,frames:[],loopCount:null};
}
function webp(buffer) {
  if(buffer.length<30||buffer.toString('ascii',0,4)!=='RIFF'||buffer.toString('ascii',8,12)!=='WEBP')bad('Invalid WebP');
  const declared=buffer.readUInt32LE(4)+8;
  if(declared!==buffer.length)bad('WebP RIFF length mismatch');
  const type=buffer.toString('ascii',12,16);let width,height;
  if(type==='VP8X'){width=1+buffer[24]+(buffer[25]<<8)+(buffer[26]<<16);height=1+buffer[27]+(buffer[28]<<8)+(buffer[29]<<16);}
  else if(type==='VP8L'){const v=buffer.readUInt32LE(21);width=(v&16383)+1;height=((v>>14)&16383)+1;}
  else if(type==='VP8 '){if(buffer.toString('hex',23,26)!=='9d012a')bad('Malformed VP8 keyframe');
    width=buffer.readUInt16LE(26)&16383;height=buffer.readUInt16LE(28)&16383;}
  else bad('Unsupported WebP format');
  fixedSize(width,height);
  return {format:'webp',width,height,frames:[],loopCount:null};
}

export function decodeReference(input, mediaType) {
  if(!Buffer.isBuffer(input)||input.length<10||input.length>MEDIA_MAX_BYTES)bad('Reference file must be 10 bytes to 8 MiB');
  const decoded= input.subarray(0,8).equals(SIG_PNG)?png(input):
    ['GIF89a','GIF87a'].includes(input.toString('ascii',0,6))?gif(input):
    input[0]===0xff&&input[1]===0xd8?jpeg(input):
    input.toString('ascii',0,4)==='RIFF'?webp(input):bad('Only PNG, GIF, JPEG and WebP reference files are accepted');
  const types={png:'image/png',gif:'image/gif',jpeg:'image/jpeg',webp:'image/webp'};
  if(mediaType && mediaType!==types[decoded.format])bad('Reference MIME type does not match file signature');
  return {...decoded,sha256:createHash('sha256').update(input).digest('hex')};
}
