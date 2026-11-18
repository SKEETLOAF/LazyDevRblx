import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { EventEmitter } from 'node:events';
import { DevKitState, InputError } from '../src/state.mjs';
import { createStudioServer } from '../src/http.mjs';
import { handleRpc } from '../src/mcp.mjs';
import { encodeRgbaPng } from '../src/viewport.mjs';
import {
  RegionFrameStore, RegionFrameError, REGION_TTL_MS, REGION_MAX_BYTES,
} from '../src/region-frames.mjs';
import { PngImagePipe, RegionPipeError, parseRegionArgs, ffmpegRegionArgs } from '../src/region-pipe.mjs';
import { captureRegion } from '../scripts/observe-region.mjs';

const png = encodeRgbaPng(Buffer.from([
  255, 0, 0, 255, 0, 255, 0, 255,
  0, 0, 255, 255, 255, 255, 255, 255,
]), 2, 2);

function rpc(state, name, args = {}) {
  const res = handleRpc(state, { jsonrpc: '2.0', id: 1, method: 'tools/call',
    params: { name, arguments: args } });
  return res.result;
}

test('PNG image pipe splits arbitrary chunks and accepts consecutive images without disk files', () => {
  const pipe = new PngImagePipe();
  const pair = Buffer.concat([png, png]);
  const result = [];
  for (let i = 0; i < pair.length; i += 7) result.push(...pipe.push(pair.subarray(i, i + 7)));
  pipe.finish();
  assert.equal(result.length, 2);
  assert.ok(result.every(frame => frame.equals(png)));
  assert.throws(() => new PngImagePipe().push(Buffer.from('not a png')), RegionPipeError);
  const truncated = new PngImagePipe();
  truncated.push(png.subarray(0, 15));
  assert.throws(() => truncated.finish(), /Incomplete/);
  assert.throws(() => new PngImagePipe().push(Buffer.alloc(REGION_MAX_BYTES * 2 + 1)), /bounded/);
  // Maliciously advertised chunk length must not allocate memory.
  const tooBig = Buffer.concat([png.subarray(0, 8), Buffer.from([0xff,0xff,0xff,0xff]), Buffer.from('IDAT')]);
  assert.throws(() => new PngImagePipe().push(tooBig), /exceeds/);
});

test('screen region CLI has explicit consent and finite safe defaults', () => {
  assert.throws(() => parseRegionArgs(['--region', '0,0,960,540']), /--share/);
  assert.throws(() => parseRegionArgs(['--share']), /Usage/);
  assert.throws(() => parseRegionArgs(['--region', '0,0,960,540', '--share', '--fps', '30']), /1–2 fps/);
  assert.throws(() => parseRegionArgs(['--region', '0,0,960,540', '--share', '--seconds', '999']), /10–300/);
  assert.throws(() => parseRegionArgs(['--region', '0,0,10000,10000', '--share']), /bounds/);
  assert.throws(() => parseRegionArgs(['--region', '0,0,960,540', '--share', '--share']), /Usage/);
  assert.throws(() => parseRegionArgs(['--region', '0,0,960,540', '--share', '--bad']), /Usage/);
  const options = parseRegionArgs(['--region','-200,100,1280,720','--share', '--fps','2','--seconds','30']);
  const cmd = ffmpegRegionArgs(options);
  assert.ok(cmd.includes('gdigrab'));
  assert.ok(cmd.includes('-show_region'));
  assert.ok(cmd.includes('-draw_mouse'));
  assert.ok(cmd.includes('pipe:1'));
  assert.ok(cmd.includes('scale=640:360:flags=fast_bilinear'));
  assert.equal(cmd[cmd.indexOf('-frames:v')+1], '60');
  assert.equal(cmd.includes('-y'), false);
});

test('agent can inspect real bytes but neither start capture nor retain stale frames', () => {
  let now = Date.now();
  const store = new RegionFrameStore({ clock: () => now });
  const original = Buffer.from(png);
  const first = store.record(original);
  original.fill(0);
  assert.equal(first.kind, 'desktop_region_capture');
  assert.equal(first.source, 'user_started_local_capture');
  assert.equal(store.read(first.regionFrameId).png.equals(png), true);
  assert.match(first.warning, /NOT a verified Roblox viewport/);
  for (let i = 0; i < 5; i++) store.record(png);
  assert.equal(store.list().length, 4);
  assert.throws(() => store.read(first.regionFrameId), RegionFrameError);
  now += REGION_TTL_MS + 1;
  assert.deepEqual(store.list(), []);
  assert.throws(() => store.read(store.record(png).regionFrameId.replace(/.$/, 'x')), RegionFrameError);
  assert.throws(() => store.record(Buffer.from('not png')), RegionFrameError);
  assert.throws(() => store.record(Buffer.alloc(REGION_MAX_BYTES + 1)), RegionFrameError);
  const state = new DevKitState();
  const entry = state.recordRegionFrame(png);
  assert.equal(JSON.parse(rpc(state, 'lazydev_list_region_frames').content[0].text).length, 1);
  const contents = rpc(state, 'lazydev_read_region_frame', {regionFrameId:entry.regionFrameId}).content;
  assert.equal(contents[1].mimeType, 'image/png');
  assert.equal(Buffer.from(contents[1].data, 'base64').equals(png), true);
  assert.equal(rpc(state, 'lazydev_read_region_frame', {regionFrameId:'missing'}).isError, true);
  assert.equal(handleRpc(state,{jsonrpc:'2.0',id:4,method:'tools/call',params:{name:'lazydev_start_region_capture',arguments:{}}}).error?.code,-32602);
  const toolNames = handleRpc(state, {jsonrpc:'2.0',id:2,method:'tools/list'}).result.tools.map(x => x.name);
  assert.equal(toolNames.includes('lazydev_start_region_capture'), false);
});

test('authenticated localhost endpoint accepts PNG only and does not expose frames to browser-origin callers', async t => {
  const state = new DevKitState();
  const {server,token} = createStudioServer(state,{token:'a'.repeat(64)});
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  t.after(() => new Promise(resolve=>server.close(resolve)));
  const endpoint = 'http://127.0.0.1:'+server.address().port+'/v1/observations/region-frame';
  const send = (body, headers = {}) => fetch(endpoint,{
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'image/png',...headers},body,
  });
  assert.equal((await fetch(endpoint,{method:'POST',body:png})).status,401);
  assert.equal((await send(png,{Origin:'https://example.com'})).status,403);
  assert.equal((await send(png,{'Content-Type':'application/json'})).status,415);
  assert.equal((await send(Buffer.from('not a png'))).status,413);
  assert.equal((await send(Buffer.alloc(REGION_MAX_BYTES+1))).status,413);
  const response=await send(png);
  assert.equal(response.status,201);
  const metadata=await response.json();
  assert.equal(metadata.width,2);
  assert.equal(metadata.height,2);
  assert.equal(state.listRegionFrames().length,1);
  assert.equal(state.readRegionFrame(metadata.regionFrameId).png.equals(png),true);
  assert.equal(new DevKitState().listRegionFrames().length,0);
});

test('mock Windows FFmpeg pipe sends bounded frames to daemon with no filesystem writes', async () => {
  let launched=null;
  const frames=[];
  const fakeLaunch = (command, args, options) => {
    launched = {command,args,options};
    const child = new EventEmitter();
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    child.exitCode = null;
    child.killed = false;
    child.kill = () => {child.killed = true; return true;};
    queueMicrotask(() => {
      child.stdout.end(Buffer.concat([png,png]));
      child.stderr.end();
      child.exitCode = 0;
      child.emit('close',0,null);
    });
    return child;
  };
  const response = await captureRegion(['--region','20,30,640,360','--share','--seconds','10'], {
    platform: 'win32', launch: fakeLaunch,
    readSessionFn: () => ({token:'b'.repeat(64),port:43187}),
    post: async (url,options) => {
      assert.equal(url, 'http://127.0.0.1:43187/v1/observations/region-frame');
      assert.equal(options.method,'POST');
      frames.push(Buffer.from(options.body));
      return { ok:true, status:201 };
    },
  });
  assert.equal(launched.command,'ffmpeg');
  assert.equal(launched.options.shell,false);
  assert.equal(response.sentFrames,2);
  assert.equal(response.storedOnDisk,false);
  assert.ok(frames.every(frame=>frame.equals(png)));
});
