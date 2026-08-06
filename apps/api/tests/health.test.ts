import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

/**
 * Testes de integração das rotas de diagnóstico.
 *
 * `createApp()` devolve o app sem chamar `listen()`, e o supertest sobe um
 * servidor efêmero só para a duração do teste. Nenhuma porta fixa é ocupada.
 */
const app = createApp();

describe('GET /health', () => {
  it('responde 200 com o status do serviço', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok', service: 'circula-api' });
    expect(typeof response.body.uptimeSeconds).toBe('number');
  });

  it('responde JSON, nunca HTML', async () => {
    const response = await request(app).get('/health');
    expect(response.headers['content-type']).toMatch(/application\/json/);
  });
});

describe('GET /health/contract', () => {
  it('expõe os enums vindos de @circula/shared', async () => {
    const response = await request(app).get('/health/contract');

    expect(response.status).toBe(200);
    expect(response.body.categories).toContain('LIVROS');
    expect(response.body.itemTypes).toContain('DOACAO');
  });
});

describe('GET /', () => {
  it('devolve o índice do serviço em vez de 404', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ service: 'circula-api' });
  });

  it('aponta as portas de entrada da API', async () => {
    const response = await request(app).get('/');

    expect(response.body.links).toMatchObject({
      docs: '/docs',
      health: '/health',
      api: '/api/v1',
    });
  });
});

describe('rota inexistente', () => {
  it('devolve 404 no envelope de erro padrão da API', async () => {
    const response = await request(app).get('/rota-que-nao-existe');

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(response.body.error.message).toContain('/rota-que-nao-existe');
  });
});
