/**
 * Armazenamento do token de sessão.
 *
 * Fica no `localStorage` porque o PWA (Vercel) e a API (Render) vivem em
 * domínios diferentes — cookie cross-site exigiria `SameSite=None; Secure`,
 * CORS com credenciais e um armazenamento de sessão no servidor. Ver ADR 010.
 *
 * A troca consciente: `localStorage` é acessível por JavaScript, logo
 * vulnerável a XSS; em compensação ficamos imunes a CSRF, porque o navegador
 * nunca anexa esse cabeçalho sozinho.
 *
 * Todo acesso passa por aqui. Nenhum componente lê `localStorage` direto — é o
 * que permite trocar a estratégia depois mexendo em um arquivo só.
 */

const TOKEN_KEY = 'circula:token';

/**
 * O acesso é envolvido em try/catch porque `localStorage` **lança exceção** em
 * alguns contextos reais: modo privado do Safari com cota esgotada, cookies
 * bloqueados, ou a página rodando dentro de um iframe restrito. Sem isso, o
 * app inteiro quebraria na inicialização em vez de apenas funcionar deslogado.
 */
export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function storeToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Sessão só dura enquanto a aba estiver aberta. Melhor que travar o app.
  }
}

export function clearStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignorado pelo mesmo motivo acima.
  }
}
