import type {
  AnnouncementDTO,
  CategoryOptionDTO,
  Paginated,
  StatsDTO,
} from '@circula/shared';
import { api } from '@/lib/api-client';

/**
 * Chamadas HTTP relacionadas a anúncios.
 *
 * Camada fina de propósito: cada função só monta a URL e devolve a promessa
 * tipada. Quem decide quando chamar, como cachear e o que fazer com erro são
 * os hooks (`hooks.ts`). Separar assim mantém estas funções testáveis e
 * reutilizáveis fora do React.
 */

/** Filtros aceitos pela vitrine. Espelha `announcementFiltersSchema` da API. */
export interface AnnouncementQuery {
  category?: string | undefined;
  type?: string | undefined;
  condition?: string | undefined;
  q?: string | undefined;
  sort?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

/**
 * Monta a query string ignorando valores vazios.
 *
 * Importa porque `?category=` (vazio) não é o mesmo que omitir o parâmetro: o
 * primeiro chega à API como string vazia e é rejeitado pelo enum do Zod. Só
 * entram na URL os filtros realmente preenchidos.
 */
function buildQueryString(query: AnnouncementQuery): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

export function listAnnouncements(query: AnnouncementQuery = {}) {
  return api.get<Paginated<AnnouncementDTO>>(
    `/api/v1/announcements${buildQueryString(query)}`,
  );
}

export function getAnnouncement(id: string) {
  return api.get<AnnouncementDTO>(`/api/v1/announcements/${id}`);
}

export function getStats() {
  return api.get<StatsDTO>('/api/v1/stats');
}

export function getCategories() {
  return api.get<{ categories: CategoryOptionDTO[] }>('/api/v1/categories');
}
