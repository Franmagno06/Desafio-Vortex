import pino from 'pino';
import { env, isProduction, isTest } from '../config/env.js';

/**
 * Logger estruturado.
 *
 * Em desenvolvimento usamos o `pino-pretty` (linhas coloridas e legíveis).
 * Em produção o log sai como JSON puro — é o formato que Render, Railway e
 * qualquer agregador de logs conseguem indexar e filtrar.
 */
export const logger = pino({
  level: isTest ? 'silent' : env.LOG_LEVEL,
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        },
      }),
});
