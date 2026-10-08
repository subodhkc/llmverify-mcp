/**
 * Public-API integration layer for the `llmverify` engine.
 *
 * HARD RULE: this module imports only from the package root (`llmverify`).
 * Internal dist paths are never touched — if the engine's public exports
 * can't express something, that's an engine PR, not an adapter workaround.
 *
 * This module also owns:
 *  - the serialized execution lane for stateful verify() calls
 *    (usage counter / audit / baseline writes are atomic per-write but
 *    not cross-process coordinated — see docs/SECURITY.md), and
 *  - the adapter-level execution timeout.
 */

import {
  verify,
  validateVerifyResult,
  getVerifyResultSchemaPath,
  getEngineCapabilities,
  getPackageInfo,
  getLLMVerifyHome,
  getLogDir,
  getAuditDir,
  getBaselineDir,
  getUsageFile,
  RESULT_SCHEMA_VERSION,
  VERSION,
  DEFAULT_CONFIG,
  HallucinationEngine,
  checkPromptInjection,
  getInjectionRiskScore,
  isInputSafe,
  checkPII,
  containsPII,
  getPIIRiskScore,
  redactPII
} from 'llmverify';
import type {
  Config,
  Finding,
  VerifyOptions,
  VerifyResult
} from 'llmverify';

import { LIMITS, withTimeout } from '../security/limits.js';

export type VerificationProfile =
  | 'baseline'
  | 'high_risk'
  | 'finance'
  | 'health'
  | 'research';

export const VALID_ENGINE_IDS = [
  'hallucination',
  'consistency',
  'jsonValidator',
  'csm6'
] as const;

export type EngineId = (typeof VALID_ENGINE_IDS)[number];

export interface VerifyToolInput {
  content: string;
  profile?: VerificationProfile;
  isJSON?: boolean;
  expectedSchema?: Record<string, unknown>;
  skipEngines?: EngineId[];
  requireAuditPersistence?: boolean;
}

/**
 * Serialized lane for calls that mutate llmverify local state
 * (usage counter, audit JSONL append, drift baseline). The engine's
 * atomic writes prevent torn JSON between processes, but read-modify-
 * write updates are still last-writer-wins across processes — so we
 * serialize them inside THIS process. Cross-process coordination is
 * documented as out of scope; no locks are added.
 */
let stateLane: Promise<unknown> = Promise.resolve();

function enqueueStateful<T>(work: () => Promise<T>): Promise<T> {
  const next = stateLane.then(work, work);
  // Keep the lane alive regardless of individual outcomes.
  stateLane = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

/**
 * General verification. Returns the engine's VerifyResult — semantics
 * preserved verbatim (notChecked, risk, limitations, audit receipt).
 * Throws typed engine errors; callers normalize them for MCP.
 */
export async function verifyContent(
  input: VerifyToolInput
): Promise<VerifyResult> {
  const config: Partial<Config> = {};
  if (input.profile !== undefined) {
    config.engines = {
      ...DEFAULT_CONFIG.engines,
      csm6: { ...DEFAULT_CONFIG.engines.csm6, profile: input.profile }
    };
  }

  const options: VerifyOptions = {
    content: input.content,
    config: Object.keys(config).length > 0 ? config : undefined,
    context: {
      isJSON: input.isJSON,
      expectedSchema: input.expectedSchema,
      skipEngines: input.skipEngines
    },
    audit: {
      requirePersistence: input.requireAuditPersistence === true
    }
  };

  // The engine returns a fully-formed VerifyResult; we validate it
  // against the shipped contract before exposing it (defense in depth —
  // a contract violation becomes an adapter error, not a bad payload).
  const result = await enqueueStateful(() =>
    withTimeout(verify(options), LIMITS.toolTimeoutMs)
  );

  const check = validateVerifyResult(result);
  if (!check.valid) {
    const err = new Error(
      `Engine result failed contract validation: ${check.errors
        .slice(0, 5)
        .join('; ')}`
    );
    (err as { code?: string }).code = 'MCP_ADAPTER_CONTRACT_VIOLATION';
    throw err;
  }

  return result;
}

export interface HallucinationAssessment {
  riskScore: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  riskIndicators: unknown;
  suspiciousClaims: unknown[];
  claimsEvaluated: number;
  confidence: unknown;
  methodology: string;
  limitations: string[];
}

/**
 * Heuristic hallucination-risk assessment via the engine's
 * HallucinationEngine. Read-only: this path performs no usage, audit,
 * or baseline writes. A risk SIGNAL only — never a factual verdict.
 */
export async function assessHallucinationRisk(
  content: string
): Promise<HallucinationAssessment> {
  const engine = new HallucinationEngine(DEFAULT_CONFIG);
  const result = await withTimeout(engine.detect(content), LIMITS.toolTimeoutMs);
  return {
    riskScore: result.riskScore,
    riskLevel: scoreToLevel(result.riskScore),
    riskIndicators: result.riskIndicators,
    suspiciousClaims: result.suspiciousClaims,
    claimsEvaluated: result.claims.length,
    confidence: result.confidence,
    methodology: result.methodology,
    limitations: result.limitations
  };
}

/** Same thresholds as the engine's RiskScoringEngine. */
function scoreToLevel(
  score: number
): 'low' | 'moderate' | 'high' | 'critical' {
  if (score >= 0.75) return 'critical';
  if (score >= 0.5) return 'high';
  if (score >= 0.25) return 'moderate';
  return 'low';
}

export interface InjectionAssessment {
  inputSafe: boolean;
  riskScore: number;
  findings: Finding[];
}

export function assessPromptInjection(input: string): InjectionAssessment {
  return {
    inputSafe: isInputSafe(input),
    riskScore: getInjectionRiskScore(input),
    findings: checkPromptInjection(input)
  };
}

export interface PiiAssessment {
  containsPII: boolean;
  riskScore: number;
  findings: Finding[];
  piiTypes: string[];
}

export function assessPii(content: string): PiiAssessment {
  const findings = checkPII(content);
  const types = [
    ...new Set(
      findings
        .map((f) => (f.metadata as { type?: string } | undefined)?.type)
        .filter((t): t is string => typeof t === 'string')
    )
  ];
  return {
    containsPII: containsPII(content),
    riskScore: getPIIRiskScore(content),
    findings,
    piiTypes: types
  };
}

export interface PiiRedaction {
  redacted: string;
  piiCount: number;
  /** `original` values are deliberately withheld — never echoed back. */
  redactions: Array<{ type: string; position: number }>;
}

export function redactPii(
  content: string,
  replacement?: string
): PiiRedaction {
  const out =
    replacement === undefined ? redactPII(content) : redactPII(content, replacement);
  return {
    redacted: out.redacted,
    piiCount: out.piiCount,
    redactions: out.redactions.map((r) => ({
      type: r.type,
      position: r.position
    }))
  };
}

/** Capability discovery — straight pass-through of engine metadata. */
export function describeCapabilities() {
  return {
    package: getPackageInfo(),
    adapterContractVersion: 'see contracts/version.ts',
    resultSchemaVersion: RESULT_SCHEMA_VERSION,
    engineVersion: VERSION,
    capabilities: getEngineCapabilities(),
    localState: {
      home: getLLMVerifyHome(),
      logDir: getLogDir(),
      auditDir: getAuditDir(),
      baselineDir: getBaselineDir(),
      usageFile: getUsageFile(),
      note:
        'llmverify writes usage counters, audit JSONL (if enabled), ' +
        'baseline state and operational logs under these paths. ' +
        'Zero network access does not mean zero local writes.'
    },
    resultSchemaFile: getVerifyResultSchemaPath()
  };
}
