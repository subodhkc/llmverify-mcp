import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 60000,
    hookTimeout: 60000,
    // Server tests spawn child processes; keep workers modest.
    maxWorkers: 4,
    env: {
      // Isolate all llmverify local state per test run.
      LLMVERIFY_MCP_MAX_INPUT_CHARS: '100000',
      NODE_ENV: 'test'
    }
  }
});
