import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError, z } from 'zod';
import { AppError, isAppError } from '../shared/errors.js';
import { logger } from '../shared/logger.js';
import { isProduction } from '../config/env.js';

/**
 * Rota inexistente -> 404 no MESMO envelope JSON das outras respostas.
 * Sem isso o Express devolveria um HTML de "Cannot GET /x", quebrando o
 * requisito do edital de "envio e retorno estritamente em JSON".
 */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError('NOT_FOUND', `Rota não encontrada: ${req.method} ${req.originalUrl}`));
};

/**
 * Middleware de erro global — o ÚNICO lugar do projeto que decide status HTTP.
 *
 * Detalhe do Express 5: erros lançados dentro de handlers `async` são
 * encaminhados automaticamente para cá. No Express 4 seria obrigatório
 * envolver cada rota em try/catch ou em um wrapper `asyncHandler`.
 *
 * A assinatura precisa ter EXATAMENTE 4 parâmetros — é assim que o Express
 * identifica um error handler. Por isso `_next` existe mesmo sem ser usado.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  // 1) Falha de validação vinda do Zod -> 422 com a lista de campos.
  if (err instanceof ZodError) {
    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Os dados enviados são inválidos.',
        details: z.treeifyError(err),
      },
    });
    return;
  }

  // 2) Erro de negócio previsto -> status semântico definido no AppError.
  if (isAppError(err)) {
    // 4xx é comportamento esperado (log em nível baixo); 5xx é incidente.
    const level = err.status >= 500 ? 'error' : 'warn';
    logger[level]({ code: err.code, path: req.originalUrl }, err.message);

    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
    return;
  }

  // 3) Qualquer outra coisa é bug nosso: loga completo, responde genérico.
  //    Nunca vazamos stack trace em produção (superfície de ataque).
  logger.error({ err, path: req.originalUrl }, 'Erro não tratado');

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Erro interno no servidor.',
      ...(isProduction ? {} : { details: err instanceof Error ? err.message : String(err) }),
    },
  });
};
