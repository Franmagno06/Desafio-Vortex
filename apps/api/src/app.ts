import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
// `pino-http` é um pacote CommonJS: sob ESM importamos o export nomeado,
// porque o `default` de um módulo CJS é o `module.exports` inteiro.
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';

import { env, isProduction, isTest } from './config/env.js';
import { logger } from './shared/logger.js';
import { AppError } from './shared/errors.js';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.js';
import { healthRouter } from './modules/health/health.routes.js';
import { buildOpenApiDocument } from './docs/openapi.js';
import {
  type AnnouncementsRepository,
  prismaAnnouncementsRepository,
} from './modules/announcements/announcements.repository.js';
import { createAnnouncementsService } from './modules/announcements/announcements.service.js';
import { createAnnouncementsRouter } from './modules/announcements/announcements.routes.js';
import { createCatalogRouter } from './modules/catalog/catalog.routes.js';
import { type UsersRepository, prismaUsersRepository } from './modules/auth/auth.repository.js';
import { createAuthService } from './modules/auth/auth.service.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';

/** Prefixo versionado: permite evoluir a API sem quebrar clientes já instalados. */
export const API_PREFIX = '/api/v1';

/**
 * Origens de desenvolvimento liberadas automaticamente.
 *
 * Em **produção esta função sempre devolve `false`** — lá vale só a allowlist
 * explícita do `CORS_ORIGINS`. Em desenvolvimento ela evita dois atritos reais:
 *
 *  1. `localhost` e `127.0.0.1` são o mesmo servidor, mas **origens diferentes**
 *     para o navegador. Abrir a aplicação por um enquanto o CORS libera só o
 *     outro faz toda requisição falhar — e, como o `fetch` não expõe o motivo,
 *     a interface acaba mostrando "verifique sua conexão" para quem está com
 *     internet perfeita. Aconteceu neste projeto.
 *
 *  2. Testar o PWA no celular exige acessar pelo IP da máquina na rede local
 *     (`192.168.x.x`). Sem esta regra, seria preciso editar o `.env` e
 *     reiniciar a API a cada troca de rede.
 */
function isAllowedDevOrigin(origin: string): boolean {
  if (isProduction) return false;

  try {
    const { hostname } = new URL(origin);

    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]') {
      return true;
    }

    // Faixas privadas da RFC 1918 — a rede de casa ou do campus.
    return (
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
    );
  } catch {
    // Origem malformada: trata como não autorizada.
    return false;
  }
}

/**
 * Dependências injetáveis.
 *
 * Em produção nada é passado e valem os padrões (Prisma + Postgres). Nos
 * testes, injetamos um repositório em memória — é assim que a suíte roda no
 * GitHub Actions sem precisar de um banco no CI.
 */
export interface AppDependencies {
  announcementsRepository?: AnnouncementsRepository;
  usersRepository?: UsersRepository;
}

/**
 * Monta a aplicação Express SEM iniciar o servidor.
 *
 * Essa separação (app.ts monta / server.ts escuta) é o que permite os testes
 * com supertest baterem nas rotas sem ocupar uma porta de rede — cada teste
 * roda em milissegundos e vários podem rodar em paralelo.
 */
export function createApp(deps: AppDependencies = {}): Express {
  const app = express();

  const announcementsRepository = deps.announcementsRepository ?? prismaAnnouncementsRepository;
  const usersRepository = deps.usersRepository ?? prismaUsersRepository;

  const announcementsService = createAnnouncementsService(announcementsRepository);
  const authService = createAuthService(usersRepository);

  // A ordem dos middlewares é a ordem de execução. Ela importa.

  // 1) Atrás da Render/Vercel existe um proxy. Sem isso o rate limit veria o
  //    IP do proxy para todo mundo e limitaria todos os usuários juntos.
  app.set('trust proxy', 1);

  // 2) Cabeçalhos de segurança (X-Content-Type-Options, HSTS, etc.).
  //    A CSP fica desligada porque ela protege documentos HTML, e o único HTML
  //    que servimos é o Swagger UI — que precisa de estilos e scripts inline
  //    para funcionar. As rotas de dados devolvem JSON, onde CSP é irrelevante.
  app.use(helmet({ contentSecurityPolicy: false }));

  // 3) CORS restrito à allowlist do .env — nunca `origin: '*'` em produção.
  app.use(
    cors({
      origin(origin, callback) {
        // `!origin` cobre curl, Insomnia, Postman e requisições same-origin.
        if (!origin || env.CORS_ORIGINS.includes(origin) || isAllowedDevOrigin(origin)) {
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

  /**
   * Índice da API.
   *
   * A raiz não serve página: isto é uma API REST, não um site. Sem esta rota
   * ela caía no `notFoundHandler` e devolvia 404 — tecnicamente correto, mas
   * indistinguível de um serviço quebrado para quem cola a URL no navegador.
   *
   * O índice não promete nada além do que existe: diz o que é o serviço e
   * aponta as portas de entrada. É a diferença entre "está fora do ar" e
   * "está no ar, a documentação é ali".
   */
  app.get('/', (_req, res) => {
    res.json({
      service: 'circula-api',
      description: 'API do Circula — Marketplace de Economia Circular do Campus.',
      version: process.env['npm_package_version'] ?? '0.2.0',
      links: {
        docs: '/docs',
        openapi: '/openapi.json',
        health: '/health',
        api: API_PREFIX,
      },
    });
  });

  app.use(healthRouter); // /health fica fora do prefixo, é infraestrutura

  app.use(`${API_PREFIX}/auth`, createAuthRouter(authService));
  app.use(`${API_PREFIX}/announcements`, createAnnouncementsRouter(announcementsService));
  app.use(
    API_PREFIX,
    createCatalogRouter(announcementsService, () => authService.countUsers()),
  );

  // --- Documentação interativa -------------------------------------------
  const openApiDocument = buildOpenApiDocument();

  /** Especificação crua — útil para importar no Insomnia/Postman. */
  app.get('/openapi.json', (_req, res) => {
    res.json(openApiDocument);
  });

  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      customSiteTitle: 'Circula API — Documentação',
    }),
  );

  // --- Tratamento de erros (sempre por último) ---------------------------
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
