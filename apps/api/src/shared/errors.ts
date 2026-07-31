/**
 * Erros de aplicação com código semântico.
 *
 * Ideia central: as camadas de negócio (services) NÃO sabem o que é uma
 * resposta HTTP. Elas apenas lançam um `AppError` com um código. Quem traduz
 * isso para status HTTP + JSON é um único lugar: o middleware de erro.
 *
 * Isso mantém a regra de negócio testável sem subir servidor e garante que
 * todo erro da API saia no mesmo formato.
 */

/** Códigos estáveis — o frontend pode reagir a eles sem depender do texto. */
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 422,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;

    // Mantém o stack trace apontando para quem lançou, não para este construtor.
    Error.captureStackTrace?.(this, AppError);
  }
}

/** Atalhos para deixar os services legíveis: `throw notFound('Anúncio não encontrado')`. */
export const badRequest = (message: string, details?: unknown) =>
  new AppError('VALIDATION_ERROR', message, details);

export const unauthorized = (message = 'Autenticação necessária.') =>
  new AppError('UNAUTHORIZED', message);

export const forbidden = (message = 'Você não tem permissão para esta ação.') =>
  new AppError('FORBIDDEN', message);

export const notFound = (message = 'Recurso não encontrado.') => new AppError('NOT_FOUND', message);

export const conflict = (message: string, details?: unknown) =>
  new AppError('CONFLICT', message, details);

/** Type guard usado pelo middleware de erro. */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
