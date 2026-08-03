import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

import { createApp } from '../src/app.js';
import { InMemoryUsersRepository } from './helpers/in-memory-users.js';
import { InMemoryAnnouncementsRepository } from './helpers/in-memory-repository.js';

/**
 * Testes de autenticação — Sprint 2.
 */

const validRegistration = {
  name: 'Ana Beatriz Lima',
  email: 'ana.lima@edu.unifor.br',
  password: 'circula2026',
  course: 'Engenharia Civil',
};

let users: InMemoryUsersRepository;
let announcements: InMemoryAnnouncementsRepository;
let app: Express;

beforeEach(() => {
  users = new InMemoryUsersRepository();
  announcements = new InMemoryAnnouncementsRepository();
  app = createApp({ usersRepository: users, announcementsRepository: announcements });
});

describe('POST /api/v1/auth/register', () => {
  it('cria a conta e já devolve um token', async () => {
    const response = await request(app).post('/api/v1/auth/register').send(validRegistration);

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({
      name: 'Ana Beatriz Lima',
      email: 'ana.lima@edu.unifor.br',
      course: 'Engenharia Civil',
    });
    expect(typeof response.body.token).toBe('string');
    expect(response.body.expiresIn).toBeGreaterThan(0);
  });

  it('NUNCA devolve o hash da senha', async () => {
    const response = await request(app).post('/api/v1/auth/register').send(validRegistration);

    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    expect(JSON.stringify(response.body)).not.toContain(validRegistration.password);
  });

  it('guarda a senha como hash, nunca em texto puro', async () => {
    await request(app).post('/api/v1/auth/register').send(validRegistration);

    const stored = users.raw()[0];
    expect(stored?.passwordHash).toBeDefined();
    expect(stored?.passwordHash).not.toBe(validRegistration.password);
    // Prefixo característico do bcrypt.
    expect(stored?.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('normaliza o e-mail para minúsculas', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validRegistration, email: 'Ana.Lima@EDU.Unifor.BR' });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe('ana.lima@edu.unifor.br');
  });

  it('impede cadastro com e-mail já usado, mesmo em outra caixa', async () => {
    await request(app).post('/api/v1/auth/register').send(validRegistration);

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validRegistration, email: 'ANA.LIMA@edu.unifor.br' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('CONFLICT');
  });

  it('recusa senha curta demais', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validRegistration, password: 'abc1' });

    expect(response.status).toBe(422);
    expect(response.body.error.details.properties).toHaveProperty('password');
  });

  it('recusa senha sem número', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validRegistration, password: 'senhasemnumero' });

    expect(response.status).toBe(422);
  });

  it('recusa senha acima de 72 bytes (limite do bcrypt)', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validRegistration, password: 'a1'.repeat(40) });

    expect(response.status).toBe(422);
  });

  it('recusa e-mail inválido', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validRegistration, email: 'nao-e-email' });

    expect(response.status).toBe(422);
  });
});

describe('POST /api/v1/auth/login', () => {
  beforeEach(async () => {
    await users.seedUser('ana.lima@edu.unifor.br', 'circula2026', 'Ana Beatriz Lima');
  });

  it('autentica com credenciais corretas', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ana.lima@edu.unifor.br', password: 'circula2026' });

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe('ana.lima@edu.unifor.br');
    expect(typeof response.body.token).toBe('string');
  });

  it('aceita e-mail digitado em maiúsculas', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: '  ANA.LIMA@edu.unifor.BR  ', password: 'circula2026' });

    expect(response.status).toBe(200);
  });

  it('recusa senha errada', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ana.lima@edu.unifor.br', password: 'senha-errada-1' });

    expect(response.status).toBe(401);
  });

  it('usa a MESMA mensagem para e-mail inexistente e senha errada', async () => {
    // Mensagens diferentes transformariam a tela de login num validador de
    // quais e-mails têm conta no sistema.
    const senhaErrada = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ana.lima@edu.unifor.br', password: 'senha-errada-1' });

    const emailInexistente = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ninguem@edu.unifor.br', password: 'circula2026' });

    expect(senhaErrada.status).toBe(emailInexistente.status);
    expect(senhaErrada.body.error.message).toBe(emailInexistente.body.error.message);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('devolve o usuário do token', async () => {
    const registro = await request(app).post('/api/v1/auth/register').send(validRegistration);
    const token = registro.body.token as string;

    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe('ana.lima@edu.unifor.br');
  });

  it('recusa requisição sem token', async () => {
    const response = await request(app).get('/api/v1/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('recusa token com assinatura inválida', async () => {
    const registro = await request(app).post('/api/v1/auth/register').send(validRegistration);
    const token = registro.body.token as string;

    // Altera o último caractere: o payload continua legível, mas a assinatura
    // deixa de bater. É exatamente o que o JWT existe para detectar.
    const adulterado = token.slice(0, -1) + (token.at(-1) === 'A' ? 'B' : 'A');

    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${adulterado}`);

    expect(response.status).toBe(401);
  });

  it('recusa esquema diferente de Bearer', async () => {
    const registro = await request(app).post('/api/v1/auth/register').send(validRegistration);

    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Basic ${registro.body.token}`);

    expect(response.status).toBe(401);
  });

  it('aceita "bearer" em minúsculas (o esquema é case-insensitive)', async () => {
    const registro = await request(app).post('/api/v1/auth/register').send(validRegistration);

    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `bearer ${registro.body.token}`);

    expect(response.status).toBe(200);
  });
});

describe('Rotas protegidas agora exigem JWT', () => {
  const payload = {
    title: 'Cálculo Volume 1 — Stewart',
    description: 'Livro em bom estado, usado em Cálculo I. Sem rasuras nem páginas soltas.',
    category: 'LIVROS',
    condition: 'SEMINOVO',
    type: 'VENDA',
    priceCents: 8900,
    imageUrl: 'https://example.com/calculo.jpg',
  };

  it('cria anúncio com token válido', async () => {
    const registro = await request(app).post('/api/v1/auth/register').send(validRegistration);

    const response = await request(app)
      .post('/api/v1/announcements')
      .set('Authorization', `Bearer ${registro.body.token}`)
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body.author.id).toBe(registro.body.user.id);
  });

  it('o antigo X-User-Id NÃO autentica mais nada', async () => {
    // Regressão da Sprint 1: aquele cabeçalho podia ser inventado por qualquer
    // cliente. Agora ele é simplesmente ignorado.
    const response = await request(app)
      .post('/api/v1/announcements')
      .set('X-User-Id', 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001')
      .send(payload);

    expect(response.status).toBe(401);
  });

  it('um usuário não consegue editar o anúncio de outro', async () => {
    const ana = await request(app).post('/api/v1/auth/register').send(validRegistration);
    const carlos = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validRegistration, email: 'carlos@edu.unifor.br', name: 'Carlos Souza' });

    const criado = await request(app)
      .post('/api/v1/announcements')
      .set('Authorization', `Bearer ${ana.body.token}`)
      .send(payload);

    const response = await request(app)
      .patch(`/api/v1/announcements/${criado.body.id}`)
      .set('Authorization', `Bearer ${carlos.body.token}`)
      .send({ title: 'Tentativa de sequestro do anúncio' });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('a vitrine pública continua acessível sem token', async () => {
    const response = await request(app).get('/api/v1/announcements');
    expect(response.status).toBe(200);
  });
});
