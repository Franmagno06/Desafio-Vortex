import bcrypt from 'bcryptjs';
import type {
  CreateUserData,
  UserRecord,
  UsersRepository,
} from '../../src/modules/auth/auth.repository.js';

/**
 * Implementação em memória do repositório de usuários.
 *
 * Mesma motivação da versão de anúncios: permitir que a suíte exercite cadastro,
 * login e autorização sem PostgreSQL no CI.
 *
 * O detalhe importante é que ela reproduz a restrição UNIQUE do e-mail — sem
 * isso, o teste de "e-mail duplicado devolve 409" passaria por acidente.
 */
export class InMemoryUsersRepository implements UsersRepository {
  private users: UserRecord[] = [];
  private sequence = 0;

  reset(): void {
    this.users = [];
    this.sequence = 0;
  }

  raw(): UserRecord[] {
    return this.users;
  }

  private nextId(): string {
    this.sequence += 1;
    return `aaaaaaaa-aaaa-4aaa-8aaa-${String(this.sequence).padStart(12, '0')}`;
  }

  findByEmail(email: string) {
    return Promise.resolve(this.users.find((user) => user.email === email) ?? null);
  }

  findById(id: string) {
    return Promise.resolve(this.users.find((user) => user.id === id) ?? null);
  }

  create(data: CreateUserData) {
    const record: UserRecord = {
      id: this.nextId(),
      name: data.name,
      email: data.email,
      passwordHash: data.passwordHash,
      course: data.course ?? null,
      campus: data.campus ?? null,
      avatarUrl: null,
      createdAt: new Date(),
    };

    this.users.push(record);
    return Promise.resolve(record);
  }

  count() {
    return Promise.resolve(this.users.length);
  }

  /**
   * Insere um usuário já pronto, com senha hasheada de verdade.
   *
   * Custo baixo de propósito (4 rodadas em vez de 12): os testes rodam dezenas
   * de vezes e não precisam do custo de produção. A segurança do bcrypt vem do
   * número de rodadas configurado no service, não aqui.
   */
  async seedUser(email: string, plainPassword: string, name = 'Usuário de Teste') {
    const record: UserRecord = {
      id: this.nextId(),
      name,
      email,
      passwordHash: await bcrypt.hash(plainPassword, 4),
      course: 'Ciência da Computação',
      campus: 'Fortaleza — Sede',
      avatarUrl: null,
      createdAt: new Date(),
    };

    this.users.push(record);
    return record;
  }
}
