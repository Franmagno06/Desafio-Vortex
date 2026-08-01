import {
  announcementFiltersSchema,
  createAnnouncementSchema,
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

const userIdHeader = {
  name: 'X-User-Id',
  in: 'header' as const,
  required: true,
  schema: { type: 'string', format: 'uuid' },
  description: 'Identificação temporária do usuário (Sprint 1). Vira JWT na Sprint 2.',
};

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
      { name: 'Anúncios', description: 'CRUD da vitrine' },
      { name: 'Catálogo', description: 'Categorias, opções de formulário e estatísticas' },
      { name: 'Sistema', description: 'Diagnóstico' },
    ],
    paths: {
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
          parameters: [userIdHeader],
          requestBody: jsonBody(toSchema(createAnnouncementSchema)),
          responses: {
            201: jsonResponse('Anúncio criado', announcementSchema),
            401: errorResponse('Cabeçalho X-User-Id ausente ou inválido'),
            422: errorResponse('Dados inválidos (ex.: doação com preço)'),
          },
        },
      },
      '/api/v1/announcements/mine': {
        get: {
          tags: ['Anúncios'],
          summary: 'Lista os anúncios do usuário identificado',
          parameters: [userIdHeader, ...buildFilterParameters()],
          responses: {
            200: jsonResponse('Lista paginada', paginatedAnnouncements),
            401: errorResponse('Não identificado'),
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
          parameters: [userIdHeader],
          requestBody: jsonBody(toSchema(updateAnnouncementSchema)),
          responses: {
            200: jsonResponse('Anúncio atualizado', announcementSchema),
            401: errorResponse('Não identificado'),
            403: errorResponse('Você não é o dono do anúncio'),
            404: errorResponse('Anúncio inexistente'),
            422: errorResponse('Dados inválidos'),
          },
        },
        delete: {
          tags: ['Anúncios'],
          summary: 'Exclui logicamente (apenas o dono)',
          parameters: [userIdHeader],
          responses: {
            204: { description: 'Excluído com sucesso, sem corpo' },
            401: errorResponse('Não identificado'),
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
