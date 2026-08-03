import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import {
  type AnnouncementQuery,
  getAnnouncement,
  getCategories,
  getStats,
  listAnnouncements,
} from './api';

/**
 * Hooks de leitura da vitrine.
 *
 * Cada um devolve `{ data, isPending, isError, error }`. A interface reage a
 * esses estados em vez de controlar carregamento na mão — é o que elimina a
 * dupla `useState` + `useEffect` repetida em cada tela.
 */

export function useAnnouncements(query: AnnouncementQuery = {}) {
  return useQuery({
    // A chave inclui os filtros: mudar de categoria é outra query, com cache
    // próprio. Voltar para a categoria anterior mostra o resultado na hora.
    queryKey: queryKeys.announcements.list(query),
    queryFn: () => listAnnouncements(query),

    // Mantém a lista anterior visível enquanto a nova carrega, em vez de piscar
    // um skeleton a cada troca de filtro.
    placeholderData: (previous) => previous,
  });
}

export function useAnnouncement(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.announcements.detail(id ?? ''),
    queryFn: () => getAnnouncement(id!),
    // Sem id não há o que buscar (ex.: rota ainda resolvendo o parâmetro).
    enabled: Boolean(id),
  });
}

export function useStats() {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: getStats,
    // Contadores da landing toleram estar alguns minutos desatualizados.
    staleTime: 5 * 60_000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: getCategories,
    staleTime: 5 * 60_000,
    select: (data) => data.categories,
  });
}
