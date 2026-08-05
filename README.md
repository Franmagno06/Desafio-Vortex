# 🌱 Circula — Marketplace de Economia Circular do Campus

> Plataforma web/PWA onde estudantes doam, vendem e trocam livros, jalecos, calculadoras,
> componentes eletrônicos e materiais universitários — dando uma segunda vida ao que sobra
> de um semestre e barateando a entrada de quem está chegando.

Projeto desenvolvido para o **Desafio Técnico do Laboratório de Inovação Vortex (UNIFOR)** —
Processo Seletivo para Estágio Full-Stack 2026.

<!-- prettier-ignore -->
| | |
|---|---|
| **Status** | 🚧 Sprint 6 concluída — publicação pendente |
| **Landing (produção)** | _aguardando publicação na Vercel_ |
| **API (produção)** | _aguardando publicação na Render_ |
| **Documentação da API** | OpenAPI 3.1 interativo em `/docs` |

---

## 📑 Índice

- [O problema](#-o-problema)
- [Funcionalidades](#-funcionalidades)
- [Stack](#-stack)
- [Arquitetura](#-arquitetura)
- [Como rodar localmente](#-como-rodar-localmente)
- [Scripts disponíveis](#-scripts-disponíveis)
- [API REST](#-api-rest)
- [Testes](#-testes)
- [Deploy](#-deploy)
- [🤖 Diário de Bordo da IA](#-diário-de-bordo-da-ia)
- [Roadmap por sprint](#-roadmap-por-sprint)
- [Autor](#-autor)

---

## 🎯 O problema

Todo fim de semestre o mesmo ciclo se repete no campus: calouros gastando caro em livros que
veteranos vão descartar, jalecos comprados para uma única disciplina, calculadoras científicas
paradas na gaveta. O material existe — o que falta é um canal confiável que conecte quem tem
com quem precisa, **dentro da própria universidade**.

O **Circula** é esse canal. Uma vitrine pública para descoberta no desktop e um aplicativo
instalável no celular para anunciar em menos de um minuto.

---

## ✨ Funcionalidades

> A lista evolui a cada sprint. ✅ pronto · 🚧 em andamento · ⬜ planejado

**Landing Page pública (desktop)**

- ✅ Apresentação da proposta de economia circular no campus
- ✅ Estatísticas do sistema — **reais**, contadas no banco
- ✅ Vitrine com os últimos itens anunciados
- ✅ Filtros por categoria, com contagem em cada chip
- ✅ CTAs para anunciar e para buscar itens
- ✅ Skeletons, estado vazio, estado de erro e transições suaves
- ✅ Responsividade completa (4 colunas no desktop, 1 no mobile)

**Aplicativo PWA (mobile)**

- ✅ Instalação na tela inicial (Android/iOS/desktop)
- ✅ Cadastro e login com JWT
- ✅ Formulário de anúncio (título, descrição, categoria, preço ou doação, URL de imagem)
- ✅ Campo de preço some quando o tipo é doação ou troca
- ✅ Pré-visualização da imagem antes de publicar
- ✅ Meus anúncios — com exclusão
- ✅ Barra de navegação inferior (experiência de app nativo)
- ✅ Busca com debounce, paginação e detalhe do anúncio
- ✅ Funcionamento offline dos dados já carregados
- ✅ Service Worker autoral com 6 estratégias de cache
- ✅ Background Sync: publica offline e reenvia ao voltar a rede

**API REST**

- ✅ Envelope JSON padronizado, inclusive em erros
- ✅ Health check raso (`/health`) e profundo (`/health/ready`)
- ✅ CRUD completo de anúncios com filtros, busca e paginação
- ✅ Regra de negócio: doação e troca não têm preço
- ✅ Exclusão lógica (soft delete) — nada é apagado de verdade
- ✅ Estatísticas e catálogo de categorias com contagem
- ✅ Documentação OpenAPI 3.1 interativa em `/docs`
- ✅ Autenticação JWT (bcrypt, 7 dias de validade)
- ✅ Regra de propriedade: só o dono edita ou exclui
- ✅ Rate limit reforçado no login e proteção contra timing attack

---

## 🛠 Stack

### Backend — `apps/api`

| Tecnologia                             | Papel                                            |
| -------------------------------------- | ------------------------------------------------ |
| **Node.js 22+**                        | Runtime                                          |
| **TypeScript 5.9**                     | Tipagem estática em modo `strict`                |
| **Express 5**                          | Framework HTTP                                   |
| **Zod 4**                              | Validação de entrada e das variáveis de ambiente |
| **Prisma 6**                           | ORM, migrations e seed                           |
| **PostgreSQL (Neon)**                  | Banco relacional em nuvem                        |
| **swagger-ui-express**                 | Documentação interativa em `/docs`               |
| **jsonwebtoken + bcryptjs**            | Autenticação e hash de senha                     |
| **Helmet · CORS · express-rate-limit** | Camada de segurança HTTP                         |
| **Pino**                               | Log estruturado                                  |
| **Vitest + Supertest**                 | Testes de integração das rotas                   |

### Frontend — `apps/web`

| Tecnologia           | Papel                                       |
| -------------------- | ------------------------------------------- |
| **React 19**         | Biblioteca de interface                     |
| **TypeScript 5.9**   | Tipagem estática                            |
| **Vite 8**           | Build e dev server                          |
| **Tailwind CSS 4**   | Estilo e design tokens                      |
| **React Router 8**   | Roteamento e layouts aninhados              |
| **TanStack Query 5** | Cache de dados do servidor                  |
| **React Hook Form**  | Formulários (com os schemas Zod)            |
| **vite-plugin-pwa**  | Manifesto e Service Worker (injectManifest) |

### Compartilhado — `packages/shared`

Enums de domínio, schemas Zod e helpers usados **pelos dois lados**. A mesma regra que valida
no navegador é a que valida no servidor.

---

## 🏗 Arquitetura

Monorepo com **npm workspaces** — um único `npm install` na raiz instala tudo.

```
circula/
├─ apps/
│  ├─ api/                      # API REST (Express 5 + TypeScript)
│  │  ├─ prisma/
│  │  │  ├─ schema.prisma       # modelo de dados (fonte da verdade)
│  │  │  ├─ migrations/         # SQL versionado
│  │  │  └─ seed.ts             # 6 usuários + 28 anúncios realistas
│  │  ├─ src/
│  │  │  ├─ server.ts           # sobe o HTTP e trata SIGTERM
│  │  │  ├─ app.ts              # monta o Express (sem escutar porta)
│  │  │  ├─ config/env.ts       # variáveis de ambiente validadas com Zod
│  │  │  ├─ docs/openapi.ts     # OpenAPI gerado a partir dos schemas Zod
│  │  │  ├─ lib/prisma.ts       # cliente único (singleton)
│  │  │  ├─ middlewares/        # validação, identificação, erros, 404
│  │  │  ├─ modules/            # uma pasta por recurso do domínio
│  │  │  │  ├─ announcements/   # routes · service · repository · mapper
│  │  │  │  ├─ catalog/         # categorias, opções e estatísticas
│  │  │  │  └─ health/
│  │  │  └─ shared/             # AppError, logger
│  │  └─ tests/                 # integração (Vitest + Supertest, sem banco)
│  └─ web/                      # PWA (React 19 + Vite)
│     ├─ src/
│     │  ├─ app/router.tsx      # rotas, layouts e proteção de sessão
│     │  ├─ components/
│     │  │  ├─ ui/              # Button, Badge, Skeleton, Field, Toast
│     │  │  └─ layout/          # Header, Footer, BottomNav
│     │  ├─ features/
│     │  │  ├─ announcements/   # api · hooks · mutations · card · filtros
│     │  │  └─ auth/            # contexto de sessão, storage do token
│     │  ├─ pages/
│     │  │  ├─ landing/         # Hero, Stats, HowItWorks, Showcase
│     │  │  ├─ auth/            # login e cadastro
│     │  │  └─ app/             # home, anunciar, meus anúncios, perfil
│     │  ├─ lib/
│     │  │  ├─ api-client.ts    # único ponto que fala HTTP com a API
│     │  │  ├─ query-client.ts  # cache e chaves do TanStack Query
│     │  │  └─ query-state.ts   # estados de lista (inclui o "pausado")
│     │  ├─ sw.ts               # ⭐ Service Worker autoral
│     │  └─ styles/global.css   # design tokens do Tailwind v4
│     ├─ public/icons/          # ícones do PWA (any + maskable)
│     └─ index.html
├─ packages/
│  └─ shared/                   # contratos comuns (enums, schemas, helpers)
└─ docs/
   ├─ ARCHITECTURE.md           # decisões e diagramas
   ├─ ai-logbook/               # registro bruto do uso de IA
   └─ walkthrough/              # relatório técnico de cada sprint
```

**Fluxo de uma requisição na API:**

```
Requisição
   → helmet (headers de segurança)
   → cors (allowlist de origens)
   → express.json (parse do corpo, limite de 100kb)
   → pino-http (log)
   → rate limit
   → rota
        → validação Zod       (valida E transforma a entrada)
        → service             (regra de negócio, não conhece HTTP)
        → repository          (interface — Prisma em produção, memória nos testes)
        → mapper              (registro do banco → DTO público)
   → resposta JSON
        ↓ (em caso de erro, em qualquer ponto)
   errorHandler  →  { "error": { "code", "message", "details" } }
```

Cada camada só conhece a de baixo. O service não sabe o que é uma resposta HTTP e o
repositório não sabe o que é regra de negócio — é isso que permite testar as regras sem
subir servidor nem banco.

Detalhes e justificativas das escolhas: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## 🚀 Como rodar localmente

### Pré-requisitos

| Ferramenta | Versão mínima | Verificar com   |
| ---------- | ------------- | --------------- |
| Node.js    | 22            | `node -v`       |
| npm        | 10            | `npm -v`        |
| Git        | 2.30          | `git --version` |

### 1. Clonar o repositório

```bash
git clone https://github.com/Franmagno06/Desafio-Vortex.git
cd Desafio-Vortex
```

### 2. Instalar as dependências

Um único comando na raiz instala a API, o PWA e o pacote compartilhado:

```bash
npm install
```

### 3. Configurar as variáveis de ambiente

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

No Windows (PowerShell):

```bash
Copy-Item apps/api/.env.example apps/api/.env; Copy-Item apps/web/.env.example apps/web/.env
```

As variáveis estão comentadas uma a uma dentro dos `.env.example`. Uma delas é
**obrigatória**: `DATABASE_URL`. Sem ela a API se recusa a subir, com uma mensagem
dizendo exatamente o que falta.

### 4. Preparar o banco de dados

Escolha **uma** das opções:

**Opção A — Neon (PostgreSQL em nuvem, gratuito):** crie um projeto em
[neon.tech](https://neon.tech), copie a _connection string_ e cole em
`apps/api/.env` na variável `DATABASE_URL`.

**Opção B — PostgreSQL local via Docker:**

```bash
docker compose up -d
```

Depois use no `.env`: `DATABASE_URL="postgresql://circula:circula@localhost:5432/circula?schema=public"`

Com a variável configurada, crie as tabelas e popule com dados de exemplo:

```bash
npm run db:deploy --workspace @circula/api
```

```bash
npm run db:seed --workspace @circula/api
```

O seed cria 6 usuários e 28 anúncios realistas, e imprime os ids que você deve usar no
cabeçalho `X-User-Id` para testar as rotas protegidas.

### 5. Subir tudo

```bash
npm run dev
```

| Serviço             | URL                          |
| ------------------- | ---------------------------- |
| PWA (frontend)      | http://localhost:5173        |
| API (backend)       | http://localhost:4000        |
| Health check da API | http://localhost:4000/health |

> 💡 A porta **4000** foi escolhida no lugar da 3333 porque esta última é o padrão de muitos
> projetos Node e o conflito silencioso entre dois servidores é difícil de diagnosticar.

Para rodar apenas um dos lados: `npm run dev:api` ou `npm run dev:web`.

---

## 📜 Scripts disponíveis

Todos executados a partir da **raiz** do projeto.

| Comando             | O que faz                                        |
| ------------------- | ------------------------------------------------ |
| `npm run dev`       | Sobe API + PWA simultaneamente                   |
| `npm run dev:api`   | Sobe só a API (`tsx watch`, recarrega ao salvar) |
| `npm run dev:web`   | Sobe só o PWA (Vite)                             |
| `npm run build`     | Build de produção de todos os pacotes            |
| `npm run typecheck` | Checagem de tipos em todos os pacotes            |
| `npm test`          | Roda a suíte de testes                           |
| `npm run lint`      | ESLint em todo o monorepo                        |
| `npm run format`    | Formata o código com Prettier                    |

Scripts de banco (rodam no workspace da API — acrescente `--workspace @circula/api`):

| Comando              | O que faz                                          |
| -------------------- | -------------------------------------------------- |
| `npm run db:deploy`  | Aplica as migrations existentes (produção e setup) |
| `npm run db:migrate` | Cria uma migration nova a partir do schema         |
| `npm run db:seed`    | Popula com 6 usuários e 28 anúncios de exemplo     |
| `npm run db:studio`  | Abre o Prisma Studio para inspecionar as tabelas   |
| `npm run db:reset`   | ⚠️ Apaga tudo, reaplica migrations e roda o seed   |

---

## 🔌 API REST

Base local: `http://localhost:4000` · Prefixo versionado: `/api/v1`

### Endpoints

| Método   | Rota                         | Auth | Descrição                                      |
| -------- | ---------------------------- | ---- | ---------------------------------------------- |
| `POST`   | `/api/v1/auth/register`      | —    | Cria conta e já devolve o token                |
| `POST`   | `/api/v1/auth/login`         | —    | Troca e-mail e senha por um token              |
| `GET`    | `/api/v1/auth/me`            | 🔒   | Dados do usuário autenticado                   |
| `GET`    | `/api/v1/announcements`      | —    | Vitrine pública, com filtros e paginação       |
| `POST`   | `/api/v1/announcements`      | 🔒   | Cria um anúncio                                |
| `GET`    | `/api/v1/announcements/mine` | 🔒   | Meus anúncios                                  |
| `GET`    | `/api/v1/announcements/:id`  | —    | Detalha um anúncio                             |
| `PATCH`  | `/api/v1/announcements/:id`  | 🔒   | Atualiza parcialmente (apenas o dono)          |
| `DELETE` | `/api/v1/announcements/:id`  | 🔒   | Exclusão lógica (apenas o dono)                |
| `GET`    | `/api/v1/categories`         | —    | Categorias com contagem de anúncios ativos     |
| `GET`    | `/api/v1/catalog`            | —    | Opções de formulário (categoria/tipo/estado)   |
| `GET`    | `/api/v1/stats`              | —    | Estatísticas reais da plataforma               |
| `GET`    | `/health`                    | —    | Status do serviço (não toca o banco)           |
| `GET`    | `/health/ready`              | —    | Status do serviço **e** do banco (503 se fora) |
| `GET`    | `/docs`                      | —    | Documentação interativa (Swagger UI)           |
| `GET`    | `/openapi.json`              | —    | Especificação OpenAPI 3.1                      |

**Filtros da listagem:** `?category=` `?type=` `?condition=` `?status=` `?q=` `?sort=`
`?page=` `?limit=`

> 🔒 Rotas protegidas exigem `Authorization: Bearer <token>`. Obtenha o token em
> `/api/v1/auth/login` — ou clique em **Authorize** no [`/docs`](http://localhost:4000/docs)
> e cole lá uma vez só.

**Contas de demonstração** (criadas pelo `db:seed`, todas com a senha `circula2026`):
`ana.lima@edu.unifor.br` · `carlos.souza@edu.unifor.br` · `mariana.costa@edu.unifor.br`

### Regra de negócio central

Doação e troca **não têm preço**. A regra vive em um único arquivo
(`packages/shared/src/domain/rules.ts`) e é aplicada na API e — a partir da Sprint 4 — no
formulário do PWA:

```jsonc
// 422 VALIDATION_ERROR
{ "type": "DOACAO", "priceCents": 5000 }

// ✅ aceito
{ "type": "DOACAO", "priceCents": null }
```

### Formato das respostas

Sucesso:

```json
{ "status": "ok", "service": "circula-api", "version": "0.2.0" }
```

Erro — **sempre** neste envelope, em qualquer rota e qualquer status:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Rota não encontrada: GET /api/v1/foo"
  }
}
```

| `code`             | HTTP | Quando acontece                         |
| ------------------ | ---- | --------------------------------------- |
| `VALIDATION_ERROR` | 422  | Corpo ou query reprovados pelo Zod      |
| `UNAUTHORIZED`     | 401  | Token ausente ou inválido               |
| `FORBIDDEN`        | 403  | Autenticado, mas sem permissão          |
| `NOT_FOUND`        | 404  | Recurso ou rota inexistente             |
| `CONFLICT`         | 409  | Violação de unicidade (e-mail repetido) |
| `RATE_LIMITED`     | 429  | Limite de requisições excedido          |
| `INTERNAL_ERROR`   | 500  | Falha não prevista                      |

---

## 🧪 Testes

```bash
npm test
```

Os testes usam **Vitest + Supertest**. O `createApp()` devolve a aplicação Express sem chamar
`listen()`, então o Supertest sobe um servidor efêmero por teste — nenhuma porta fixa é
ocupada e a suíte roda em milissegundos.

**34 testes rodam sem precisar de um banco de dados.** Isso é possível porque o service
depende de uma _interface_ de repositório, não do Prisma: em produção entra a implementação
Prisma, nos testes uma implementação em memória. É o que permite o CI do GitHub Actions
validar toda a regra de negócio sem subir um PostgreSQL no pipeline.

---

## ☁️ Deploy

| Camada | Serviço | Configuração                                        |
| ------ | ------- | --------------------------------------------------- |
| PWA    | Vercel  | [`vercel.json`](vercel.json)                        |
| API    | Render  | [`render.yaml`](render.yaml) — blueprint versionado |
| Banco  | Neon    | PostgreSQL gerenciado                               |

**Passo a passo completo: [`docs/DEPLOY.md`](docs/DEPLOY.md)** — segredos a configurar,
ordem das etapas (a API antes do PWA, e o CORS por último), keep-alive contra a
hibernação da Render e guia de solução de problemas.

Dois detalhes de produção que valem destacar:

- **`start:prod` aplica as migrations antes de aceitar tráfego.** Nunca existe uma
  janela em que o código é novo e o schema do banco é velho.
- **O `sw.js` é servido com `max-age=0`.** Se o Service Worker fosse cacheado como os
  demais arquivos, o navegador continuaria usando o SW antigo — que serve o app antigo
  do precache — e **nenhum deploy chegaria ao usuário**.

---

## 🤖 Diário de Bordo da IA

> Seção obrigatória conforme a Seção 3 do edital. É atualizada ao final de cada sprint, com
> registro bruto em [`docs/ai-logbook/`](docs/ai-logbook/).

### 1. Ferramentas utilizadas

| Ferramenta                      | Uso principal                                                                            | Sprints |
| ------------------------------- | ---------------------------------------------------------------------------------------- | ------- |
| **Claude Opus 5 (Claude Code)** | Discussão de arquitetura, scaffolding do monorepo, modelagem de dados, revisão de código | 0 → 1   |

_(atualizar conforme outras ferramentas forem entrando)_

### 2. Estratégia de engenharia de prompts

Minha estratégia central foi **não pedir código antes de fechar a arquitetura**. O primeiro
prompt do projeto não pedia implementação nenhuma — pedia um plano que eu pudesse auditar e
autorizar. Isso me deu controle sobre as decisões em vez de receber um projeto pronto que eu
não saberia defender.

**Prompt #1 — Planejamento antes de qualquer linha de código**

```
Esse é um desafio proposto em um processo seletivo que estou participando, o uso de IA é
permitido, leia atentamente o documento, é um desafio de um projeto focada no Marketplace de
Economia Circular do Campus na qual está descrito no documento, leia atentamente cada tópico,
escopo e funcionalidades da telas, requisitos técnicos no backend e frontend, faça um
planejamento sobre stacks a serem utilizadas, arquitetura e estabeleça um plano de ação
dividindo em cada etapa em sprints de desenvolvimento assim a cada etapa concluída, o projeto
deve evoluir. Além disso, é necessário estabelecer um Diário de bordo da IA conforme descrito
no documento para registrar o uso da IA, os prompts utilizados e o link da conversa, crie um
Readme para isso. Me retorne as stacks determinadas e arquitetura definida para eu autorizar
o planejamento e iniciar as sprints.
```

**Prompt #2 — Rejeitando a sugestão da IA com base na minha experiência**

A IA recomendou **Fastify** no backend, argumentando plugins oficiais para JWT e Swagger.
Recusei conscientemente:

```
As stacks acima estão autorizadas mas quero usar o framework express na qual já venho
utilizando em outros projetos [...] a cada sprint finalizada, quero um relatório técnico do
que foi feito e que seja para estudo e anotações para mim, quando possível me fale para eu
realizar testes manuais como testar os métodos CRUD do backend, quero em total imersão e
entendimento do projeto, não só para a realização do vídeo como também para o meu aprendizado.
```

O raciocínio: a banca avalia se **eu** domino o código. Um framework que eu já uso me deixa
explicar cada middleware com segurança; um framework novo me faria depender da IA para
justificar as próprias escolhas. Troquei "elegância técnica" por "autoria defensável".

**Prompt #3 — Exigindo o registro do processo, não só o produto**

```
Tudo pronto pode começar a sprint 1, sempre lembrando de mostrar tópicos do
desenvolvimento do sprint 1 que você considera importante para estudo e obtenção de
conhecimento técnico, no mais continue a registrar no diário de bordo seu desenvolvimento
sa sprint 1, erros e acertos que teve ao longo do caminho. Criei a conta na Neon quando
finalizar o sprint eu mesmo colocar o DATABASE_URL.
```

Duas decisões deliberadas aqui. A primeira: pedir **erros e acertos**, não só o resultado.
Sem isso a IA entrega o código final polido e os bugs do caminho somem — junto com o
aprendizado. A segunda: segurar a `DATABASE_URL` de propósito até o fim da sprint, para ver
como a API se comporta **sem** banco. Foi assim que descobri que `/health` respondia 200
com o Postgres fora, o que motivou criar o `/health/ready` devolvendo 503.

_(O prompt sobre a arquitetura do Service Worker entra aqui na Sprint 5.)_

### 3. Compartilhamento de histórico

> ⚠️ _A preencher — ver `docs/ai-logbook/` para os registros brutos de cada sessão._

### 4. Reflexão crítica

Já na Sprint 0 a IA errou três vezes de formas diferentes, e cada erro ensinou algo sobre
**onde exatamente não confiar nela**:

**a) Alucinação de versão de pacote.** A IA gerou o `package.json` com
`"@eslint/js": "^10.8.0"`. O `npm install` quebrou com `ETARGET — No matching version found`.
Ela havia assumido que o `@eslint/js` seguiria a mesma numeração do `eslint` (10.8.0), mas a
versão real era a **10.0.1**. Lição: modelo de linguagem não consulta o registro do npm — ele
_infere_ números plausíveis. Passei a validar versões com `npm view <pacote> version` antes de
confiar em qualquer `package.json` gerado.

**b) Import incorreto de módulo CommonJS.** O código gerado usava
`import pinoHttp from 'pino-http'`. O TypeScript recusou: `This expression is not callable`.
Sob ESM + `moduleResolution: NodeNext`, o `default` de um pacote CommonJS é o `module.exports`
inteiro — não a função. A correção foi o import nomeado: `import { pinoHttp } from 'pino-http'`.
Esse foi um erro que **só o compilador pegou**; nenhum teste teria detectado antes de rodar.

**c) Conflito de porta silencioso.** O `/health` respondia `200 OK` no navegador, mas com
`"service":"portfoliolab-api"` — a resposta vinha de **outro projeto meu** que ainda estava
rodando na porta 3333 desde dois dias antes. A API do Circula reportava "ouvindo na 3333" sem
nenhum erro. Diagnostiquei com `Get-NetTCPConnection -LocalPort 3333` e movi o projeto para a
porta 4000. Lição: um `200 OK` não prova que você falou com o servidor certo — vale conferir
_quem_ respondeu.

**d) O bug que apagaria preços em produção (Sprint 1).** O schema de criação de anúncio
declarava `priceCents: z.number().nullable().default(null)`, e o de atualização derivava dele
com `.partial()`. Parece seguro — mas **`.partial()` torna o campo opcional sem remover o
default**. Na prática, um `PATCH { "status": "RESERVADO" }` saía do parse como
`{ status: 'RESERVADO', priceCents: null }` e **apagava o preço** de um anúncio de venda sem
ninguém ter pedido.

Peguei isso porque, antes de construir o backend em cima dos schemas, rodei um script
exercitando cada regra e imprimindo o resultado — o caso "PATCH só com status" mostrou
`priceCents: null` na saída. Se eu tivesse lido o código e achado que estava certo, o bug só
apareceria quando um usuário reservasse o próprio anúncio e perdesse o valor. Hoje existe um
teste de regressão fixando esse comportamento.

**e) Código inalcançável que parecia correto (Sprint 1).** O service tinha um bloco explícito
zerando o preço ao converter uma venda em doação. O bloco nunca executava: três linhas acima,
a validação já lançava 422 comparando o tipo novo com o preço antigo. A IA acertou a intenção
e errou a **ordem** — e o código _lia_ como se funcionasse. Só um teste automatizado revelou.
Ficou a lição de que código morto não avisa que é morto; foi preciso reordenar para resolver o
preço final **antes** de validá-lo.

**f) "Funciona na minha máquina" — o CI vermelho por duas sprints (Sprints 2–3).** O pipeline
do GitHub Actions estava falhando enquanto todo o meu portão de qualidade passava localmente.
Duas causas: (1) o `typecheck` quebrava porque o workflow não rodava `prisma generate` — o
cliente tipado do Prisma é um artefato **gerado**, não versionado, e o runner começa do zero;
localmente ele existia porque eu o gerara na Sprint 1; (2) o `format:check` reprovava 6
arquivos que o formatador do editor havia reescrito **depois** do meu check local, antes do
commit. Corrigi adicionando o passo `prisma generate` ao CI e reformatando os arquivos. A
lição mais importante não foi técnica: **eu deveria ter olhado o resultado do CI ao fim da
Sprint 1**, e não descoberto o problema duas sprints depois. CI verde existe para pegar
exatamente o que passa por acidente no ambiente local.

---

## 🗺 Roadmap por sprint

| Sprint | Entrega                                                         | Status |
| ------ | --------------------------------------------------------------- | ------ |
| **0**  | Monorepo, TypeScript strict, lint, CI, ambiente rodando         | ✅     |
| **1**  | Modelagem, Prisma + PostgreSQL, CRUD de anúncios, filtros, docs | ✅     |
| **2**  | Autenticação JWT, regra de propriedade, validação robusta       | ✅     |
| **3**  | Landing Page desktop com vitrine e filtros                      | ✅     |
| **4**  | App mobile: criar anúncio, meus anúncios, detalhe               | ✅     |
| **5**  | PWA: manifesto, Service Worker, offline, instalação             | ✅     |
| **6**  | Deploy da API e do PWA + hardening de produção                  | ✅     |
| **7**  | README final, Diário de Bordo consolidado e vídeo               | 🚧     |

Relatório técnico detalhado de cada sprint: [`docs/walkthrough/`](docs/walkthrough/).

---

## 👤 Autor

**Francisco Magno Quezado**
Candidato ao Estágio Full-Stack — Laboratório de Inovação Vortex (UNIFOR), 2026.

---

<sub>Licença MIT — veja [LICENSE](LICENSE).</sub>
