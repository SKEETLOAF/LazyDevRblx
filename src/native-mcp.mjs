import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { win32, posix } from 'node:path';

// Local, read-only preflight. Does NOT launch Studio, inspect host config
// contents, register MCP, run commands, or share credentials with any agent.
export function inspectNativeMcp({
  platform=process.platform,
  localAppData=process.env.LOCALAPPDATA,
  home=homedir(),
  exists=existsSync,
}={}) {
  if (!['win32','darwin','linux'].includes(platform)) {
    return {platform:'other',launcherFound:false,hostConfigFound:false,
      connection:'not_tested',supportedPlatform:false};
  }
  let launchers=[];
  if(platform==='win32' && typeof localAppData==='string' && localAppData) {
    launchers=[win32.join(localAppData,'Roblox','mcp.bat')];
  } else if(platform==='darwin') {
    launchers=[
      '/Applications/RobloxStudio.app/Contents/MacOS/StudioMCP',
      posix.join(home,'Applications','RobloxStudio.app','Contents','MacOS','StudioMCP'),
    ];
  }
  const launcherFound=launchers.some(path=>exists(path));
  const hostConfigFound=typeof home==='string' && home.length>0 &&
    exists(platform==='win32'
      ? win32.join(home,'.codex','config.toml')
      : posix.join(home,'.codex','config.toml'));
  return {
    platform,
    launcherFound,
    hostConfigFound,
    connection:'not_tested',
    supportedPlatform:platform==='win32'||platform==='darwin',
    recommendation:'Use Roblox Studio official MCP and its own Quick Connect. Do not register duplicate Roblox_Studio servers. LAZY DevKit remains a separate review/specialist evidence bridge.',
    limitation:'File presence does not prove that Studio is running, MCP is enabled, a host is connected, or any capability is authorized.',
  };
}
