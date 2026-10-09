/**
 * Model-Agnostic Adapters Example
 * 
 * Demonstrates how to use the unified adapter interface
 * with different LLM providers.
 * 
 * @example
 * npx ts-node examples/model-adapters.ts
 */

import { 
  createAdapter, 
  monitorLLM,
  LlmClient,
  LlmRequest,
  LlmResponse,
  ProviderId
} from '../src';

// ============================================
// Example 1: OpenAI Adapter
// ============================================
async function openAIExample() {
  console.log('=== OpenAI Adapter ===\n');
  
  // In real usage:
  // import OpenAI from 'openai';
  // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  // Mock for demonstration
  const mockOpenAI = {
    chat: {
      completions: {
        create: async (params: any) => ({
          choices: [{ message: { content: 'Hello from OpenAI!' }, finish_reason: 'stop' }],
          usage: { completion_tokens: 5, total_tokens: 15 },
          model: params.model
        })
      }
    }
  };
  
  const llm = createAdapter({
    provider: 'openai',
    client: mockOpenAI,
    defaultModel: 'gpt-4o-mini'
  });
  
  const response = await llm.generate({
    prompt: 'Say hello!',
    system: 'You are a helpful assistant.'
  });
  
  console.log('Provider:', llm.provider);
  console.log('Response:', response.text);
  console.log('Tokens:', response.tokens);
  console.log();
}

// ============================================
// Example 2: Anthropic Adapter
// ============================================
async function anthropicExample() {
  console.log('=== Anthropic Adapter ===\n');
  
  // Mock Anthropic client
  const mockAnthropic = {
    messages: {
      create: async (params: any) => ({
        content: [{ type: 'text', text: 'Hello from Claude!' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 5 },
        model: params.model
      })
    }
  };
  
  const llm = createAdapter({
    provider: 'anthropic',
    client: mockAnthropic,
    defaultModel: 'claude-3-5-sonnet-20241022'
  });
  
  const response = await llm.generate({
    prompt: 'Say hello!',
    system: 'You are a helpful assistant.'
  });
  
  console.log('Provider:', llm.provider);
  console.log('Response:', response.text);
  console.log('Tokens:', response.tokens);
  console.log();
}

// ============================================
// Example 3: Local Model Adapter
// ============================================
async function localExample() {
  console.log('=== Local Model Adapter ===\n');
  
  // Simple local inference function
  const localInference = async (prompt: string) => {
    // In real usage, this would call llama.cpp, Ollama, vLLM, etc.
    return `Local response to: ${prompt.substring(0, 30)}...`;
  };
  
  const llm = createAdapter({
    provider: 'local',
    client: localInference,
    defaultModel: 'llama-3',
    providerName: 'Ollama'
  });
  
  const response = await llm.generate({
    prompt: 'What is the capital of France?'
  });
  
  console.log('Provider:', llm.provider);
  console.log('Provider Name:', llm.providerName);
  console.log('Response:', response.text);
  console.log();
}

// ============================================
// Example 4: Adapter with Monitoring
// ============================================
async function monitoredAdapterExample() {
  console.log('=== Monitored Adapter ===\n');
  
  // Create a mock client
  const mockClient = {
    chat: {
      completions: {
        create: async (params: any) => {
          // Simulate varying latency
          await new Promise(r => setTimeout(r, 50 + Math.random() * 100));
          return {
            choices: [{ message: { content: 'Monitored response!' }, finish_reason: 'stop' }],
            usage: { completion_tokens: 3, total_tokens: 10 },
            model: params.model
          };
        }
      }
    }
  };
  
  // Create adapter
  const llm = createAdapter({
    provider: 'openai',
    client: mockClient,
    defaultModel: 'gpt-4o-mini'
  });
  
  // Wrap with monitoring
  const monitored = monitorLLM(llm, {
    hooks: {
      onHealthCheck: (report) => {
        console.log(`  Health: ${report.health} (score: ${report.score})`);
      }
    }
  });
  
  // Make several calls
  for (let i = 0; i < 3; i++) {
    const response = await monitored.generate({
      prompt: `Test prompt ${i + 1}`
    });
    console.log(`Call ${i + 1}: ${response.text}`);
  }
  
  console.log('\nBaseline:', monitored.getBaseline());
  console.log();
}

// ============================================
// Example 5: Custom Adapter
// ============================================
async function customAdapterExample() {
  console.log('=== Custom Adapter ===\n');
  
  // Create a custom adapter for any API
  const customClient = {
    async generate(request: LlmRequest): Promise<LlmResponse> {
      // Your custom API logic here
      return {
        text: `Custom response to: ${request.prompt}`,
        tokens: 10,
        model: request.model ?? 'custom-model'
      };
    }
  };
  
  const llm = createAdapter({
    provider: 'custom',
    client: customClient,
    providerName: 'My Custom API'
  });
  
  const response = await llm.generate({
    prompt: 'Hello custom API!'
  });
  
  console.log('Provider:', llm.provider);
  console.log('Provider Name:', llm.providerName);
  console.log('Response:', response.text);
  console.log();
}

// ============================================
// Example 6: Provider Switching
// ============================================
async function providerSwitchingExample() {
  console.log('=== Provider Switching ===\n');
  
  // Factory function to create adapters
  function createLLM(provider: ProviderId): LlmClient {
    const mockClients: Record<string, any> = {
      openai: {
        chat: {
          completions: {
            create: async () => ({
              choices: [{ message: { content: 'OpenAI response' } }],
              usage: { completion_tokens: 3 }
            })
          }
        }
      },
      anthropic: {
        messages: {
          create: async () => ({
            content: [{ type: 'text', text: 'Anthropic response' }],
            usage: { output_tokens: 3 }
          })
        }
      },
      local: async (prompt: string) => `Local: ${prompt}`
    };
    
    return createAdapter({
      provider,
      client: mockClients[provider],
      defaultModel: 'default'
    });
  }
  
  // Switch between providers easily
  const providers: ProviderId[] = ['openai', 'anthropic', 'local'];
  
  for (const provider of providers) {
    const llm = createLLM(provider);
    const response = await llm.generate({ prompt: 'Hello!' });
    console.log(`${provider}: ${response.text}`);
  }
  
  console.log();
}

// Run all examples
async function main() {
  try {
    await openAIExample();
    await anthropicExample();
    await localExample();
    await monitoredAdapterExample();
    await customAdapterExample();
    await providerSwitchingExample();
    
    console.log('=== All examples completed ===');
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
