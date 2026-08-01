import type {
  AnnouncementFilters,
  AnnouncementStatus,
  Category,
  CreateAnnouncementInput,
  ItemCondition,
  ItemType,
} from '@circula/shared';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

/**
 * Camada de persistência dos anúncios.
 *
 * O service conversa com a INTERFACE abaixo, nunca com o Prisma diretamente.
 * Isso paga duas contas de uma vez:
 *
 *  1. Os testes rodam sem banco. O CI no GitHub Actions não sobe Postgres —
 *     a suíte injeta uma implementação em memória e exercita a regra de
 *     negócio de verdade, em milissegundos.
 *  2. Trocar Prisma por outra coisa (ou adicionar cache) fica restrito a este
 *     arquivo. O service não muda uma linha.
 *
 * O custo é uma indireção a mais. Vale a pena porque a regra "doação não tem
 * preço" é a parte que realmente precisa de teste, e ela vive no service.
 */

/** Registro do anúncio já com o autor carregado. */
export interface AnnouncementRecord {
  id: string;
  title: string;
  description: string;
  category: Category;
  condition: ItemCondition;
  type: ItemType;
  priceCents: number | null;
  imageUrl: string;
  status: AnnouncementStatus;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  author: {
    id: string;
    name: string;
    course: string | null;
    avatarUrl: string | null;
  };
}

/** Campos que o service pode alterar num update. */
export interface AnnouncementUpdateData {
  title?: string;
  description?: string;
  category?: Category;
  condition?: ItemCondition;
  type?: ItemType;
  priceCents?: number | null;
  imageUrl?: string;
  status?: AnnouncementStatus;
}

export interface AnnouncementsRepository {
  findMany(
    filters: AnnouncementFilters,
    authorId?: string,
  ): Promise<{ items: AnnouncementRecord[]; total: number }>;

  findById(id: string): Promise<AnnouncementRecord | null>;

  create(data: CreateAnnouncementInput, authorId: string): Promise<AnnouncementRecord>;

  update(id: string, data: AnnouncementUpdateData): Promise<AnnouncementRecord>;

  /** Exclusão lógica: preenche `deletedAt`, não apaga a linha. */
  softDelete(id: string): Promise<void>;

  countByCategory(): Promise<Array<{ category: Category; count: number }>>;

  countStats(): Promise<{ total: number; active: number; donations: number }>;
}

/** Só estes campos do autor saem da camada de dados — nunca o `passwordHash`. */
const authorSelect = {
  select: { id: true, name: true, course: true, avatarUrl: true },
} as const;

/**
 * Traduz os filtros validados para a cláusula `where` do Prisma.
 *
 * `deletedAt: null` é a primeira condição de TODA consulta. Um anúncio
 * "excluído" continua na tabela e não pode vazar para a vitrine.
 */
function buildWhere(
  filters: AnnouncementFilters,
  authorId?: string,
): Prisma.AnnouncementWhereInput {
  const where: Prisma.AnnouncementWhereInput = { deletedAt: null };

  if (authorId) where.authorId = authorId;
  if (filters.category) where.category = filters.category;
  if (filters.type) where.type = filters.type;
  if (filters.condition) where.condition = filters.condition;

  // Sem filtro explícito, a vitrine pública só mostra o que está disponível.
  where.status = filters.status ?? 'ATIVO';

  if (filters.q) {
    // `mode: 'insensitive'` deixa a busca indiferente a maiúsculas/acentuação
    // de caixa. "calculo" encontra "Cálculo"? Não — acento é outro caractere.
    // Para busca com acento-insensível seria preciso `unaccent` no Postgres.
    where.OR = [
      { title: { contains: filters.q, mode: 'insensitive' } },
      { description: { contains: filters.q, mode: 'insensitive' } },
    ];
  }

  return where;
}

/** Traduz o `sort` da query string para o `orderBy` do Prisma. */
function buildOrderBy(
  sort: AnnouncementFilters['sort'],
): Prisma.AnnouncementOrderByWithRelationInput {
  switch (sort) {
    case 'oldest':
      return { createdAt: 'asc' };
    case 'price_asc':
      // `nulls: 'last'` empurra doações (preço null) para o fim da ordenação
      // crescente — senão elas apareceriam antes de tudo, como "mais baratas".
      return { priceCents: { sort: 'asc', nulls: 'last' } };
    case 'price_desc':
      return { priceCents: { sort: 'desc', nulls: 'last' } };
    case 'recent':
    default:
      return { createdAt: 'desc' };
  }
}

export const prismaAnnouncementsRepository: AnnouncementsRepository = {
  async findMany(filters, authorId) {
    const where = buildWhere(filters, authorId);
    const skip = (filters.page - 1) * filters.limit;

    // `$transaction` roda as duas consultas no mesmo snapshot do banco. Sem
    // isso, um anúncio criado entre a contagem e a busca produziria um `total`
    // incoerente com a página devolvida.
    const [items, total] = await prisma.$transaction([
      prisma.announcement.findMany({
        where,
        orderBy: buildOrderBy(filters.sort),
        skip,
        take: filters.limit,
        include: { author: authorSelect },
      }),
      prisma.announcement.count({ where }),
    ]);

    return { items, total };
  },

  async findById(id) {
    return prisma.announcement.findFirst({
      where: { id, deletedAt: null },
      include: { author: authorSelect },
    });
  },

  async create(data, authorId) {
    return prisma.announcement.create({
      data: { ...data, authorId },
      include: { author: authorSelect },
    });
  },

  async update(id, data) {
    return prisma.announcement.update({
      where: { id },
      data,
      include: { author: authorSelect },
    });
  },

  async softDelete(id) {
    await prisma.announcement.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },

  async countByCategory() {
    const rows = await prisma.announcement.groupBy({
      by: ['category'],
      where: { deletedAt: null, status: 'ATIVO' },
      _count: { _all: true },
    });

    return rows.map((row) => ({ category: row.category, count: row._count._all }));
  },

  async countStats() {
    const [total, active, donations] = await prisma.$transaction([
      prisma.announcement.count({ where: { deletedAt: null } }),
      prisma.announcement.count({ where: { deletedAt: null, status: 'ATIVO' } }),
      prisma.announcement.count({ where: { deletedAt: null, type: 'DOACAO' } }),
    ]);

    return { total, active, donations };
  },
};
