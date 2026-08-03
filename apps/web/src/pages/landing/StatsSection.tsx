import { HeartHandshake, Package, Users, Recycle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useStats } from '@/features/announcements/hooks';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Contadores da plataforma.
 *
 * O edital pede "estatísticas simuladas". Estas são **reais** — vêm de
 * `GET /api/v1/stats`, que conta as linhas no PostgreSQL. Custou duas consultas
 * a mais e rende um argumento melhor no pitch: o número na tela é o estado
 * verdadeiro do sistema, não um valor fixo no código.
 */
export function StatsSection() {
  const { data, isPending, isError } = useStats();

  // Se a API cair, a landing continua de pé sem a seção. Melhor uma página
  // completa sem contadores do que uma faixa de erro no meio do conteúdo.
  if (isError) return null;

  const items: Array<{ icon: LucideIcon; value: number | undefined; label: string; accent?: boolean }> = [
    { icon: Package, value: data?.activeAnnouncements, label: 'itens disponíveis agora' },
    { icon: HeartHandshake, value: data?.donations, label: 'oferecidos como doação', accent: true },
    { icon: Users, value: data?.users, label: 'estudantes participando' },
    { icon: Recycle, value: data?.totalAnnouncements, label: 'itens que ganharam nova vida' },
  ];

  return (
    <section
      className="mx-auto max-w-6xl px-4 sm:px-6"
      aria-label="Números da plataforma"
      aria-busy={isPending}
    >
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {items.map(({ icon: Icon, value, label, accent }) => (
          <div
            key={label}
            className="rounded-[var(--radius-card)] border border-slate-200 bg-surface p-5 transition-shadow hover:shadow-md"
          >
            <Icon
              className={accent ? 'size-6 text-accent-500' : 'size-6 text-brand-600'}
              aria-hidden="true"
            />
            <dd className="mt-3 text-3xl font-bold tracking-tight text-ink-900 tabular-nums">
              {isPending ? <Skeleton className="h-9 w-16" /> : value}
            </dd>
            <dt className="mt-1 text-sm text-ink-500">{label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
