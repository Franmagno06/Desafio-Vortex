import { z } from 'zod';

/**
 * Paginação por offset (page/limit).
 *
 * Usamos `z.coerce` porque query string sempre chega como texto: `?page=2` é a
 * string "2", e o Zod converte para número ANTES de validar. Sem isso, todo
 * `page` seria rejeitado por não ser number.
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/** Envelope de listagem devolvido pela API. */
export interface Paginated<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/** Monta o bloco `meta` a partir do total do banco. */
export function buildPaginationMeta(
  total: number,
  { page, limit }: PaginationQuery,
): Paginated<never>['meta'] {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
