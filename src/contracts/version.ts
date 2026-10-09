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

/**
 * 1.1: privacy-hardened projection — verify_llm_content adds a
 * `privacy` field and masks PII in input-echoing result fields;
 * get_llmverify_capabilities `localState` reports env-var names and
 * field slots instead of absolute host paths unless the caller opts in
 * via `includeLocalPaths`; new error codes MCP_ADAPTER_QUEUE_FULL,
 * MCP_ADAPTER_QUEUE_EXPIRED, MCP_ADAPTER_OUTPUT_TOO_LARGE.
 */
export const ADAPTER_CONTRACT_VERSION = '1.1';

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
