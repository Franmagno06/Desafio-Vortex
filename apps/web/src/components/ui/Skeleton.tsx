import { cn } from '@/lib/cn';

/**
 * Placeholder de carregamento.
 *
 * Por que skeleton em vez de um spinner: o skeleton ocupa **o mesmo espaço** do
 * conteúdo que vai chegar. O layout não salta quando os dados carregam, e a
 * espera parece menor porque a pessoa já vê a forma da página.
 *
 * `aria-hidden` porque isto é ruído visual: quem usa leitor de tela recebe o
 * aviso pelo `aria-busy` do contêiner, não por uma sequência de caixas vazias.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('animate-pulse rounded-lg bg-slate-200/70', className)} />
  );
}

/** Esqueleto com a forma exata de um `AnnouncementCard`. */
export function AnnouncementCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-slate-200 bg-surface">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-2/3" />
        <div className="flex items-center gap-2 pt-2">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}
