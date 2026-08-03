import { prisma } from '../../lib/prisma.js';

/**
 * Persistência de usuários.
 *
 * Mesmo padrão dos anúncios: o service fala com a interface, não com o Prisma.
 * É o que permite testar cadastro e login sem banco no CI.
 */

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  course: string | null;
  campus: string | null;
  avatarUrl: string | null;
  createdAt: Date;
}

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
  course?: string | undefined;
  campus?: string | undefined;
}

export interface UsersRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  create(data: CreateUserData): Promise<UserRecord>;
  count(): Promise<number>;
}

export const prismaUsersRepository: UsersRepository = {
  async findByEmail(email) {
    return prisma.user.findUnique({ where: { email } });
  },

  async findById(id) {
    return prisma.user.findUnique({ where: { id } });
  },

  async create(data) {
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        course: data.course ?? null,
        campus: data.campus ?? null,
      },
    });
  },

  async count() {
    return prisma.user.count();
  },
};
