import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/Button';
import { LandingPage } from '@/pages/landing/LandingPage';
import { ExplorePage } from '@/pages/ExplorePage';
import { AnnouncementDetailPage } from '@/pages/AnnouncementDetailPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { AppHomePage } from '@/pages/app/AppHomePage';
import { NewAnnouncementPage } from '@/pages/app/NewAnnouncementPage';
import { MyAnnouncementsPage } from '@/pages/app/MyAnnouncementsPage';
import { ProfilePage } from '@/pages/app/ProfilePage';
import { useAuth } from '@/features/auth/AuthContext';

/**
 * Rotas da aplicação.
 *
 * Três grupos, com layouts diferentes:
 *
 *  - **Público** (`/`, `/explorar`, `/anuncio/:id`) — header + footer. É a
 *    experiência de descoberta, a "Landing Page rica no desktop" do edital.
 *  - **Autenticação** (`/entrar`, `/cadastro`) — layout limpo, sem navegação
 *    que distraia de completar o formulário.
 *  - **App** (`/app/*`) — exige login e ganha a barra inferior, a "experiência
 *    fluida de aplicativo no mobile".
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="explorar" element={<ExplorePage />} />
        <Route path="anuncio/:id" element={<AnnouncementDetailPage />} />
        <Route path="como-funciona" element={<Navigate to="/#como-funciona" replace />} />
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="entrar" element={<LoginPage />} />
        <Route path="cadastro" element={<RegisterPage />} />
      </Route>

      <Route path="app" element={<ProtectedAppLayout />}>
        <Route index element={<AppHomePage />} />
        <Route path="anunciar" element={<NewAnnouncementPage />} />
        <Route path="meus-anuncios" element={<MyAnnouncementsPage />} />
        <Route path="perfil" element={<ProfilePage />} />
      </Route>

      {/* Atalho: o header aponta para /anunciar, mas a tela vive dentro do app. */}
      <Route path="anunciar" element={<Navigate to="/app/anunciar" replace />} />

      <Route path="*" element={<NotFoundLayout />} />
    </Routes>
  );
}

function PublicLayout() {
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

function AuthLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex flex-1 items-center justify-center">
        <Outlet />
      </main>
    </div>
  );
}

/**
 * Layout do app autenticado.
 *
 * O `pb-20` reserva espaço para a barra inferior fixa — sem ele, o último item
 * de qualquer lista ficaria escondido atrás dela.
 */
function ProtectedAppLayout() {
  return (
    <ProtectedRoute>
      <div className="flex min-h-dvh flex-col">
        <Header />
        <main className="flex-1 pb-20 md:pb-0">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}

/**
 * Guarda de rota.
 *
 * Detalhe que importa: enquanto `isLoading` for `true`, NÃO redireciona. No
 * primeiro carregamento o token ainda está sendo validado contra `/auth/me`;
 * decidir antes disso jogaria para o login quem já estava autenticado, a cada
 * F5 — um dos bugs mais comuns em SPA com sessão.
 *
 * O `state.from` guarda a rota pretendida para o login devolver a pessoa ao
 * destino original em vez da home.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center" aria-busy="true">
        <span className="sr-only">Verificando sua sessão…</span>
        <span className="size-8 animate-spin rounded-full border-3 border-brand-200 border-t-brand-700" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/entrar" state={{ from: location.pathname }} replace />;
  }

  return children;
}

function NotFoundLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <p className="text-6xl font-bold text-brand-200">404</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink-900">
          Não encontramos esta página
        </h1>
        <p className="mt-3 text-ink-500">O endereço pode ter mudado ou o item saiu do ar.</p>
        <Button to="/" className="mt-8">
          Voltar para o início
        </Button>
      </main>
      <Footer />
    </div>
  );
}
