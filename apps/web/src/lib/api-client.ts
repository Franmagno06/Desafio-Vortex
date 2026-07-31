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

/** Erro de rede (offline, DNS, servidor fora do ar) — distinto de erro HTTP. */
export class NetworkError extends Error {
  constructor(cause: unknown) {
    super('Não foi possível conectar à API. Verifique sua conexão.');
    this.name = 'NetworkError';
    this.cause = cause;
  }
}

const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;

  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...rest,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
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
