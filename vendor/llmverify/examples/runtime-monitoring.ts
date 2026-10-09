/**
 * Runtime Health Monitoring Example
 * 
 * Demonstrates how to use the monitorLLM wrapper to track
 * LLM health, detect anomalies, and respond to health changes.
 * 
 * @example
 * npx ts-node examples/runtime-monitoring.ts
 */

import { 
  monitorLLM, 
  runAllSentinelTests,
  HealthReport,
  HealthStatus
} from '../src';

// Mock LLM client for demonstration
const mockLLMClient = {
  async generate(opts: { prompt: string; model?: string }) {
    // Simulate varying response times
    const delay = 100 + Math.random() * 200;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return {
      text: `Response to: ${opts.prompt.substring(0, 50)}...`,
      tokens: 20 + Math.floor(Math.random() * 30)
    };
  }
};

// Example 1: Basic monitoring
async function basicMonitoring() {
  console.log('=== Basic Monitoring ===\n');
  
  const client = monitorLLM(mockLLMClient);
  
  // Make some calls
  for (let i = 0; i < 5; i++) {
    const response = await client.generate({
      prompt: `Test prompt ${i + 1}`,
      model: 'gpt-4'
    });
    
    console.log(`Call ${i + 1}:`);
    console.log(`  Health: ${response.llmverify.health}`);
    console.log(`  Score: ${response.llmverify.score}`);
    console.log(`  Response: ${response.text.substring(0, 50)}...`);
    console.log();
  }
  
  // Check baseline
  const baseline = client.getBaseline();
  console.log('Baseline established:');
  console.log(`  Avg Latency: ${Math.round(baseline.avgLatencyMs)}ms`);
  console.log(`  Avg Tokens/sec: ${Math.round(baseline.avgTokensPerSecond)}`);
  console.log(`  Sample Count: ${baseline.sampleCount}`);
  console.log();
}

// Example 2: Monitoring with hooks
async function monitoringWithHooks() {
  console.log('=== Monitoring with Hooks ===\n');
  
  const client = monitorLLM(mockLLMClient, {
    hooks: {
      onUnstable: (report: HealthReport) => {
        console.log('🚨 ALERT: LLM is unstable!');
        console.log(`   Score: ${report.score}`);
        if (report.recommendations) {
          console.log('   Recommendations:');
          report.recommendations.forEach(r => console.log(`     - ${r}`));
        }
      },
      onDegraded: (report: HealthReport) => {
        console.log('⚠️  WARNING: LLM performance degraded');
        console.log(`   Score: ${report.score}`);
      },
      onRecovery: (report: HealthReport) => {
        console.log('✅ RECOVERED: LLM health restored');
        console.log(`   Score: ${report.score}`);
      },
      onHealthCheck: (report: HealthReport) => {
        // Called on every request
        if (report.health !== 'stable') {
          console.log(`Health check: ${report.health} (${report.score})`);
        }
      }
    }
  });
  
  // Make calls
  for (let i = 0; i < 3; i++) {
    await client.generate({ prompt: `Hook test ${i + 1}` });
  }
  
  console.log('Hooks monitoring complete.\n');
}

// Example 3: Custom thresholds
async function customThresholds() {
  console.log('=== Custom Thresholds ===\n');
  
  const client = monitorLLM(mockLLMClient, {
    thresholds: {
      latencyWarnRatio: 1.5,  // Warn at 1.5x baseline
      latencyErrorRatio: 4.0, // Error at 4x baseline
      tokenRateWarnRatio: 0.7,
      tokenRateErrorRatio: 0.3
    },
    learningRate: 0.2, // Faster baseline adaptation
    minSamplesForBaseline: 3
  });
  
  // Make calls
  for (let i = 0; i < 5; i++) {
    const response = await client.generate({ prompt: `Threshold test ${i + 1}` });
    console.log(`Call ${i + 1}: ${response.llmverify.health}`);
  }
  
  console.log();
}

// Example 4: Sentinel tests
async function sentinelTests() {
  console.log('=== Sentinel Tests ===\n');
  
  // Create a mock client that can handle sentinel tests
  const testClient = {
    async generate(opts: { prompt: string }) {
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Handle different test prompts
      if (opts.prompt.includes('repeat the following phrase')) {
        return { text: 'The quick brown fox jumps over the lazy dog.' };
      }
      if (opts.prompt.includes('2 + 2')) {
        return { text: '4' };
      }
      if (opts.prompt.includes('List exactly 3 colors')) {
        return { text: '1. Red\n2. Blue\n3. Green' };
      }
      if (opts.prompt.includes('Whiskers')) {
        return { text: 'Yes' };
      }
      if (opts.prompt.includes('5 apples')) {
        return { text: '3' };
      }
      if (opts.prompt.includes('100 or 99')) {
        return { text: '100' };
      }
      
      return { text: 'Default response' };
    }
  };
  
  const suite = await runAllSentinelTests(
    { client: testClient },
    {
      onTestComplete: (result) => {
        const icon = result.passed ? '✅' : '❌';
        console.log(`${icon} ${result.test}: ${result.message}`);
      }
    }
  );
  
  console.log();
  console.log(`Summary: ${suite.summary}`);
  console.log(`Duration: ${suite.durationMs}ms`);
  console.log();
}

// Example 5: Health status handling
function handleHealthStatus(status: HealthStatus): void {
  switch (status) {
    case 'stable':
      // Normal operation
      break;
    case 'minor_variation':
      // Log for monitoring
      console.log('Minor variation detected - monitoring');
      break;
    case 'degraded':
      // Consider fallback or retry logic
      console.log('Degraded - consider fallback');
      break;
    case 'unstable':
      // Alert and potentially switch providers
      console.log('Unstable - alert ops team');
      break;
  }
}

// Run all examples
async function main() {
  try {
    await basicMonitoring();
    await monitoringWithHooks();
    await customThresholds();
    await sentinelTests();
    
    console.log('=== All examples completed ===');
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
