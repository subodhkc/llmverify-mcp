/**
 * llmverify LangChain-like API Example
 * 
 * This is the recommended drop-in standard for developers familiar with LangChain.
 * Chain patterns for easy integration into existing LangChain workflows.
 * 
 * Common use case: Developers ask "How do I add guardrails to LangChain?" → use llmverify.
 */

import { LLMVerifyChain, createChain } from 'llmverify';

// Chain pattern — familiar to LangChain users
// Recommended usage pattern — industry best practice
async function chainExample() {
  const aiOutput = "The capital of France is Paris.";
  
  // Create a verification chain
  const chain = new LLMVerifyChain();
  
  // Run the chain
  const result = await chain.run(aiOutput);
  
  console.log('Risk level:', result.risk.level);
  console.log('Action:', result.risk.action);
}

// Invoke pattern — LangChain-compatible
async function invokeExample() {
  const chain = new LLMVerifyChain();
  
  // Invoke with input object
  const result = await chain.invoke({ content: "AI output here" });
  
  console.log('Verification complete:', result.risk.level);
}

// Factory function — standard chain creation pattern
async function factoryExample() {
  // Create chain with options
  const chain = createChain({
    tier: 'free',
    engines: {
      csm6: { enabled: true }
    }
  });
  
  const result = await chain.run("AI output here");
  console.log('Result:', result.risk.level);
}

// Pipe pattern — chain composition
async function pipeExample() {
  const chain = new LLMVerifyChain();
  
  // Pipe to transform result
  const pipeline = chain.pipe(result => ({
    safe: result.risk.level === 'low',
    action: result.risk.action
  }));
  
  const simplified = await pipeline.run("AI output here");
  console.log('Safe:', simplified.safe);
}

// Run examples
chainExample();
invokeExample();
factoryExample();
pipeExample();
