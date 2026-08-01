import type { AnnouncementStatus, Category, ItemCondition, ItemType } from '../domain/enums.js';

/**
 * Formato de SAÍDA da API — o que o PWA realmente recebe.
 *
 * Não é o modelo do banco. Duas diferenças propositais:
 *
 *  - `passwordHash`, `deletedAt` e afins nunca aparecem aqui. O tipo documenta
 *    o que é público; o mapper (`announcements.mapper.ts`) garante isso em
 *    tempo de execução.
 *  - Datas são `string` em ISO 8601, porque JSON não tem tipo data. Quem
 *    precisar de um `Date` converte na borda.
 */

/** Dados do anunciante expostos publicamente. */
export interface AuthorSummary {
  id: string;
  name: string;
  course: string | null;
  avatarUrl: string | null;
}

export interface AnnouncementDTO {
  id: string;
  title: string;
  description: string;
  category: Category;
  condition: ItemCondition;
  type: ItemType;
  /** Centavos. `null` em doação e troca. */
  priceCents: number | null;
  imageUrl: string;
  status: AnnouncementStatus;
  author: AuthorSummary;
  /** ISO 8601, ex.: "2026-08-01T14:32:10.000Z" */
  createdAt: string;
  updatedAt: string;
}

/** Contadores da landing page. */
export interface StatsDTO {
  totalAnnouncements: number;
  activeAnnouncements: number;
  donations: number;
  users: number;
  byCategory: Array<{ category: Category; count: number }>;
}

/** Item da lista de categorias com contagem — alimenta os chips de filtro. */
export interface CategoryOptionDTO {
  value: Category;
  label: string;
  icon: string;
  count: number;
}
