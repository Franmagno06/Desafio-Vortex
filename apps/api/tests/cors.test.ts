import { describe, expect, it } from 'vitest';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { InMemoryAnnouncementsRepository } from './helpers/in-memory-repository.js';
import { InMemoryUsersRepository } from './helpers/in-memory-users.js';

/**
 * Testes da política de CORS.
 *
 * Existem por causa de um problema real: a aplicação foi aberta por
 * `http://127.0.0.1:5173` enquanto o CORS liberava apenas `http://localhost:5173`.
 * São o mesmo servidor, mas **origens diferentes** para o navegador — toda
 * requisição virou 403, e a interface exibiu "verifique sua conexão" para quem
 * estava com a internet perfeita.
 *
 * A regra atual libera origens locais **só em desenvolvimento**. Estes testes
 * travam as duas metades: o que passa em dev e o que continua bloqueado.
 */
function buildApp() {
  return createApp({
    announcementsRepository: new InMemoryAnnouncementsRepository(),
    usersRepository: new InMemoryUsersRepository(),
  });
}

describe('CORS em desenvolvimento', () => {
  const app = buildApp();

  it.each([
    ['a origem configurada no .env', 'http://localhost:5173'],
    ['127.0.0.1 — mesmo servidor, outra origem', 'http://127.0.0.1:5173'],
    ['outra porta em localhost', 'http://localhost:4321'],
    ['IP da rede local (testar PWA no celular)', 'http://192.168.0.10:5173'],
    ['faixa privada 10.x', 'http://10.0.0.5:5173'],
    ['faixa privada 172.16-31.x', 'http://172.20.10.3:5173'],
  ])('libera %s', async (_descricao, origin) => {
    const response = await request(app).get('/api/v1/catalog').set('Origin', origin);

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe(origin);
  });

  it.each([
    ['domínio externo', 'https://site-malicioso.com'],
    ['IP público', 'http://203.0.113.42:5173'],
    ['subdomínio que apenas contém "localhost"', 'https://localhost.atacante.com'],
    ['faixa 172 fora do intervalo privado', 'http://172.32.0.1:5173'],
  ])('bloqueia %s', async (_descricao, origin) => {
    const response = await request(app).get('/api/v1/catalog').set('Origin', origin);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('permite requisição sem Origin (curl, Insomnia, servidor a servidor)', async () => {
    const response = await request(app).get('/api/v1/catalog');
    expect(response.status).toBe(200);
  });
});
