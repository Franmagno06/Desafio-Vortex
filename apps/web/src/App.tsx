import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';
import { queryClient } from '@/lib/query-client';
import { AppRoutes } from '@/app/router';
import { AuthProvider } from '@/features/auth/AuthContext';
import { ToastProvider } from '@/components/ui/Toast';

/**
 * Raiz da aplicação: providers + rotas.
 *
 * A ordem do aninhamento não é arbitrária:
 *
 *   QueryClientProvider  ← precisa ser o mais externo: o AuthProvider usa
 *                          `useQueryClient()` para limpar o cache no logout
 *     AuthProvider       ← as rotas dependem da sessão para decidir o acesso
 *       ToastProvider    ← qualquer tela pode disparar uma notificação
 *         BrowserRouter
 */
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
