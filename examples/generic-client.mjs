/**
 * Minimal generic MCP stdio client for llmverify-mcp.
 *
 * Usage:
 *   npm install @modelcontextprotocol/client
 *   node examples/generic-client.mjs
 *
 * Requires the server to be built first: npm run build
 */

import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const serverPath = join(
  fileURLToPath(new URL('.', import.meta.url)),
  '..',
  'dist',
  'index.js'
);

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverPath]
});

const client = new Client({ name: 'example-client', version: '0.0.0' });
await client.connect(transport);

const { tools } = await client.listTools();
console.log('Tools:', tools.map((t) => t.name).join(', '));

const result = await client.callTool({
  name: 'verify_llm_content',
  arguments: { content: 'Studies show 99% of experts agree.' }
});

console.log(JSON.stringify(result.structuredContent, null, 2));

await client.close();
