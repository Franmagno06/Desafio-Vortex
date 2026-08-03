import { Router } from 'express';
import { type LoginInput, type RegisterInput, loginSchema, registerSchema } from '@circula/shared';
import { rateLimit } from 'express-rate-limit';

import { isTest } from '../../config/env.js';
import { validateBody } from '../../middlewares/validate.js';
import { requireAuth } from '../../middlewares/authenticate.js';
import type { AuthService } from './auth.service.js';

/**
 * Rotas de autenticação.
 */

/**
 * Rate limit específico e mais severo que o global.
 *
 * O limite geral da API é 100 requisições / 15 min. Para login isso seria
 * generoso demais: 100 tentativas de senha por IP a cada 15 minutos viabiliza
 * ataque de força bruta contra senhas fracas. Aqui são 10.
 *
 * `skipSuccessfulRequests` faz o contador ignorar logins que deram certo — quem
 * está usando o sistema normalmente nunca esbarra no limite; quem está
 * adivinhando senhas, sim.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: () => isTest,
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.',
      },
    });
  },
});

export function createAuthRouter(service: AuthService): Router {
  const router = Router();

  /** POST /api/v1/auth/register — cria a conta e já devolve o token. */
  router.post('/register', authLimiter, validateBody(registerSchema), async (req, res) => {
    const input = req.body as RegisterInput;
    const result = await service.register(input);

    // 201: um recurso (o usuário) foi criado.
    res.status(201).json(result);
  });

  /** POST /api/v1/auth/login — troca credenciais por um token. */
  router.post('/login', authLimiter, validateBody(loginSchema), async (req, res) => {
    const input = req.body as LoginInput;

    // 200, não 201: login não cria recurso nenhum, só emite um token.
    res.json(await service.login(input));
  });

  /**
   * GET /api/v1/auth/me — quem sou eu?
   *
   * O PWA chama esta rota ao abrir para saber se o token guardado ainda vale.
   * Se responder 401, a sessão expirou e a interface manda para o login.
   */
  router.get('/me', requireAuth, async (req, res) => {
    res.json({ user: await service.getById(req.userId!) });
  });

  return router;
}
