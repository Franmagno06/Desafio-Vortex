import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { unauthorized } from '../../shared/errors.js';

/**
 * Emissão e verificação de JSON Web Tokens.
 *
 * O que é um JWT: três partes separadas por ponto — `header.payload.signature`.
 * As duas primeiras são **base64, não criptografia**: qualquer pessoa consegue
 * ler o conteúdo colando o token em jwt.io. O que o JWT garante não é sigilo, é
 * **integridade** — a assinatura prova que o payload não foi alterado depois de
 * emitido, porque só quem tem o `JWT_SECRET` consegue produzi-la.
 *
 * Consequência prática: nunca coloque dado sensível no payload. Aqui vai só o
 * id do usuário, que já é público.
 *
 * Por que isso substitui bem o `X-User-Id` da Sprint 1: aquele cabeçalho podia
 * ser inventado por qualquer cliente. Um JWT não — forjar um exigiria o segredo
 * do servidor.
 */

/** O que guardamos dentro do token. Mínimo possível. */
export interface TokenPayload {
  /** `sub` (subject) é o campo padrão do JWT para "de quem é este token". */
  sub: string;
}

/**
 * Valida o formato do payload decodificado.
 *
 * Sim, mesmo depois de a assinatura conferir. A assinatura garante que o token
 * saiu daqui, não que o conteúdo dele ainda faz sentido para a versão atual do
 * código — um token emitido por uma versão antiga da API pode ter outro formato.
 */
const payloadSchema = z.object({ sub: z.uuid() });

/** Converte "7d", "12h", "30m" em segundos. */
export function parseExpiresInToSeconds(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) throw new Error(`JWT_EXPIRES_IN inválido: "${value}". Use algo como 7d, 12h ou 30m.`);

  const amount = Number(match[1]);
  const unit = match[2];

  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return amount * (multipliers[unit as string] ?? 1);
}

export const TOKEN_TTL_SECONDS = parseExpiresInToSeconds(env.JWT_EXPIRES_IN);

/** Assina um token para o usuário informado. */
export function signToken(userId: string): string {
  return jwt.sign({ sub: userId } satisfies TokenPayload, env.JWT_SECRET, {
    expiresIn: TOKEN_TTL_SECONDS,
    issuer: 'circula-api',
  });
}

/**
 * Verifica a assinatura e devolve o payload.
 *
 * Todos os modos de falha viram o MESMO erro 401 genérico de propósito.
 * Distinguir "assinatura inválida" de "token expirado" na resposta entregaria
 * informação útil para quem está testando ataques.
 */
export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { issuer: 'circula-api' });
    const result = payloadSchema.safeParse(decoded);

    if (!result.success) throw new Error('payload fora do formato esperado');

    return result.data;
  } catch {
    throw unauthorized('Sessão inválida ou expirada. Faça login novamente.');
  }
}
