/**
 * Vocabulário do domínio "Circula".
 *
 * Este arquivo é a ÚNICA fonte da verdade para categorias, tipos de negociação,
 * estado de conservação e status do anúncio. A API valida contra ele, o banco
 * espelha ele (enums do Prisma) e o PWA monta os filtros a partir dele.
 *
 * Regra prática: se um valor novo precisa aparecer na interface, ele nasce aqui.
 */

/** Categorias da vitrine — o edital cita Livros, Engenharia e Computação como exemplo. */
export const CATEGORIES = [
  'LIVROS',
  'ENGENHARIA',
  'COMPUTACAO',
  'ELETRONICOS',
  'VESTUARIO',
  'MOVEIS',
  'PAPELARIA',
  'OUTROS',
] as const;

export type Category = (typeof CATEGORIES)[number];

/** Como o item é oferecido. `DOACAO` é o coração da proposta de economia circular. */
export const ITEM_TYPES = ['VENDA', 'DOACAO', 'TROCA'] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

/** Estado de conservação declarado pelo anunciante. */
export const ITEM_CONDITIONS = ['NOVO', 'SEMINOVO', 'USADO'] as const;
export type ItemCondition = (typeof ITEM_CONDITIONS)[number];

/** Ciclo de vida do anúncio. Exclusão é lógica (soft delete), nunca física. */
export const ANNOUNCEMENT_STATUSES = ['ATIVO', 'RESERVADO', 'CONCLUIDO'] as const;
export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number];

/** Metadados de apresentação: rótulo em pt-BR e ícone (nome do ícone no lucide-react). */
export interface EnumMeta {
  readonly label: string;
  readonly icon: string;
}

export const CATEGORY_META: Record<Category, EnumMeta> = {
  LIVROS: { label: 'Livros', icon: 'BookOpen' },
  ENGENHARIA: { label: 'Engenharia', icon: 'Ruler' },
  COMPUTACAO: { label: 'Computação', icon: 'Laptop' },
  ELETRONICOS: { label: 'Eletrônicos', icon: 'CircuitBoard' },
  VESTUARIO: { label: 'Vestuário e jalecos', icon: 'Shirt' },
  MOVEIS: { label: 'Móveis', icon: 'Armchair' },
  PAPELARIA: { label: 'Papelaria e xerox', icon: 'Paperclip' },
  OUTROS: { label: 'Outros', icon: 'Package' },
};

export const ITEM_TYPE_META: Record<ItemType, EnumMeta> = {
  VENDA: { label: 'Venda', icon: 'Tag' },
  DOACAO: { label: 'Doação', icon: 'HeartHandshake' },
  TROCA: { label: 'Troca', icon: 'Repeat' },
};

export const ITEM_CONDITION_META: Record<ItemCondition, EnumMeta> = {
  NOVO: { label: 'Novo', icon: 'Sparkles' },
  SEMINOVO: { label: 'Seminovo', icon: 'ThumbsUp' },
  USADO: { label: 'Usado', icon: 'History' },
};

export const ANNOUNCEMENT_STATUS_META: Record<AnnouncementStatus, EnumMeta> = {
  ATIVO: { label: 'Disponível', icon: 'CircleCheck' },
  RESERVADO: { label: 'Reservado', icon: 'CircleDashed' },
  CONCLUIDO: { label: 'Finalizado', icon: 'CircleOff' },
};

/** Helper de UI: transforma o enum em lista pronta para chips/select. */
export function toOptions<T extends string>(
  values: readonly T[],
  meta: Record<T, EnumMeta>,
): Array<{ value: T; label: string; icon: string }> {
  return values.map((value) => ({
    value,
    label: meta[value].label,
    icon: meta[value].icon,
  }));
}
