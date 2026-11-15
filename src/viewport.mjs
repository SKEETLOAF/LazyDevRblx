import { createHash, randomUUID } from 'node:crypto';
import { deflateSync } from 'node:zlib';

// The Studio plugin shares only one explicitly approved downscaled 3D
// viewport frame. No screenshots of other windows, video or automatic polling.
export const VIEWPORT_MAX_WIDTH = 480;
export const VIEWPORT_MAX_HEIGHT = 300;
export const VIEWPORT_MAX_PIXELS = VIEWPORT_MAX_WIDTH * VIEWPORT_MAX_HEIGHT;
export const VIEWPORT_MAX_BYTES = VIEWPORT_MAX_PIXELS * 4;
const RETAIN = 4;

export class ViewportInputError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
function invalid(message) { throw new ViewportInputError(message); }
function dim(value, name, max) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > max) {
    invalid('Invalid viewport ' + name);
  }
  return value;
}

const CRC_TABLE = Uint32Array.from({length:256}, (_,i) => {
  let c=i;
  for(let j=0;j<8;j++) c=(c&1) ? (0xedb88320^(c>>>1)) : (c>>>1);
  return c>>>0;
});
function crc32(bytes) {
  let crc=0xffffffff;
  for (const b of bytes) crc=CRC_TABLE[(crc^b)&255] ^ (crc>>>8);
  return (crc^0xffffffff)>>>0;
}
function chunk(name, contents) {
  const type=Buffer.from(name,'ascii');
  const header=Buffer.alloc(4);
  header.writeUInt32BE(contents.length,0);
  const checksum=Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([type,contents])),0);
  return Buffer.concat([header,type,contents,checksum]);
}

export function encodeRgbaPng(pixels, width, height) {
  dim(width,'width',VIEWPORT_MAX_WIDTH);
  dim(height,'height',VIEWPORT_MAX_HEIGHT);
  if(width*height>VIEWPORT_MAX_PIXELS) invalid('Viewport is too large');
  if(!Buffer.isBuffer(pixels) || pixels.length!==width*height*4) {
    invalid('Expected exactly four RGBA bytes per pixel');
  }
  const stride=width*4;
  const rows=Buffer.alloc((stride+1)*height);
  for(let y=0;y<height;y++) {
    const offset=y*(stride+1);
    rows[offset]=0; // PNG scanline filter: None
    pixels.copy(rows,offset+1,y*stride,(y+1)*stride);
  }
  const ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(width,0);
  ihdr.writeUInt32BE(height,4);
  ihdr[8]=8; // 8-bit
  ihdr[9]=6; // RGBA
  const png=Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR',ihdr),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0)),
  ]);
  return png;
}

export class ViewportStore {
  constructor() { this.frames=new Map(); }
  inspect({pixels,width,height,capturedTimestamp=Math.floor(Date.now()/1000)}) {
    const now=Math.floor(Date.now()/1000);
    if(!Number.isInteger(capturedTimestamp) ||
       capturedTimestamp < now-24*60*60 || capturedTimestamp > now+60) {
      invalid('Invalid or excessively old capture timestamp');
    }
    const png=encodeRgbaPng(pixels,width,height);
    const item={
      viewportId:randomUUID(),kind:'studio_3d_viewport',width,height,
      capturedAt:new Date(capturedTimestamp*1000).toISOString(),
      receivedAt:new Date().toISOString(),sha256:createHash('sha256').update(png).digest('hex'),
      bytes:png.length, png,
    };
    this.frames.set(item.viewportId,item);
    while(this.frames.size>RETAIN) this.frames.delete(this.frames.keys().next().value);
    return this.metadata(item);
  }
  metadata({png,...rest}) { return {...rest}; }
  list() { return [...this.frames.values()].map(v=>this.metadata(v)); }
  read(id) {
    const item=this.frames.get(id);
    if(!item) throw new ViewportInputError('Viewport capture missing or expired',404);
    return {metadata:this.metadata(item),png:Buffer.from(item.png)};
  }
}
