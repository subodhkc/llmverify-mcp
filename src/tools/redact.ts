/**
 * Tool: redact_pii — in-memory PII redaction.
 *
 * Pure string transformation via the engine's redactPII(). No
 * filesystem mutation, no external transmission. Original matched
 * values are never returned — only the redacted output plus
 * redaction type/position metadata.
 */

import * as z from 'zod';
import type { McpServer } from '@modelcontextprotocol/server';
import {
  contentField,
  truncationSchema,
  engineIdentitySchema,
  toolErrorSchema
} from '../schemas/common.js';
import { redactPii } from '../adapters/llmverify.js';
import { TruncationTracker } from '../security/bounds.js';
import { ADAPTER_CONTRACT_VERSION, ADAPTER_NAME, adapterVersion } from '../contracts/version.js';
import { okResult, errorResult } from '../contracts/results.js';
import { VERSION as ENGINE_VERSION } from 'llmverify';

const inputSchema = z.object({
  content: contentField.describe('Text to redact PII from'),
  replacement: z
    .string()
    .max(64)
    .optional()
    .describe(
      'Replacement marker. Default: engine default ([REDACTED]).'
    )
});

const outputSchema = z.looseObject({
  adapter: z.object({
    name: z.string(),
    version: z.string(),
    contractVersion: z.string()
  }),
  engine: engineIdentitySchema,
  evaluation: z.enum(['COMPLETED', 'PARTIAL', 'FAILED']),
  redacted: z.string(),
  piiCount: z.number(),
  redactions: z.array(
    z.object({
      type: z.string(),
      position: z.number()
    })
  ),
  limitations: z.array(z.string()),
  output: truncationSchema,
  error: toolErrorSchema.optional()
});

export function registerRedactTool(server: McpServer): void {
  server.registerTool(
    'redact_pii',
    {
      title: 'Redact PII',
      description:
        'Return a PII-redacted copy of the supplied text using ' +
        'llmverify pattern redaction. Original matched values are ' +
        'never returned. Pattern coverage is not exhaustive — review ' +
        'output before relying on it for disclosure decisions.',
      inputSchema,
      outputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ content, replacement }) => {
      try {
        const result = redactPii(content, replacement);
        const t = new TruncationTracker();
        const redactions = t.bound(result.redactions, 'redactions');

        return okResult(
          {
            adapter: {
              name: ADAPTER_NAME,
              version: adapterVersion(),
              contractVersion: ADAPTER_CONTRACT_VERSION
            },
            engine: { name: 'llmverify', version: ENGINE_VERSION },
            evaluation: 'COMPLETED',
            redacted: result.redacted,
            piiCount: result.piiCount,
            redactions,
            limitations: [
              'Pattern-based redaction is not exhaustive — verify output before disclosure use',
              'Original values are withheld by design; use position metadata for review'
            ],
            output: t.report()
          } as Record<string, unknown>,
          `Redacted ${result.piiCount} PII match(es). Pattern coverage ` +
            'is not exhaustive — review before disclosure use.'
        );
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}
