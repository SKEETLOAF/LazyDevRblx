import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const script = fileURLToPath(new URL('../scripts/print-client-config.mjs', import.meta.url));
const root = fileURLToPath(new URL('../', import.meta.url));

function render(mode) {
  const result = spawnSync(process.execPath, [script, mode], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.ok(!result.stdout.includes('Bearer'));
  return result.stdout;
}

test('Claude Desktop configuration uses installed Node and the shared stdio relay', () => {
  const config = JSON.parse(render('claude-desktop'));
  const server = config.mcpServers['lazy-devkit'];
  assert.equal(server.command, process.execPath);
  assert.ok(server.args[0].endsWith('stdio-client.mjs'));
  assert.ok(existsSync(server.args[0]));
  assert.ok(!server.args[0].endsWith('main.mjs'));
});

test('Claude Code and Codex snippets point to the shared relay', () => {
  const claude = render('claude-code');
  const codex = render('codex');
  assert.match(claude, /^claude mcp add --transport stdio --scope user lazy-devkit -- /);
  assert.ok(claude.includes('stdio-client.mjs'));
  assert.ok(!claude.includes('session.json'));
  assert.match(codex, /\[mcp_servers\.lazy-devkit\]/);
  assert.match(codex, /args\s*=\s*\[/);
  assert.ok(codex.includes('stdio-client.mjs'));
  assert.ok(!codex.includes('session.json'));
});

test('local plugin manifest and marketplace reference one canonical MCP implementation', () => {
  const manifest=JSON.parse(readFileSync(resolve(root,'plugin.json'),'utf8'));
  const mcp=JSON.parse(readFileSync(resolve(root,'mcp.json'),'utf8'));
  const marketplace=JSON.parse(readFileSync(resolve(root,'.agents/plugins/marketplace.json'),'utf8'));
  assert.equal(manifest.name,'lazy-devkit');
  assert.equal(mcp.mcpServers['lazy-devkit'].type,'stdio');
  assert.equal(mcp.mcpServers['lazy-devkit'].args[0], '${PLUGIN_ROOT}/src/stdio-client.mjs');
  assert.equal(marketplace.plugins[0].source.path,'./');
});
