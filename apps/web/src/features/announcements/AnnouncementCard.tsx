import { useState } from 'react';
import { Link } from 'react-router';
import {
  type AnnouncementDTO,
  CATEGORY_META,
  ITEM_CONDITION_META,
  formatPrice,
} from '@circula/shared';
import { TypeBadge } from '@/components/ui/Badge';

/**
 * Card de anúncio da vitrine.
 *
 * O card inteiro é um link. Repare que existe **um só** `<a>` envolvendo tudo,
 * em vez de links separados no título e na imagem: leitor de tela anunciaria
 * dois links para o mesmo destino, e a navegação por teclado exigiria dois Tab
 * para passar por um card.
 */
export function AnnouncementCard({ announcement }: { announcement: AnnouncementDTO }) {
  const [imageFailed, setImageFailed] = useState(false);

  const category = CATEGORY_META[announcement.category];
  const condition = ITEM_CONDITION_META[announcement.condition];
  const isDonation = announcement.type === 'DOACAO';

  return (
    <Link
      to={`/anuncio/${announcement.id}`}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-slate-200 bg-surface transition-all duration-200 hover:-translate-y-1 hover:border-brand-300 hover:shadow-lg focus-visible:-translate-y-1 focus-visible:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {imageFailed ? (
          // As imagens são URLs externas informadas pelo usuário — link quebrado
          // é questão de tempo. Sem este fallback o card apareceria rasgado.
          <div className="flex h-full items-center justify-center text-sm text-ink-500">
            Imagem indisponível
          </div>
        ) : (
          <img
            src={announcement.imageUrl}
            alt=""
            /* alt vazio de propósito: a imagem é decorativa aqui, o título logo
               abaixo já descreve o item. Repetir viraria ruído no leitor de tela. */
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}

        <div className="absolute top-3 left-3">
          <TypeBadge type={announcement.type} />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <span className="text-xs font-medium tracking-wide text-ink-500 uppercase">
          {category.label} · {condition.label}
        </span>

        <h3 className="mt-1.5 line-clamp-2 font-semibold text-ink-900 group-hover:text-brand-800">
          {announcement.title}
        </h3>

        <p className="mt-auto pt-3 text-lg font-bold text-brand-700">
          {isDonation ? (
            <span className="text-accent-600">Doação</span>
          ) : announcement.type === 'TROCA' ? (
            <span className="text-ink-700">Troca</span>
          ) : (
            formatPrice(announcement.priceCents)
          )}
        </p>

        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
          {announcement.author.avatarUrl ? (
            <img
              src={announcement.author.avatarUrl}
              alt=""
              loading="lazy"
              className="size-7 rounded-full object-cover"
            />
          ) : (
            <span className="flex size-7 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800">
              {announcement.author.name.charAt(0)}
            </span>
          )}
          <span className="truncate text-xs text-ink-500">
            {announcement.author.name}
            {announcement.author.course && ` · ${announcement.author.course}`}
          </span>
        </div>
      </div>
    </Link>
  );
}
