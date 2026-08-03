import { Outlet, Route, Routes } from 'react-router';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { LandingPage } from '@/pages/landing/LandingPage';

/**
 * Rotas da aplicação.
 *
 * As telas de `/explorar`, `/anunciar` e `/entrar` chegam nas Sprints 3 e 4.
 * Até lá exibem um placeholder honesto em vez de um link quebrado — a landing
 * já aponta para elas nos CTAs, e um 404 na demo seria pior que um "em breve".
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="explorar" element={<ComingSoon title="Explorar itens" sprint="3" />} />
        <Route path="anunciar" element={<ComingSoon title="Anunciar um item" sprint="4" />} />
        <Route path="entrar" element={<ComingSoon title="Entrar" sprint="4" />} />
        <Route path="anuncio/:id" element={<ComingSoon title="Detalhe do anúncio" sprint="4" />} />
        <Route path="como-funciona" element={<ComingSoon title="Como funciona" sprint="3" />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

/**
 * Layout compartilhado por todas as páginas.
 *
 * O `<Outlet />` é onde o React Router injeta a rota filha — header e footer
 * ficam montados entre navegações, sem remontar nem piscar.
 */
function SiteLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function ComingSoon({ title, sprint }: { title: string; sprint: string }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
      <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold tracking-wide text-brand-800 uppercase">
        Sprint {sprint}
      </span>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink-900">{title}</h1>
      <p className="mt-3 text-ink-500">
        Esta tela está em construção. A Landing Page já está funcional — volte para ver a vitrine
        com dados reais.
      </p>
      <Button to="/" className="mt-8">
        Voltar para o início
      </Button>
    </div>
  );
}

function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
      <p className="text-6xl font-bold text-brand-200">404</p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink-900">
        Não encontramos esta página
      </h1>
      <p className="mt-3 text-ink-500">O endereço pode ter mudado ou o item saiu do ar.</p>
      <Button to="/" className="mt-8">
        Voltar para o início
      </Button>
    </div>
  );
}
