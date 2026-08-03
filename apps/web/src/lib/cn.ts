/**
 * Junta classes CSS condicionais.
 *
 * `cn('base', ativo && 'destaque', undefined)` → `"base destaque"`.
 *
 * Existem bibliotecas para isso (`clsx`, `tailwind-merge`), mas para o tamanho
 * deste projeto seriam 12 KB para resolver três linhas. A diferença real do
 * `tailwind-merge` é desempatar utilitários conflitantes (`p-2 p-4` → `p-4`);
 * aqui evitamos o conflito na origem, escrevendo as variantes sem sobreposição.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
