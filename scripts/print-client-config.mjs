import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const worker = resolve(root,'src','stdio-client.mjs');
const node = process.execPath;
const mode = process.argv[2] || 'help';

if (mode === 'claude-desktop') {
  const config={mcpServers:{'lazy-devkit':{command:node,args:[worker]}}};
  process.stdout.write(JSON.stringify(config,null,2)+'\n');
} else if(mode === 'claude-code') {
  // Paths can contain spaces on Windows. These quotes are for PowerShell.
  process.stdout.write(`claude mcp add --transport stdio --scope user lazy-devkit -- "${node}" "${worker}"\n`);
} else if(mode === 'codex') {
  process.stdout.write(`[mcp_servers.lazy-devkit]\ncommand = ${JSON.stringify(node)}\nargs = [${JSON.stringify(worker)}]\n`);
} else {
  process.stdout.write('Usage: node scripts/print-client-config.mjs claude-desktop|claude-code|codex\n');
  process.exitCode=1;
}
