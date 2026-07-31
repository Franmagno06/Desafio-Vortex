import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
// `pino-http` é um pacote CommonJS: sob ESM importamos o export nomeado,
// porque o `default` de um módulo CJS é o `module.exports` inteiro.
import { pinoHttp } from 'pino-http';

import { env, isTest } from './config/env.js';
import { logger } from './shared/logger.js';
import { AppError } from './shared/errors.js';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.js';
import { healthRouter } from './modules/health/health.routes.js';

/** Prefixo versionado: permite evoluir a API sem quebrar clientes já instalados. */
export const API_PREFIX = '/api/v1';

/**
 * Monta a aplicação Express SEM iniciar o servidor.
 *
 * Essa separação (app.ts monta / server.ts escuta) é o que permite os testes
 * com supertest baterem nas rotas sem ocupar uma porta de rede — cada teste
 * roda em milissegundos e vários podem rodar em paralelo.
 */
export function createApp(): Express {
  const app = express();

  // A ordem dos middlewares é a ordem de execução. Ela importa.

  // 1) Atrás da Render/Vercel existe um proxy. Sem isso o rate limit veria o
  //    IP do proxy para todo mundo e limitaria todos os usuários juntos.
  app.set('trust proxy', 1);

  // 2) Cabeçalhos de segurança (X-Content-Type-Options, HSTS, etc.).
  app.use(helmet());

  // 3) CORS restrito à allowlist do .env — nunca `origin: '*'` em produção.
  app.use(
    cors({
      origin(origin, callback) {
        // `!origin` cobre curl, Insomnia, Postman e requisições same-origin.
        if (!origin || env.CORS_ORIGINS.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new AppError('FORBIDDEN', `Origem não autorizada pelo CORS: ${origin}`));
      },
      credentials: true,
    }),
  );

  // 4) Body parser JSON com teto de tamanho (evita payload gigante como DoS).
  app.use(express.json({ limit: '100kb' }));

  // 5) Log estruturado de cada requisição (desligado durante os testes).
  if (!isTest) {
    app.use(pinoHttp({ logger }));
  }

  // 6) Rate limit global: 100 requisições por IP a cada 15 minutos.
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 100,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      skip: () => isTest,
      handler: (_req, res) => {
        res.status(429).json({
          error: {
            code: 'RATE_LIMITED',
            message: 'Muitas requisições. Tente novamente em alguns minutos.',
          },
        });
      },
    }),
  );

  // --- Rotas -------------------------------------------------------------
  app.use(healthRouter); // /health fica fora do prefixo, é infraestrutura
  app.use(API_PREFIX, healthRouter);

  // Sprint 1: app.use(`${API_PREFIX}/announcements`, announcementsRouter)
  // Sprint 2: app.use(`${API_PREFIX}/auth`, authRouter)

  // --- Tratamento de erros (sempre por último) ---------------------------
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
