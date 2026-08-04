import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, ImageOff } from 'lucide-react';
import { CATEGORY_META, ITEM_CONDITION_META, formatPrice } from '@circula/shared';

import { Button } from '@/components/ui/Button';
import { TypeBadge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAnnouncement } from '@/features/announcements/hooks';
import { useAuth } from '@/features/auth/AuthContext';

/** Detalhe de um anúncio. Rota pública — não exige login para visualizar. */
export function AnnouncementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data, isPending, isError, error } = useAnnouncement(id);
  const [imageFailed, setImageFailed] = useState(false);

  if (isPending) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <Skeleton className="aspect-[4/3] w-full rounded-[var(--radius-card)]" />
        <Skeleton className="mt-5 h-8 w-3/4" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-2/3" />
      </div>
    );
  }

  if (isError) {
    const isNotFound = error instanceof Error && 'status' in error && error.status === 404;

    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center">
        <h1 className="text-xl font-bold text-ink-900">
          {isNotFound ? 'Anúncio não encontrado' : 'Não foi possível carregar'}
        </h1>
        <p className="mt-2 text-sm text-ink-500">
          {isNotFound
            ? 'Ele pode ter sido removido pelo anunciante.'
            : 'Verifique sua conexão e tente novamente.'}
        </p>
        <Button to="/explorar" variant="secondary" className="mt-6">
          Ver outros itens
        </Button>
      </div>
    );
  }

  const category = CATEGORY_META[data.category];
  const condition = ITEM_CONDITION_META[data.condition];
  const isOwner = user?.id === data.author.id;

  return (
    <article className="mx-auto w-full max-w-2xl px-4 py-6">
      <Link
        to="/explorar"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-brand-700"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Voltar para a vitrine
      </Link>

      <div className="mt-4 overflow-hidden rounded-[var(--radius-card)] border border-slate-200 bg-slate-100">
        {imageFailed ? (
          <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 text-ink-500">
            <ImageOff className="size-8" aria-hidden="true" />
            <p className="text-sm">Imagem indisponível</p>
          </div>
        ) : (
          <img
            src={data.imageUrl}
            alt={data.title}
            onError={() => {
              setImageFailed(true);
            }}
            className="aspect-[4/3] w-full object-cover"
          />
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <TypeBadge type={data.type} />
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-ink-700">
          {category.label}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-ink-700">
          {condition.label}
        </span>
        {data.status !== 'ATIVO' && (
          <span className="rounded-full bg-accent-100 px-2.5 py-0.5 text-xs font-semibold text-accent-600">
            {data.status === 'RESERVADO' ? 'Reservado' : 'Finalizado'}
          </span>
        )}
      </div>

      <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink-900">{data.title}</h1>

      <p className="mt-2 text-2xl font-bold text-brand-700">
        {data.type === 'DOACAO' ? (
          <span className="text-accent-600">Doação</span>
        ) : data.type === 'TROCA' ? (
          <span className="text-ink-700">Aberto a troca</span>
        ) : (
          formatPrice(data.priceCents)
        )}
      </p>

      {/* `whitespace-pre-line` preserva as quebras de linha que a pessoa
          digitou no textarea — sem isso a descrição vira um parágrafo só. */}
      <p className="mt-5 whitespace-pre-line text-ink-700">{data.description}</p>

      <div className="mt-8 flex items-center gap-3 rounded-[var(--radius-card)] border border-slate-200 bg-surface p-4">
        {data.author.avatarUrl ? (
          <img src={data.author.avatarUrl} alt="" className="size-11 rounded-full object-cover" />
        ) : (
          <span className="flex size-11 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-800">
            {data.author.name.charAt(0)}
          </span>
        )}

        <div className="min-w-0">
          <p className="truncate font-semibold text-ink-900">
            {data.author.name}
            {isOwner && <span className="ml-2 text-xs font-normal text-ink-500">(você)</span>}
          </p>
          {data.author.course && (
            <p className="truncate text-sm text-ink-500">{data.author.course}</p>
          )}
        </div>
      </div>

      {isOwner && (
        <div className="mt-4">
          <Button to="/app/meus-anuncios" variant="secondary" className="w-full">
            Gerenciar meus anúncios
          </Button>
        </div>
      )}
    </article>
  );
}
