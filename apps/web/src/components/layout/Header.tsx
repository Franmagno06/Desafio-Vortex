import { Link, NavLink } from 'react-router';
import { Leaf } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

/**
 * Cabeçalho da versão desktop.
 *
 * O `hidden md:block` no `<nav>` esconde os links em telas pequenas — no mobile
 * a navegação acontece pela barra inferior (Sprint 4), que é o padrão de app
 * nativo e fica ao alcance do polegar.
 */
export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2 font-bold text-ink-900"
          aria-label="Circula — página inicial"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-brand-700 text-white">
            <Leaf className="size-5" aria-hidden="true" />
          </span>
          <span className="text-lg tracking-tight">
            Circula<span className="text-brand-600">.</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Navegação principal">
          <HeaderLink to="/explorar">Explorar</HeaderLink>
          <HeaderLink to="/como-funciona">Como funciona</HeaderLink>
        </nav>

        <div className="flex items-center gap-2">
          <Button to="/entrar" variant="ghost" size="sm" className="hidden sm:inline-flex">
            Entrar
          </Button>
          <Button to="/anunciar" size="sm">
            Anunciar item
          </Button>
        </div>
      </div>
    </header>
  );
}

function HeaderLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      // O `NavLink` do React Router entrega `isActive` — usamos para marcar a
      // página atual sem precisar comparar `location.pathname` na mão.
      className={({ isActive }) =>
        cn(
          'rounded-full px-4 py-2 text-sm font-medium transition-colors',
          isActive ? 'bg-brand-50 text-brand-800' : 'text-ink-700 hover:bg-slate-100',
        )
      }
    >
      {children}
    </NavLink>
  );
}
