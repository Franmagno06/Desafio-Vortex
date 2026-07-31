# Sprint 0 — Fundação

**Data:** 31/07/2026 · **Duração:** 1 dia · **Status:** ✅ concluída

> Relatório técnico de estudo. A ideia não é listar arquivos, e sim explicar **o que cada peça
> faz, por que ela existe e o que você precisa saber para defendê-la na banca**.
> Ao final há uma bateria de testes manuais para você rodar com as próprias mãos.

---

## 1. Objetivo da sprint

Montar o esqueleto do projeto de forma que, do segundo dia em diante, **toda energia vá para o
produto e nenhuma para configuração**. Nenhuma funcionalidade do marketplace foi implementada
aqui — o entregável é o ambiente de pé, tipado, testado e com padrão de erro definido.

---

## 2. O que foi entregue

| Item                                                | Onde                                  |
| --------------------------------------------------- | ------------------------------------- |
| Monorepo com npm workspaces (3 pacotes)             | `package.json`                        |
| TypeScript em modo `strict` compartilhado           | `tsconfig.base.json`                  |
| ESLint 10 (flat config) + Prettier integrados       | `eslint.config.js`                    |
| Vocabulário do domínio (categorias, tipos, status)  | `packages/shared/src/domain/enums.ts` |
| Helpers de dinheiro e paginação                     | `packages/shared/src/`                |
| API Express 5 com segurança, log e envelope de erro | `apps/api/src/app.ts`                 |
| Validação das variáveis de ambiente no boot         | `apps/api/src/config/env.ts`          |
| Encerramento gracioso (SIGTERM)                     | `apps/api/src/server.ts`              |
| 4 testes de integração passando                     | `apps/api/tests/health.test.ts`       |
| PWA React 19 + Vite 8 + Tailwind v4                 | `apps/web/`                           |
| Cliente HTTP com erros tipados                      | `apps/web/src/lib/api-client.ts`      |
| Tela de diagnóstico da conexão                      | `apps/web/src/App.tsx`                |

---

## 3. Conceitos para estudar

### 3.1 Monorepo com npm workspaces

**O que é.** Um repositório contendo vários pacotes independentes. O campo `workspaces` no
`package.json` da raiz diz ao npm quais pastas são pacotes:

```json
"workspaces": ["packages/*", "apps/*"]
```

**O que acontece na prática.** Um `npm install` na raiz instala as dependências de todos os
pacotes numa `node_modules` única (_hoisting_) e cria um **link simbólico** de
`node_modules/@circula/shared` para `packages/shared`. É por isso que `import { CATEGORIES }
from '@circula/shared'` funciona na API e no PWA sem publicar nada no npm.

**Por que importa aqui.** As categorias do marketplace existem em um lugar só. Sem isso, a
lista estaria duplicada no back e no front e um dia divergiria.

> **Na banca:** _"como o front e o back compartilham as mesmas regras?"_ →
> workspaces + pacote `@circula/shared` linkado simbolicamente.

---

### 3.2 ESM, `NodeNext` e a extensão `.js` nos imports

Repare neste import dentro de um arquivo **TypeScript**:

```ts
import { createApp } from './app.js'; // ← .js, mesmo o arquivo sendo app.ts
```

Não é erro. O projeto usa **ESM nativo** (`"type": "module"`). No ESM, diferente do CommonJS,
o caminho do import precisa ser o caminho **real do arquivo em tempo de execução** — e, depois
de compilado, `app.ts` vira `app.js`. O TypeScript com `moduleResolution: "NodeNext"` entende
essa convenção e resolve o `.ts` durante o desenvolvimento.

**Regra prática:** dentro de `apps/api` e `packages/shared`, todo import relativo termina em
`.js`. No `apps/web` isso não vale, porque lá quem resolve os caminhos é o Vite (bundler), não
o Node.

---

### 3.3 O `strict` do TypeScript e o `noUncheckedIndexedAccess`

O `tsconfig.base.json` liga rigor acima do padrão. O mais interessante é:

```jsonc
"noUncheckedIndexedAccess": true
```

Com ele, acessar um array por índice devolve `T | undefined`:

```ts
const primeiro = lista[0]; // tipo: Item | undefined  — o TS te obriga a checar
```

Isso elimina a fonte número um de `TypeError: cannot read property of undefined` em produção.

---

### 3.4 Express 5 — a ordem dos middlewares é a ordem de execução

Em `apps/api/src/app.ts`, cada `app.use()` empilha um middleware. Uma requisição atravessa a
pilha **de cima para baixo**. A ordem não é estética, é funcional:

| Ordem | Middleware        | Por que está nessa posição                                                                 |
| ----- | ----------------- | ------------------------------------------------------------------------------------------ |
| 1     | `trust proxy`     | Precisa valer antes do rate limit, senão todo mundo compartilharia o IP do proxy da Render |
| 2     | `helmet`          | Cabeçalhos de segurança em toda resposta, inclusive nas de erro                            |
| 3     | `cors`            | Barra a origem não autorizada antes de gastar processamento                                |
| 4     | `express.json`    | Só depois de autorizado vale a pena desserializar o corpo                                  |
| 5     | `pino-http`       | Loga a requisição já validada                                                              |
| 6     | `rateLimit`       | Contabiliza por IP                                                                         |
| 7     | rotas             | —                                                                                          |
| 8     | `notFoundHandler` | Só chega aqui quem não casou com nenhuma rota                                              |
| 9     | `errorHandler`    | Precisa ser o último para capturar tudo                                                    |

**Duas particularidades do Express 5 que valem ouro no vídeo:**

1. **Erros de funções `async` são propagados automaticamente.** No Express 4, uma `Promise`
   rejeitada dentro de uma rota simplesmente travava a requisição até dar timeout — era preciso
   `try/catch` em toda rota. No 5, o framework encaminha ao error handler sozinho.

2. **O error handler é identificado pela aridade.** O Express reconhece um middleware de erro
   porque ele tem **exatamente 4 parâmetros** `(err, req, res, next)`. Se você remover o
   `next` não usado, ele deixa de ser tratado como error handler e para de funcionar. É por
   isso que o parâmetro se chama `_next` no código — o underscore avisa ao ESLint que ele é
   intencionalmente não usado.

---

### 3.5 Fail fast nas variáveis de ambiente

`apps/api/src/config/env.ts` valida `process.env` com Zod **antes** de o servidor subir.

```ts
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error(JSON.stringify(z.treeifyError(parsed.error), null, 2));
  process.exit(1);
}
```

Sem essa checagem, uma variável faltando só apareceria na primeira requisição que dependesse
dela — em produção, na frente do avaliador. Com ela, o processo morre no boot dizendo
exatamente qual variável está errada.

Repare também no `CORS_ORIGINS`: ele chega como string `"a,b"` e o Zod **transforma** em array
durante a validação. Quem consome `env.CORS_ORIGINS` já recebe `string[]`.

---

### 3.6 Erros de negócio desacoplados do HTTP

O padrão adotado tem duas peças:

**`shared/errors.ts`** define `AppError` com um código semântico, e um mapa que traduz código
→ status HTTP:

```ts
throw notFound('Anúncio não encontrado.'); // o service não sabe o que é "404"
```

**`middlewares/error-handler.ts`** é o **único** lugar do projeto que decide status HTTP.
Ele trata três casos, nessa ordem:

1. `ZodError` → 422 com a árvore de erros por campo
2. `AppError` → o status do código semântico
3. qualquer outra coisa → 500 genérico, com a stack **apenas fora de produção**

**Por que separar assim.** A regra de negócio fica testável sem subir servidor, e toda resposta
de erro sai no mesmo formato. O `notFoundHandler` completa o cerco: sem ele, uma rota
inexistente devolveria o HTML `Cannot GET /x` do Express — violando o requisito do edital de
"envio e retorno estritamente no formato JSON".

---

### 3.7 `createApp()` separado do `listen()`

```
app.ts     → createApp(): monta o Express e devolve. Não escuta porta.
server.ts  → chama createApp() e faz listen(). Trata SIGTERM.
```

Essa separação existe para os testes: o Supertest recebe o app e sobe um servidor efêmero em
porta aleatória. Nenhum teste ocupa a 4000, e vários podem rodar em paralelo.

**Graceful shutdown.** Quando a Render faz um deploy novo, ela envia `SIGTERM` ao processo
antigo. O handler em `server.ts` para de aceitar conexões novas, espera as requisições em voo
terminarem e só então sai — em vez de derrubar usuários no meio de uma resposta.

---

### 3.8 Tailwind v4 — o tema mora no CSS

Mudança grande em relação ao Tailwind v3: **não existe mais `tailwind.config.js`**. O tema é
declarado no CSS com `@theme`, em `apps/web/src/styles/global.css`:

```css
@theme {
  --color-brand-600: #0d9488;
}
```

Cada variável vira utilitário automaticamente: `bg-brand-600`, `text-brand-600`,
`border-brand-600`. A integração é um plugin do Vite (`@tailwindcss/vite`) — sem PostCSS.

---

### 3.9 Testes de integração com Vitest + Supertest

```ts
const response = await request(app).get('/health');
expect(response.status).toBe(200);
```

São testes **de integração**, não unitários: a requisição atravessa a pilha inteira de
middlewares. Um deles verifica algo que o edital cobra explicitamente:

```ts
expect(response.headers['content-type']).toMatch(/application\/json/);
```

---

## 4. 🔬 Testes manuais — faça você mesmo

> Rode cada bloco e confira o resultado esperado. O objetivo é você **ver** o comportamento,
> não confiar no meu relato.

### Preparação

```powershell
cd "C:\Users\franm\OneDrive\Desktop\Desafio Vortex"
npm run dev
```

Deixe rodando e abra **outro terminal** para os testes abaixo.

---

### Teste 1 — A API responde?

```powershell
Invoke-RestMethod http://localhost:4000/health | ConvertTo-Json
```

✅ **Esperado:** `status: ok`, `service: circula-api`, um `uptimeSeconds` que cresce a cada
chamada.

❓ **Pergunte-se:** por que `/health` fica fora do prefixo `/api/v1`?
_(Porque é infraestrutura, não domínio. A Render chama essa rota para saber se o serviço subiu
e ela não deve mudar quando a API versionar para `/api/v2`.)_

---

### Teste 2 — O pacote compartilhado está realmente linkado?

```powershell
Invoke-RestMethod http://localhost:4000/health/contract | ConvertTo-Json
```

✅ **Esperado:** as 8 categorias e os 3 tipos de negociação.

❓ **Prove para você mesmo:** abra `packages/shared/src/domain/enums.ts`, adicione
`'INSTRUMENTOS'` ao array `CATEGORIES` e ao `CATEGORY_META`, salve e rode:

```powershell
npm run build:shared
```

Reinicie o `npm run dev` e chame a rota de novo — a categoria nova aparece **na API e na tela
do navegador ao mesmo tempo**. Depois desfaça a mudança.

---

### Teste 3 — Rota inexistente devolve JSON (não HTML)

```powershell
try { Invoke-RestMethod http://localhost:4000/nao-existe } catch { $_.ErrorDetails.Message }
```

✅ **Esperado:**

```json
{ "error": { "code": "NOT_FOUND", "message": "Rota não encontrada: GET /nao-existe" } }
```

❓ **Experimente:** comente a linha `app.use(notFoundHandler)` em `apps/api/src/app.ts`, salve
e repita. Você verá o HTML `Cannot GET /nao-existe` — exatamente o que o edital proíbe.
Descomente depois.

---

### Teste 4 — O CORS está mesmo bloqueando?

```powershell
curl.exe -i -H "Origin: http://site-malicioso.com" http://localhost:4000/health
```

✅ **Esperado:** status **403** com `"code":"FORBIDDEN"`.

Agora com a origem autorizada:

```powershell
curl.exe -i -H "Origin: http://localhost:5173" http://localhost:4000/health
```

✅ **Esperado:** **200** e o cabeçalho `Access-Control-Allow-Origin: http://localhost:5173`.

❓ **Entenda:** o CORS é uma proteção **do navegador**. Por isso o `curl` sem cabeçalho
`Origin` passa normalmente — e por isso o código trata `!origin` como permitido (Postman,
Insomnia e chamadas servidor-a-servidor não enviam `Origin`).

---

### Teste 5 — O fail fast funciona?

Abra `apps/api/.env`, troque `PORT=4000` por `PORT=abacaxi` e salve.

✅ **Esperado:** o processo da API morre imediatamente com uma árvore de erro apontando
`PORT`, em vez de subir e falhar depois.

Volte para `PORT=4000`.

---

### Teste 6 — O front lida com a API fora do ar?

Com tudo rodando, mate **só** a API:

```powershell
Get-NetTCPConnection -LocalPort 4000 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

Recarregue http://localhost:5173.

✅ **Esperado:** o card mostra "API indisponível" com a mensagem amigável do `NetworkError` —
não uma tela branca nem um erro cru no console.

❓ **Repare no código** (`api-client.ts`): `fetch` **só rejeita** em falha de rede. Um 404 ou
500 resolve normalmente e precisa ser checado com `response.ok`. Confundir esses dois casos é
um dos erros mais comuns com `fetch`.

Suba tudo de novo com `npm run dev`.

---

### Teste 7 — A suíte automatizada

```powershell
npm test
```

✅ **Esperado:** 4 testes passando.

```powershell
npm run typecheck
```

✅ **Esperado:** silêncio (nenhum erro é a saída de sucesso).

```powershell
npm run lint
```

✅ **Esperado:** silêncio também.

---

## 5. Problemas reais enfrentados nesta sprint

| #   | Sintoma                                                        | Causa raiz                                                                                  | Correção                                                                                     |
| --- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | `npm install` falhou com `ETARGET`                             | `@eslint/js@^10.8.0` não existe — a IA assumiu que ele acompanharia a numeração do `eslint` | Conferido com `npm view @eslint/js version` → fixado em `^10.0.1`                            |
| 2   | `tsc`: _"This expression is not callable"_ em `pino-http`      | Sob ESM, o `default` de um pacote CommonJS é o `module.exports` inteiro, não a função       | Trocado para import nomeado: `import { pinoHttp } from 'pino-http'`                          |
| 3   | `/health` devolvia `200 OK` com `"service":"portfoliolab-api"` | Outro projeto seu ocupava a porta 3333 desde 29/07                                          | Diagnóstico com `Get-NetTCPConnection -LocalPort 3333`; Circula movido para a porta **4000** |
| 4   | Risco de lint quebrado no monorepo                             | `typescript@7.x` é a versão mais recente, mas `typescript-eslint@8` exige `<6.1.0`          | TypeScript fixado em `5.9.3` (sem `^`)                                                       |

O item **3** é o mais instrutivo: a resposta era `200 OK`, mas vinha do servidor errado. Um
teste que verificasse apenas o status HTTP teria passado. Foi o campo `service` no corpo que
denunciou.

---

## 6. Perguntas que a banca pode fazer

<details>
<summary><b>"Por que Express e não outro framework?"</b></summary>

Experiência prévia. O critério mais pesado do edital é explicar o próprio código com
propriedade — um framework que eu já domino me deixa defender cada middleware. Além disso, o
Express 5 traz propagação automática de erros em handlers `async`, que elimina o `try/catch`
repetido em toda rota.

</details>

<details>
<summary><b>"Como você garante que back e front não divergem?"</b></summary>

Pelo pacote `@circula/shared`, linkado via npm workspaces. Enums, schemas Zod e helpers ficam
lá. A rota `/health/contract` existe justamente para provar isso em tempo de execução.

</details>

<details>
<summary><b>"O que acontece se um erro inesperado estourar numa rota?"</b></summary>

O Express 5 encaminha ao `errorHandler`, que loga o erro completo com Pino e responde
`500 INTERNAL_ERROR` sem vazar a stack trace em produção — stack trace é superfície de ataque.

</details>

<details>
<summary><b>"Por que dinheiro em centavos?"</b></summary>

Porque `0.1 + 0.2 !== 0.3` em ponto flutuante. Guardando `1990` como inteiro em vez de `19.90`,
a classe inteira de bugs de arredondamento em preço deixa de existir. A formatação para
`R$ 19,90` acontece só na exibição, em `formatPrice()`.

</details>

---

## 7. Próxima sprint

**Sprint 1 — Núcleo do backend:** modelagem no Prisma, banco PostgreSQL no Neon, seed com
dados realistas, CRUD completo de anúncios com filtros e paginação, rotas `/stats` e
`/categories`, e documentação OpenAPI. Ao final, **todos os requisitos obrigatórios de backend
do edital estarão fechados**.
