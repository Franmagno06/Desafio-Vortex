import { Link, NavLink } from 'react-router';
import { Leaf } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthContext';
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

        <HeaderActions />
      </div>
    </header>
  );
}

/**
 * Ações do cabeçalho, dependentes da sessão.
 *
 * Enquanto `isLoading` (validando o token guardado), não mostramos nem "Entrar"
 * nem o avatar. Mostrar "Entrar" e trocar por avatar meio segundo depois
 * produz um piscar que passa a impressão de que o app "deslogou sozinho".
 */
function HeaderActions() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <div className="h-9 w-32" aria-hidden="true" />;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <Button to="/entrar" variant="ghost" size="sm" className="hidden sm:inline-flex">
          Entrar
        </Button>
        <Button to="/app/anunciar" size="sm">
          Anunciar item
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button to="/app/anunciar" size="sm">
        Anunciar item
      </Button>

      <Link
        to="/app/perfil"
        aria-label={`Perfil de ${user?.name ?? 'usuário'}`}
        className="shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="size-9 rounded-full object-cover" />
        ) : (
          <span className="flex size-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800">
            {user?.name.charAt(0)}
          </span>
        )}
      </Link>
    </div>
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
