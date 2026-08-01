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
