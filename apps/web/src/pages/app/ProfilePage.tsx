import { useNavigate } from 'react-router';
import { LogOut, Package } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthContext';

/** Perfil do usuário autenticado, com acesso aos anúncios e logout. */
export function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  function handleSignOut() {
    signOut();
    void navigate('/', { replace: true });
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-6">
      <div className="flex items-center gap-4">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="size-16 rounded-full object-cover" />
        ) : (
          <span className="flex size-16 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-800">
            {user.name.charAt(0)}
          </span>
        )}

        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight text-ink-900">{user.name}</h1>
          <p className="truncate text-sm text-ink-500">{user.email}</p>
          {user.course && <p className="truncate text-sm text-ink-500">{user.course}</p>}
        </div>
      </div>

      <div className="mt-8 space-y-2">
        <Button to="/app/meus-anuncios" variant="secondary" className="w-full justify-start">
          <Package className="size-4" aria-hidden="true" />
          Meus anúncios
        </Button>

        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
        >
          <LogOut className="size-4" aria-hidden="true" />
          Sair da conta
        </button>
      </div>
    </div>
  );
}
