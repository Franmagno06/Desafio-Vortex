/**
 * Ponto de entrada público de @circula/shared.
 *
 * Tudo que a API e o PWA precisam enxergar em comum passa por aqui.
 * Se um símbolo não está exportado neste arquivo, ele é interno ao pacote.
 */

export * from './domain/enums.js';
export * from './domain/money.js';
export * from './schemas/pagination.js';
