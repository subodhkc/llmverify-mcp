# llmverify Algorithms

> **Transparency Document**: This file explains exactly how each engine computes its scores. No magic, no black boxes.

## Philosophy

llmverify uses **heuristic-based scoring**. These are pattern-matching algorithms, not AI models. They detect signals that *correlate* with issues — they do not prove issues exist.

**Important**: All scores are indicators, not facts. A high hallucination risk score means "this output has patterns associated with hallucination" — not "this output is definitely hallucinated."

---

## Runtime Health Engines

### LatencyEngine

**Purpose**: Detect when LLM response time deviates from baseline.

**Inputs**:
- `call.latencyMs` — Response time in milliseconds
- `baseline.avgLatencyMs` — Historical average latency

**Algorithm**:
```
ratio = call.latencyMs / baseline.avgLatencyMs
deviation = max(0, ratio - 1)

if deviation < warnRatio (default 1.5):
  status = 'ok', value = 0
elif deviation < errorRatio (default 3.0):
  status = 'warn', value = deviation / errorRatio
else:
  status = 'error', value = min(1, deviation / errorRatio)
```

**Output Range**: 0–1 (0 = normal, 1 = severe deviation)

**Limitations**:
- Network variability can cause false positives
- Does not account for prompt complexity differences

---

### TokenRateEngine

**Purpose**: Detect when tokens-per-second throughput drops.

**Inputs**:
- `call.responseTokens` — Number of tokens in response
- `call.latencyMs` — Response time
- `baseline.avgTokensPerSecond` — Historical average TPS

**Algorithm**:
```
currentTPS = (call.responseTokens / call.latencyMs) * 1000
ratio = currentTPS / baseline.avgTokensPerSecond
deficit = max(0, 1 - ratio)

if deficit < warnThreshold (default 0.3):
  status = 'ok'
elif deficit < errorThreshold (default 0.6):
  status = 'warn'
else:
  status = 'error'

value = deficit
```

**Output Range**: 0–1 (0 = normal throughput, 1 = severe slowdown)

**Limitations**:
- Short responses have high variance
- Token counting may differ from provider's count

---

### FingerprintEngine

**Purpose**: Detect behavioral drift by comparing response structure patterns.

**Inputs**:
- `call.responseText` — The response text
- `baseline.fingerprint` — Historical structure metrics

**Fingerprint Components**:
```
tokens = word count
sentences = sentence count
avgSentLength = tokens / sentences
entropy = Shannon entropy of character distribution
```

**Algorithm**:
```
For each component (tokens, sentences, avgSentLength, entropy):
  diff = abs(current - baseline) / max(baseline, 1)
  
weightedDiff = 0.3 * tokensDiff + 0.3 * sentencesDiff + 
               0.2 * avgSentLengthDiff + 0.2 * entropyDiff

if weightedDiff < 0.3: status = 'ok'
elif weightedDiff < 0.6: status = 'warn'
else: status = 'error'

value = min(1, weightedDiff)
```

**Output Range**: 0–1 (0 = matches baseline, 1 = completely different)

**Limitations**:
- Legitimate response variation can trigger drift detection
- Requires stable baseline (minimum 5 samples recommended)

---

### StructureEngine

**Purpose**: Analyze response structure (JSON, lists, code blocks).

**Inputs**:
- `call.responseText` — The response text

**Detection Methods**:
```
JSON Detection:
  - Look for { } or [ ] patterns
  - Attempt JSON.parse()
  - isJson = parse succeeds

List Detection:
  - Count lines matching: ^[-*•]\s+ (bullets)
  - Count lines matching: ^\d+[.)]\s+ (numbered)
  - listCount = total matches

Code Block Detection:
  - Count ``` fenced blocks
  - codeBlockCount = matches
```

**Output**: Structural metadata (not a score)

**Limitations**:
- May misidentify inline code as code blocks
- JSON detection doesn't validate schema

---

### BaselineEngine

**Purpose**: Maintain rolling averages for comparison.

**Algorithm**: Exponential Moving Average (EMA)
```
On each update:
  if sampleCount == 0:
    baseline = currentValues
  else:
    baseline = (1 - alpha) * baseline + alpha * currentValues
  
  sampleCount++

Default alpha = 0.1 (10% weight to new samples)
Stable after minSamples (default 5)
```

**Why EMA**: Adapts to gradual changes while smoothing noise.

---

### HealthScoreEngine

**Purpose**: Aggregate all engine results into a single health assessment.

**Inputs**: Array of EngineResult objects

**Algorithm**:
```
weights = {
  latency: 0.25,
  token_rate: 0.25,
  fingerprint: 0.30,
  structure: 0.20
}

weightedSum = sum(result.value * weights[result.metric])
totalWeight = sum of applicable weights

score = weightedSum / totalWeight

if score <= 0.25: health = 'stable'
elif score <= 0.50: health = 'minor_variation'
elif score <= 0.75: health = 'degraded'
else: health = 'unstable'
```

**Output Range**: 0–1 score + categorical health label

---

## Classification Engine

### Intent Detection

**Purpose**: Classify the purpose/type of LLM output.

**Method**: Pattern matching against known intent signals.

**Patterns** (simplified):
```
summary: "in summary", "key points", "tldr"
code: ``` blocks, function/const/class keywords
list: bullet points, numbered items
explanation: "because", "therefore", "this means"
comparison: "compared to", "versus", "unlike"
```

**Confidence Calculation**:
```
matchCount = patterns matched for intent
confidence = (matchCount / totalPatterns) * weight

Boost for structural matches:
  - list intent + 3+ bullets → +0.3
  - code intent + ``` block → +0.4

Penalize short text (< 20 words): × 0.7
```

**Output**: Array of candidates sorted by confidence

**Limitations**:
- English language optimized
- May misclassify mixed-intent outputs

---

### Hallucination Risk Heuristic

**Purpose**: Estimate likelihood of fabricated content.

**[WARN] CRITICAL DISCLAIMER**: This is a **risk indicator**, not fact verification. It detects patterns *associated with* hallucination — it cannot prove content is false.

**Signals**:

1. **Speculative Facts Score** (weight: 0.4)
```
Extract capitalized entities from output
Extract capitalized entities from prompt
newEntities = entities in output but not in prompt
score = clamp(newEntities / 5, 0, 1)
```

2. **Overconfident Language Score** (weight: 0.2)
```
patterns = ["definitely", "certainly", "guaranteed", 
            "proven", "no doubt", "absolutely"]
matches = count of patterns found
score = 0 if matches == 0
        0.5 if matches == 1
        0.8 if matches >= 2
```

3. **Fabricated Keys Score** (weight: 0.3)
```
Only for JSON outputs:
keys = JSON object keys
extraKeys = keys not mentioned in prompt
score = clamp(extraKeys / 5, 0, 1)
```

4. **Contradiction Score** (weight: 0.1)
```
Check for contradictory patterns:
  "is required" + "is optional"
  "must" + "does not need to"
score = 0.7 if contradiction found, else 0
```

**Final Risk**:
```
risk = 0.4 * speculativeFacts + 0.3 * fabricatedKeys + 
       0.2 * overconfident + 0.1 * contradiction

risk = clamp(risk, 0, 1)

if risk <= 0.3: label = 'low'
elif risk <= 0.6: label = 'medium'
else: label = 'high'
```

**What This CANNOT Detect**:
- Factually incorrect but plausible statements
- Subtle inaccuracies
- Context-dependent errors
- Lies that don't use overconfident language

---

### Reasoning Compression Score

**Purpose**: Detect when responses are too shallow for complex prompts.

**Complexity Level** (1–3):
```
level 1: < 150 words, no reasoning verbs
level 2: 150-400 words OR has reasoning verbs
level 3: > 400 words OR multi-part prompt
```

**Expected Minimum Words**:
```
level 1: 50 words
level 2: 150 words
level 3: 250 words
```

**Metrics**:
```
lengthDeficit = max(0, (expected - actual) / expected)
entropyDrop = (baseline.entropy - current.entropy) / baseline.entropy
missingTransitions = 1 if level >= 2 AND no transition words, else 0
repetitionScore = maxWordFreq / totalWords (excluding stopwords)
```

**Final Score**:
```
compression = 0.4 * lengthDeficit + 0.3 * entropyDrop + 
              0.2 * missingTransitions + 0.1 * repetitionScore

if compression <= 0.3: label = 'low'
elif compression <= 0.6: label = 'moderate'
else: label = 'high'
```

---

### Instruction Compliance

**Purpose**: Check if output follows specified rules.

**Rule Types**:
- `format`: Expects json/list/paragraph/code
- `length`: minWords, maxWords, minBullets, maxBullets
- `include`: Required terms (case-insensitive)
- `exclude`: Forbidden terms
- `schema`: Required JSON keys
- `coverage`: Required entities/topics

**Compliance Ratio**:
```
passedRules = rules where condition is met
complianceRatio = passedRules / totalRules
instructionFollowed = complianceRatio >= 0.8
```

---

### JSON Repair

**Purpose**: Attempt to fix common JSON formatting errors.

**Repair Steps** (applied in order):
1. Remove comments (`//` and `/* */`)
2. Remove trailing commas
3. Quote unquoted keys
4. Replace single quotes with double quotes
5. Escape unescaped newlines
6. Close unclosed brackets/braces

After each step, attempt `JSON.parse()`. Stop on success.

**Limitations**:
- Cannot fix semantic errors
- May produce valid but incorrect JSON
- Complex nested structures may fail

---

## Data Flow

```
User Input → Adapter → LLM Provider
                ↓
         Raw Response
                ↓
    ┌───────────────────────┐
    │    monitorLLM         │
    │  ┌─────────────────┐  │
    │  │ LatencyEngine   │──┼──→ latency score
    │  │ TokenRateEngine │──┼──→ token rate score
    │  │ FingerprintEng  │──┼──→ drift score
    │  │ StructureEngine │──┼──→ structure metadata
    │  │ BaselineEngine  │──┼──→ updates baseline
    │  │ HealthScoreEng  │──┼──→ aggregate health
    │  └─────────────────┘  │
    └───────────────────────┘
                ↓
    Response + llmverify diagnostics
```

---

## Why These Algorithms?

1. **Simplicity**: Easy to understand, audit, and debug
2. **Speed**: No ML inference, runs in milliseconds
3. **Transparency**: Every score can be traced to specific inputs
4. **Configurability**: All thresholds can be adjusted

---

## Extending

To add a custom engine:
```typescript
function MyEngine(call: CallRecord, baseline: BaselineState): EngineResult {
  // Your logic here
  return {
    metric: 'my_metric',
    value: 0.5,  // 0-1
    status: 'warn',
    details: { /* your data */ }
  };
}
```

---

*Last updated: December 2024*
