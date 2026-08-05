import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { BrowserRouter } from 'react-router';
import { queryClient } from '@/lib/query-client';
import {
  CACHE_BUSTER,
  MAX_CACHE_AGE,
  queryPersister,
  shouldPersistQuery,
} from '@/lib/query-persister';
import { AppRoutes } from '@/app/router';
import { AuthProvider } from '@/features/auth/AuthContext';
import { ToastProvider } from '@/components/ui/Toast';
import { PwaPrompts } from '@/features/pwa/PwaPrompts';

/**
 * Raiz da aplicação: providers + rotas.
 *
 * A ordem do aninhamento não é arbitrária:
 *
 *   PersistQueryClientProvider  ← precisa ser o mais externo: o AuthProvider
 *                                 usa `useQueryClient()` para limpar o cache
 *                                 no logout
 *     AuthProvider              ← as rotas dependem da sessão para decidir o
 *                                 acesso
 *       ToastProvider           ← qualquer tela pode disparar uma notificação
 *         BrowserRouter
 *
 * O `PersistQueryClientProvider` substituiu o `QueryClientProvider` na
 * Sprint 5: além de fornecer o cliente, ele restaura o cache salvo no
 * `localStorage` antes da primeira renderização e o mantém sincronizado. É o
 * que faz os anúncios já carregados aparecerem instantaneamente ao reabrir o
 * app — inclusive sem internet.
 */
export default function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: MAX_CACHE_AGE,
        buster: CACHE_BUSTER,
        dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
      }}
      onSuccess={() => {
        // Chamado depois de restaurar o cache do disco.
        if (import.meta.env.DEV) console.warn('[PWA] Cache de queries restaurado.');
      }}
    >
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppRoutes />
            <PwaPrompts />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </PersistQueryClientProvider>
  );
}
