import { z } from 'zod';

/**
 * Contratos de cadastro e login.
 *
 * Estes schemas são usados nos dois lados: a API valida a requisição com eles,
 * e o formulário do PWA (Sprint 4) valida antes de enviar. O usuário recebe o
 * mesmo erro nos dois casos.
 */

/**
 * Regras de senha.
 *
 * Comprimento mínimo pesa mais que exigir símbolos: uma senha longa é
 * exponencialmente mais cara de quebrar, enquanto "obrigar um caractere
 * especial" só empurra o usuário para `Senha@123`. Ficamos em 8 caracteres com
 * ao menos uma letra e um número — o piso razoável sem tornar o cadastro chato.
 *
 * O teto de 72 não é estético: o **bcrypt trunca silenciosamente** o que passar
 * de 72 bytes. Sem esse limite, duas senhas diferentes com o mesmo prefixo de
 * 72 bytes autenticariam uma à outra.
 */
const passwordSchema = z
  .string()
  .min(8, 'A senha precisa de pelo menos 8 caracteres.')
  .max(72, 'A senha pode ter no máximo 72 caracteres.')
  .refine((value) => /[a-zA-Z]/.test(value), 'A senha precisa conter ao menos uma letra.')
  .refine((value) => /[0-9]/.test(value), 'A senha precisa conter ao menos um número.');

/**
 * E-mail normalizado: sem espaços nas pontas e em minúsculas.
 *
 * `Ana@Unifor.br` e `ana@unifor.br` são o mesmo endereço. Sem a normalização,
 * a restrição UNIQUE do banco deixaria os dois coexistirem e o login ficaria
 * dependente de como a pessoa digitou no dia do cadastro.
 *
 * ⚠️ A ORDEM aqui é o detalhe que importa, e já custou um teste vermelho:
 *
 *   z.email().transform(v => v.trim())   ← ERRADO
 *   z.string().trim().pipe(z.email())    ← certo
 *
 * No primeiro caso a validação de formato roda ANTES do trim, então
 * `"  ana@unifor.br  "` é rejeitado como e-mail inválido. Teclado de celular
 * costuma acrescentar espaço depois do autocompletar, e colar um endereço traz
 * espaço junto — normalizar primeiro e validar depois evita rejeitar um e-mail
 * que estava certo.
 */
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Informe um e-mail válido.').max(160));

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Informe seu nome completo.')
    .max(120, 'O nome pode ter no máximo 120 caracteres.'),
  email: emailSchema,
  password: passwordSchema,
  course: z.string().trim().max(120).optional(),
  campus: z.string().trim().max(120).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  // No login não revalidamos as regras de força: quem já tem conta precisa
  // conseguir entrar mesmo que a política tenha mudado desde o cadastro.
  password: z.string().min(1, 'Informe sua senha.').max(72),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** Dados do usuário autenticado — nunca inclui hash de senha. */
export interface AuthUserDTO {
  id: string;
  name: string;
  email: string;
  course: string | null;
  campus: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

/** Resposta de `/auth/register` e `/auth/login`. */
export interface AuthResponseDTO {
  user: AuthUserDTO;
  token: string;
  /** Segundos até o token expirar — o cliente usa para agendar o refresh. */
  expiresIn: number;
}
