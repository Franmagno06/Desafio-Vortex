# Arquitetura e Registro de Decisões — Circula

Este documento explica **por que** o projeto é do jeito que é. Cada decisão registra o
contexto, a alternativa descartada e a consequência aceita.

---

## Visão geral

```
┌────────────────────────┐        HTTPS / JSON        ┌────────────────────────┐
│   apps/web  (PWA)      │ ─────────────────────────▶ │   apps/api  (REST)     │
│   React 19 + Vite      │ ◀───────────────────────── │   Express 5 + TS       │
│   Tailwind v4          │                            │   Zod · Pino · Helmet  │
│   Service Worker       │                            └───────────┬────────────┘
└───────────┬────────────┘                                        │ Prisma
            │                                                     ▼
            │                                          ┌────────────────────────┐
            └──────────── @circula/shared ────────────▶ │  PostgreSQL (Neon)     │
                     enums · schemas Zod · helpers      └────────────────────────┘
```

O pacote `@circula/shared` é a espinha dorsal: define o vocabulário do domínio uma única vez
e o entrega para os dois lados. Se uma categoria nova nascer lá, a API passa a aceitá-la e o
PWA passa a exibi-la sem nenhuma duplicação de lista.

---

## ADR 001 — Monorepo com npm workspaces

**Contexto.** O edital pede "uma aplicação única integrando uma API RESTful e uma interface
responsiva instalável". Precisamos de separação clara entre back e front, sem fragmentar a
entrega em dois repositórios.

**Decisão.** Monorepo com `npm workspaces`: `apps/api`, `apps/web`, `packages/shared`.

**Alternativas descartadas.**

- _Dois repositórios separados_ — dobraria o setup na avaliação e impediria o pacote comum.
- _Turborepo / Nx_ — trazem cache e orquestração que este projeto não precisa, ao custo de
  uma camada de configuração a mais para explicar no vídeo.

**Consequência.** Um `npm install` na raiz resolve tudo. Em troca, o `@circula/shared`
precisa ser compilado antes dos apps — por isso `npm run dev` roda `build:shared` primeiro.

---

## ADR 002 — Express 5 no lugar de Fastify

**Contexto.** A recomendação inicial da IA foi Fastify, pelos plugins oficiais de JWT,
Swagger e rate limit.

**Decisão.** **Express 5**, por experiência prévia do desenvolvedor.

**Justificativa.** O critério de avaliação mais pesado do edital é _"capacidade de explicar o
próprio código com propriedade"_. Um framework já dominado permite defender cada middleware
na banca; um framework novo criaria dependência da IA até para justificar as escolhas.

**O que ganhamos com o Express 5 especificamente.** Erros lançados dentro de handlers `async`
são encaminhados automaticamente ao middleware de erro. No Express 4 seria necessário
envolver cada rota em `try/catch` ou num wrapper `asyncHandler`.

**Consequência aceita.** JWT, documentação OpenAPI e rate limit exigem bibliotecas avulsas em
vez de plugins de primeira parte. É mais código nosso — o que, neste contexto, é vantagem de
autoria.

---

## ADR 003 — Validação com Zod, uma vez, para os dois lados

**Contexto.** O edital pontua "validação de campos obrigatórios" como diferencial, e o
formulário do PWA precisa validar as mesmas regras antes de enviar.

**Decisão.** Schemas Zod declarados em `@circula/shared` e importados pela API e pelo PWA.

**Consequência.** Uma regra como "doação não pode ter preço" existe em **um único lugar**.
O `z.infer` gera os tipos TypeScript automaticamente — schema e tipo nunca divergem.

---

## ADR 004 — Variáveis de ambiente validadas no boot (fail fast)

**Decisão.** `apps/api/src/config/env.ts` valida `process.env` com Zod na inicialização e
chama `process.exit(1)` se algo estiver errado.

**Justificativa.** Sem isso, um `DATABASE_URL` ausente só explodiria na primeira requisição
que tocasse o banco — provavelmente em produção, durante a demonstração. Falhar no boot
transforma um bug de runtime em erro de configuração óbvio.

---

## ADR 005 — Erros de negócio desacoplados do HTTP

**Decisão.** Services lançam `AppError('NOT_FOUND', ...)`. Um único middleware
(`middlewares/error-handler.ts`) traduz código semântico em status HTTP e monta o envelope
`{ error: { code, message, details } }`.

**Consequência.** Regra de negócio fica testável sem subir servidor, e **toda** resposta de
erro da API tem o mesmo formato — inclusive rotas inexistentes, que sem o `notFoundHandler`
devolveriam o HTML padrão "Cannot GET /x" e violariam o requisito de "JSON estritamente".

---

## ADR 006 — `app.ts` separado de `server.ts`

**Decisão.** `createApp()` monta a aplicação; `server.ts` chama `listen()`.

**Justificativa.** Permite que o Supertest exercite as rotas sem ocupar porta de rede. Os
testes rodam em milissegundos e em paralelo, sem risco de conflito de porta no CI.

---

## ADR 007 — PostgreSQL em nuvem (Neon) em vez de SQLite

**Contexto.** O edital aceita SQLite ou memória, mas lista "banco relacional real em container
ou nuvem" como diferencial.

**Decisão.** PostgreSQL gerenciado no **Neon**, mesmo em desenvolvimento.

**Justificativa.** Desenvolver em SQLite e publicar em Postgres cria divergência de
comportamento (tipos, enums nativos, case-sensitivity) que só aparece no deploy. Usar o mesmo
banco nos dois ambientes elimina a classe inteira de bugs "funciona na minha máquina".

**Consequência.** Exige conexão com a internet para desenvolver. Para quem clonar o
repositório sem conta no Neon, um `docker-compose.yml` sobe um Postgres local equivalente.

---

## ADR 008 — TypeScript fixado em 5.9.3

**Contexto.** A versão mais recente publicada no npm é a 7.x.

**Decisão.** Fixar `typescript@5.9.3` (sem `^`).

**Justificativa.** O `typescript-eslint@8` declara peer dependency `typescript >=4.8.4 <6.1.0`.
Instalar a 7.x quebraria o lint de todo o monorepo. Ficar na última versão estável coberta
pelo ecossistema vale mais que estar na ponta.

---

## ADR 009 — Porta local 4000

**Decisão.** A API roda em `localhost:4000` em desenvolvimento.

**Justificativa.** A 3333 é o padrão de muitos projetos Node. Durante a Sprint 0 outro
projeto na mesma máquina já ocupava essa porta e respondia `200 OK` ao `/health` do Circula —
com o corpo de outra aplicação. Um conflito que se disfarça de sucesso é pior que um erro.

---

## Convenções de código

| Tema               | Convenção                                                              |
| ------------------ | ---------------------------------------------------------------------- |
| Módulos            | ESM puro (`"type": "module"`), imports relativos com extensão `.js`    |
| Nomes de arquivo   | `kebab-case.ts`; componentes React em `PascalCase.tsx`                 |
| Organização da API | Por recurso (`modules/announcements/`), não por camada técnica         |
| Dinheiro           | Sempre inteiro em centavos, nunca `float`                              |
| Exclusão           | Lógica (`deletedAt`), nunca física                                     |
| Idioma             | Código e identificadores em inglês; domínio, comentários e UI em pt-BR |
