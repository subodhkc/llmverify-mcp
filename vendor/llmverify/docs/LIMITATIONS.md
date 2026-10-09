# llmverify Limitations

> **Honest disclosure of what llmverify can and cannot do.**

## Executive Summary

llmverify is a **heuristic-based monitoring and classification tool**. It provides **risk indicators and signals**, not ground truth. It cannot:

- Prove an LLM is hallucinating
- Detect all prompt injection attacks
- Guarantee content safety
- Verify factual accuracy
- Replace human review

---

## What llmverify IS

[OK] A **runtime monitoring layer** that tracks LLM behavior over time  
[OK] A **pattern-based classifier** that identifies output characteristics  
[OK] A **risk indicator system** that flags suspicious patterns  
[OK] A **developer tool** for building more observable AI systems  
[OK] A **local-first library** with zero data collection  

---

## What llmverify IS NOT

[FAIL] A fact-checking service  
[FAIL] A content moderation AI  
[FAIL] A security guarantee  
[FAIL] A replacement for human review  
[FAIL] An official audit tool for any provider  

---

## Specific Limitations by Feature

### Hallucination Detection

**What it does**: Scores risk based on patterns like overconfident language, new entities, and fabricated JSON keys.

**What it CANNOT do**:
- Verify if statements are factually true
- Detect plausible-sounding lies
- Identify subtle inaccuracies
- Check against external knowledge bases
- Prove content is hallucinated

**False Positives**: Legitimate confident statements may score high.  
**False Negatives**: Subtle hallucinations with hedged language may score low.

**Accuracy Estimate**: ~60-70% correlation with human-identified hallucinations in controlled tests. Real-world accuracy varies significantly by domain.

---

### Prompt Injection Detection

**What it does**: Pattern-matches against known injection techniques.

**What it CANNOT do**:
- Detect novel/zero-day attacks
- Stop sophisticated adversarial prompts
- Guarantee input safety
- Replace proper input validation

**Coverage**: Detects ~80% of common injection patterns from public datasets. Novel attacks will bypass detection.

**Recommendation**: Use as one layer in defense-in-depth, not as sole protection.

---

### PII Detection

**What it does**: Regex-based pattern matching for common PII formats.

**What it CANNOT do**:
- Detect all PII (especially names without context)
- Understand semantic PII (e.g., "my address is...")
- Handle international formats comprehensively
- Guarantee GDPR/HIPAA compliance

**Accuracy Estimate**: ~90% for structured PII (emails, phones, SSNs). ~60% for unstructured PII (names, addresses).

---

### Runtime Health Monitoring

**What it does**: Tracks latency, token rate, and response structure over time.

**What it CANNOT do**:
- Detect provider-side model changes with certainty
- Distinguish network issues from model issues
- Account for prompt complexity differences
- Guarantee stable baselines

**Best Use Case**: Detecting anomalies in repetitive, stable workloads (e.g., CI pipelines, batch processing).

**Worst Use Case**: Highly variable prompts with diverse expected outputs.

---

### Intent Classification

**What it does**: Pattern-matches to identify output type (summary, code, list, etc.).

**What it CANNOT do**:
- Understand semantic intent
- Handle mixed-intent outputs well
- Work reliably on non-English text
- Classify domain-specific intents

**Accuracy Estimate**: ~85% on clear, single-intent outputs. ~50% on ambiguous or mixed outputs.

---

### JSON Repair

**What it does**: Attempts to fix common JSON formatting errors.

**What it CANNOT do**:
- Fix semantic errors
- Repair deeply malformed structures
- Guarantee repaired JSON is correct
- Handle all edge cases

**Success Rate**: ~70% on common errors (trailing commas, unquoted keys). Lower on complex nested structures.

---

## When NOT to Use llmverify

1. **High-stakes decisions**: Medical, legal, financial decisions should not rely on llmverify scores.

2. **Security-critical applications**: Do not use as sole defense against adversarial attacks.

3. **Compliance certification**: llmverify does not provide compliance guarantees.

4. **Fact verification**: Use dedicated fact-checking services for accuracy verification.

5. **Non-English content**: Most patterns are English-optimized.

---

## Recommended Usage

### DO

- Use as **one signal among many** in your decision pipeline
- Combine with human review for important outputs
- Monitor trends over time rather than individual scores
- Adjust thresholds based on your specific use case
- Log and review false positives/negatives

### DON'T

- Treat scores as absolute truth
- Block content solely based on llmverify scores
- Assume 100% detection of any category
- Use without understanding the algorithms
- Rely on it for legal/compliance guarantees

---

## Accuracy Transparency

| Feature | Estimated Accuracy | Confidence |
|---------|-------------------|------------|
| Prompt Injection | ~80% | Medium |
| PII (structured) | ~90% | High |
| PII (unstructured) | ~60% | Low |
| Hallucination Risk | ~65% | Low |
| Intent Classification | ~85% | Medium |
| JSON Repair | ~70% | Medium |

**Note**: These estimates are based on internal testing. Real-world accuracy depends heavily on your specific use case, data distribution, and configuration.

---

## Known Issues

1. **Baseline cold start**: Health monitoring is unreliable until baseline stabilizes (~5 samples). Early scores are informational only.

2. **Short response variance**: Very short responses have high score variance.

3. **English bias**: Pattern matching is optimized for English text.

4. **Provider differences**: Token counting may differ from provider's internal count.

5. **Network attribution**: Cannot distinguish network latency from model latency.

6. **PII false positives**: Regex patterns may flag random IDs, hex strings, or order numbers as PII. Use `minSeverity: 'high'` to reduce noise.

7. **Compression on simple prompts**: Short but valid answers to simple questions may be flagged as "compressed". Compression scores are most meaningful for complex, multi-part prompts.

---

## Tuning Guide

### Reduce PII False Positives

```typescript
// Only report high-severity PII findings
const config = {
  engines: {
    csm6: {
      pii: { enabled: true, minSeverity: 'high' }
    }
  }
};
```

### Reduce Hallucination False Positives

```typescript
// Lower weights for less sensitive detection
const result = classify(prompt, output, {
  hallucination: {
    weights: {
      speculative: 0.2,    // New entities are often legitimate
      fabricated: 0.2,     // JSON keys often aren't in prompt
      overconfident: 0.3,  // Focus on overconfident language
      contradiction: 0.1
    }
  }
});
```

### Relax Compression Thresholds

```typescript
// For simple Q&A workloads
const result = classify(prompt, output, {
  compression: {
    expectedWords: {
      level1: 20,   // Simple prompts (default: 30)
      level2: 80,   // Moderate prompts (default: 100)
      level3: 150   // Complex prompts (default: 200)
    }
  }
});
```

### Limit JSON Repair Aggressiveness

```typescript
// Only apply first 2 repair steps
const result = classify(prompt, output, {
  json: { maxRepairSteps: 2 }
});
```

### Handle Large Outputs

```typescript
// Limit scanning to first 50KB for performance
const result = classify(prompt, output, {
  performance: { maxOutputLength: 50000 }
});
```

### Wait for Baseline Stability

```typescript
const monitored = monitorLLM(client, {
  minSamplesForBaseline: 10  // Wait for 10 samples before trusting scores
});

// Check if baseline is stable before acting on scores
const baseline = monitored.getBaseline();
if (baseline.sampleCount >= 10) {
  // Baseline is stable, scores are meaningful
}
```

---

## Reporting Issues

If you find:
- False positives/negatives
- Edge cases not handled
- Accuracy issues

Please report at: https://github.com/subodhkc/llmverify-npm/issues

Include:
- Input/output that caused the issue
- Expected vs actual behavior
- Your configuration

---

## Legal Disclaimer

llmverify is provided "AS IS" without warranty of any kind. The authors are not liable for any damages arising from use of this software. 

llmverify does not:
- Guarantee detection of harmful content
- Provide legal compliance certification
- Replace professional security audits
- Constitute legal or professional advice

Users are responsible for:
- Validating suitability for their use case
- Implementing additional safeguards as needed
- Complying with applicable laws and regulations
- Human review of critical decisions

---

*Last updated: December 2024*
