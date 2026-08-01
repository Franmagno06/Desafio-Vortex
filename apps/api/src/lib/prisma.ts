import { PrismaClient } from '@prisma/client';
import { isProduction } from '../config/env.js';
import { logger } from '../shared/logger.js';

/**
 * Instância única do PrismaClient (singleton).
 *
 * Cada `new PrismaClient()` abre um pool de conexões próprio. Criar um por
 * requisição estouraria o limite de conexões do Postgres em minutos — e o
 * plano gratuito do Neon é justamente onde isso dói primeiro.
 *
 * O `globalThis` existe por causa do hot reload: o `tsx watch` recarrega o
 * módulo a cada arquivo salvo, e sem esse cache cada reload vazaria um pool
 * novo. Em produção o módulo é carregado uma vez só, então guardamos direto.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProduction ? ['error'] : ['warn', 'error'],
  });

if (!isProduction) {
  globalForPrisma.prisma = prisma;
}

/**
 * Verifica se o banco responde. Usado pelo `/health` para diferenciar
 * "a API está no ar" de "a API está no ar E consegue ler o banco".
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error({ err: error }, 'Falha ao conectar no banco de dados');
    return false;
  }
}
