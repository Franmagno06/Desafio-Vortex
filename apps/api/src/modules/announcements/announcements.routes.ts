import { Router } from 'express';
import {
  type AnnouncementFilters,
  type CreateAnnouncementInput,
  type UpdateAnnouncementInput,
  announcementFiltersSchema,
  announcementIdParamSchema,
  createAnnouncementSchema,
  updateAnnouncementSchema,
} from '@circula/shared';

import { requireAuth } from '../../middlewares/authenticate.js';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validate.js';
import type { AnnouncementsService } from './announcements.service.js';

/**
 * Rotas HTTP dos anúncios.
 *
 * Responsabilidade da camada de rota, e só ela:
 *   1. declarar método e caminho
 *   2. encadear os middlewares de validação
 *   3. extrair os dados já validados
 *   4. chamar o service e devolver o status certo
 *
 * Nenhuma regra de negócio mora aqui. Se aparecer um `if` decidindo o que pode
 * ou não pode, ele está no arquivo errado.
 *
 * Os handlers são `async` sem `try/catch`: o Express 5 encaminha promessas
 * rejeitadas para o middleware de erro automaticamente.
 */
export function createAnnouncementsRouter(service: AnnouncementsService): Router {
  const router = Router();

  /** GET /api/v1/announcements — vitrine pública, com filtros e paginação. */
  router.get('/', validateQuery(announcementFiltersSchema), async (req, res) => {
    const filters = req.validatedQuery as AnnouncementFilters;
    res.json(await service.list(filters));
  });

  /**
   * GET /api/v1/announcements/mine — "meus anúncios".
   *
   * Precisa vir ANTES da rota `/:id`. O Express casa as rotas na ordem de
   * registro: se `/:id` estivesse acima, ele trataria "mine" como um id e a
   * validação de UUID rejeitaria a requisição com 422.
   */
  router.get('/mine', requireAuth, validateQuery(announcementFiltersSchema), async (req, res) => {
    const filters = req.validatedQuery as AnnouncementFilters;
    res.json(await service.listByAuthor(req.userId!, filters));
  });

  /** GET /api/v1/announcements/:id — detalhe do anúncio. */
  router.get('/:id', validateParams(announcementIdParamSchema), async (req, res) => {
    const { id } = req.validatedParams as { id: string };
    res.json(await service.getById(id));
  });

  /** POST /api/v1/announcements — cria um anúncio. 201 + Location. */
  router.post('/', requireAuth, validateBody(createAnnouncementSchema), async (req, res) => {
    const input = req.body as CreateAnnouncementInput;
    const announcement = await service.create(input, req.userId!);

    // 201 Created com o cabeçalho Location apontando para o recurso novo —
    // o que a especificação HTTP pede para criação bem-sucedida.
    res.status(201).location(`/api/v1/announcements/${announcement.id}`).json(announcement);
  });

  /** PATCH /api/v1/announcements/:id — atualização parcial, só do dono. */
  router.patch(
    '/:id',
    requireAuth,
    validateParams(announcementIdParamSchema),
    validateBody(updateAnnouncementSchema),
    async (req, res) => {
      const { id } = req.validatedParams as { id: string };
      const input = req.body as UpdateAnnouncementInput;

      res.json(await service.update(id, input, req.userId!));
    },
  );

  /** DELETE /api/v1/announcements/:id — exclusão lógica, só do dono. */
  router.delete(
    '/:id',
    requireAuth,
    validateParams(announcementIdParamSchema),
    async (req, res) => {
      const { id } = req.validatedParams as { id: string };
      await service.remove(id, req.userId!);

      // 204 No Content: sucesso, sem corpo. Não faz sentido devolver o
      // recurso que acabou de sair do ar.
      res.status(204).end();
    },
  );

  return router;
}
