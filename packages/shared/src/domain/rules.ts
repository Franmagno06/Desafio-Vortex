import type { ItemType } from './enums.js';

/**
 * Regras de negócio puras do Circula.
 *
 * "Puras" quer dizer: só recebem dados e devolvem um resultado. Não conhecem
 * HTTP, não conhecem banco, não conhecem React. Por isso podem ser usadas nos
 * três lugares onde a regra precisa valer:
 *
 *   1. no schema Zod (validação da requisição na API)
 *   2. no service (quando um PATCH altera o tipo sem reenviar o preço)
 *   3. no formulário do PWA (feedback imediato, antes de mandar para a rede)
 *
 * Manter a regra num único lugar é o que impede o clássico "o front deixou
 * passar mas a API recusou".
 */

/** Preço mínimo aceito num anúncio de venda: R$ 1,00. */
export const MIN_PRICE_CENTS = 100;

/** Teto de sanidade: R$ 100.000,00. Evita erro de digitação virar anúncio. */
export const MAX_PRICE_CENTS = 100_000_00;

export type PriceRuleViolation =
  'PRICE_REQUIRED_FOR_SALE' | 'PRICE_BELOW_MINIMUM' | 'PRICE_ABOVE_MAXIMUM' | 'PRICE_NOT_ALLOWED';

/**
 * O coração da proposta de economia circular: doação e troca **não têm preço**.
 *
 * Devolve `null` quando a combinação é válida, ou o código da violação.
 */
export function checkPriceAgainstType(
  type: ItemType,
  priceCents: number | null,
): PriceRuleViolation | null {
  if (type === 'VENDA') {
    if (priceCents === null) return 'PRICE_REQUIRED_FOR_SALE';
    if (priceCents < MIN_PRICE_CENTS) return 'PRICE_BELOW_MINIMUM';
    if (priceCents > MAX_PRICE_CENTS) return 'PRICE_ABOVE_MAXIMUM';
    return null;
  }

  // DOACAO e TROCA: qualquer preço informado é inconsistente com o tipo.
  return priceCents === null ? null : 'PRICE_NOT_ALLOWED';
}

/** Mensagem em pt-BR para cada violação — usada na API e na interface. */
export const PRICE_RULE_MESSAGES: Record<PriceRuleViolation, string> = {
  PRICE_REQUIRED_FOR_SALE: 'Anúncios de venda precisam de um preço.',
  PRICE_BELOW_MINIMUM: 'O preço mínimo é R$ 1,00.',
  PRICE_ABOVE_MAXIMUM: 'O preço máximo é R$ 100.000,00.',
  PRICE_NOT_ALLOWED: 'Doações e trocas não podem ter preço.',
};
