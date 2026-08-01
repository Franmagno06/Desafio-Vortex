import { Router } from 'express';
import { CATEGORIES, ITEM_TYPES } from '@circula/shared';
import { checkDatabaseConnection } from '../../lib/prisma.js';

/**
 * Rotas de diagnóstico.
 *
 * `/health` é o endpoint que a Render usa para saber se o serviço subiu, e é
 * também o que o keep-alive vai chamar de 10 em 10 minutos para o container
 * não hibernar antes da gravação do vídeo.
 */
export const healthRouter: Router = Router();

const startedAt = Date.now();

/**
 * Health check raso (`/health`) — o processo está no ar?
 *
 * Deliberadamente NÃO toca o banco. É o que a plataforma chama a cada poucos
 * segundos; se ele abrisse conexão toda vez, o próprio monitoramento consumiria
 * o pool do plano gratuito.
 */
healthRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'circula-api',
    version: process.env['npm_package_version'] ?? '0.2.0',
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Health check profundo (`/health/ready`) — o serviço consegue ATENDER?
 *
 * Aqui sim o banco é consultado. A distinção entre "vivo" e "pronto" é o
 * padrão liveness × readiness: um processo pode estar rodando perfeitamente e
 * ainda assim ser incapaz de responder, porque o banco caiu. Devolver 200 nesse
 * estado esconderia a falha justamente de quem deveria detectá-la.
 */
healthRouter.get('/health/ready', async (_req, res) => {
  const databaseOk = await checkDatabaseConnection();

  // 503 Service Unavailable é o status correto para "estou de pé, mas não
  // consigo servir agora".
  res.status(databaseOk ? 200 : 503).json({
    status: databaseOk ? 'ready' : 'degraded',
    service: 'circula-api',
    checks: { database: databaseOk ? 'ok' : 'unreachable' },
    timestamp: new Date().toISOString(),
  });
});

/**
 * Prova viva de que o pacote @circula/shared está linkado corretamente:
 * estes enums são os MESMOS que o PWA vai usar para montar os filtros.
 */
healthRouter.get('/health/contract', (_req, res) => {
  res.json({
    categories: CATEGORIES,
    itemTypes: ITEM_TYPES,
  });
});
