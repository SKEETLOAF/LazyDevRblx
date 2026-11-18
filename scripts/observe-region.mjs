import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSession } from '../src/session.mjs';
import { PngImagePipe, ffmpegRegionArgs, parseRegionArgs } from '../src/region-pipe.mjs';

export async function captureRegion(
  args = process.argv.slice(2),
  { platform = process.platform, launch = spawn, readSessionFn = readSession, post = fetch } = {},
) {
  const options = parseRegionArgs(args);
  if (platform !== 'win32') throw new Error('Experimental capture currently supports Windows gdigrab only');
  const { token, port } = readSessionFn();
  const command = ffmpegRegionArgs(options);
  // No shell, web server, disk recording, file input, hidden screenshots, or model.
  const child = launch(options.ffmpeg, command, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, shell: false });
  const closed = new Promise((resolveClose, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => resolveClose({ code, signal }));
  });
  // Attach a rejection observer immediately so a missing executable cannot
  // trigger an unhandled rejection before stdout finishes closing.
  closed.catch(() => {});
  let cancelled = false;
  let timedOut = false;
  let count = 0;
  let diagnostics = '';
  child.stderr.on('data', bytes => { diagnostics = (diagnostics + bytes.toString('utf8')).slice(-800); });
  const stop = () => { cancelled = true; child.kill(); };
  process.once('SIGINT', stop);
  const timer = setTimeout(() => { timedOut = true; child.kill(); }, options.seconds * 1000 + 5000);
  const parser = new PngImagePipe();
  process.stderr.write(
    'LAZY region observation ON: only the selected rectangle is captured. ' +
    'Keep private windows away from it. Authorized local MCP clients can request its last four frames. ' +
    'No video or frames are saved by LAZY to disk. Press Ctrl+C to stop.\n',
  );
  try {
    for await (const data of child.stdout) {
      for (const frame of parser.push(data)) {
        const response = await post('http://127.0.0.1:' + port + '/v1/observations/region-frame', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'image/png' },
          body: frame,
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) {
          throw new Error('LAZY daemon rejected region frame (HTTP ' + response.status + ')');
        }
        count++;
      }
    }
    const outcome = await closed;
    if (!cancelled && !timedOut && outcome.code !== 0) {
      throw new Error('FFmpeg region capture failed. ' + diagnostics.trim().slice(-300));
    }
    if (!cancelled && !timedOut) parser.finish();
    if (count === 0) throw new Error('No frames captured. Check FFmpeg installation, region coordinates and visible Studio viewport.');
    return { sentFrames: count, stoppedByUser: cancelled, timedOut, storedOnDisk: false };
  } finally {
    clearTimeout(timer);
    process.off('SIGINT', stop);
    if (child.exitCode === null && !child.killed) child.kill();
    process.stderr.write('LAZY region observation stopped. Recently shared frames expire from daemon RAM within 30 seconds.\n');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  captureRegion().then(result => process.stdout.write(JSON.stringify(result) + '\n'))
    .catch(error => {
      const message = error?.code === 'ENOENT' ? 'FFmpeg not installed or not found on PATH' : error.message;
      process.stderr.write('Region capture error: ' + message + '\n');
      process.exitCode = 1;
    });
}
