import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { forwardRpc } from '../src/relay.mjs';
import { makeProjectManifest, parseProjectManifest } from '../src/competency/manifest.mjs';

const MAX_MANIFEST_BYTES = 24 * 1024;
const USAGE = 'Usage: npm run project:manifest -- import "path/to/project.json" | export <briefId> "path/to/project.json"';

async function invokeTool(name, args, transport) {
  const reply = await transport({
    jsonrpc: '2.0', id: 1, method: 'tools/call',
    params: { name, arguments: args },
  });
  if (reply?.error || reply?.result?.isError || !Array.isArray(reply?.result?.content)) {
    throw new Error('LAZY DevKit rejected the project brief request');
  }
  const text = reply.result.content.find(item => item.type === 'text')?.text;
  if (typeof text !== 'string') throw new Error('LAZY DevKit returned no project brief');
  return JSON.parse(text);
}

// The operator explicitly names one local file. MCP agents cannot use this
// CLI to inspect arbitrary paths, and no automatic project discovery occurs.
export async function runProjectManifest(args = process.argv.slice(2), { transport = forwardRpc } = {}) {
  const [command, ...rest] = args;
  if (command === 'import' && rest.length === 1 && rest[0] && !rest[0].startsWith('--')) {
    const filename = resolve(rest[0]);
    const info = await lstat(filename);
    if (!info.isFile() || info.isSymbolicLink() || info.size < 20 || info.size > MAX_MANIFEST_BYTES) {
      throw new Error('Expected a regular project manifest JSON file under 24 KiB (no symlinks)');
    }
    const bytes = await readFile(filename);
    if (bytes.length !== info.size) throw new Error('Project manifest changed during reading');
    const parsed = parseProjectManifest(JSON.parse(bytes.toString('utf8')));
    const created = await invokeTool('lazydev_create_project_brief', parsed.brief, transport);
    return {
      action: 'import', briefId: created.briefId, projectName: created.projectName,
      omittedSessionReferenceCount: parsed.omittedSessionReferenceCount,
      note: 'Planning context imported for this daemon session. Reimport any image/GIF references separately; no links or rights claims were independently verified.',
    };
  }
  if (command === 'export' && rest.length === 2 && rest.every(x => x && !x.startsWith('--'))) {
    const [briefId, output] = rest;
    if (briefId.length > 100) throw new Error('Invalid brief ID');
    const brief = await invokeTool('lazydev_read_project_brief', { briefId }, transport);
    const manifest = makeProjectManifest(brief);
    const json = JSON.stringify(manifest, null, 2) + '\n';
    if (Buffer.byteLength(json, 'utf8') > MAX_MANIFEST_BYTES) {
      throw new Error('Project manifest exceeds the 24 KiB file limit');
    }
    const filename = resolve(output);
    await mkdir(dirname(filename), { recursive: true, mode: 0o700 });
    // No implicit overwrites: the operator must explicitly remove or rename
    // a prior file. Session tokens and reference bytes are never exported.
    await writeFile(filename, json, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    return {
      action: 'export', filename, projectName: brief.projectName,
      omittedSessionReferenceCount: manifest.omittedSessionReferenceCount,
      note: 'Saved planning data only. No image/GIF media, session token, evidence or Studio state was exported.',
    };
  }
  throw new Error(USAGE);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runProjectManifest().then(result => process.stdout.write(JSON.stringify(result, null, 2) + '\n'))
    .catch(error => { process.stderr.write(error.message + '\n'); process.exitCode = 1; });
}
