import { useEffect, useState } from 'react';
import { CATEGORIES, CATEGORY_META, type Category } from '@circula/shared';
import { api, ApiError, NetworkError } from '@/lib/api-client';

/**
 * Tela de diagnóstico da Sprint 0.
 *
 * Ela não faz parte do produto final — existe para provar, visualmente, que a
 * cadeia completa está de pé: PWA (5173) -> CORS -> API (3333) -> pacote
 * compartilhado. Na Sprint 3 este componente é substituído pela Landing Page.
 */

interface HealthResponse {
  status: string;
  service: string;
  version: string;
  uptimeSeconds: number;
}

type ConnectionState =
  | { kind: 'loading' }
  | { kind: 'online'; data: HealthResponse }
  | { kind: 'error'; message: string };

export default function App() {
  const [connection, setConnection] = useState<ConnectionState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;

    api
      .get<HealthResponse>('/health')
      .then((data) => {
        if (!cancelled) setConnection({ kind: 'online', data });
      })
      .catch((error: unknown) => {
        if (cancelled) return;

        const message =
          error instanceof NetworkError || error instanceof ApiError
            ? error.message
            : 'Erro desconhecido.';

        setConnection({ kind: 'error', message });
      });

    // Cleanup: se o componente desmontar antes da resposta chegar, ignoramos
    // o resultado em vez de chamar setState em um componente já removido.
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-8 px-6 py-12">
      <header className="space-y-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold tracking-wide text-brand-800 uppercase">
          Sprint 0 · Fundação
        </span>
        <h1 className="text-4xl font-bold tracking-tight text-ink-900">
          Circula<span className="text-brand-600">.</span>
        </h1>
        <p className="text-ink-500">
          Marketplace de economia circular do campus. Ambiente de desenvolvimento configurado.
        </p>
      </header>

      <section className="rounded-[var(--radius-card)] border border-slate-200 bg-surface p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-ink-700">Conexão com a API</h2>

        {connection.kind === 'loading' && (
          <div className="flex items-center gap-3 text-ink-500">
            <span className="size-3 animate-pulse rounded-full bg-brand-400" />
            Verificando <code className="text-xs">{api.baseUrl}/health</code>…
          </div>
        )}

        {connection.kind === 'online' && (
          <div className="space-y-2">
            <div className="flex items-center gap-3 font-medium text-brand-700">
              <span className="size-3 rounded-full bg-brand-500" />
              API conectada
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-ink-500">
              <dt>Serviço</dt>
              <dd className="text-ink-900">{connection.data.service}</dd>
              <dt>Versão</dt>
              <dd className="text-ink-900">{connection.data.version}</dd>
              <dt>Uptime</dt>
              <dd className="text-ink-900">{connection.data.uptimeSeconds}s</dd>
            </dl>
          </div>
        )}

        {connection.kind === 'error' && (
          <div className="space-y-2">
            <div className="flex items-center gap-3 font-medium text-red-600">
              <span className="size-3 rounded-full bg-red-500" />
              API indisponível
            </div>
            <p className="text-sm text-ink-500">{connection.message}</p>
            <p className="text-xs text-ink-500">
              Rode <code className="rounded bg-slate-100 px-1">npm run dev</code> na raiz do projeto
              para subir a API junto com o front.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-[var(--radius-card)] border border-slate-200 bg-surface p-6 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-ink-700">Categorias do domínio</h2>
        <p className="mb-4 text-xs text-ink-500">
          Vindas de <code>@circula/shared</code> — a mesma lista que a API usa para validar.
        </p>
        <ul className="flex flex-wrap gap-2">
          {CATEGORIES.map((category: Category) => (
            <li
              key={category}
              className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-sm text-brand-800"
            >
              {CATEGORY_META[category].label}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
