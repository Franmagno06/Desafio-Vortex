/**
 * Cliente HTTP do Circula.
 *
 * Um único lugar concentra: URL base, cabeçalhos, parsing de JSON e tradução
 * do envelope de erro da API para uma exceção tipada. Nenhum componente da
 * interface deve chamar `fetch` diretamente.
 */

/** Envelope de erro que a API sempre devolve: `{ error: { code, message } }`. */
export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = payload.code;
    this.details = payload.details;
  }
}

/**
 * Falha antes de existir uma resposta HTTP: offline, DNS, servidor fora do ar
 * ou bloqueio de CORS.
 *
 * O `fetch` **não conta qual dos casos aconteceu** — por segurança, o navegador
 * devolve a mesma rejeição opaca para todos. Então usamos o único sinal
 * disponível para separar os dois cenários que exigem ações opostas do usuário:
 *
 *  - `navigator.onLine === false` → o problema é a internet dele.
 *  - online, mas a requisição falhou → o problema é do servidor (fora do ar,
 *    URL errada ou CORS bloqueando).
 *
 * Essa distinção não é preciosismo: durante o desenvolvimento a aplicação foi
 * aberta por `127.0.0.1` enquanto o CORS liberava só `localhost`, e a mensagem
 * "verifique sua conexão" mandou investigar a internet — que estava perfeita.
 * Mensagem de erro que aponta a causa errada custa mais tempo que erro nenhum.
 */
export class NetworkError extends Error {
  /** `true` quando o navegador se considera sem rede. */
  readonly isOffline: boolean;

  constructor(cause: unknown) {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;

    super(
      offline
        ? 'Você está sem conexão com a internet.'
        : 'O servidor não respondeu. Verifique se a API está no ar.',
    );

    this.name = 'NetworkError';
    this.isOffline = offline;
    this.cause = cause;
  }
}

/**
 * URL base da API.
 *
 * O ajuste abaixo existe para testar o PWA num celular de verdade. Ao abrir o
 * app pelo IP da máquina na rede (`http://192.168.0.10:5173`), o
 * `VITE_API_URL` configurado aponta para `http://localhost:4000` — e
 * `localhost`, **no celular, é o próprio celular**. Nenhuma requisição
 * chegaria ao servidor.
 *
 * Quando a API está configurada como local mas a página veio de outro host,
 * trocamos o hostname pelo mesmo da página, preservando a porta. Em produção
 * nada disso roda: lá o `VITE_API_URL` aponta para o domínio da Render, que
 * não é localhost.
 */
function resolveBaseUrl(): string {
  const configured = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

  if (typeof window === 'undefined') return configured;

  try {
    const apiUrl = new URL(configured);
    const isLocalApi = apiUrl.hostname === 'localhost' || apiUrl.hostname === '127.0.0.1';
    const pageHost = window.location.hostname;
    const pageIsLocal = pageHost === 'localhost' || pageHost === '127.0.0.1';

    if (isLocalApi && !pageIsLocal) {
      apiUrl.hostname = pageHost;
      return apiUrl.toString().replace(/\/$/, '');
    }

    return configured;
  } catch {
    return configured;
  }
}

const BASE_URL = resolveBaseUrl();

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

/**
 * Callback que devolve o token atual, ou `null` se ninguém estiver logado.
 *
 * É injetado por `setAuthTokenProvider` em vez de o cliente importar o módulo
 * de storage direto. Motivo: sem isso teríamos `api-client → storage` e
 * `auth → api-client`, e o dia em que o storage precisasse reportar um erro
 * pela API fecharia um ciclo de importação. Injetar mantém a seta em um
 * sentido só.
 */
type TokenProvider = () => string | null;

let getAuthToken: TokenProvider = () => null;

export function setAuthTokenProvider(provider: TokenProvider): void {
  getAuthToken = provider;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;

  const token = getAuthToken();

  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...rest,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        // O token entra ANTES do spread de `headers` para que uma chamada
        // possa sobrescrevê-lo de propósito (útil em teste).
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (cause) {
    // `fetch` só rejeita em falha de rede; erro 4xx/5xx resolve normalmente.
    throw new NetworkError(cause);
  }

  // 204 No Content não tem corpo para desserializar.
  if (response.status === 204) {
    return undefined as T;
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error =
      payload && typeof payload === 'object' && 'error' in payload
        ? (payload.error as ApiErrorPayload)
        : { code: 'UNKNOWN', message: `Erro ${response.status} ao chamar ${path}` };

    throw new ApiError(response.status, error);
  }

  return payload as T;
}

export const api = {
  baseUrl: BASE_URL,
  get: <T>(path: string, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'DELETE' }),
};
