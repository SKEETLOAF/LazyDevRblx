import { REGION_MAX_BYTES } from './region-frames.mjs';

const SIG = Buffer.from('89504e470d0a1a0a', 'hex');
const PIPE_MAX_BYTES = REGION_MAX_BYTES * 2;

export class RegionPipeError extends Error {}

export class PngImagePipe {
  constructor() { this.pending = Buffer.alloc(0); }
  push(chunk) {
    if (!Buffer.isBuffer(chunk)) throw new RegionPipeError('Expected binary image pipe data');
    if (this.pending.length + chunk.length > PIPE_MAX_BYTES) {
      throw new RegionPipeError('Image pipe exceeded bounded memory');
    }
    this.pending = Buffer.concat([this.pending, chunk]);
    const frames = [];
    while (this.pending.length >= SIG.length) {
      if (!this.pending.subarray(0, 8).equals(SIG)) {
        throw new RegionPipeError('Unexpected data in PNG image pipe');
      }
      let pos = 8, sawIhdr = false, sawIdat = false, complete = false;
      while (this.pending.length >= pos + 8) {
        const length = this.pending.readUInt32BE(pos);
        if (length > REGION_MAX_BYTES || pos + length + 12 > REGION_MAX_BYTES) {
          throw new RegionPipeError('PNG pipe frame exceeds 2 MiB');
        }
        if (this.pending.length < pos + length + 12) break;
        const type = this.pending.toString('ascii', pos + 4, pos + 8);
        if (!sawIhdr && (type !== 'IHDR' || length !== 13)) {
          throw new RegionPipeError('PNG pipe missing IHDR');
        }
        if (type === 'IHDR') {
          if (sawIhdr) throw new RegionPipeError('Duplicate IHDR in PNG pipe');
          sawIhdr = true;
        }
        if (type === 'IDAT') sawIdat = true;
        pos += length + 12;
        if (type === 'IEND') {
          if (length !== 0 || !sawIdat) throw new RegionPipeError('Invalid PNG pipe terminator');
          const frame = Buffer.from(this.pending.subarray(0, pos));
          frames.push(frame);
          this.pending = this.pending.subarray(pos);
          complete = true;
          break;
        }
      }
      if (!complete) break;
    }
    return frames;
  }
  finish() {
    if (this.pending.length !== 0) throw new RegionPipeError('Incomplete trailing PNG frame');
  }
}

const usage = 'Usage: npm run observe:region -- --region X,Y,WIDTH,HEIGHT --share [--fps 1|2] [--seconds 10..300] [--ffmpeg executable]';
function integer(s) { return /^-?(?:0|[1-9]\d*)$/.test(s ?? '') ? Number(s) : NaN; }

export function parseRegionArgs(args) {
  const options = { fps: 1, seconds: 60, ffmpeg: 'ffmpeg', share: false };
  const seen = new Set();
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (!['--region','--fps','--seconds','--ffmpeg','--share'].includes(flag) || seen.has(flag)) {
      throw new Error(usage);
    }
    seen.add(flag);
    if (flag === '--share') { options.share = true; continue; }
    const value = args[++i];
    if (value === undefined) throw new Error(usage);
    if (flag === '--region') {
      const parts = value.split(',');
      if (parts.length !== 4 || parts.some(x => !Number.isSafeInteger(integer(x)))) {
        throw new Error('Region requires four whole numbers: X,Y,WIDTH,HEIGHT');
      }
      options.region = parts.map(integer);
    } else if (flag === '--fps') options.fps = integer(value);
    else if (flag === '--seconds') options.seconds = integer(value);
    else if (flag === '--ffmpeg') options.ffmpeg = value;
  }
  if (!options.share) throw new Error('Explicit --share required: authorized local MCP clients can read the captured screen region.');
  if (!options.region) throw new Error(usage);
  const [x, y, width, height] = options.region;
  if (Math.abs(x) > 8192 || Math.abs(y) > 8192 ||
      width < 64 || height < 64 || width > 2560 || height > 1440 ||
      width * height > 1920 * 1080) {
    throw new Error('Region bounds exceed capture limit (max input area 1920x1080)');
  }
  if (![1,2].includes(options.fps) || !Number.isInteger(options.seconds) ||
      options.seconds < 10 || options.seconds > 300) {
    throw new Error('Capture supports 1–2 fps and 10–300 seconds');
  }
  if (typeof options.ffmpeg !== 'string' || !options.ffmpeg.trim() || options.ffmpeg.includes('\0')) {
    throw new Error('Invalid FFmpeg executable path');
  }
  return options;
}

export function ffmpegRegionArgs(options) {
  const [x, y, width, height] = options.region;
  const scale = Math.min(1, 640 / width, 360 / height);
  const outW = Math.max(2, 2 * Math.floor(width * scale / 2));
  const outH = Math.max(2, 2 * Math.floor(height * scale / 2));
  return [
    '-hide_banner', '-loglevel', 'error', '-nostdin',
    '-f', 'gdigrab', '-draw_mouse', '0', '-show_region', '1',
    '-framerate', String(options.fps), '-offset_x', String(x), '-offset_y', String(y),
    '-video_size', width + 'x' + height, '-i', 'desktop',
    '-vf', 'scale=' + outW + ':' + outH + ':flags=fast_bilinear',
    '-frames:v', String(options.fps * options.seconds),
    '-pix_fmt', 'rgb24', '-c:v', 'png', '-f', 'image2pipe', 'pipe:1',
  ];
}
