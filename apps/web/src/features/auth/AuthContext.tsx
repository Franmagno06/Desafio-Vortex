import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AuthResponseDTO, AuthUserDTO } from '@circula/shared';

import { ApiError, setAuthTokenProvider } from '@/lib/api-client';
import { clearStoredToken, getStoredToken, storeToken } from './storage';
import { getMe } from './api';

/**
 * Estado de sessão da aplicação.
 *
 * Por que Context e não TanStack Query: o token não é "dado do servidor que
 * pode ser revalidado", é estado local que determina QUEM está fazendo as
 * requisições. Colocá-lo numa query criaria a dependência circular de precisar
 * do token para buscar o token.
 */

interface AuthState {
  user: AuthUserDTO | null;
  /** `true` enquanto validamos o token guardado no primeiro carregamento. */
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Guarda a sessão devolvida por login/cadastro. */
  signIn: (response: AuthResponseDTO) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<AuthUserDTO | null>(null);
  const [isLoading, setIsLoading] = useState(() => getStoredToken() !== null);

  /**
   * Liga o cliente HTTP a este estado.
   *
   * `useMemo` e não `useEffect` de propósito: precisa valer ANTES da primeira
   * requisição. Um `useEffect` roda depois da renderização, e a validação do
   * token abaixo sairia sem o cabeçalho `Authorization`.
   */
  useMemo(() => {
    setAuthTokenProvider(() => token);
  }, [token]);

  const signOut = useCallback(() => {
    clearStoredToken();
    setToken(null);
    setUser(null);
    // Limpa o cache: "meus anúncios" do usuário anterior não pode vazar para
    // quem logar em seguida na mesma aba.
    queryClient.clear();
  }, [queryClient]);

  const signIn = useCallback((response: AuthResponseDTO) => {
    storeToken(response.token);
    setToken(response.token);
    setUser(response.user);
  }, []);

  /**
   * Valida o token guardado quando o app abre.
   *
   * Sem isso, um token expirado deixaria a interface em estado "logado" até a
   * primeira ação falhar com 401 — pior experiência e mais confusa.
   */
  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    getMe()
      .then(({ user: authenticated }) => {
        if (!cancelled) setUser(authenticated);
      })
      .catch((error: unknown) => {
        if (cancelled) return;

        // 401 significa sessão inválida: descarta. Já uma falha de rede não
        // prova nada sobre o token — mantém a sessão e tenta de novo depois,
        // o que importa para o funcionamento offline da Sprint 5.
        if (error instanceof ApiError && error.status === 401) {
          clearStoredToken();
          setToken(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      signIn,
      signOut,
    }),
    [user, isLoading, signIn, signOut],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

/** Acessa a sessão. Lança se usado fora do provider — erro de programação. */
export function useAuth(): AuthState {
  const context = use(AuthContext);

  if (!context) {
    throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  }

  return context;
}
