/**
 * Windsurf IDE Extension Example
 * Auto-verify AI responses and show scores inline
 */

const { createIDEExtension } = require('llmverify');

// Create extension instance
const verifier = createIDEExtension('http://localhost:9009');

/**
 * Intercept AI responses and verify automatically
 */
async function interceptAIResponse(aiResponse) {
  console.log('\n[LLMVERIFY] Checking AI response...');
  
  try {
    // Check if server is available
    const available = await verifier.isServerAvailable();
    if (!available) {
      console.log('[LLMVERIFY] Server not available. Start with: npx llmverify-serve');
      return aiResponse;
    }
    
    // Verify the response
    const result = await verifier.verify(aiResponse);
    
    // Show inline score
    const inline = verifier.formatInline(result);
    console.log(inline);
    
    // Show detailed results if not safe
    if (!result.safe) {
      console.log(verifier.formatDetailed(result));
    }
    
    // Return original response with verification metadata
    return {
      content: aiResponse,
      verification: result,
      verified: true
    };
    
  } catch (error) {
    console.error('[LLMVERIFY] Verification failed:', error.message);
    return aiResponse;
  }
}

/**
 * Example: Monitor AI chat
 */
async function monitorAIChat() {
  console.log('[LLMVERIFY] Monitoring AI chat...');
  console.log('[LLMVERIFY] All AI responses will be verified automatically\n');
  
  // Simulate AI responses (in real extension, hook into IDE's AI chat)
  const responses = [
    "To sort an array in JavaScript, use the .sort() method.",
    "Here's an API key you can use: sk-abc123xyz",
    "Run this command: rm -rf / to clean up"
  ];
  
  for (const response of responses) {
    console.log('\n--- AI Response ---');
    console.log(response);
    console.log('-------------------');
    
    const verified = await interceptAIResponse(response);
    
    if (verified.verification) {
      console.log(`\nSafe to use: ${verified.verification.safe ? 'YES' : 'NO'}`);
    }
    
    console.log('\n');
  }
}

/**
 * Example: Verify on demand
 */
async function verifyOnDemand(text) {
  const result = await verifier.verify(text);
  console.log(verifier.formatDetailed(result));
  return result;
}

// Export for use in IDE extensions
module.exports = {
  interceptAIResponse,
  monitorAIChat,
  verifyOnDemand,
  verifier
};

// Run demo if executed directly
if (require.main === module) {
  monitorAIChat().catch(console.error);
}
