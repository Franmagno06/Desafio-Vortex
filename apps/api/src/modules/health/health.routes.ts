import { Router } from 'express';
import { CATEGORIES, ITEM_TYPES } from '@circula/shared';

/**
 * Rotas de diagnóstico.
 *
 * `/health` é o endpoint que a Render usa para saber se o serviço subiu, e é
 * também o que o keep-alive vai chamar de 10 em 10 minutos para o container
 * não hibernar antes da gravação do vídeo.
 */
export const healthRouter: Router = Router();

const startedAt = Date.now();

healthRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'circula-api',
    version: process.env['npm_package_version'] ?? '0.1.0',
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
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
