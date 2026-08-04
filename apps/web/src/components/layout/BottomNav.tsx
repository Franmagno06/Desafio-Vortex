import { NavLink } from 'react-router';
import { Compass, LayoutGrid, PlusCircle, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Barra de navegação inferior — o padrão de aplicativo nativo.
 *
 * Fica embaixo por ergonomia: numa tela de 6 polegadas, o topo está fora do
 * alcance do polegar. É essa barra que faz o PWA "parecer um app" quando
 * instalado na tela inicial, requisito central do edital.
 *
 * `pb-[env(safe-area-inset-bottom)]` evita que os botões fiquem embaixo da
 * barra de gestos do iPhone quando o app roda em tela cheia.
 */
const items: Array<{ to: string; label: string; icon: LucideIcon; end?: boolean }> = [
  { to: '/app', label: 'Início', icon: LayoutGrid, end: true },
  { to: '/explorar', label: 'Explorar', icon: Compass },
  { to: '/app/anunciar', label: 'Anunciar', icon: PlusCircle },
  { to: '/app/perfil', label: 'Perfil', icon: User },
];

export function BottomNav() {
  return (
    <nav
      aria-label="Navegação do aplicativo"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="flex">
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              // `end` só na raiz: sem isso, `/app` ficaria marcado como ativo
              // também quando a rota fosse `/app/anunciar`, acendendo dois
              // itens ao mesmo tempo.
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
                  isActive ? 'text-brand-700' : 'text-ink-500 hover:text-ink-700',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn('size-5 transition-transform', isActive && 'scale-110')}
                    aria-hidden="true"
                  />
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
