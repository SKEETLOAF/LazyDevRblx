import { inspectNativeMcp } from '../src/native-mcp.mjs';

// Read-only local readiness indication. Never echo paths or config file contents.
process.stdout.write(JSON.stringify(inspectNativeMcp(),null,2)+'\n');
