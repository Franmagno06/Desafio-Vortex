/**
 * Dinheiro é armazenado SEMPRE em centavos (inteiro), nunca em float.
 *
 * Motivo: `0.1 + 0.2 !== 0.3` em ponto flutuante. Guardar `1990` em vez de
 * `19.90` elimina a classe inteira de bugs de arredondamento em preço.
 */

/** 1990 -> "R$ 19,90" · null -> "Gratuito" */
export function formatPrice(priceCents: number | null): string {
  if (priceCents === null) return 'Gratuito';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(priceCents / 100);
}

/** "19,90" ou "19.90" -> 1990. Retorna null se não for um número válido. */
export function parsePriceToCents(input: string): number | null {
  const normalized = input.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}
