import {
  announcementFiltersSchema,
  createAnnouncementSchema,
  loginSchema,
  registerSchema,
  updateAnnouncementSchema,
} from '@circula/shared';
import { z } from 'zod';

/**
 * Documentação OpenAPI gerada a partir dos schemas Zod.
 *
 * O ponto importante: os schemas abaixo **não são escritos à mão**. O
 * `z.toJSONSchema()` (nativo do Zod 4) converte o mesmo schema que valida as
 * requisições em JSON Schema. Consequência prática: a documentação não tem
 * como ficar desatualizada em relação ao comportamento real da API — mudou a
 * validação, mudou o `/docs` no próximo boot.
 *
 * O OpenAPI 3.1 adota JSON Schema draft 2020-12, que é exatamente o alvo
 * pedido na conversão.
 */

const toSchema = (schema: z.ZodType, io: 'input' | 'output' = 'input') =>
  z.toJSONSchema(schema, { target: 'draft-2020-12', io, unrepresentable: 'any' });

/** Envelope de erro — idêntico ao que o middleware de erro produz. */
const errorSchema = {
  type: 'object',
  properties: {
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'NOT_FOUND' },
        message: { type: 'string', example: 'Anúncio não encontrado.' },
        details: {},
      },
      required: ['code', 'message'],
    },
  },
} as const;

const authorSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    course: { type: 'string', nullable: true },
    avatarUrl: { type: 'string', nullable: true },
  },
} as const;

const announcementSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    title: { type: 'string' },
    description: { type: 'string' },
    category: { type: 'string' },
    condition: { type: 'string' },
    type: { type: 'string', enum: ['VENDA', 'DOACAO', 'TROCA'] },
    priceCents: { type: 'integer', nullable: true, description: 'Preço em centavos.' },
    imageUrl: { type: 'string' },
    status: { type: 'string' },
    author: authorSchema,
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;

const paginatedAnnouncements = {
  type: 'object',
  properties: {
    items: { type: 'array', items: announcementSchema },
    meta: {
      type: 'object',
      properties: {
        page: { type: 'integer' },
        limit: { type: 'integer' },
        total: { type: 'integer' },
        totalPages: { type: 'integer' },
        hasNext: { type: 'boolean' },
        hasPrev: { type: 'boolean' },
      },
    },
  },
} as const;

/** Converte o schema de filtros em parâmetros de query do OpenAPI. */
function buildFilterParameters() {
  const jsonSchema = toSchema(announcementFiltersSchema) as {
    properties?: Record<string, Record<string, unknown>>;
    required?: string[];
  };

  return Object.entries(jsonSchema.properties ?? {}).map(([name, schema]) => ({
    name,
    in: 'query' as const,
    required: jsonSchema.required?.includes(name) ?? false,
    schema,
    description: typeof schema['description'] === 'string' ? schema['description'] : undefined,
  }));
}

/**
 * Marca a operação como protegida.
 *
 * O nome `bearerAuth` referencia o `securitySchemes` declarado lá embaixo — é
 * isso que faz o Swagger UI mostrar o cadeado e o botão "Authorize", onde você
 * cola o token uma vez e ele acompanha todas as requisições.
 */
const secured = [{ bearerAuth: [] }];

const authUserSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    email: { type: 'string', format: 'email' },
    course: { type: 'string', nullable: true },
    campus: { type: 'string', nullable: true },
    avatarUrl: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
  },
} as const;

const authResponseSchema = {
  type: 'object',
  properties: {
    user: authUserSchema,
    token: { type: 'string', description: 'JWT. Envie em `Authorization: Bearer <token>`.' },
    expiresIn: { type: 'integer', description: 'Segundos até o token expirar.' },
  },
} as const;

const jsonBody = (schema: unknown) => ({
  required: true,
  content: { 'application/json': { schema } },
});

const jsonResponse = (description: string, schema: unknown) => ({
  description,
  content: { 'application/json': { schema } },
});

const errorResponse = (description: string) => jsonResponse(description, errorSchema);

export function buildOpenApiDocument(): Record<string, unknown> {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Circula API',
      version: '0.2.0',
      description:
        'API REST do Circula — marketplace de economia circular do campus.\n\n' +
        'Desafio Técnico do Laboratório de Inovação Vortex (UNIFOR).\n\n' +
        '**Todos os erros** seguem o envelope `{ "error": { "code", "message", "details" } }`.',
      license: { name: 'MIT' },
    },
    servers: [
      { url: 'http://localhost:4000', description: 'Desenvolvimento local' },
      { url: '/', description: 'Ambiente atual' },
    ],
    tags: [
      { name: 'Autenticação', description: 'Cadastro, login e identidade' },
      { name: 'Anúncios', description: 'CRUD da vitrine' },
      { name: 'Catálogo', description: 'Categorias, opções de formulário e estatísticas' },
      { name: 'Sistema', description: 'Diagnóstico' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'Faça login em `/api/v1/auth/login`, copie o campo `token` e cole aqui. ' +
            'O Swagger passa a enviá-lo em `Authorization: Bearer <token>` automaticamente.',
        },
      },
    },
    paths: {
      '/api/v1/auth/register': {
        post: {
          tags: ['Autenticação'],
          summary: 'Cria uma conta e já devolve o token',
          requestBody: jsonBody(toSchema(registerSchema)),
          responses: {
            201: jsonResponse('Conta criada', authResponseSchema),
            409: errorResponse('E-mail já cadastrado'),
            422: errorResponse('Dados inválidos (senha fraca, e-mail malformado…)'),
            429: errorResponse('Muitas tentativas'),
          },
        },
      },
      '/api/v1/auth/login': {
        post: {
          tags: ['Autenticação'],
          summary: 'Troca e-mail e senha por um token',
          description:
            'Responde 401 tanto para e-mail inexistente quanto para senha errada, ' +
            'com a **mesma mensagem** — evita que a rota vire um validador de ' +
            'quais e-mails têm conta.',
          requestBody: jsonBody(toSchema(loginSchema)),
          responses: {
            200: jsonResponse('Autenticado', authResponseSchema),
            401: errorResponse('E-mail ou senha incorretos'),
            429: errorResponse('Muitas tentativas de login'),
          },
        },
      },
      '/api/v1/auth/me': {
        get: {
          tags: ['Autenticação'],
          summary: 'Dados do usuário autenticado',
          description: 'O PWA usa esta rota ao abrir para saber se o token guardado ainda vale.',
          security: secured,
          responses: {
            200: jsonResponse('Usuário autenticado', {
              type: 'object',
              properties: { user: authUserSchema },
            }),
            401: errorResponse('Token ausente, inválido ou expirado'),
          },
        },
      },
      '/api/v1/announcements': {
        get: {
          tags: ['Anúncios'],
          summary: 'Lista anúncios da vitrine pública',
          description:
            'Retorna apenas anúncios não excluídos. Sem o parâmetro `status`, ' +
            'considera somente os `ATIVO`.',
          parameters: buildFilterParameters(),
          responses: {
            200: jsonResponse('Lista paginada', paginatedAnnouncements),
            422: errorResponse('Filtros inválidos'),
          },
        },
        post: {
          tags: ['Anúncios'],
          summary: 'Cria um anúncio',
          security: secured,
          requestBody: jsonBody(toSchema(createAnnouncementSchema)),
          responses: {
            201: jsonResponse('Anúncio criado', announcementSchema),
            401: errorResponse('Token ausente, inválido ou expirado'),
            422: errorResponse('Dados inválidos (ex.: doação com preço)'),
          },
        },
      },
      '/api/v1/announcements/mine': {
        get: {
          tags: ['Anúncios'],
          summary: 'Lista os anúncios do usuário autenticado',
          security: secured,
          parameters: buildFilterParameters(),
          responses: {
            200: jsonResponse('Lista paginada', paginatedAnnouncements),
            401: errorResponse('Token ausente, inválido ou expirado'),
          },
        },
      },
      '/api/v1/announcements/{id}': {
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        get: {
          tags: ['Anúncios'],
          summary: 'Detalha um anúncio',
          responses: {
            200: jsonResponse('Anúncio encontrado', announcementSchema),
            404: errorResponse('Anúncio inexistente ou excluído'),
            422: errorResponse('Id fora do formato UUID'),
          },
        },
        patch: {
          tags: ['Anúncios'],
          summary: 'Atualiza parcialmente (apenas o dono)',
          security: secured,
          requestBody: jsonBody(toSchema(updateAnnouncementSchema)),
          responses: {
            200: jsonResponse('Anúncio atualizado', announcementSchema),
            401: errorResponse('Token ausente, inválido ou expirado'),
            403: errorResponse('Você não é o dono do anúncio'),
            404: errorResponse('Anúncio inexistente'),
            422: errorResponse('Dados inválidos'),
          },
        },
        delete: {
          tags: ['Anúncios'],
          summary: 'Exclui logicamente (apenas o dono)',
          security: secured,
          responses: {
            204: { description: 'Excluído com sucesso, sem corpo' },
            401: errorResponse('Token ausente, inválido ou expirado'),
            403: errorResponse('Você não é o dono do anúncio'),
            404: errorResponse('Anúncio inexistente'),
          },
        },
      },
      '/api/v1/categories': {
        get: {
          tags: ['Catálogo'],
          summary: 'Categorias com contagem de anúncios ativos',
          responses: { 200: jsonResponse('Categorias', { type: 'object' }) },
        },
      },
      '/api/v1/catalog': {
        get: {
          tags: ['Catálogo'],
          summary: 'Todas as opções de formulário (categorias, tipos, condições)',
          responses: { 200: jsonResponse('Opções', { type: 'object' }) },
        },
      },
      '/api/v1/stats': {
        get: {
          tags: ['Catálogo'],
          summary: 'Estatísticas reais da plataforma',
          responses: { 200: jsonResponse('Contadores', { type: 'object' }) },
        },
      },
      '/health': {
        get: {
          tags: ['Sistema'],
          summary: 'Status do serviço e do banco',
          responses: {
            200: jsonResponse('Serviço saudável', { type: 'object' }),
            503: errorResponse('Banco indisponível'),
          },
        },
      },
    },
  };
}
