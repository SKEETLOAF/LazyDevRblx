import { attachStdioRelay } from './relay.mjs';

// The client is intentionally inert until the MCP host sends a request.
// It never owns port 43187, never accesses Studio directly, and never prints
// the session token. Launch one client per MCP host.
attachStdioRelay();
