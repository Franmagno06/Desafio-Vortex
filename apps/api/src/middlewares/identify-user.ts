import type { RequestHandler } from 'express';
import { z } from 'zod';
import { unauthorized } from '../shared/errors.js';

/**
 * Identificação do usuário via cabeçalho `X-User-Id`. — SPRINT 1, TEMPORÁRIO
 *
 * O edital aceita explicitamente duas formas de separar usuários:
 * "Autenticação básica de usuários (ex: JWT) **ou separação por IDs de
 * usuário**". Esta é a segunda, e serve de ponte até a Sprint 2.
 *
 * ⚠️ Isto NÃO é autenticação. Qualquer cliente pode mandar o id que quiser e
 * se passar por outra pessoa. É aceitável agora porque a Sprint 2 substitui o
 * corpo desta função pela verificação do JWT.
 *
 * O ponto do desenho: o restante do sistema já lê `req.userId`. Quando o JWT
 * entrar, muda só este arquivo — rotas, service e repositório ficam intactos.
 * É o motivo de o middleware existir separado em vez de a rota ler o cabeçalho
 * na mão.
 */

const userIdSchema = z.uuid();

/** Exige identificação. Sem cabeçalho válido, responde 401. */
export const requireUser: RequestHandler = (req, _res, next) => {
  const header = req.header('X-User-Id');

  if (!header) {
    next(
      unauthorized(
        'Informe o cabeçalho X-User-Id com o id do usuário. (Sprint 2: será substituído por JWT.)',
      ),
    );
    return;
  }

  const result = userIdSchema.safeParse(header);

  if (!result.success) {
    next(unauthorized('O cabeçalho X-User-Id precisa ser um UUID válido.'));
    return;
  }

  req.userId = result.data;
  next();
};
