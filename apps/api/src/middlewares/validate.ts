import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

/**
 * Middlewares de validação com Zod.
 *
 * Cada rota declara o que espera receber. Se a validação passa, o handler
 * recebe dados já tipados e normalizados; se falha, o `ZodError` é encaminhado
 * ao middleware de erro, que devolve 422 com a lista de campos.
 *
 * Repare que o resultado do parse SUBSTITUI o valor original. Isso importa
 * porque o Zod não só valida, ele transforma: `?page=2` (string) vira o número
 * 2, espaços em branco são removidos pelo `.trim()`, e os defaults são
 * aplicados. O handler nunca vê o dado cru.
 */

/** Valida `req.body` (POST, PATCH). */
export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      next(result.error);
      return;
    }

    req.body = result.data;
    next();
  };
}

/**
 * Valida `req.query` (filtros da listagem).
 *
 * Detalhe do Express 5: `req.query` virou um getter somente-leitura — atribuir
 * direto (`req.query = ...`) lança TypeError em runtime. No Express 4 era uma
 * propriedade comum e o padrão antigo funcionava. Por isso guardamos o
 * resultado em `req.validatedQuery`, declarado no augment de tipos abaixo.
 */
export function validateQuery<T>(schema: ZodType<T>): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      next(result.error);
      return;
    }

    req.validatedQuery = result.data;
    next();
  };
}

/** Valida `req.params` (o `:id` da rota). */
export function validateParams<T>(schema: ZodType<T>): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      next(result.error);
      return;
    }

    req.validatedParams = result.data;
    next();
  };
}

/**
 * Declaration merging: acrescenta campos ao `Request` do Express.
 *
 * É assim que se estende um tipo de biblioteca em TypeScript sem editar o
 * pacote. A partir daqui, `req.validatedQuery` existe e é tipado em todo o
 * projeto.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      validatedQuery?: unknown;
      validatedParams?: unknown;
      /** Preenchido pelo `identifyUser` (Sprint 1) e pelo JWT (Sprint 2). */
      userId?: string;
    }
  }
}
