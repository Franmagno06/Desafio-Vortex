import type { AnnouncementFilters, Category, CreateAnnouncementInput } from '@circula/shared';
import type {
  AnnouncementRecord,
  AnnouncementUpdateData,
  AnnouncementsRepository,
} from '../../src/modules/announcements/announcements.repository.js';

/**
 * Implementação em memória do repositório de anúncios.
 *
 * Existe por uma razão concreta: o workflow do GitHub Actions não sobe um
 * PostgreSQL. Sem esta classe, ou o CI ficaria sem testes, ou seria preciso
 * manter um serviço de banco no pipeline só para exercitar regras que não
 * dependem de banco nenhum.
 *
 * Ela reproduz os comportamentos que o service realmente depende:
 * exclusão lógica, filtro padrão por status ATIVO, ordenação e paginação.
 * Não é um clone do Postgres — é um dublê fiel ao contrato da interface.
 */
export class InMemoryAnnouncementsRepository implements AnnouncementsRepository {
  private records: AnnouncementRecord[] = [];
  private sequence = 0;

  /** Insere um registro pronto, para montar o cenário do teste. */
  seed(records: AnnouncementRecord[]): void {
    this.records.push(...records);
  }

  reset(): void {
    this.records = [];
    this.sequence = 0;
  }

  /** Acesso cru — usado para conferir efeitos colaterais, como o soft delete. */
  raw(): AnnouncementRecord[] {
    return this.records;
  }

  private nextId(): string {
    this.sequence += 1;
    return `00000000-0000-4000-8000-${String(this.sequence).padStart(12, '0')}`;
  }

  /** Espelha o `buildWhere` da versão Prisma. */
  private applyFilters(filters: AnnouncementFilters, authorId?: string): AnnouncementRecord[] {
    return this.records.filter((record) => {
      if (record.deletedAt !== null) return false;
      if (authorId && record.authorId !== authorId) return false;
      if (filters.category && record.category !== filters.category) return false;
      if (filters.type && record.type !== filters.type) return false;
      if (filters.condition && record.condition !== filters.condition) return false;

      const wantedStatus = filters.status ?? 'ATIVO';
      if (record.status !== wantedStatus) return false;

      if (filters.q) {
        const needle = filters.q.toLowerCase();
        const haystack = `${record.title} ${record.description}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }

      return true;
    });
  }

  private sort(items: AnnouncementRecord[], sort: AnnouncementFilters['sort']) {
    const copy = [...items];

    switch (sort) {
      case 'oldest':
        return copy.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      case 'price_asc':
        // Espelha o `nulls: 'last'` do Prisma: sem preço vai para o fim.
        return copy.sort((a, b) => (a.priceCents ?? Infinity) - (b.priceCents ?? Infinity));
      case 'price_desc':
        return copy.sort((a, b) => (b.priceCents ?? -Infinity) - (a.priceCents ?? -Infinity));
      case 'recent':
      default:
        return copy.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
  }

  findMany(filters: AnnouncementFilters, authorId?: string) {
    const filtered = this.applyFilters(filters, authorId);
    const sorted = this.sort(filtered, filters.sort);
    const start = (filters.page - 1) * filters.limit;

    return Promise.resolve({
      items: sorted.slice(start, start + filters.limit),
      total: filtered.length,
    });
  }

  findById(id: string) {
    const found = this.records.find((record) => record.id === id && record.deletedAt === null);
    return Promise.resolve(found ?? null);
  }

  create(data: CreateAnnouncementInput, authorId: string) {
    const now = new Date();

    const record: AnnouncementRecord = {
      id: this.nextId(),
      ...data,
      status: 'ATIVO',
      authorId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      author: {
        id: authorId,
        name: 'Usuário de Teste',
        course: 'Ciência da Computação',
        avatarUrl: null,
      },
    };

    this.records.push(record);
    return Promise.resolve(record);
  }

  update(id: string, data: AnnouncementUpdateData) {
    const index = this.records.findIndex((record) => record.id === id);
    const current = this.records[index];

    if (!current) return Promise.reject(new Error(`Anúncio ${id} não encontrado`));

    const updated: AnnouncementRecord = { ...current, ...data, updatedAt: new Date() };
    this.records[index] = updated;

    return Promise.resolve(updated);
  }

  softDelete(id: string) {
    const record = this.records.find((item) => item.id === id);
    if (record) record.deletedAt = new Date();
    return Promise.resolve();
  }

  countByCategory() {
    const counts = new Map<Category, number>();

    for (const record of this.records) {
      if (record.deletedAt !== null || record.status !== 'ATIVO') continue;
      counts.set(record.category, (counts.get(record.category) ?? 0) + 1);
    }

    return Promise.resolve([...counts].map(([category, count]) => ({ category, count })));
  }

  countStats() {
    const alive = this.records.filter((record) => record.deletedAt === null);

    return Promise.resolve({
      total: alive.length,
      active: alive.filter((record) => record.status === 'ATIVO').length,
      donations: alive.filter((record) => record.type === 'DOACAO').length,
    });
  }
}

/** Constrói um registro válido, permitindo sobrescrever só o que o teste precisa. */
export function makeAnnouncement(overrides: Partial<AnnouncementRecord> = {}): AnnouncementRecord {
  const now = new Date('2026-08-01T12:00:00.000Z');

  return {
    id: '00000000-0000-4000-8000-000000000999',
    title: 'Livro de Cálculo I',
    description: 'Livro em bom estado, usado durante um semestre inteiro sem rasuras.',
    category: 'LIVROS',
    condition: 'SEMINOVO',
    type: 'VENDA',
    priceCents: 5000,
    imageUrl: 'https://example.com/livro.jpg',
    status: 'ATIVO',
    authorId: '11111111-1111-4111-8111-111111111111',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    author: {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Ana Beatriz Lima',
      course: 'Engenharia Civil',
      avatarUrl: null,
    },
    ...overrides,
  };
}
