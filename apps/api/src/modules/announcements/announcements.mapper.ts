import type { AnnouncementDTO } from '@circula/shared';
import type { AnnouncementRecord } from './announcements.repository.js';

/**
 * Converte o registro do banco no DTO que sai pela API.
 *
 * Este arquivo é uma fronteira de segurança, não só de formatação. A regra é:
 * **nada sai do banco direto para a resposta HTTP.** Se amanhã alguém
 * acrescentar uma coluna sensível no modelo (um telefone, um documento), ela
 * não vaza sozinha — precisa ser adicionada aqui de propósito.
 *
 * Um `res.json(registroDoBanco)` funcionaria e é o atalho comum. O preço dele
 * é que o formato da resposta passa a mudar sozinho junto com o schema.
 *
 * Também é aqui que `Date` vira string ISO 8601, porque JSON não tem tipo data.
 */
export function toAnnouncementDTO(record: AnnouncementRecord): AnnouncementDTO {
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    category: record.category,
    condition: record.condition,
    type: record.type,
    priceCents: record.priceCents,
    imageUrl: record.imageUrl,
    status: record.status,
    author: {
      id: record.author.id,
      name: record.author.name,
      course: record.author.course,
      avatarUrl: record.author.avatarUrl,
    },
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
  // `deletedAt` e `authorId` ficam de fora de propósito: são detalhe interno.
}

export function toAnnouncementDTOList(records: AnnouncementRecord[]): AnnouncementDTO[] {
  return records.map(toAnnouncementDTO);
}
