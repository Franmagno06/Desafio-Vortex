import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Força o modo de teste: silencia logs e desativa o rate limit.
    env: {
      NODE_ENV: 'test',
      PORT: '3999',
      CORS_ORIGINS: 'http://localhost:5173',
    },
  },
});
