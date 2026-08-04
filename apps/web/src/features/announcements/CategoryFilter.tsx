import type { CategoryOptionDTO } from '@circula/shared';
import { cn } from '@/lib/cn';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Chips de filtro por categoria — requisito explícito do edital
 * ("filtros básicos por categoria: Livros, Engenharia, Computação").
 *
 * Detalhes que fazem diferença aqui:
 *
 *  - Cada chip mostra a **contagem** de anúncios. Um filtro que leva a uma tela
 *    vazia frustra; mostrando o número antes, a pessoa sabe o que esperar.
 *  - Categorias com zero anúncios ficam desabilitadas em vez de sumirem. Some
 *    seria pior: a lista mudaria de tamanho a cada carregamento e a pessoa
 *    perderia a referência de onde clicar.
 *  - São `<button>` de verdade, não `<div onClick>`. Vêm de graça: foco por
 *    teclado, ativação com Enter/Espaço e anúncio correto no leitor de tela.
 */
interface Props {
  categories: CategoryOptionDTO[] | undefined;
  isLoading: boolean;
  selected: string | undefined;
  onSelect: (category: string | undefined) => void;
}

export function CategoryFilter({ categories, isLoading, selected, onSelect }: Props) {
  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-28 rounded-full" />
        ))}
      </div>
    );
  }

  if (!categories?.length) return null;

  const total = categories.reduce((sum, category) => sum + category.count, 0);

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar anúncios por categoria">
      <FilterChip
        label="Todos"
        count={total}
        isActive={selected === undefined}
        onClick={() => onSelect(undefined)}
      />

      {categories.map((category) => (
        <FilterChip
          key={category.value}
          label={category.label}
          count={category.count}
          isActive={selected === category.value}
          isDisabled={category.count === 0}
          onClick={() => onSelect(category.value)}
        />
      ))}
    </div>
  );
}

function FilterChip({
  label,
  count,
  isActive,
  isDisabled = false,
  onClick,
}: {
  label: string;
  count: number;
  isActive: boolean;
  isDisabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      // `aria-pressed` comunica ao leitor de tela que este é um botão de
      // alternância e qual é o estado atual — informação que a cor sozinha
      // transmite apenas para quem enxerga.
      aria-pressed={isActive}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200',
        isActive
          ? 'border-brand-700 bg-brand-700 text-white shadow-sm'
          : 'border-slate-200 bg-surface text-ink-700 hover:border-brand-300 hover:bg-brand-50',
        isDisabled && 'cursor-not-allowed opacity-40 hover:border-slate-200 hover:bg-surface',
      )}
    >
      {label}
      <span
        className={cn(
          'rounded-full px-1.5 text-xs tabular-nums',
          isActive ? 'bg-white/20' : 'bg-slate-100 text-ink-500',
        )}
      >
        {count}
      </span>
    </button>
  );
}
