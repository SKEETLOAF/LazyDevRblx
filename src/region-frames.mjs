import { createHash, randomUUID } from 'node:crypto';
import { decodeReference, ReferenceMediaError } from './reference-media.mjs';

export const REGION_MAX_WIDTH = 640;
export const REGION_MAX_HEIGHT = 360;
export const REGION_MAX_BYTES = 2 * 1024 * 1024;
export const REGION_RETAIN = 4;
export const REGION_TTL_MS = 30_000;

export class RegionFrameError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'RegionFrameError';
    this.status = status;
  }
}

const fail = (message, status) => { throw new RegionFrameError(message, status); };

export class RegionFrameStore {
  constructor({ clock = () => Date.now() } = {}) {
    this.frames = new Map();
    this.clock = clock;
  }
  prune() {
    const now = this.clock();
    for (const [id, frame] of this.frames) {
      if (now - frame.receivedAtMs >= REGION_TTL_MS) this.frames.delete(id);
    }
  }
  record(png) {
    if (!Buffer.isBuffer(png) || png.length < 45 || png.length > REGION_MAX_BYTES) {
      fail('Region frame must be a bounded PNG (maximum 2 MiB)', 413);
    }
    let decoded;
    try { decoded = decodeReference(png, 'image/png'); }
    catch (error) {
      if (error instanceof ReferenceMediaError) fail('Invalid or unsupported region PNG');
      throw error;
    }
    if (decoded.width > REGION_MAX_WIDTH || decoded.height > REGION_MAX_HEIGHT ||
        decoded.frames?.length !== 1) {
      fail('Region frame must be at most 640x360 pixels', 413);
    }
    const receivedAtMs = this.clock();
    const frame = {
      regionFrameId: randomUUID(), kind: 'desktop_region_capture',
      source: 'user_started_local_capture', width: decoded.width, height: decoded.height,
      receivedAt: new Date(receivedAtMs).toISOString(), receivedAtMs,
      sha256: createHash('sha256').update(png).digest('hex'),
      bytes: png.length,
      warning: 'This is a user-selected screen region, NOT a verified Roblox viewport. Other windows and private UI may be visible. Timing is receipt time, not exact display capture time.',
      png: Buffer.from(png),
    };
    this.prune();
    this.frames.set(frame.regionFrameId, frame);
    while (this.frames.size > REGION_RETAIN) this.frames.delete(this.frames.keys().next().value);
    return this.metadata(frame);
  }
  metadata(frame) {
    const { png, receivedAtMs, ...publicFields } = frame;
    return { ...publicFields };
  }
  list() {
    this.prune();
    return [...this.frames.values()].map(frame => this.metadata(frame));
  }
  read(id) {
    if (typeof id !== 'string' || !/^[\da-f-]{36}$/i.test(id)) fail('Invalid region frame ID');
    this.prune();
    const frame = this.frames.get(id);
    if (!frame) fail('Region frame missing or expired', 404);
    return { metadata: this.metadata(frame), png: Buffer.from(frame.png) };
  }
}
