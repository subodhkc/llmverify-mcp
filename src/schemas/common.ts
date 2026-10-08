/**
 * Shared zod v4 schema fragments for tool inputs and outputs.
 */

import * as z from 'zod';
import { LIMITS } from '../security/limits.js';

export const contentField = z
  .string()
  .min(1, 'content must not be empty')
  .max(
    LIMITS.maxInputChars,
    `content exceeds adapter limit of ${LIMITS.maxInputChars} characters`
  )
  .describe('AI-generated text to evaluate. Never executed.');

export const auditStatusSchema = z
  .enum(['PERSISTED', 'DISABLED', 'FAILED', 'NOT_ATTEMPTED'])
  .describe(
    'Actual persistence outcome of the audit write — a successful ' +
      'verification does NOT imply a persisted audit record'
  );

export const auditReceiptSchema = z.object({
  status: auditStatusSchema,
  filePath: z.string().optional(),
  entryDigest: z
    .string()
    .optional()
    .describe(
      "Integrity digest 'sha256:<hex>' over the canonical stored record. " +
        'Tamper-evidence only — NOT a digital signature or proof of ' +
        'producer authenticity.'
    ),
  error: z.string().optional()
});

export const truncationSchema = z.object({
  truncated: z.boolean(),
  truncations: z.array(
    z.object({
      path: z.string(),
      omitted: z.number()
    })
  )
});

export const engineIdentitySchema = z.object({
  name: z.string(),
  version: z.string()
});

export const toolErrorSchema = z.object({
  name: z.string(),
  code: z.string(),
  message: z.string(),
  recoverable: z.boolean().optional(),
  details: z.record(z.string(), z.unknown()).optional()
});

export const ENGINE_IDS = [
  'hallucination',
  'consistency',
  'jsonValidator',
  'csm6'
] as const;
