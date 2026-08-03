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
      // A validação de env exige DATABASE_URL, mas os testes injetam um
      // repositório em memória e nunca abrem conexão. Este valor só satisfaz
      // o schema no boot — nenhum teste toca o Postgres.
      DATABASE_URL: 'postgresql://test:test@localhost:5432/circula_test',
      // Segredo fixo e fake: os testes precisam de um valor determinístico e
      // este nunca sai da suíte.
      JWT_SECRET: 'segredo-de-teste-com-mais-de-32-caracteres-para-passar-na-validacao',
      JWT_EXPIRES_IN: '1h',
    },
  },
});
