import { useState } from 'react';
import { ArrowRight, PackageOpen, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AnnouncementCardSkeleton } from '@/components/ui/Skeleton';
import { AnnouncementCard } from '@/features/announcements/AnnouncementCard';
import { CategoryFilter } from '@/features/announcements/CategoryFilter';
import { useAnnouncements, useCategories } from '@/features/announcements/hooks';
import { ApiError, NetworkError } from '@/lib/api-client';

/** Traduz a falha de carregamento numa instrução útil para o usuário. */
function describeLoadError(error: unknown): string {
  if (error instanceof NetworkError) return error.message;
  if (error instanceof ApiError) return error.message;
  return 'Tente novamente em instantes.';
}

/**
 * Vitrine pública da Landing Page.
 *
 * Requisito do edital: "uma vitrine pública listando os últimos itens
 * anunciados com filtros básicos por categoria".
 *
 * Esta seção lida com **quatro estados** distintos, e cada um tem um desenho
 * próprio. É a diferença entre uma tela que parece pronta e uma que quebra na
 * primeira vez que a rede oscila:
 *
 *   1. carregando  → skeletons com a forma exata dos cards
 *   2. erro        → mensagem clara com botão de tentar de novo
 *   3. vazio       → explica por que está vazio e oferece uma saída
 *   4. com dados   → a vitrine
 */
export function Showcase() {
  const [category, setCategory] = useState<string | undefined>(undefined);

  const { data: categories, isPending: loadingCategories } = useCategories();
  const { data, isPending, isError, isFetching, error, refetch } = useAnnouncements({
    category,
    limit: 8,
    sort: 'recent',
  });

  const announcements = data?.items ?? [];

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6" aria-labelledby="vitrine">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="vitrine" className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            Últimos anúncios
          </h2>
          <p className="mt-2 text-ink-500">O que estudantes do campus estão oferecendo agora.</p>
        </div>

        <Button to="/explorar" variant="secondary" size="sm">
          Ver todos
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="mt-6">
        <CategoryFilter
          categories={categories}
          isLoading={loadingCategories}
          selected={category}
          onSelect={setCategory}
        />
      </div>

      {/* `aria-live="polite"` faz o leitor de tela anunciar a mudança de
          resultado depois de trocar o filtro — sem isso, quem não enxerga
          clicaria no chip e não receberia retorno nenhum. */}
      <div className="mt-8" aria-live="polite" aria-busy={isPending}>
        {isPending ? (
          <CardGrid>
            {Array.from({ length: 8 }).map((_, index) => (
              <AnnouncementCardSkeleton key={index} />
            ))}
          </CardGrid>
        ) : isError ? (
          <EmptyState
            icon={WifiOff}
            title="Não foi possível carregar os anúncios"
            // A mensagem vem do erro, que já distingue "você está offline" de
            // "o servidor não respondeu". Um texto fixo mandaria metade das
            // pessoas investigar a própria internet sem motivo.
            description={describeLoadError(error)}
            action={
              <Button onClick={() => void refetch()} variant="secondary" size="sm">
                Tentar de novo
              </Button>
            }
          />
        ) : announcements.length === 0 ? (
          <EmptyState
            icon={PackageOpen}
            title="Nenhum item nesta categoria ainda"
            description="Que tal ser a primeira pessoa a anunciar aqui?"
            action={
              <Button to="/anunciar" size="sm">
                Anunciar um item
              </Button>
            }
          />
        ) : (
          <CardGrid
            /* Enquanto revalida em segundo plano, esmaece de leve em vez de
               trocar tudo por skeleton — a lista antiga continua utilizável. */
            className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}
          >
            {announcements.map((announcement) => (
              <AnnouncementCard key={announcement.id} announcement={announcement} />
            ))}
          </CardGrid>
        )}
      </div>
    </section>
  );
}

function CardGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 ${className ?? ''}`}>
      {children}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-slate-300 bg-surface px-6 py-16 text-center">
      <Icon className="size-10 text-ink-500" aria-hidden />
      <h3 className="mt-4 font-semibold text-ink-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>
      <div className="mt-5">{action}</div>
    </div>
  );
}
