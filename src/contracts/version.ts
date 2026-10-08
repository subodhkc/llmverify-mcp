/**
 * Adapter output contract version.
 *
 * This is the MCP adapter's OWN structured-content contract. It is
 * independent of the llmverify result schema version (currently '1.0'),
 * which is carried through unchanged in `resultSchemaVersion`.
 *
 * Bump this when the shape of any tool's `structuredContent` changes in
 * a backward-incompatible way.
 */
import { readFileSync } from 'node:fs';

export const ADAPTER_CONTRACT_VERSION = '1.0';

export const ADAPTER_NAME = 'llmverify-mcp';

/**
 * Adapter package version, resolved from package.json at runtime
 * (src/ compiles to dist/, so package.json sits one level up either way).
 */
export function adapterVersion(): string {
  try {
    const pkgUrl = new URL('../../package.json', import.meta.url);
    const pkg = JSON.parse(readFileSync(pkgUrl, 'utf-8')) as {
      version?: string;
    };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}
