import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';
import { queryClient } from '@/lib/query-client';
import { AppRoutes } from '@/app/router';

/**
 * Raiz da aplicação: providers + rotas.
 *
 * A ordem importa. O `QueryClientProvider` fica por fora porque qualquer rota
 * pode precisar buscar dados; o `BrowserRouter` por dentro, já com acesso ao
 * cache. Inverter faria os hooks de query quebrarem fora do contexto.
 */
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
