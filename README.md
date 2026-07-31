# 🌱 Circula — Marketplace de Economia Circular do Campus

> Plataforma web/PWA onde estudantes doam, vendem e trocam livros, jalecos, calculadoras,
> componentes eletrônicos e materiais universitários — dando uma segunda vida ao que sobra
> de um semestre e barateando a entrada de quem está chegando.

Projeto desenvolvido para o **Desafio Técnico do Laboratório de Inovação Vortex (UNIFOR)** —
Processo Seletivo para Estágio Full-Stack 2026.

<!-- prettier-ignore -->
| | |
|---|---|
| **Status** | 🚧 Em desenvolvimento — Sprint 0 concluída |
| **Landing (produção)** | _a publicar na Sprint 6_ |
| **API (produção)** | _a publicar na Sprint 6_ |
| **Documentação da API** | _a publicar na Sprint 1_ |

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

- ⬜ Apresentação da proposta de economia circular no campus
- ⬜ Estatísticas do sistema (itens ativos, doações realizadas, usuários)
- ⬜ Vitrine com os últimos itens anunciados
- ⬜ Filtros por categoria (Livros, Engenharia, Computação, …)
- ⬜ CTAs para anunciar e para buscar itens

**Aplicativo PWA (mobile)**

- ⬜ Instalação na tela inicial (Android/iOS/desktop)
- ⬜ Cadastro e login
- ⬜ Formulário de anúncio (título, descrição, categoria, preço ou doação, URL de imagem)
- ⬜ Meus anúncios — editar e excluir
- ⬜ Funcionamento offline dos dados já carregados

**API REST**

- ✅ Envelope JSON padronizado, inclusive em erros
- ✅ Rota de health check
- ⬜ CRUD de anúncios com filtros e paginação
- ⬜ Autenticação JWT com regra de propriedade

---

## 🛠 Stack

### Backend — `apps/api`

| Tecnologia                             | Papel                                            |
| -------------------------------------- | ------------------------------------------------ |
| **Node.js 22+**                        | Runtime                                          |
| **TypeScript 5.9**                     | Tipagem estática em modo `strict`                |
| **Express 5**                          | Framework HTTP                                   |
| **Zod 4**                              | Validação de entrada e das variáveis de ambiente |
| **Prisma 6**                           | ORM e migrations _(Sprint 1)_                    |
| **PostgreSQL (Neon)**                  | Banco relacional em nuvem _(Sprint 1)_           |
| **JWT + bcryptjs**                     | Autenticação _(Sprint 2)_                        |
| **Helmet · CORS · express-rate-limit** | Camada de segurança HTTP                         |
| **Pino**                               | Log estruturado                                  |
| **Vitest + Supertest**                 | Testes de integração das rotas                   |

### Frontend — `apps/web`

| Tecnologia           | Papel                                   |
| -------------------- | --------------------------------------- |
| **React 19**         | Biblioteca de interface                 |
| **TypeScript 5.9**   | Tipagem estática                        |
| **Vite 8**           | Build e dev server                      |
| **Tailwind CSS 4**   | Estilo e design tokens                  |
| **React Router 8**   | Roteamento _(Sprint 3)_                 |
| **TanStack Query 5** | Cache de dados do servidor _(Sprint 3)_ |
| **React Hook Form**  | Formulários _(Sprint 4)_                |
| **vite-plugin-pwa**  | Manifesto e Service Worker _(Sprint 5)_ |

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
│  │  ├─ src/
│  │  │  ├─ server.ts           # sobe o HTTP e trata SIGTERM
│  │  │  ├─ app.ts              # monta o Express (sem escutar porta)
│  │  │  ├─ config/env.ts       # variáveis de ambiente validadas com Zod
│  │  │  ├─ middlewares/        # error handler global, 404
│  │  │  ├─ modules/            # uma pasta por recurso do domínio
│  │  │  │  └─ health/
│  │  │  └─ shared/             # AppError, logger
│  │  └─ tests/                 # testes de integração (Vitest + Supertest)
│  └─ web/                      # PWA (React 19 + Vite)
│     ├─ src/
│     │  ├─ lib/api-client.ts   # único ponto que fala HTTP com a API
│     │  ├─ styles/global.css   # design tokens do Tailwind v4
│     │  └─ App.tsx
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
   → rota  →  validação Zod  →  service (regra de negócio)  →  Prisma
   → resposta JSON
        ↓ (em caso de erro, em qualquer ponto)
   errorHandler  →  { "error": { "code", "message", "details" } }
```

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
git clone https://github.com/SEU-USUARIO/circula.git
cd circula
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

Os valores padrão já funcionam para desenvolvimento local. As variáveis estão comentadas
uma a uma dentro dos arquivos `.env.example`.

### 4. Subir tudo

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

---

## 🔌 API REST

Base local: `http://localhost:4000` · Prefixo versionado: `/api/v1`

### Endpoints

| Método | Rota               | Auth | Descrição                       |
| ------ | ------------------ | ---- | ------------------------------- |
| `GET`  | `/health`          | —    | Status do serviço               |
| `GET`  | `/health/contract` | —    | Enums de domínio compartilhados |

> As rotas de anúncios (`/api/v1/announcements`) chegam na Sprint 1 e as de autenticação
> (`/api/v1/auth`) na Sprint 2. Esta tabela é atualizada a cada sprint.

### Formato das respostas

Sucesso:

```json
{ "status": "ok", "service": "circula-api", "version": "0.1.0" }
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

---

## ☁️ Deploy

| Camada | Serviço | Status     |
| ------ | ------- | ---------- |
| PWA    | Vercel  | _Sprint 6_ |
| API    | Render  | _Sprint 6_ |
| Banco  | Neon    | _Sprint 1_ |

---

## 🤖 Diário de Bordo da IA

> Seção obrigatória conforme a Seção 3 do edital. É atualizada ao final de cada sprint, com
> registro bruto em [`docs/ai-logbook/`](docs/ai-logbook/).

### 1. Ferramentas utilizadas

| Ferramenta                      | Uso principal                                                        | Sprints |
| ------------------------------- | -------------------------------------------------------------------- | ------- |
| **Claude Opus 5 (Claude Code)** | Discussão de arquitetura, scaffolding do monorepo, revisão de código | 0 →     |

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

**Prompt #3 — _a preencher na Sprint 1_** (debug de um problema real)

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

---

## 🗺 Roadmap por sprint

| Sprint | Entrega                                                         | Status |
| ------ | --------------------------------------------------------------- | ------ |
| **0**  | Monorepo, TypeScript strict, lint, CI, ambiente rodando         | ✅     |
| **1**  | Modelagem, Prisma + PostgreSQL, CRUD de anúncios, filtros, docs | 🚧     |
| **2**  | Autenticação JWT, regra de propriedade, validação robusta       | ⬜     |
| **3**  | Landing Page desktop com vitrine e filtros                      | ⬜     |
| **4**  | App mobile: criar anúncio, meus anúncios, detalhe               | ⬜     |
| **5**  | PWA: manifesto, Service Worker, offline, instalação             | ⬜     |
| **6**  | Deploy da API e do PWA + hardening de produção                  | ⬜     |
| **7**  | README final, Diário de Bordo consolidado e vídeo               | ⬜     |

Relatório técnico detalhado de cada sprint: [`docs/walkthrough/`](docs/walkthrough/).

---

## 👤 Autor

**Francisco Magno Quezado**
Candidato ao Estágio Full-Stack — Laboratório de Inovação Vortex (UNIFOR), 2026.

---

<sub>Licença MIT — veja [LICENSE](LICENSE).</sub>
