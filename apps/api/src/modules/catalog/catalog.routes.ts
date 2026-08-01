import { Router } from 'express';
import {
  type CategoryOptionDTO,
  CATEGORIES,
  CATEGORY_META,
  ITEM_CONDITION_META,
  ITEM_CONDITIONS,
  ITEM_TYPES,
  ITEM_TYPE_META,
  toOptions,
} from '@circula/shared';

import type { AnnouncementsService } from '../announcements/announcements.service.js';

/**
 * Rotas que alimentam a Landing Page: catálogo de opções e estatísticas.
 *
 * Decisão de produto: o edital pede "estatísticas simuladas", mas aqui elas
 * são **reais**, contadas no banco. Custa duas consultas e rende um argumento
 * melhor no pitch — o número na tela é o estado verdadeiro da plataforma.
 */
export function createCatalogRouter(
  service: AnnouncementsService,
  countUsers: () => Promise<number>,
): Router {
  const router = Router();

  /**
   * GET /api/v1/categories
   *
   * Devolve rótulo, ícone e **quantidade de anúncios ativos** por categoria.
   * A contagem é o que permite ao PWA esconder ou desabilitar um chip de filtro
   * que não traria resultado nenhum.
   */
  router.get('/categories', async (_req, res) => {
    const counts = await service.countByCategory();
    const countByCategory = new Map(counts.map((row) => [row.category, row.count]));

    const categories: CategoryOptionDTO[] = CATEGORIES.map((category) => ({
      value: category,
      label: CATEGORY_META[category].label,
      icon: CATEGORY_META[category].icon,
      count: countByCategory.get(category) ?? 0,
    }));

    res.json({ categories });
  });

  /**
   * GET /api/v1/catalog
   *
   * Todas as listas de opções de uma vez, para o formulário de anúncio montar
   * seus selects com uma requisição só em vez de três.
   */
  router.get('/catalog', (_req, res) => {
    res.json({
      categories: toOptions(CATEGORIES, CATEGORY_META),
      types: toOptions(ITEM_TYPES, ITEM_TYPE_META),
      conditions: toOptions(ITEM_CONDITIONS, ITEM_CONDITION_META),
    });
  });

  /** GET /api/v1/stats — contadores da landing page. */
  router.get('/stats', async (_req, res) => {
    const usersCount = await countUsers();
    res.json(await service.getStats(usersCount));
  });

  return router;
}
