import { test } from 'node:test';
import assert from 'node:assert/strict';
import {win32,posix} from 'node:path';
import {inspectNativeMcp} from '../src/native-mcp.mjs';

test('Windows preflight only checks existence; does not assume connected',()=>{
  const root='C:\\Users\\Tester';
  const launcher=win32.join('C:\\Users\\Tester\\AppData\\Local','Roblox','mcp.bat');
  const config=win32.join(root,'.codex','config.toml');
  const calls=[];
  const report=inspectNativeMcp({
    platform:'win32',localAppData:'C:\\Users\\Tester\\AppData\\Local',
    home:root,exists:path=>{calls.push(path); return path===launcher||path===config;},
  });
  assert.equal(report.launcherFound,true);
  assert.equal(report.hostConfigFound,true);
  assert.equal(report.connection,'not_tested');
  assert.equal(calls.length,2);
  assert.deepEqual(calls,[launcher,config]);
  assert.ok(!JSON.stringify(report).includes(root),'Must not disclose personal filesystem paths');
});
test('launcher absent is not a fabricated failure of native MCP integration',()=>{
  const r=inspectNativeMcp({platform:'win32',home:'C:\\Users\\Test',
    localAppData:undefined,exists:()=>false});
  assert.equal(r.launcherFound,false);
  assert.equal(r.connection,'not_tested');
  assert.equal(r.supportedPlatform,true);
});
test('macOS checks supported app placements without reading configuration',()=>{
  const target='/Applications/RobloxStudio.app/Contents/MacOS/StudioMCP';
  const r=inspectNativeMcp({platform:'darwin',home:'/Users/dev',
    exists:path=>path===target});
  assert.equal(r.launcherFound,true);
  assert.equal(r.hostConfigFound,false);
  assert.match(r.recommendation,/Quick Connect/);
});
test('linux and unknown hosts are not silently treated as supported',()=>{
  const linux=inspectNativeMcp({platform:'linux',home:'/home/dev',exists:()=>false});
  assert.equal(linux.supportedPlatform,false);
  assert.equal(linux.launcherFound,false);
  const other=inspectNativeMcp({platform:'freebsd',exists:()=>false});
  assert.equal(other.supportedPlatform,false);
  assert.equal(other.connection,'not_tested');
});
