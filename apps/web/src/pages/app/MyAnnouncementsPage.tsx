import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { PackagePlus, Trash2 } from 'lucide-react';
import { type AnnouncementDTO, type Paginated, formatPrice } from '@circula/shared';

import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { Button } from '@/components/ui/Button';
import { TypeBadge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useDeleteAnnouncement } from '@/features/announcements/mutations';

/**
 * "Meus anúncios" — requisito do edital: o usuário deve visualizar os próprios
 * anúncios cadastrados.
 *
 * Usa `GET /announcements/mine`, que filtra pelo id extraído do JWT. O cliente
 * não manda o id do autor: quem decide de quem é a lista é o servidor, a
 * partir do token. Se dependesse de um parâmetro, bastaria trocá-lo para ver a
 * lista de outra pessoa.
 */
export function MyAnnouncementsPage() {
  const toast = useToast();
  const { mutateAsync: remove, isPending: isDeleting } = useDeleteAnnouncement();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: queryKeys.announcements.mine({}),
    // `status` vazio traz também RESERVADO e CONCLUIDO: o dono precisa ver
    // tudo que é seu, não só o que está ativo na vitrine.
    queryFn: () => api.get<Paginated<AnnouncementDTO>>('/api/v1/announcements/mine?limit=50'),
  });

  async function handleDelete(announcement: AnnouncementDTO) {
    // `confirm` nativo por ser exclusão irreversível na visão do usuário.
    // Um modal próprio entraria aqui se houvesse mais tempo de sprint.
    const confirmed = window.confirm(
      `Excluir "${announcement.title}"? Esta ação não pode ser desfeita.`,
    );
    if (!confirmed) return;

    setPendingId(announcement.id);

    try {
      await remove(announcement.id);
      toast.success('Anúncio excluído.');
    } catch {
      toast.error('Não foi possível excluir. Tente novamente.');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Meus anúncios</h1>
        <Button to="/app/anunciar" size="sm">
          <PackagePlus className="size-4" aria-hidden="true" />
          Novo
        </Button>
      </div>

      <div className="mt-6 space-y-3" aria-busy={isPending}>
        {isPending ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-[var(--radius-card)]" />
          ))
        ) : isError ? (
          <div className="rounded-[var(--radius-card)] border border-dashed border-slate-300 px-6 py-12 text-center">
            <p className="text-sm text-ink-500">Não foi possível carregar seus anúncios.</p>
            <Button onClick={() => void refetch()} variant="secondary" size="sm" className="mt-4">
              Tentar de novo
            </Button>
          </div>
        ) : data.items.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-dashed border-slate-300 px-6 py-14 text-center">
            <PackagePlus className="mx-auto size-10 text-ink-500" aria-hidden="true" />
            <h2 className="mt-4 font-semibold text-ink-900">Você ainda não anunciou nada</h2>
            <p className="mx-auto mt-1 max-w-xs text-sm text-ink-500">
              Um livro, um jaleco, uma calculadora. Alguém do campus está precisando.
            </p>
            <Button to="/app/anunciar" size="sm" className="mt-5">
              Anunciar meu primeiro item
            </Button>
          </div>
        ) : (
          data.items.map((announcement) => (
            <article
              key={announcement.id}
              className="flex gap-3 rounded-[var(--radius-card)] border border-slate-200 bg-surface p-3"
            >
              <Link to={`/anuncio/${announcement.id}`} className="shrink-0">
                <img
                  src={announcement.imageUrl}
                  alt=""
                  loading="lazy"
                  className="size-20 rounded-lg bg-slate-100 object-cover"
                />
              </Link>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    to={`/anuncio/${announcement.id}`}
                    className="line-clamp-2 font-semibold text-ink-900 hover:text-brand-700"
                  >
                    {announcement.title}
                  </Link>

                  <button
                    type="button"
                    onClick={() => void handleDelete(announcement)}
                    disabled={isDeleting && pendingId === announcement.id}
                    aria-label={`Excluir ${announcement.title}`}
                    className="shrink-0 rounded-lg p-1.5 text-ink-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <TypeBadge type={announcement.type} />
                  {announcement.status !== 'ATIVO' && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-ink-700">
                      {announcement.status === 'RESERVADO' ? 'Reservado' : 'Finalizado'}
                    </span>
                  )}
                  {announcement.type === 'VENDA' && (
                    <span className="text-sm font-bold text-brand-700">
                      {formatPrice(announcement.priceCents)}
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
