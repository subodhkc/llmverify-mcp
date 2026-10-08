/**
 * Output bounding and privacy post-processing.
 *
 * Engine output arrays (findings, claims, contradictions, ...) can grow
 * with input size. Every tool result passes through bound helpers that
 * cap array lengths and text fields, and record what was omitted in
 * `truncations` — nothing is dropped silently.
 */

import { LIMITS } from './limits.js';

export interface TruncationRecord {
  /** JSON-path-ish location of the bounded array or field. */
  path: string;
  /** Number of items/characters omitted. */
  omitted: number;
}

export interface TruncationReport {
  truncated: boolean;
  truncations: TruncationRecord[];
}

export class TruncationTracker {
  private records: TruncationRecord[] = [];

  bound<T>(items: readonly T[] | undefined, path: string): T[] {
    if (!items) return [];
    if (items.length <= LIMITS.maxOutputItems) return [...items];
    this.records.push({
      path,
      omitted: items.length - LIMITS.maxOutputItems
    });
    return items.slice(0, LIMITS.maxOutputItems);
  }

  text(value: unknown, path: string): string | undefined {
    if (typeof value !== 'string') return undefined;
    if (value.length <= LIMITS.maxTextFieldChars) return value;
    this.records.push({
      path,
      omitted: value.length - LIMITS.maxTextFieldChars
    });
    return `${value.slice(0, LIMITS.maxTextFieldChars)}… [truncated]`;
  }

  report(): TruncationReport {
    return { truncated: this.records.length > 0, truncations: this.records };
  }
}

/**
 * Bound a VerifyResult-shaped object for transport: caps every known
 * output array and long text field without altering semantics.
 * Returns `{ result, output }` where `result` is the bounded copy.
 */
export function boundVerifyResult(result: any): {
  result: any;
  output: TruncationReport;
} {
  const t = new TruncationTracker();
  const bounded: any = { ...result };

  if (result.hallucination) {
    const h = result.hallucination;
    bounded.hallucination = {
      ...h,
      claims: t
        .bound(h.claims, 'hallucination.claims')
        .map(boundClaim(t, 'hallucination.claims')),
      suspiciousClaims: t
        .bound(h.suspiciousClaims, 'hallucination.suspiciousClaims')
        .map(boundClaim(t, 'hallucination.suspiciousClaims'))
    };
  }

  if (result.consistency) {
    const c = result.consistency;
    bounded.consistency = {
      ...c,
      sections: t
        .bound(c.sections, 'consistency.sections')
        .map((s: unknown, i: number) =>
          t.text(s, `consistency.sections[${i}]`)
        ),
      contradictions: t
        .bound(c.contradictions, 'consistency.contradictions')
        .map((cd: any, i: number) => ({
          ...cd,
          claim1: t.text(cd?.claim1, `consistency.contradictions[${i}].claim1`),
          claim2: t.text(cd?.claim2, `consistency.contradictions[${i}].claim2`)
        })),
      // Similarity matrix can be O(n²) — drop it for transport, note it.
      similarityMatrix: undefined
    };
  }

  if (result.json) {
    const j = result.json;
    bounded.json = {
      ...j,
      schemaErrors: t.bound(j.schemaErrors, 'json.schemaErrors'),
      // `parsed` echoes the input document; too large for tool output.
      parsed: undefined
    };
  }

  if (result.csm6) {
    const s = result.csm6;
    bounded.csm6 = {
      ...s,
      findings: t
        .bound(s.findings, 'csm6.findings')
        .map(boundFinding(t, 'csm6.findings'))
    };
  }

  bounded.limitations = t.bound(result.limitations, 'limitations');
  bounded.notChecked = t.bound(result.notChecked, 'notChecked');
  if (result.warnings) {
    bounded.warnings = t.bound(result.warnings, 'warnings');
  }

  return { result: bounded, output: t.report() };
}

function boundClaim(t: TruncationTracker, base: string) {
  return (claim: any, i: number) => ({
    ...claim,
    text: t.text(claim?.text, `${base}[${i}].text`),
    limitations: t.bound(claim?.limitations, `${base}[${i}].limitations`)
  });
}

function boundFinding(t: TruncationTracker, base: string) {
  return (finding: any, i: number) => ({
    ...finding,
    message: t.text(finding?.message, `${base}[${i}].message`),
    recommendation: t.text(
      finding?.recommendation,
      `${base}[${i}].recommendation`
    ),
    evidence: boundEvidence(t, `${base}[${i}].evidence`, finding?.evidence),
    limitations: t.bound(finding?.limitations, `${base}[${i}].limitations`)
  });
}

function boundEvidence(
  t: TruncationTracker,
  path: string,
  evidence: any
): any {
  if (!evidence || typeof evidence !== 'object') return evidence;
  return {
    ...evidence,
    textSample: t.text(evidence.textSample, `${path}.textSample`),
    context: t.text(evidence.context, `${path}.context`)
  };
}

/**
 * Findings that may contain the actual sensitive values (PII scan
 * results). For these, evidence text samples are masked rather than
 * truncated — a PII tool must not echo the PII it found.
 */
export function maskFindingEvidence(finding: any): any {
  if (!finding || typeof finding !== 'object') return finding;
  const masked = { ...finding };
  if (masked.evidence && typeof masked.evidence === 'object') {
    masked.evidence = { ...masked.evidence };
    if (masked.evidence.textSample !== undefined) {
      masked.evidence.textSample = '[REDACTED]';
    }
    if (masked.evidence.context !== undefined) {
      masked.evidence.context = '[REDACTED]';
    }
  }
  return masked;
}
