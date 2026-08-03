import type { ItemType } from '@circula/shared';
import { ITEM_TYPE_META } from '@circula/shared';
import { cn } from '@/lib/cn';

/**
 * Selo do tipo de negociação.
 *
 * A cor comunica antes do texto: **doação usa o âmbar**, a única cor de
 * destaque da paleta, reservada exatamente para isso. Venda e troca ficam em
 * tons neutros. É uma decisão de produto — queremos que o olho encontre as
 * doações primeiro ao varrer a vitrine.
 */
const typeStyles: Record<ItemType, string> = {
  DOACAO: 'bg-accent-100 text-accent-600 ring-1 ring-accent-400/30',
  VENDA: 'bg-brand-50 text-brand-800 ring-1 ring-brand-200',
  TROCA: 'bg-slate-100 text-ink-700 ring-1 ring-slate-200',
};

export function TypeBadge({ type, className }: { type: ItemType; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        typeStyles[type],
        className,
      )}
    >
      {ITEM_TYPE_META[type].label}
    </span>
  );
}
