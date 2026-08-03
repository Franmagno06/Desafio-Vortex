import 'dotenv/config';
import { z } from 'zod';

/**
 * Validação das variáveis de ambiente no BOOT da aplicação.
 *
 * Por que isso importa: sem essa checagem, um `DATABASE_URL` faltando só
 * explodiria na primeira requisição que tocasse o banco — em produção,
 * provavelmente na frente do avaliador. Aqui o processo morre imediatamente,
 * com uma mensagem que diz exatamente qual variável está errada.
 *
 * Padrão conhecido como "fail fast".
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  /**
   * Render (e a maioria das PaaS) injeta a porta via variável de ambiente.
   * Local usamos 4000 — 3333 é a porta padrão de muitos projetos Node e
   * colidir com outro servidor rodando na máquina gera erro difícil de achar.
   */
  PORT: z.coerce.number().int().positive().default(4000),

  /** Origens autorizadas no CORS, separadas por vírgula. */
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  /**
   * String de conexão do PostgreSQL.
   *
   * Obrigatória: sem banco, a API não tem o que servir. Se estiver ausente ou
   * malformada, o processo morre aqui — e não na primeira requisição que
   * tentasse ler um anúncio.
   */
  DATABASE_URL: z
    .string({
      // Sem este `error`, uma variável AUSENTE cai na mensagem genérica do Zod
      // ("expected string, received undefined") e não diz o que fazer. Mensagem
      // de erro que não indica a próxima ação desperdiça o fail fast.
      error: 'DATABASE_URL é obrigatória. Cole a connection string do Neon em apps/api/.env',
    })
    .min(1, 'DATABASE_URL está vazia. Cole a connection string do Neon em apps/api/.env')
    .refine(
      (url) => url.startsWith('postgresql://') || url.startsWith('postgres://'),
      'DATABASE_URL precisa começar com postgresql:// ou postgres://',
    ),

  /**
   * Segredo que assina os JWT.
   *
   * O mínimo de 32 caracteres não é burocracia: a segurança de um token
   * HMAC-SHA256 depende inteiramente da imprevisibilidade deste valor. Um
   * segredo curto ou adivinhável (`secret`, `circula123`) permite que qualquer
   * pessoa forje um token válido para qualquer usuário.
   *
   * Gere com:
   *   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   */
  JWT_SECRET: z
    .string({
      error:
        "JWT_SECRET é obrigatória. Gere com: node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\"",
    })
    .min(32, 'JWT_SECRET precisa ter pelo menos 32 caracteres para ser seguro.'),

  /** Validade do token: 7d, 12h, 30m… */
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/, 'JWT_EXPIRES_IN deve ser algo como 7d, 12h ou 30m.')
    .default('7d'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // `z.treeifyError` (Zod 4) monta uma árvore legível campo a campo.
  console.error('❌ Variáveis de ambiente inválidas:');
  console.error(JSON.stringify(z.treeifyError(parsed.error), null, 2));
  process.exit(1);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
