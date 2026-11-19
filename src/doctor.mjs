import { readSession } from './session.mjs';
import { inspectNativeMcp } from './native-mcp.mjs';

// Read-only diagnostics. An observation in memory is not proof that Studio is
// currently connected, nor does the native launcher prove native MCP works.
const REQUIRED = Object.freeze([
  'lazydev_list_structures',
  'lazydev_list_observations',
  'lazydev_list_viewports',
  'lazydev_read_viewport',
]);

function parseList(result) {
  if (result?.isError || !Array.isArray(result?.content)) return null;
  const text = result.content.find(item => item.type === 'text')?.text;
  if (typeof text !== 'string') return null;
  try {
    const items = JSON.parse(text);
    return Array.isArray(items) ? items.length : null;
  } catch {
    return null;
  }
}

// Dependency injection allows full, credential-free offline tests.
export async function diagnose({
  sessionReader = readSession,
  nativeInspector = inspectNativeMcp,
  transport = fetch,
  timeoutMs = 3000,
  nodeVersion = process.versions.node,
} = {}) {
  const native = nativeInspector();
  const report = {
    schemaVersion: 1,
    node: { version: nodeVersion, supported: Number.parseInt(nodeVersion, 10) >= 20 },
    nativeStudio: {
      supportedPlatform: native.supportedPlatform,
      launcherFound: native.launcherFound,
      hostConfigFound: native.hostConfigFound,
      connection: 'not_tested',
    },
    lazyBridge: { state: 'not_checked', toolCount: null, missingTools: [] },
    sharedEvidence: { state: 'not_checked', scripts: null, structures: null, viewports: null },
    liveStudioVerified: false,
    endToEndWorkflowVerified: false,
    nextSteps: [],
  };

  if (!report.node.supported) {
    report.nextSteps.push('Install Node.js 20 or later before running LAZY.');
  }
  let session;
  try {
    session = await sessionReader();
  } catch {
    report.lazyBridge.state = 'no_usable_session';
    report.nextSteps.push('Run npm start in the LAZY repository, then run npm run doctor in a second terminal.');
    report.nextSteps.push('Use official Roblox Studio MCP Quick Connect separately in your AI host.');
    return report;
  }

  let id = 0;
  const rpc = async (method, params = {}) => {
    const requestId = ++id;
    const response = await transport(`http://127.0.0.1:${session.port}/v1/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: requestId, method, params }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error('unavailable');
    const body = await response.json();
    if (!body || !body.reply || body.reply.id !== requestId || body.reply.error) {
      throw new Error('invalid_reply');
    }
    return body.reply.result;
  };

  try {
    await rpc('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'lazy-doctor', version: '1.0' },
    });
    const listing = await rpc('tools/list');
    if (!Array.isArray(listing?.tools)) throw new Error('invalid_tools');
    const names = new Set(listing.tools.map(tool => tool.name));
    report.lazyBridge = {
      state: 'connected',
      toolCount: listing.tools.length,
      missingTools: REQUIRED.filter(name => !names.has(name)),
    };
    if (report.lazyBridge.missingTools.length) {
      report.nextSteps.push('Update the LAZY checkout and restart its daemon; essential tools are missing.');
    }
    const kinds = [
      ['scripts', 'lazydev_list_observations'],
      ['structures', 'lazydev_list_structures'],
      ['viewports', 'lazydev_list_viewports'],
    ];
    const counts = {};
    for (const [key, toolName] of kinds) {
      counts[key] = names.has(toolName)
        ? parseList(await rpc('tools/call', { name: toolName, arguments: {} }))
        : null;
    }
    const available = Object.values(counts).every(Number.isInteger);
    report.sharedEvidence = {
      state: !available ? 'unavailable' :
        Object.values(counts).some(count => count > 0) ? 'snapshots_present' : 'none_shared',
      ...counts,
    };
    if (report.sharedEvidence.state === 'none_shared') {
      report.nextSteps.push('Share an inspection from the installed Studio plugin if testing LAZY-specific evidence; otherwise use native Studio MCP directly.');
    }
    if (report.sharedEvidence.state === 'snapshots_present') {
      report.nextSteps.push('Shared snapshots may be stale. Verify live Studio access in the AI host before making changes.');
    }
    if (report.sharedEvidence.state === 'unavailable') {
      report.nextSteps.push('Evidence listing failed; inspect daemon logs and MCP tool responses.');
    }
  } catch {
    report.lazyBridge.state = 'unreachable_or_invalid';
    report.nextSteps.push('Check that the daemon is running and its saved session is current; restart npm start if necessary.');
  }
  report.nextSteps.push('Verify Roblox_Studio native MCP inside Claude/Codex, then run the disposable-place end-to-end test in docs/FIRST-END-TO-END-TEST.md.');
  return report;
}
