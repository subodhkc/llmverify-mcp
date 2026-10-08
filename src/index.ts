#!/usr/bin/env node
/**
 * llmverify-mcp — executable entrypoint.
 *
 * Serves MCP over stdio. stdout is RESERVED for protocol frames:
 * every diagnostic goes to stderr. To defend the transport against
 * accidental prints (by this adapter or its dependencies), console.log
 * and console.info are re-routed to stderr before the server connects.
 */

import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { createLlmverifyMcpServer } from './server.js';
import { ADAPTER_NAME, adapterVersion } from './contracts/version.js';

// Guard the protocol channel: nothing but MCP frames may reach stdout.
const stderr = console.error.bind(console);
console.log = stderr;
console.info = stderr;
console.debug = stderr;

function diag(message: string): void {
  console.error(`[${ADAPTER_NAME}] ${message}`);
}

async function main(): Promise<void> {
  const server = createLlmverifyMcpServer();
  const transport = new StdioServerTransport();

  transport.onerror = (error: Error) => {
    diag(`transport error: ${error.message}`);
  };

  await server.connect(transport);
  diag(`v${adapterVersion()} serving MCP over stdio (local-only)`);
}

main().catch((error: unknown) => {
  diag(
    `fatal startup error: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exitCode = 1;
});
