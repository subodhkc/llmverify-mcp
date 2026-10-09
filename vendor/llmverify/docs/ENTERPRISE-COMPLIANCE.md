# Enterprise Compliance Guide

Complete guide for enterprise deployments, compliance requirements, and testing protocols for llmverify.

---

## Table of Contents

1. [Compliance Scenarios](#compliance-scenarios)
2. [Testing Requirements](#testing-requirements)
3. [Deployment Protocols](#deployment-protocols)
4. [Audit Commands](#audit-commands)
5. [Security Verification](#security-verification)
6. [Compliance Reports](#compliance-reports)
7. [Industry-Specific Requirements](#industry-specific-requirements)

---

## Compliance Scenarios

### Scenario 1: Healthcare (HIPAA Compliance)

**Requirements:**
- PII detection enabled
- PHI (Protected Health Information) scanning
- Audit logging
- Data residency controls
- Zero network requests

**Configuration:**
```javascript
const config = {
  tier: 'enterprise',
  privacy: {
    allowNetworkRequests: false,
    telemetryEnabled: false,
    dataResidency: 'US'
  },
  engines: {
    csm6: {
      enabled: true,
      profile: 'health',
      pii: {
        enabled: true,
        minSeverity: 'low',
        categories: ['personal', 'health', 'financial']
      }
    }
  }
};
```

**Testing Commands:**
```bash
# Run full test suite
npm test

# Run compliance-specific tests
npm run test:coverage

# Verify PII detection
node -e "const {verify} = require('./dist/verify'); verify({content: 'Patient John Doe, SSN: 123-45-6789', config: {engines: {csm6: {enabled: true, profile: 'health'}}}}).then(r => console.log(JSON.stringify(r.csm6.findings, null, 2)));"

# Generate audit report
npm run doctor
```

**Expected Results:**
- All PII detected and flagged
- No network requests made
- Audit trail generated
- Zero data leakage

---

### Scenario 2: Financial Services (SOC 2, PCI-DSS)

**Requirements:**
- Financial data detection
- Credential scanning
- Security vulnerability checks
- Compliance reporting
- Encrypted storage

**Configuration:**
```javascript
const config = {
  tier: 'enterprise',
  privacy: {
    allowNetworkRequests: false,
    telemetryEnabled: false,
    dataResidency: 'US'
  },
  engines: {
    csm6: {
      enabled: true,
      profile: 'finance',
      pii: {
        enabled: true,
        minSeverity: 'low',
        categories: ['financial', 'credential', 'personal']
      },
      checks: {
        security: true,
        privacy: true,
        safety: true,
        fairness: true,
        reliability: true,
        transparency: true
      }
    }
  }
};
```

**Testing Commands:**
```bash
# Full compliance test
npm run prepublishOnly

# Security-specific tests
npm test -- --testNamePattern="security"

# Verify credential detection
node -e "const {verify} = require('./dist/verify'); verify({content: 'API Key: sk_test_123456789', config: {engines: {csm6: {enabled: true, profile: 'finance'}}}}).then(r => console.log(JSON.stringify(r.csm6.findings, null, 2)));"

# Generate SOC 2 compliance report
npm run doctor > compliance-report.txt
```

---

### Scenario 3: Government (FedRAMP, FISMA)

**Requirements:**
- Highest security profile
- Complete audit trail
- No external dependencies
- Offline operation
- Detailed logging

**Configuration:**
```javascript
const config = {
  tier: 'enterprise',
  privacy: {
    allowNetworkRequests: false,
    telemetryEnabled: false,
    dataResidency: 'US'
  },
  engines: {
    hallucination: { enabled: true },
    consistency: { enabled: true },
    jsonValidator: { enabled: true },
    csm6: {
      enabled: true,
      profile: 'high_risk',
      checks: {
        security: true,
        privacy: true,
        safety: true,
        fairness: true,
        reliability: true,
        transparency: true
      }
    }
  },
  output: {
    verbose: true,
    includeEvidence: true,
    includeMethodology: true,
    includeLimitations: true
  }
};
```

**Testing Commands:**
```bash
# Complete test suite with coverage
npm run test:coverage

# Integration tests
npm run test:integration

# Type safety verification
npm run typecheck

# Build verification
npm run build

# Full prepublish check
npm run prepublishOnly
```

---

### Scenario 4: Research Institutions (IRB Compliance)

**Requirements:**
- Research data protection
- Participant privacy
- Data integrity verification
- Reproducible results
- Methodology transparency

**Configuration:**
```javascript
const config = {
  tier: 'professional',
  privacy: {
    allowNetworkRequests: false,
    telemetryEnabled: false
  },
  engines: {
    csm6: {
      enabled: true,
      profile: 'research',
      checks: {
        security: true,
        privacy: true,
        fairness: true,
        reliability: true,
        transparency: true
      }
    }
  },
  output: {
    verbose: true,
    includeEvidence: true,
    includeMethodology: true,
    includeLimitations: true
  }
};
```

---

## Testing Requirements

### Pre-Deployment Testing

**Required Tests:**
```bash
# 1. Type checking
npm run typecheck

# 2. Build verification
npm run build

# 3. Unit tests
npm test

# 4. Integration tests
npm run test:integration

# 5. Coverage analysis
npm run test:coverage

# 6. Prepublish validation
npm run prepublishOnly
```

**Expected Results:**
- All tests pass (654 tests)
- Coverage > 90%
- No TypeScript errors
- Build successful
- Integration tests pass

---

### Continuous Testing

**During Development:**
```bash
# Watch mode for instant feedback
npm run test:watch
```

**Before Commits:**
```bash
# Quick validation
npm run typecheck && npm test
```

**Before Deployment:**
```bash
# Full validation
npm run prepublishOnly
```

---

## Deployment Protocols

### Step 1: Pre-Deployment Validation

```bash
# Clean build
npm run build:clean

# Full test suite
npm run prepublishOnly

# Verify package contents
npm pack --dry-run
```

---

### Step 2: Security Verification

```bash
# Check for secrets
npm pack
tar -tzf llmverify-*.tgz | grep -E '\.(env|key|pem|secret)'

# Should return nothing (exit code 1 is good)
```

---

### Step 3: Compliance Verification

```bash
# Generate compliance report
npm run doctor > compliance-report-$(date +%Y%m%d).txt

# Review report for any issues
cat compliance-report-*.txt
```

---

### Step 4: Integration Testing

```bash
# Start server
npm run serve:force

# Run integration tests
npm run test:integration

# Verify all endpoints
curl http://localhost:9009/health
```

---

## Audit Commands

### Generate Audit Report

```bash
npm run doctor
```

**Output:**
```
llmverify System Diagnostics

SYSTEM INFO:
  Version: 1.4.0
  Node.js: v20.x.x
  Platform: linux
  Architecture: x64

CONFIGURATION:
  Tier: enterprise
  Privacy Mode: strict
  Network Requests: disabled
  Telemetry: disabled

ENGINES:
  Hallucination Detection: enabled
  Consistency Analysis: enabled
  JSON Validator: enabled
  CSM6 Security: enabled (high_risk profile)

HEALTH CHECKS:
  [PASS] All engines operational
  [PASS] Privacy controls active
  [PASS] No network dependencies
  [PASS] Audit logging enabled

COMPLIANCE STATUS:
  HIPAA: compliant
  SOC 2: compliant
  GDPR: compliant
  FedRAMP: compliant
```

---

### Verify Specific Content

```bash
# Verify AI response
npm run verify -- --content "AI response text here"

# Verify with specific profile
npm run verify -- --content "text" --profile health

# Verify with JSON output
npm run verify -- --content "text" --format json
```

---

## Security Verification

### Test PII Detection

```bash
# Test SSN detection
node -e "const {verify} = require('./dist/verify'); verify({content: 'SSN: 123-45-6789'}).then(r => console.log('PII Detected:', r.csm6.findings.length > 0));"

# Test email detection
node -e "const {verify} = require('./dist/verify'); verify({content: 'Email: user@example.com'}).then(r => console.log('PII Detected:', r.csm6.findings.length > 0));"

# Test credit card detection
node -e "const {verify} = require('./dist/verify'); verify({content: 'Card: 4532-1234-5678-9010'}).then(r => console.log('PII Detected:', r.csm6.findings.length > 0));"
```

---

### Test Security Vulnerabilities

```bash
# Test SQL injection detection
node -e "const {verify} = require('./dist/verify'); verify({content: 'SELECT * FROM users WHERE id = 1 OR 1=1'}).then(r => console.log('SQL Injection:', r.csm6.findings.some(f => f.type === 'sql_injection')));"

# Test command injection
node -e "const {verify} = require('./dist/verify'); verify({content: 'rm -rf /'}).then(r => console.log('Command Injection:', r.csm6.findings.some(f => f.type === 'dangerous_command')));"

# Test path traversal
node -e "const {verify} = require('./dist/verify'); verify({content: '../../../etc/passwd'}).then(r => console.log('Path Traversal:', r.csm6.findings.some(f => f.type === 'path_traversal')));"
```

---

## Compliance Reports

### Generate HTML Coverage Report

```bash
# Run tests with coverage
npm run test:coverage

# View HTML report
# Windows
start coverage/lcov-report/index.html

# Mac
open coverage/lcov-report/index.html

# Linux
xdg-open coverage/lcov-report/index.html
```

---

### Generate JSON Report

```bash
# Run tests with JSON output
npm test -- --json --outputFile=test-results.json

# View results
cat test-results.json | jq '.testResults[] | {name: .name, status: .status}'
```

---

### Generate Compliance Summary

```bash
# Create compliance summary
cat > generate-compliance-summary.js << 'EOF'
const { verify } = require('./dist/verify');

async function generateSummary() {
  const testCases = [
    { name: 'PII Detection', content: 'SSN: 123-45-6789' },
    { name: 'SQL Injection', content: 'SELECT * FROM users WHERE 1=1' },
    { name: 'Command Injection', content: 'rm -rf /' },
    { name: 'Safe Content', content: 'This is safe content' }
  ];

  console.log('COMPLIANCE SUMMARY\n');
  console.log('Date:', new Date().toISOString());
  console.log('Version: 1.4.0\n');

  for (const test of testCases) {
    const result = await verify({ content: test.content });
    console.log(`[${test.name}]`);
    console.log(`  Risk Level: ${result.risk.level}`);
    console.log(`  Findings: ${result.csm6.findings.length}`);
    console.log(`  Status: ${result.csm6.passed ? 'PASS' : 'FAIL'}\n`);
  }
}

generateSummary();
EOF

node generate-compliance-summary.js
```

---

## Industry-Specific Requirements

### Healthcare (HIPAA)

**Required Commands:**
```bash
# Pre-deployment
npm run prepublishOnly

# PII verification
npm test -- --testNamePattern="PII"

# Privacy compliance
npm run doctor

# Audit trail
npm run verify -- --content "test" --audit
```

**Compliance Checklist:**
- [ ] All tests pass
- [ ] PII detection enabled
- [ ] No network requests
- [ ] Audit logging active
- [ ] Data residency configured
- [ ] Encryption at rest
- [ ] Access controls implemented

---

### Financial (SOC 2, PCI-DSS)

**Required Commands:**
```bash
# Security testing
npm test -- --testNamePattern="security"

# Credential detection
npm test -- --testNamePattern="credential"

# Full compliance
npm run prepublishOnly

# Coverage report
npm run test:coverage
```

**Compliance Checklist:**
- [ ] Security tests pass
- [ ] Credential detection works
- [ ] No secrets in package
- [ ] Audit trail complete
- [ ] Encryption verified
- [ ] Access logs enabled

---

### Government (FedRAMP)

**Required Commands:**
```bash
# Complete test suite
npm run test:coverage

# Integration verification
npm run test:integration

# Type safety
npm run typecheck

# Build verification
npm run build

# Prepublish check
npm run prepublishOnly
```

**Compliance Checklist:**
- [ ] All tests pass (654/654)
- [ ] Coverage > 90%
- [ ] No TypeScript errors
- [ ] Build successful
- [ ] Integration tests pass
- [ ] No external dependencies
- [ ] Offline operation verified
- [ ] Audit trail complete

---

### Research (IRB)

**Required Commands:**
```bash
# Reproducibility test
npm test

# Methodology verification
npm run doctor

# Data integrity
npm run test:integration
```

**Compliance Checklist:**
- [ ] Results reproducible
- [ ] Methodology documented
- [ ] Limitations disclosed
- [ ] Privacy protected
- [ ] Data integrity verified

---

## Quick Reference

### Essential Commands

```bash
# Pre-deployment validation
npm run prepublishOnly

# Full test suite with coverage
npm run test:coverage

# Integration testing
npm run test:integration

# Security verification
npm test -- --testNamePattern="security"

# Compliance report
npm run doctor

# Type checking
npm run typecheck
```

---

### Compliance Workflow

```bash
# 1. Clean build
npm run build:clean

# 2. Type check
npm run typecheck

# 3. Run all tests
npm test

# 4. Integration tests
npm run test:integration

# 5. Coverage analysis
npm run test:coverage

# 6. Prepublish validation
npm run prepublishOnly

# 7. Generate compliance report
npm run doctor > compliance-report.txt

# 8. Verify package
npm pack --dry-run
```

---

## Troubleshooting

### Test Failures

**Issue:** Tests fail during prepublishOnly

**Solution:**
```bash
# Check specific failing tests
npm test -- --verbose

# Run tests individually
npm test -- --testNamePattern="specific test"

# Check for environment issues
npm run doctor
```

---

### Coverage Issues

**Issue:** Coverage below threshold

**Solution:**
```bash
# View detailed coverage
npm run test:coverage

# Open HTML report
start coverage/lcov-report/index.html

# Identify uncovered lines
cat coverage/lcov.info | grep -A 5 "LF:0"
```

---

### Integration Test Timeouts

**Issue:** Integration tests timeout

**Solution:**
```bash
# Increase timeout
npm run test:integration -- --testTimeout=30000

# Check server status
npm run serve:force

# Verify port availability
netstat -ano | findstr :9009
```

---

## Support

For enterprise support and compliance assistance:

- Documentation: See [COMMANDS.md](COMMANDS.md)
- Errors: See [ERROR-GUIDE.md](ERROR-GUIDE.md)
- Security: See [SECURITY.md](../SECURITY.md)
- Issues: https://github.com/subodhkc/llmverify-npm/issues

---

## Summary

**Enterprise Deployment Checklist:**

1. [ ] Run `npm run prepublishOnly`
2. [ ] Run `npm run test:coverage`
3. [ ] Run `npm run test:integration`
4. [ ] Generate compliance report: `npm run doctor`
5. [ ] Verify package contents: `npm pack --dry-run`
6. [ ] Check for secrets in package
7. [ ] Review coverage report (>90%)
8. [ ] Document compliance status
9. [ ] Archive audit logs
10. [ ] Deploy with monitoring

**All systems must be green before production deployment.**
