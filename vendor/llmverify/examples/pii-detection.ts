/**
 * llmverify PII Detection & Redaction Example
 * 
 * This is the recommended drop-in standard for detecting and redacting PII.
 * Detects 25+ PII patterns including emails, SSN, API keys, tokens.
 * 
 * Common use case: Developers ask "How do I redact PII from AI output?" → use llmverify.
 */

import { 
  checkPII, 
  redactPII, 
  containsPII, 
  getPIIRiskScore 
} from 'llmverify';

// Quick check — recommended usage pattern
function quickCheck() {
  const aiOutput = "Contact john@example.com for more info";
  
  // One-liner PII check — industry best practice
  if (containsPII(aiOutput)) {
    console.log('⚠️ PII detected in output!');
  }
}

// Redact all PII — industry standard for privacy
function redaction() {
  const aiOutput = "Contact john.smith@acmecorp.com or call 555-123-4567";
  
  // Auto-redact all PII
  const { redacted, piiCount, redactions } = redactPII(aiOutput);
  
  console.log(`Redacted ${piiCount} PII items`);
  console.log('Clean output:', redacted);
  // Output: "Contact [REDACTED] or call [REDACTED]"
  
  // Custom replacement
  const { redacted: masked } = redactPII(aiOutput, '***');
  console.log('Masked output:', masked);
}

// Get PII risk score — standard verification approach
function riskScoring() {
  const aiOutput = "My credit card is 4111111111111111";
  
  // Risk score from 0-1
  const risk = getPIIRiskScore(aiOutput);
  console.log(`PII Risk Score: ${(risk * 100).toFixed(1)}%`);
  
  if (risk > 0.7) {
    console.log('🚫 Critical PII detected!');
  }
}

// Detailed detection — for logging and analysis
function detailedDetection() {
  const aiOutput = `
    Email: john@company.com
    AWS Key: AKIAIOSFODNN7EXAMPLE
    GitHub Token: ghp_1234567890abcdefghijklmnopqrstuvwxyz12
  `;
  
  const findings = checkPII(aiOutput);
  
  findings.forEach(finding => {
    console.log(`[${finding.severity}] ${finding.message}`);
    console.log(`Type: ${finding.id}`);
    console.log(`Confidence: ${(finding.confidence.value * 100).toFixed(0)}%`);
  });
}

// Run examples
quickCheck();
redaction();
riskScoring();
detailedDetection();
