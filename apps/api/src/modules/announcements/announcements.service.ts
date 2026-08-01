import {
  type AnnouncementDTO,
  type AnnouncementFilters,
  type CreateAnnouncementInput,
  type Paginated,
  type StatsDTO,
  type UpdateAnnouncementInput,
  PRICE_RULE_MESSAGES,
  buildPaginationMeta,
  checkPriceAgainstType,
} from '@circula/shared';

import { badRequest, forbidden, notFound } from '../../shared/errors.js';
import { toAnnouncementDTO, toAnnouncementDTOList } from './announcements.mapper.js';
import type {
  AnnouncementUpdateData,
  AnnouncementsRepository,
} from './announcements.repository.js';

/**
 * Regra de negócio dos anúncios.
 *
 * O que este arquivo NÃO sabe: que existe HTTP, que existe Express, que existe
 * Prisma. Ele recebe dados já validados, aplica as regras do domínio e lança
 * `AppError` quando algo é proibido. Quem traduz isso para status HTTP é o
 * middleware de erro.
 *
 * O repositório entra por parâmetro (injeção de dependência) — é isso que
 * permite testar tudo aqui com uma implementação em memória.
 */
/**
 * Decide qual será o preço depois de um PATCH.
 *
 * São três situações distintas, e confundi-las gerou um bug real neste projeto:
 *
 *  1. O corpo trouxe `priceCents` → respeita o que veio, inclusive se for
 *     inválido (aí a checagem seguinte recusa e o usuário vê o porquê).
 *  2. O corpo NÃO trouxe preço, mas o tipo final não é VENDA → o preço deixa
 *     de fazer sentido e é zerado. Converter uma venda em doação não deve
 *     obrigar o usuário a mandar `priceCents: null` junto.
 *  3. Nenhum dos casos acima → preserva o preço que já estava lá. É o que
 *     impede um `PATCH { "status": "RESERVADO" }` de apagar o valor do anúncio.
 */
function resolveNextPrice(
  input: UpdateAnnouncementInput,
  currentPrice: number | null,
  nextType: CreateAnnouncementInput['type'],
): number | null {
  if ('priceCents' in input) return input.priceCents ?? null;
  if (nextType !== 'VENDA') return null;
  return currentPrice;
}

export function createAnnouncementsService(repository: AnnouncementsRepository) {
  /**
   * Garante que o preço combina com o tipo de negociação.
   *
   * Precisa existir aqui, e não só no schema Zod, por causa do PATCH parcial:
   * um `PATCH { "type": "DOACAO" }` num anúncio que era VENDA chega ao service
   * sem `priceCents` no corpo. Só depois de mesclar com o registro atual dá
   * para saber se a combinação final é válida.
   */
  function assertPriceMatchesType(
    type: CreateAnnouncementInput['type'],
    priceCents: number | null,
  ) {
    const violation = checkPriceAgainstType(type, priceCents);

    if (violation) {
      throw badRequest(PRICE_RULE_MESSAGES[violation], {
        field: 'priceCents',
        rule: violation,
      });
    }
  }

  /** Carrega o anúncio ou lança 404. Usado por todas as operações por id. */
  async function getRecordOrFail(id: string) {
    const record = await repository.findById(id);
    if (!record) throw notFound('Anúncio não encontrado.');
    return record;
  }

  return {
    /** Vitrine pública, paginada e filtrada. */
    async list(filters: AnnouncementFilters): Promise<Paginated<AnnouncementDTO>> {
      const { items, total } = await repository.findMany(filters);

      return {
        items: toAnnouncementDTOList(items),
        meta: buildPaginationMeta(total, filters),
      };
    },

    /** "Meus anúncios" — mesma listagem, restrita a um autor. */
    async listByAuthor(
      authorId: string,
      filters: AnnouncementFilters,
    ): Promise<Paginated<AnnouncementDTO>> {
      const { items, total } = await repository.findMany(filters, authorId);

      return {
        items: toAnnouncementDTOList(items),
        meta: buildPaginationMeta(total, filters),
      };
    },

    async getById(id: string): Promise<AnnouncementDTO> {
      return toAnnouncementDTO(await getRecordOrFail(id));
    },

    async create(input: CreateAnnouncementInput, authorId: string): Promise<AnnouncementDTO> {
      // O schema Zod já checou isto na criação; a chamada aqui é a garantia de
      // que a regra vale mesmo se alguém usar o service por outro caminho.
      assertPriceMatchesType(input.type, input.priceCents);

      return toAnnouncementDTO(await repository.create(input, authorId));
    },

    /**
     * Atualização parcial, restrita ao dono do anúncio.
     *
     * Na Sprint 2 o `requesterId` passa a vir do JWT em vez do cabeçalho
     * `X-User-Id` — e nada neste arquivo precisa mudar.
     */
    async update(
      id: string,
      input: UpdateAnnouncementInput,
      requesterId: string,
    ): Promise<AnnouncementDTO> {
      const current = await getRecordOrFail(id);

      if (current.authorId !== requesterId) {
        throw forbidden('Você só pode editar os seus próprios anúncios.');
      }

      // Estado final = o que já existe + o que veio no corpo.
      const nextType = input.type ?? current.type;
      const nextPrice = resolveNextPrice(input, current.priceCents, nextType);

      // A checagem vem DEPOIS de resolver o preço final, nunca antes: validar
      // o preço antigo contra o tipo novo rejeitaria uma conversão legítima de
      // venda para doação.
      assertPriceMatchesType(nextType, nextPrice);

      const data: AnnouncementUpdateData = { ...input };

      // Só toca a coluna se o preço realmente mudou.
      if (nextPrice !== current.priceCents) {
        data.priceCents = nextPrice;
      }

      return toAnnouncementDTO(await repository.update(id, data));
    },

    /** Exclusão lógica, restrita ao dono. */
    async remove(id: string, requesterId: string): Promise<void> {
      const current = await getRecordOrFail(id);

      if (current.authorId !== requesterId) {
        throw forbidden('Você só pode excluir os seus próprios anúncios.');
      }

      await repository.softDelete(id);
    },

    /** Contadores da landing page — dados reais, não simulados. */
    async getStats(usersCount: number): Promise<StatsDTO> {
      const [counts, byCategory] = await Promise.all([
        repository.countStats(),
        repository.countByCategory(),
      ]);

      return {
        totalAnnouncements: counts.total,
        activeAnnouncements: counts.active,
        donations: counts.donations,
        users: usersCount,
        byCategory,
      };
    },

    async countByCategory() {
      return repository.countByCategory();
    },
  };
}

export type AnnouncementsService = ReturnType<typeof createAnnouncementsService>;
