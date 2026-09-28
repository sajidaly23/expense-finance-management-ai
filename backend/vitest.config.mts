import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.ts'],
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 30000,
    hookTimeout: 60000,
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-jwt-secret-for-vitest',
      JWT_EXPIRES_IN: '1h',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/smartfin-unused-memory-server',
      FRONTEND_URL: 'http://localhost:3000',
    },
  },
});
