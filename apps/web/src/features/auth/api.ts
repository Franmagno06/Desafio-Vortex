import type { AuthResponseDTO, AuthUserDTO, LoginInput, RegisterInput } from '@circula/shared';
import { api } from '@/lib/api-client';

/** Chamadas HTTP de autenticação. */

export function login(input: LoginInput) {
  return api.post<AuthResponseDTO>('/api/v1/auth/login', input);
}

export function register(input: RegisterInput) {
  return api.post<AuthResponseDTO>('/api/v1/auth/register', input);
}

/**
 * Valida a sessão guardada.
 *
 * Chamada quando o app abre: se o token do `localStorage` expirou ou foi
 * invalidado, esta rota responde 401 e a interface manda para o login em vez
 * de deixar o usuário navegar achando que está autenticado e tomar erro na
 * primeira ação.
 */
export function getMe() {
  return api.get<{ user: AuthUserDTO }>('/api/v1/auth/me');
}
