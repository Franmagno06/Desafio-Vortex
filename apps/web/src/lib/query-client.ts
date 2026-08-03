import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api-client';

/**
 * Configuração global do cache de dados do servidor.
 *
 * O TanStack Query resolve, de uma vez, quatro coisas que a gente escreveria à
 * mão com `useEffect`: estado de carregamento, cache entre telas, deduplicação
 * de requisições simultâneas e revalidação. Na Sprint 5 ele também vira a base
 * do funcionamento offline, persistindo o cache no navegador.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /**
       * Por 60s um dado buscado é considerado "fresco" e reaproveitado sem ir
       * à rede. Anúncios de campus não mudam a cada segundo, e isso evita que
       * navegar entre páginas dispare a mesma requisição repetidamente.
       */
      staleTime: 60_000,

      /** Quanto tempo o dado fica no cache depois que ninguém mais o usa. */
      gcTime: 5 * 60_000,

      /**
       * Não repetir requisição que falhou por erro do cliente (4xx).
       *
       * Um 404 ou 422 vai falhar de novo — insistir só atrasa a mensagem de
       * erro para o usuário. Já falha de rede ou 5xx pode ser transitória, e aí
       * duas novas tentativas valem a pena.
       */
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 2;
      },

      /** Evita recarregar tudo sempre que a aba volta a ter foco. */
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Chaves de cache centralizadas.
 *
 * Cada query precisa de uma chave única e estável; se duas telas usarem chaves
 * diferentes para o mesmo dado, o cache não é compartilhado. Reunir tudo aqui
 * evita divergência e permite invalidar por prefixo — `['announcements']`
 * invalida todas as listagens de uma vez, com qualquer filtro.
 */
export const queryKeys = {
  announcements: {
    all: ['announcements'] as const,
    // `object` em vez de `Record<string, unknown>`: uma interface declarada
    // (como `AnnouncementQuery`) não tem index signature e seria rejeitada
    // pelo Record. Para uma chave de cache basta ser serializável.
    list: (filters: object) => ['announcements', 'list', filters] as const,
    detail: (id: string) => ['announcements', 'detail', id] as const,
    mine: (filters: object) => ['announcements', 'mine', filters] as const,
  },
  stats: ['stats'] as const,
  categories: ['categories'] as const,
  catalog: ['catalog'] as const,
  me: ['auth', 'me'] as const,
};
