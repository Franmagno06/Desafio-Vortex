import { z } from 'zod';
import { ANNOUNCEMENT_STATUSES, CATEGORIES, ITEM_CONDITIONS, ITEM_TYPES } from '../domain/enums.js';
import { MAX_PRICE_CENTS, PRICE_RULE_MESSAGES, checkPriceAgainstType } from '../domain/rules.js';
import { paginationQuerySchema } from './pagination.js';

/**
 * Contrato de entrada dos anúncios.
 *
 * Estes schemas são a fronteira entre "dado que veio da internet" (não confiável)
 * e "dado que o sistema manipula" (tipado e validado). Nada entra no service sem
 * passar por aqui.
 */

/**
 * Preço em centavos. `null` significa "sem preço" (doação ou troca).
 *
 * Declarado à parte porque criação e atualização precisam de comportamentos
 * diferentes: no POST, omitir o campo equivale a `null` (`.default(null)`);
 * no PATCH, omitir precisa significar "não mexa no preço". Ver o comentário
 * em `updateAnnouncementSchema`.
 */
const priceCentsField = z
  .number()
  .int('O preço deve ser informado em centavos (número inteiro).')
  .nonnegative()
  .max(MAX_PRICE_CENTS)
  .nullable();

/** Campos do anúncio, sem as regras que cruzam mais de um campo. */
const announcementFieldsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(4, 'O título precisa de pelo menos 4 caracteres.')
    .max(120, 'O título pode ter no máximo 120 caracteres.'),

  description: z
    .string()
    .trim()
    .min(20, 'Descreva o item com pelo menos 20 caracteres.')
    .max(2000, 'A descrição pode ter no máximo 2000 caracteres.'),

  category: z.enum(CATEGORIES),
  condition: z.enum(ITEM_CONDITIONS),
  type: z.enum(ITEM_TYPES),

  priceCents: priceCentsField,

  /** O edital pede "uma URL de imagem simulada" — não há upload de arquivo. */
  imageUrl: z.url('Informe uma URL de imagem válida.').max(500),
});

/**
 * Criação de anúncio.
 *
 * O `.superRefine` aplica a regra que depende de DOIS campos ao mesmo tempo
 * (tipo × preço). Validações de campo único ficam no schema acima; regras
 * cruzadas ficam aqui. O `path` faz o erro aparecer grudado no campo certo do
 * formulário, e não numa mensagem solta no topo da tela.
 */
export const createAnnouncementSchema = announcementFieldsSchema
  // Só na criação omitir o preço equivale a "sem preço".
  .extend({ priceCents: priceCentsField.default(null) })
  .superRefine((data, ctx) => {
    const violation = checkPriceAgainstType(data.type, data.priceCents);

    if (violation) {
      ctx.addIssue({
        code: 'custom',
        path: ['priceCents'],
        message: PRICE_RULE_MESSAGES[violation],
      });
    }
  });

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;

/**
 * Atualização parcial (PATCH).
 *
 * Duas sutilezas que já causaram bug neste projeto:
 *
 * 1. `priceCents` **não** pode ter `.default(null)` aqui. Se tivesse, um
 *    `PATCH { "status": "RESERVADO" }` sairia do parse como
 *    `{ status: 'RESERVADO', priceCents: null }` e zeraria o preço de um
 *    anúncio de venda sem ninguém ter pedido. `.partial()` torna o campo
 *    opcional, mas um `.default()` continua sendo aplicado na ausência dele.
 *
 * 2. A regra tipo × preço não é aplicada aqui: quem envia só
 *    `{ "type": "DOACAO" }` não reenviou o preço, então o schema sozinho não
 *    tem informação suficiente para decidir. Essa checagem acontece no service,
 *    depois de mesclar o corpo recebido com o anúncio que já está no banco.
 */
export const updateAnnouncementSchema = announcementFieldsSchema
  .partial()
  .extend({ status: z.enum(ANNOUNCEMENT_STATUSES).optional() })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Envie pelo menos um campo para atualizar.',
  });

export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;

/** Ordenações aceitas na vitrine. */
export const ANNOUNCEMENT_SORTS = ['recent', 'oldest', 'price_asc', 'price_desc'] as const;
export type AnnouncementSort = (typeof ANNOUNCEMENT_SORTS)[number];

/**
 * Filtros da listagem pública.
 *
 * Estende a paginação porque toda listagem é paginada. Repare no `z.coerce`
 * herdado: query string chega sempre como texto, e `?page=2` precisa virar o
 * número 2 antes de ser validado.
 */
export const announcementFiltersSchema = paginationQuerySchema.extend({
  category: z.enum(CATEGORIES).optional(),
  type: z.enum(ITEM_TYPES).optional(),
  condition: z.enum(ITEM_CONDITIONS).optional(),
  status: z.enum(ANNOUNCEMENT_STATUSES).optional(),

  /** Busca textual no título e na descrição. */
  q: z.string().trim().min(2, 'Busque por pelo menos 2 caracteres.').max(80).optional(),

  sort: z.enum(ANNOUNCEMENT_SORTS).default('recent'),
});

export type AnnouncementFilters = z.infer<typeof announcementFiltersSchema>;

/** Valida o `:id` da rota. Rejeita lixo antes de qualquer ida ao banco. */
export const announcementIdParamSchema = z.object({
  id: z.uuid('Identificador de anúncio inválido.'),
});
