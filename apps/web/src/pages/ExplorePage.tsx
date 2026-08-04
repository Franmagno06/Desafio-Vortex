import { useState } from 'react';
import { PackageOpen, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AnnouncementCardSkeleton } from '@/components/ui/Skeleton';
import { AnnouncementCard } from '@/features/announcements/AnnouncementCard';
import { CategoryFilter } from '@/features/announcements/CategoryFilter';
import { useAnnouncements, useCategories } from '@/features/announcements/hooks';
import { useDebouncedValue } from '@/lib/use-debounced-value';

/** Vitrine completa, com busca textual, filtro por categoria e paginação. */
export function ExplorePage() {
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  /**
   * A busca só vai para a rede 400ms depois da última tecla.
   *
   * Sem isso, digitar "arduino" dispararia 7 requisições — uma por letra — e a
   * resposta da 3ª poderia chegar depois da 7ª, mostrando resultado errado.
   */
  const debouncedSearch = useDebouncedValue(search, 400);

  const { data: categories, isPending: loadingCategories } = useCategories();
  const { data, isPending, isError, isFetching, refetch } = useAnnouncements({
    category,
    // A API exige no mínimo 2 caracteres na busca; abaixo disso, nem envia.
    q: debouncedSearch.trim().length >= 2 ? debouncedSearch.trim() : undefined,
    page,
    limit: 12,
  });

  /** Qualquer mudança de filtro volta para a página 1. */
  function handleCategory(next: string | undefined) {
    setCategory(next);
    setPage(1);
  }

  function handleSearch(next: string) {
    setSearch(next);
    setPage(1);
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">Explorar itens</h1>

      <div className="relative mt-5">
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-500"
          aria-hidden="true"
        />
        <input
          type="search"
          value={search}
          onChange={(event) => {
            handleSearch(event.target.value);
          }}
          placeholder="Buscar por título ou descrição…"
          aria-label="Buscar itens"
          className="w-full rounded-full border border-slate-300 bg-surface py-2.5 pr-4 pl-10 text-sm text-ink-900 placeholder:text-ink-500/60 focus:border-brand-500 focus:outline-2 focus:outline-brand-500"
        />
      </div>

      <div className="mt-5">
        <CategoryFilter
          categories={categories}
          isLoading={loadingCategories}
          selected={category}
          onSelect={handleCategory}
        />
      </div>

      <div className="mt-8" aria-live="polite" aria-busy={isPending}>
        {isPending ? (
          <Grid>
            {Array.from({ length: 12 }).map((_, index) => (
              <AnnouncementCardSkeleton key={index} />
            ))}
          </Grid>
        ) : isError ? (
          <Empty
            title="Não foi possível carregar"
            description="Verifique sua conexão e tente novamente."
            action={
              <Button onClick={() => void refetch()} variant="secondary" size="sm">
                Tentar de novo
              </Button>
            }
          />
        ) : data.items.length === 0 ? (
          <Empty
            title="Nenhum item encontrado"
            description={
              debouncedSearch
                ? `Nada para "${debouncedSearch}". Tente outra palavra.`
                : 'Ainda não há itens nesta categoria.'
            }
            action={
              <Button to="/app/anunciar" size="sm">
                Anunciar um item
              </Button>
            }
          />
        ) : (
          <>
            <Grid className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
              {data.items.map((announcement) => (
                <AnnouncementCard key={announcement.id} announcement={announcement} />
              ))}
            </Grid>

            {data.meta.totalPages > 1 && (
              <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Paginação">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!data.meta.hasPrev}
                  onClick={() => {
                    setPage((current) => current - 1);
                    window.scrollTo({ top: 0 });
                  }}
                >
                  Anterior
                </Button>

                <span className="text-sm text-ink-500 tabular-nums">
                  {data.meta.page} de {data.meta.totalPages}
                </span>

                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!data.meta.hasNext}
                  onClick={() => {
                    setPage((current) => current + 1);
                    window.scrollTo({ top: 0 });
                  }}
                >
                  Próxima
                </Button>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Grid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-4 lg:grid-cols-4 ${className ?? ''}`}>{children}</div>
  );
}

function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-slate-300 bg-surface px-6 py-16 text-center">
      <PackageOpen className="size-10 text-ink-500" aria-hidden="true" />
      <h2 className="mt-4 font-semibold text-ink-900">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>
      <div className="mt-5">{action}</div>
    </div>
  );
}
