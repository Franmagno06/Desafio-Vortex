import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  AnnouncementDTO,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from '@circula/shared';

import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';

/**
 * Operações de escrita dos anúncios.
 *
 * O ponto central aqui é a **invalidação de cache**. Depois de criar um
 * anúncio, a vitrine e "meus anúncios" ficam desatualizados — o TanStack Query
 * não adivinha isso. Invalidar pela raiz `['announcements']` marca todas as
 * listagens (com qualquer filtro) como obsoletas de uma vez, e o React Query
 * refaz só as que estiverem na tela.
 *
 * `/stats` e `/categories` também mudam: os contadores da landing e os números
 * dos chips de filtro dependem da quantidade de anúncios.
 */

function createAnnouncement(input: CreateAnnouncementInput) {
  return api.post<AnnouncementDTO>('/api/v1/announcements', input);
}

function updateAnnouncement(id: string, input: UpdateAnnouncementInput) {
  return api.patch<AnnouncementDTO>(`/api/v1/announcements/${id}`, input);
}

function deleteAnnouncement(id: string) {
  return api.delete<void>(`/api/v1/announcements/${id}`);
}

/** Invalida tudo que depende da lista de anúncios. */
function useInvalidateAnnouncements() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    void queryClient.invalidateQueries({ queryKey: queryKeys.categories });
  };
}

export function useCreateAnnouncement() {
  const invalidate = useInvalidateAnnouncements();

  return useMutation({
    mutationFn: createAnnouncement,
    onSuccess: invalidate,
  });
}

export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateAnnouncements();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAnnouncementInput }) =>
      updateAnnouncement(id, input),
    onSuccess: (updated) => {
      // Atualiza o detalhe já com a resposta do servidor, evitando um refetch
      // extra só para exibir o que acabamos de receber.
      queryClient.setQueryData(queryKeys.announcements.detail(updated.id), updated);
      invalidate();
    },
  });
}

export function useDeleteAnnouncement() {
  const invalidate = useInvalidateAnnouncements();

  return useMutation({
    mutationFn: deleteAnnouncement,
    onSuccess: invalidate,
  });
}
