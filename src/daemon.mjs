// The persistent local daemon holds Studio observations for multiple MCP
// clients. It listens only on 127.0.0.1 and must be started explicitly.
process.env.LAZYDEV_DAEMON = '1';
await import('./main.mjs');
