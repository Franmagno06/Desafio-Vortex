import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

import { createApp } from '../src/app.js';
import {
  InMemoryAnnouncementsRepository,
  makeAnnouncement,
} from './helpers/in-memory-repository.js';

/**
 * Testes de integração do CRUD de anúncios.
 *
 * A requisição atravessa a pilha inteira — helmet, CORS, body parser,
 * validação Zod, rota, service, mapper — e só a persistência é substituída
 * por uma implementação em memória. É o ponto de equilíbrio: exercita o
 * comportamento real da API sem precisar de um PostgreSQL no CI.
 */

const ANA = '11111111-1111-4111-8111-111111111111';
const CARLOS = '22222222-2222-4222-8222-222222222222';

const validPayload = {
  title: 'Cálculo Volume 1 — Stewart',
  description: 'Livro em bom estado, usado em Cálculo I. Sem rasuras nem páginas soltas.',
  category: 'LIVROS',
  condition: 'SEMINOVO',
  type: 'VENDA',
  priceCents: 8900,
  imageUrl: 'https://example.com/calculo.jpg',
};

let repository: InMemoryAnnouncementsRepository;
let app: Express;

beforeEach(() => {
  repository = new InMemoryAnnouncementsRepository();
  app = createApp({
    announcementsRepository: repository,
    countUsers: () => Promise.resolve(6),
  });
});

describe('POST /api/v1/announcements', () => {
  it('cria um anúncio de venda e devolve 201 com Location', async () => {
    const response = await request(app)
      .post('/api/v1/announcements')
      .set('X-User-Id', ANA)
      .send(validPayload);

    expect(response.status).toBe(201);
    expect(response.headers['location']).toMatch(/^\/api\/v1\/announcements\//);
    expect(response.body).toMatchObject({
      title: validPayload.title,
      type: 'VENDA',
      priceCents: 8900,
      status: 'ATIVO',
    });
  });

  it('cria uma doação sem preço', async () => {
    const response = await request(app)
      .post('/api/v1/announcements')
      .set('X-User-Id', ANA)
      .send({ ...validPayload, type: 'DOACAO', priceCents: null });

    expect(response.status).toBe(201);
    expect(response.body.priceCents).toBeNull();
  });

  it('recusa doação COM preço — o coração da regra de negócio', async () => {
    const response = await request(app)
      .post('/api/v1/announcements')
      .set('X-User-Id', ANA)
      .send({ ...validPayload, type: 'DOACAO', priceCents: 5000 });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('recusa venda SEM preço', async () => {
    const { priceCents: _omitido, ...semPreco } = validPayload;

    const response = await request(app)
      .post('/api/v1/announcements')
      .set('X-User-Id', ANA)
      .send(semPreco);

    expect(response.status).toBe(422);
  });

  it('recusa quando falta o cabeçalho de identificação', async () => {
    const response = await request(app).post('/api/v1/announcements').send(validPayload);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('recusa campos obrigatórios inválidos e aponta o campo', async () => {
    const response = await request(app)
      .post('/api/v1/announcements')
      .set('X-User-Id', ANA)
      .send({ ...validPayload, title: 'ab', imageUrl: 'nao-e-url' });

    expect(response.status).toBe(422);
    expect(response.body.error.details.properties).toHaveProperty('title');
    expect(response.body.error.details.properties).toHaveProperty('imageUrl');
  });

  it('nunca expõe o hash de senha do autor', async () => {
    const response = await request(app)
      .post('/api/v1/announcements')
      .set('X-User-Id', ANA)
      .send(validPayload);

    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    expect(response.body.author).not.toHaveProperty('passwordHash');
  });
});

describe('GET /api/v1/announcements', () => {
  beforeEach(() => {
    repository.seed([
      makeAnnouncement({ id: 'a1', title: 'Livro de Cálculo', category: 'LIVROS' }),
      makeAnnouncement({
        id: 'a2',
        title: 'Arduino Uno',
        category: 'COMPUTACAO',
        type: 'DOACAO',
        priceCents: null,
      }),
      makeAnnouncement({ id: 'a3', title: 'Jaleco branco', category: 'VESTUARIO' }),
      makeAnnouncement({ id: 'a4', title: 'Anúncio removido', deletedAt: new Date() }),
      makeAnnouncement({ id: 'a5', title: 'Reservado', status: 'RESERVADO' }),
    ]);
  });

  it('lista apenas anúncios ativos e não excluídos', async () => {
    const response = await request(app).get('/api/v1/announcements');

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(3);

    const ids = response.body.items.map((item: { id: string }) => item.id);
    expect(ids).not.toContain('a4'); // excluído logicamente
    expect(ids).not.toContain('a5'); // status RESERVADO
  });

  it('filtra por categoria', async () => {
    const response = await request(app).get('/api/v1/announcements?category=COMPUTACAO');

    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].title).toBe('Arduino Uno');
  });

  it('filtra por tipo de negociação', async () => {
    const response = await request(app).get('/api/v1/announcements?type=DOACAO');

    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].priceCents).toBeNull();
  });

  it('busca por texto no título', async () => {
    const response = await request(app).get('/api/v1/announcements?q=jaleco');

    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].title).toBe('Jaleco branco');
  });

  it('devolve os metadados de paginação corretos', async () => {
    const response = await request(app).get('/api/v1/announcements?page=1&limit=2');

    expect(response.body.items).toHaveLength(2);
    expect(response.body.meta).toMatchObject({
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2,
      hasNext: true,
      hasPrev: false,
    });
  });

  it('recusa limit acima do teto', async () => {
    const response = await request(app).get('/api/v1/announcements?limit=999');

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/v1/announcements/:id', () => {
  it('devolve 404 para anúncio inexistente', async () => {
    const response = await request(app).get(
      '/api/v1/announcements/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    );

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('devolve 422 quando o id não é um UUID', async () => {
    const response = await request(app).get('/api/v1/announcements/123');

    expect(response.status).toBe(422);
  });
});

describe('PATCH /api/v1/announcements/:id', () => {
  const ID = '00000000-0000-4000-8000-000000000001';

  beforeEach(() => {
    repository.seed([makeAnnouncement({ id: ID, authorId: ANA, type: 'VENDA', priceCents: 5000 })]);
  });

  it('atualiza um campo do próprio anúncio', async () => {
    const response = await request(app)
      .patch(`/api/v1/announcements/${ID}`)
      .set('X-User-Id', ANA)
      .send({ title: 'Título novo e suficientemente longo' });

    expect(response.status).toBe(200);
    expect(response.body.title).toBe('Título novo e suficientemente longo');
  });

  it('NÃO apaga o preço num PATCH que só muda o status', async () => {
    // Regressão: `.partial()` com `.default(null)` no schema fazia este PATCH
    // zerar o preço de um anúncio de venda sem ninguém ter pedido.
    const response = await request(app)
      .patch(`/api/v1/announcements/${ID}`)
      .set('X-User-Id', ANA)
      .send({ status: 'RESERVADO' });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('RESERVADO');
    expect(response.body.priceCents).toBe(5000);
  });

  it('zera o preço ao converter uma venda em doação', async () => {
    const response = await request(app)
      .patch(`/api/v1/announcements/${ID}`)
      .set('X-User-Id', ANA)
      .send({ type: 'DOACAO' });

    expect(response.status).toBe(200);
    expect(response.body.type).toBe('DOACAO');
    expect(response.body.priceCents).toBeNull();
  });

  it('recusa converter doação em venda sem informar preço', async () => {
    // Caminho inverso do teste acima: virar VENDA exige preço explícito.
    await request(app).patch(`/api/v1/announcements/${ID}`).set('X-User-Id', ANA).send({
      type: 'DOACAO',
    });

    const response = await request(app)
      .patch(`/api/v1/announcements/${ID}`)
      .set('X-User-Id', ANA)
      .send({ type: 'VENDA' });

    expect(response.status).toBe(422);
    expect(response.body.error.message).toContain('preço');
  });

  it('recusa doação com preço explícito no corpo', async () => {
    const response = await request(app)
      .patch(`/api/v1/announcements/${ID}`)
      .set('X-User-Id', ANA)
      .send({ type: 'DOACAO', priceCents: 3000 });

    expect(response.status).toBe(422);
  });

  it('impede que outro usuário edite o anúncio', async () => {
    const response = await request(app)
      .patch(`/api/v1/announcements/${ID}`)
      .set('X-User-Id', CARLOS)
      .send({ title: 'Tentativa de sequestro do anúncio' });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('recusa corpo vazio', async () => {
    const response = await request(app)
      .patch(`/api/v1/announcements/${ID}`)
      .set('X-User-Id', ANA)
      .send({});

    expect(response.status).toBe(422);
  });
});

describe('DELETE /api/v1/announcements/:id', () => {
  const ID = '00000000-0000-4000-8000-000000000002';

  beforeEach(() => {
    repository.seed([makeAnnouncement({ id: ID, authorId: ANA })]);
  });

  it('exclui logicamente: some da listagem mas continua na tabela', async () => {
    const response = await request(app).delete(`/api/v1/announcements/${ID}`).set('X-User-Id', ANA);

    expect(response.status).toBe(204);
    expect(response.body).toEqual({});

    // Some da API...
    const afterList = await request(app).get('/api/v1/announcements');
    expect(afterList.body.items.map((i: { id: string }) => i.id)).not.toContain(ID);

    // ...mas o registro segue existindo, agora com deletedAt preenchido.
    const stored = repository.raw().find((record) => record.id === ID);
    expect(stored).toBeDefined();
    expect(stored?.deletedAt).toBeInstanceOf(Date);
  });

  it('impede que outro usuário exclua o anúncio', async () => {
    const response = await request(app)
      .delete(`/api/v1/announcements/${ID}`)
      .set('X-User-Id', CARLOS);

    expect(response.status).toBe(403);
  });
});

describe('GET /api/v1/announcements/mine', () => {
  beforeEach(() => {
    repository.seed([
      makeAnnouncement({ id: 'm1', authorId: ANA }),
      makeAnnouncement({ id: 'm2', authorId: ANA }),
      makeAnnouncement({ id: 'm3', authorId: CARLOS }),
    ]);
  });

  it('devolve apenas os anúncios do usuário identificado', async () => {
    const response = await request(app).get('/api/v1/announcements/mine').set('X-User-Id', ANA);

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(2);
    expect(response.body.meta.total).toBe(2);
  });

  it('não é confundida com a rota /:id', async () => {
    // A ordem de registro no router importa: se `/:id` viesse antes,
    // "mine" seria tratado como id e a validação de UUID daria 422.
    const response = await request(app).get('/api/v1/announcements/mine').set('X-User-Id', ANA);

    expect(response.status).not.toBe(422);
  });
});

describe('Catálogo e estatísticas', () => {
  beforeEach(() => {
    repository.seed([
      makeAnnouncement({ id: 'c1', category: 'LIVROS', type: 'VENDA' }),
      makeAnnouncement({ id: 'c2', category: 'LIVROS', type: 'DOACAO', priceCents: null }),
      makeAnnouncement({ id: 'c3', category: 'COMPUTACAO', type: 'DOACAO', priceCents: null }),
    ]);
  });

  it('GET /api/v1/stats devolve contadores reais', async () => {
    const response = await request(app).get('/api/v1/stats');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      totalAnnouncements: 3,
      activeAnnouncements: 3,
      donations: 2,
      users: 6,
    });
  });

  it('GET /api/v1/categories traz as 8 categorias com contagem', async () => {
    const response = await request(app).get('/api/v1/categories');

    expect(response.status).toBe(200);
    expect(response.body.categories).toHaveLength(8);

    const livros = response.body.categories.find((c: { value: string }) => c.value === 'LIVROS');
    expect(livros).toMatchObject({ label: 'Livros', count: 2 });

    // Categoria sem anúncio precisa vir com zero, não sumir da lista.
    const moveis = response.body.categories.find((c: { value: string }) => c.value === 'MOVEIS');
    expect(moveis.count).toBe(0);
  });

  it('GET /api/v1/catalog devolve as opções de formulário', async () => {
    const response = await request(app).get('/api/v1/catalog');

    expect(response.status).toBe(200);
    expect(response.body.categories).toHaveLength(8);
    expect(response.body.types).toHaveLength(3);
    expect(response.body.conditions).toHaveLength(3);
  });
});

describe('Documentação OpenAPI', () => {
  it('expõe a especificação em /openapi.json', async () => {
    const response = await request(app).get('/openapi.json');

    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe('3.1.0');
    expect(response.body.paths).toHaveProperty('/api/v1/announcements');
  });
});
