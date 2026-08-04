import { Link } from 'react-router';
import { ArrowRight, PackagePlus } from 'lucide-react';
import { AnnouncementCardSkeleton } from '@/components/ui/Skeleton';
import { AnnouncementCard } from '@/features/announcements/AnnouncementCard';
import { useAnnouncements } from '@/features/announcements/hooks';
import { useAuth } from '@/features/auth/AuthContext';

/** Tela inicial do app autenticado. */
export function AppHomePage() {
  const { user } = useAuth();
  const { data, isPending } = useAnnouncements({ limit: 6, sort: 'recent' });

  // Só o primeiro nome: "Olá, Ana Beatriz Lima" soa como cobrança de banco.
  const firstName = user?.name.split(' ')[0] ?? '';

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Olá, {firstName} 👋</h1>
        <p className="mt-1 text-sm text-ink-500">Veja o que apareceu no campus.</p>
      </header>

      <Link
        to="/app/anunciar"
        className="mt-5 flex items-center gap-3 rounded-[var(--radius-card)] bg-brand-700 p-4 text-white transition-colors hover:bg-brand-800"
      >
        <PackagePlus className="size-6 shrink-0" aria-hidden="true" />
        <span className="flex-1">
          <span className="block font-semibold">Anunciar um item</span>
          <span className="block text-sm text-brand-100">Leva menos de um minuto</span>
        </span>
        <ArrowRight className="size-5 shrink-0" aria-hidden="true" />
      </Link>

      <section className="mt-8" aria-labelledby="recentes">
        <div className="flex items-end justify-between">
          <h2 id="recentes" className="text-lg font-bold text-ink-900">
            Recentes
          </h2>
          <Link to="/explorar" className="text-sm font-medium text-brand-700 hover:underline">
            Ver todos
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4" aria-busy={isPending}>
          {isPending || !data
            ? Array.from({ length: 4 }).map((_, index) => <AnnouncementCardSkeleton key={index} />)
            : data.items.map((announcement) => (
                <AnnouncementCard key={announcement.id} announcement={announcement} />
              ))}
        </div>
      </section>
    </div>
  );
}
