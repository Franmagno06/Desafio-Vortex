import type { RequestHandler } from 'express';
import { unauthorized } from '../shared/errors.js';
import { verifyToken } from '../modules/auth/jwt.js';

/**
 * Autenticação via JWT no cabeçalho `Authorization: Bearer <token>`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ESTE ARQUIVO SUBSTITUI O `identify-user.ts` DA SPRINT 1.
 *
 * Ele é a demonstração prática do desenho em camadas: trocamos identificação
 * falsificável (um cabeçalho `X-User-Id` que qualquer cliente inventava) por
 * autenticação criptográfica de verdade — e **nenhuma rota, nenhum service e
 * nenhum repositório precisou mudar**. Todos continuam lendo `req.userId`.
 *
 * Só o que preenche esse campo mudou.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Extrai o token do cabeçalho `Authorization`. Devolve null se não houver. */
function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;

  // O formato do RFC 6750 é "Bearer <token>", com o esquema case-insensitive.
  const [scheme, token] = header.split(' ');

  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== 'bearer') return null;

  return token.trim() || null;
}

/**
 * Exige autenticação. Sem token válido, responde 401.
 *
 * Use em tudo que cria, altera ou expõe dado de um usuário específico.
 */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = extractBearerToken(req.header('Authorization'));

  if (!token) {
    next(unauthorized('Envie o cabeçalho Authorization: Bearer <token>.'));
    return;
  }

  // `verifyToken` já lança AppError(401) em qualquer falha — assinatura
  // inválida, token expirado ou payload fora do formato.
  const payload = verifyToken(token);

  req.userId = payload.sub;
  next();
};

/**
 * Autenticação OPCIONAL: identifica quem está logado, mas deixa passar quem não está.
 *
 * Serve para rotas públicas que mudam de comportamento quando há sessão — por
 * exemplo, a vitrine marcando quais anúncios são do próprio usuário. Um token
 * inválido aqui é ignorado em silêncio, porque a rota funciona sem ele.
 */
export const optionalAuth: RequestHandler = (req, _res, next) => {
  const token = extractBearerToken(req.header('Authorization'));

  if (token) {
    try {
      req.userId = verifyToken(token).sub;
    } catch {
      // Silêncio proposital: a rota é pública.
    }
  }

  next();
};
