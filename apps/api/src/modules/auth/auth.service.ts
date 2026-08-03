import bcrypt from 'bcryptjs';
import type { AuthResponseDTO, AuthUserDTO, LoginInput, RegisterInput } from '@circula/shared';

import { conflict, notFound, unauthorized } from '../../shared/errors.js';
import type { UserRecord, UsersRepository } from './auth.repository.js';
import { TOKEN_TTL_SECONDS, signToken } from './jwt.js';

/**
 * Regras de cadastro, login e identidade.
 */

/**
 * Custo do bcrypt (número de rodadas = 2^12 iterações).
 *
 * É um parâmetro de segurança deliberadamente **lento**: ~250ms por hash nesta
 * máquina. Lentidão aqui é a defesa — quem roubar o banco precisa gastar esses
 * 250ms por tentativa em cada senha que quiser adivinhar.
 *
 * 12 é o equilíbrio atual entre custo para o atacante e latência do login.
 */
const BCRYPT_ROUNDS = 12;

/**
 * Hash de comparação usado quando o e-mail não existe.
 *
 * Sem isso, um login com e-mail inexistente responderia na hora, e um com
 * e-mail válido demoraria os 250ms do bcrypt. Essa diferença de tempo é
 * mensurável e permite **enumerar quais e-mails têm conta** no sistema —
 * um ataque de canal lateral (timing attack).
 *
 * Comparando contra um hash descartável, os dois caminhos custam o mesmo.
 */
const DUMMY_HASH = bcrypt.hashSync('senha-que-nunca-sera-usada-0000', BCRYPT_ROUNDS);

/** Converte o registro do banco no DTO público. Nunca expõe `passwordHash`. */
export function toAuthUserDTO(user: UserRecord): AuthUserDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    course: user.course,
    campus: user.campus,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
  };
}

export function createAuthService(repository: UsersRepository) {
  function buildAuthResponse(user: UserRecord): AuthResponseDTO {
    return {
      user: toAuthUserDTO(user),
      token: signToken(user.id),
      expiresIn: TOKEN_TTL_SECONDS,
    };
  }

  return {
    async register(input: RegisterInput): Promise<AuthResponseDTO> {
      const existing = await repository.findByEmail(input.email);

      // 409 CONFLICT aqui é uma escolha consciente: no CADASTRO revelar que o
      // e-mail já existe é necessário (a pessoa precisa saber que deve fazer
      // login). No LOGIN, o mesmo vazamento seria um problema — veja abaixo.
      if (existing) {
        throw conflict('Este e-mail já está cadastrado.', { field: 'email' });
      }

      const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

      const user = await repository.create({
        name: input.name,
        email: input.email,
        passwordHash,
        course: input.course,
        campus: input.campus,
      });

      return buildAuthResponse(user);
    },

    async login(input: LoginInput): Promise<AuthResponseDTO> {
      const user = await repository.findByEmail(input.email);

      // Sempre executa um bcrypt.compare, mesmo sem usuário — mantém o tempo
      // de resposta constante (ver DUMMY_HASH acima).
      const matches = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);

      // Mensagem idêntica para "e-mail não existe" e "senha errada". Dizer
      // qual dos dois falhou transformaria a tela de login num validador de
      // e-mails cadastrados.
      if (!user || !matches) {
        throw unauthorized('E-mail ou senha incorretos.');
      }

      return buildAuthResponse(user);
    },

    /** Dados do usuário do token — usado por `GET /auth/me`. */
    async getById(userId: string): Promise<AuthUserDTO> {
      const user = await repository.findById(userId);

      // Token válido de um usuário que não existe mais (conta excluída).
      if (!user) throw notFound('Usuário não encontrado.');

      return toAuthUserDTO(user);
    },

    countUsers(): Promise<number> {
      return repository.count();
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
