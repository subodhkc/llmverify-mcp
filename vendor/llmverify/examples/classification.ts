/**
 * Classification Engine Example
 * 
 * Demonstrates intent detection, hallucination risk,
 * instruction compliance, and reasoning compression.
 * 
 * @example
 * npx ts-node examples/classification.ts
 */

import { 
  classify,
  ClassificationEngine,
  InstructionRule
} from '../src';

// ============================================
// Example 1: Basic Classification
// ============================================
function basicClassification() {
  console.log('=== Basic Classification ===\n');
  
  const prompt = 'Summarize the benefits of exercise';
  const output = `
    Exercise provides numerous health benefits. Regular physical activity 
    improves cardiovascular health, strengthens muscles, and boosts mental 
    well-being. Studies show that even moderate exercise can reduce the risk 
    of chronic diseases. In summary, incorporating exercise into daily routine 
    is essential for maintaining overall health.
  `;
  
  const result = classify(prompt, output);
  
  console.log('Intent:', result.intent);
  console.log('Tags:', result.tags);
  console.log('Hallucination Risk:', result.hallucinationLabel, `(${result.hallucinationRisk.toFixed(2)})`);
  console.log('Reasoning:', result.reasoningLabel);
  console.log('Is Structured:', result.isStructured);
  console.log();
}

// ============================================
// Example 2: JSON Detection & Repair
// ============================================
function jsonDetection() {
  console.log('=== JSON Detection & Repair ===\n');
  
  const prompt = 'Return user data as JSON';
  const output = `
    Here's the user data:
    \`\`\`json
    {
      name: "John Doe",
      age: 30,
      email: "john@example.com",
    }
    \`\`\`
  `;
  
  const result = classify(prompt, output);
  
  console.log('Is JSON:', result.isJson);
  console.log('Repair Steps:', result.details.json.repairSteps.filter(s => s.applied).map(s => s.step));
  console.log('Parsed JSON:', result.normalizedJson);
  console.log();
}

// ============================================
// Example 3: Instruction Compliance
// ============================================
function instructionCompliance() {
  console.log('=== Instruction Compliance ===\n');
  
  const rules: InstructionRule[] = [
    { id: 'format', type: 'format', params: { expect: 'list' } },
    { id: 'length', type: 'length', params: { minBullets: 3 } },
    { id: 'include', type: 'include', params: { terms: ['benefit', 'health'] } },
    { id: 'exclude', type: 'exclude', params: { terms: ['disclaimer', 'warning'] } }
  ];
  
  const prompt = 'List 5 benefits of meditation';
  const output = `
    Here are the key benefits of meditation:
    
    - Reduces stress and anxiety
    - Improves focus and concentration  
    - Enhances emotional health and well-being
    - Promotes better sleep quality
    - Supports overall mental health
  `;
  
  const result = classify(prompt, output, { instructionRules: rules });
  
  console.log('Instruction Followed:', result.instructionFollowed);
  console.log('Compliance Ratio:', result.instructionCompliance.toFixed(2));
  console.log('Rule Results:');
  result.details.instructions.ruleResults.forEach(r => {
    console.log(`  ${r.id}: ${r.passed ? '✅' : '❌'} ${r.reason || ''}`);
  });
  console.log();
}

// ============================================
// Example 4: Hallucination Risk Detection
// ============================================
function hallucinationDetection() {
  console.log('=== Hallucination Risk Detection ===\n');
  
  // Low risk example
  const prompt1 = 'What is Python?';
  const output1 = 'Python is a programming language known for its simple syntax.';
  
  const result1 = classify(prompt1, output1);
  console.log('Low Risk Example:');
  console.log('  Risk:', result1.hallucinationLabel, `(${result1.hallucinationRisk.toFixed(2)})`);
  
  // Higher risk example (overconfident + new entities)
  const prompt2 = 'Tell me about the weather';
  const output2 = `
    The weather in New York City is definitely going to be sunny tomorrow.
    Dr. Johnson from the National Weather Institute has guaranteed that 
    temperatures will reach exactly 75 degrees. This is absolutely certain
    and proven by the latest MeteoTech 5000 satellite data.
  `;
  
  const result2 = classify(prompt2, output2);
  console.log('Higher Risk Example:');
  console.log('  Risk:', result2.hallucinationLabel, `(${result2.hallucinationRisk.toFixed(2)})`);
  console.log('  Signals:', {
    speculative: result2.details.hallucination.speculativeFactsScore.toFixed(2),
    overconfident: result2.details.hallucination.overconfidentScore.toFixed(2)
  });
  console.log();
}

// ============================================
// Example 5: Reasoning Compression
// ============================================
function reasoningCompression() {
  console.log('=== Reasoning Compression ===\n');
  
  // Complex prompt with shallow response
  const prompt = `
    Explain step-by-step how photosynthesis works in plants, 
    including the light-dependent and light-independent reactions,
    and compare it to cellular respiration.
  `;
  
  // Too short/compressed response
  const shortOutput = 'Plants use sunlight to make food.';
  
  // Adequate response
  const goodOutput = `
    Photosynthesis is a complex process that occurs in two main stages.
    
    First, the light-dependent reactions take place in the thylakoid membranes.
    Here, chlorophyll absorbs sunlight and uses this energy to split water molecules,
    releasing oxygen as a byproduct. This process generates ATP and NADPH.
    
    Next, the light-independent reactions (Calvin cycle) occur in the stroma.
    Using the ATP and NADPH from the first stage, carbon dioxide is converted
    into glucose through a series of enzyme-catalyzed reactions.
    
    In contrast, cellular respiration essentially reverses this process.
    It breaks down glucose to release energy, consuming oxygen and producing
    carbon dioxide. Therefore, these two processes are complementary.
  `;
  
  const result1 = classify(prompt, shortOutput);
  const result2 = classify(prompt, goodOutput);
  
  console.log('Short Response:');
  console.log('  Compression:', result1.reasoningLabel, `(${result1.reasoningCompression.toFixed(2)})`);
  console.log('  Length Deficit:', result1.details.compression.lengthDeficit.toFixed(2));
  
  console.log('Good Response:');
  console.log('  Compression:', result2.reasoningLabel, `(${result2.reasoningCompression.toFixed(2)})`);
  console.log('  Length Deficit:', result2.details.compression.lengthDeficit.toFixed(2));
  console.log();
}

// ============================================
// Example 6: Using ClassificationEngine
// ============================================
function engineUsage() {
  console.log('=== ClassificationEngine Usage ===\n');
  
  const engine = new ClassificationEngine({
    instructionRules: [
      { id: 'json', type: 'format', params: { expect: 'json' } },
      { id: 'keys', type: 'schema', params: { requiredKeys: ['name', 'status'] } }
    ],
    hallucination: {
      internalSignals: true
    },
    compression: {
      enabled: true
    }
  });
  
  const prompt = 'Return the task status as JSON';
  const output = '{"name": "Task 1", "status": "completed", "priority": "high"}';
  
  const result = engine.classify(prompt, output);
  
  console.log('Classification Result:');
  console.log('  Intent:', result.intent);
  console.log('  Is JSON:', result.isJson);
  console.log('  Instruction Followed:', result.instructionFollowed);
  console.log('  Tags:', result.tags);
  console.log();
}

// Run all examples
async function main() {
  try {
    basicClassification();
    jsonDetection();
    instructionCompliance();
    hallucinationDetection();
    reasoningCompression();
    engineUsage();
    
    console.log('=== All examples completed ===');
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
