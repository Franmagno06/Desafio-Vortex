import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './shared/logger.js';

/**
 * Ponto de entrada do processo: sobe o servidor HTTP e cuida do desligamento.
 */
const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`🌱 Circula API ouvindo em http://localhost:${env.PORT}`);
  logger.info(`   health  -> http://localhost:${env.PORT}/health`);
  logger.info(`   ambiente: ${env.NODE_ENV} | CORS: ${env.CORS_ORIGINS.join(', ')}`);
});

/**
 * Graceful shutdown.
 *
 * Quando a Render faz deploy, ela envia SIGTERM ao processo antigo. Sem este
 * bloco o Node morreria no meio de requisições em andamento, devolvendo erro
 * de conexão para quem estivesse usando o app naquele segundo. Aqui paramos
 * de aceitar conexões novas e esperamos as atuais terminarem.
 */
function shutdown(signal: string): void {
  logger.info(`${signal} recebido — encerrando servidor...`);

  server.close(() => {
    logger.info('Servidor encerrado com sucesso.');
    process.exit(0);
  });

  // Rede de segurança: se algo travar, derruba em 10s de qualquer forma.
  setTimeout(() => {
    logger.error('Encerramento forçado após timeout.');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
