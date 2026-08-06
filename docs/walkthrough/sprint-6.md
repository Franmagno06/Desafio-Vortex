# Sprint 6 — Deploy e hardening de produção

**Data:** 04/08/2026 · **Publicado em:** 06/08/2026 · **Status:** ✅ configuração pronta e verificada · ✅ **no ar**

**Links de produção:**

|              |                                       |
| ------------ | ------------------------------------- |
| PWA          | https://desafio-vortex-api.vercel.app |
| API          | https://circula-api.onrender.com      |
| Documentação | https://circula-api.onrender.com/docs |

> Relatório técnico de estudo. Esta sprint entrega o **bônus mais forte** do edital
> ("realizar o deploy real da API e do Frontend e disponibilizar os links funcionais").

---

## 1. Objetivo da sprint

Deixar o projeto pronto para publicar com o mínimo de passos manuais, e garantir que o
que roda em produção se comporta de forma **diferente e mais segura** que em
desenvolvimento.

| Item                                            | Status                    |
| ----------------------------------------------- | ------------------------- |
| Blueprint da Render versionado                  | ✅                        |
| Configuração da Vercel                          | ✅                        |
| Scripts de build e start de produção            | ✅                        |
| Migrations aplicadas antes de aceitar tráfego   | ✅                        |
| Keep-alive contra hibernação                    | ✅                        |
| Comportamento de produção verificado localmente | ✅                        |
| **Publicar** (criar contas e serviços)          | ✅ **você** — ver seção 5 |

> **O que eu não faço:** criar contas, logar na Render/Vercel ou cadastrar segredos.
> Isso exige suas credenciais. Toda a configuração está pronta para que publicar seja
> conectar o repositório e colar 4 variáveis — o passo a passo está em
> [`docs/DEPLOY.md`](../DEPLOY.md).

---

## 2. O que foi entregue

| Item                                   | Onde                                                                         |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| Blueprint do serviço da API            | [`render.yaml`](../../render.yaml)                                           |
| Rewrites, headers e cache do PWA       | [`vercel.json`](../../vercel.json)                                           |
| Build e start de produção              | `apps/api/package.json`                                                      |
| Ping periódico contra hibernação       | [`.github/workflows/keep-alive.yml`](../../.github/workflows/keep-alive.yml) |
| Guia completo com solução de problemas | [`docs/DEPLOY.md`](../DEPLOY.md)                                             |
| Correção da URL base do OpenAPI        | `apps/api/src/docs/openapi.ts`                                               |

---

## 3. Conceitos para estudar

### 3.1 Infraestrutura como código

O `render.yaml` descreve o serviço **em código**, em vez de configurá-lo clicando no
painel. Duas vantagens práticas:

- a configuração fica **versionada junto do código** — dá para ver no histórico o que
  mudou e por quê;
- recriar o serviço do zero é apertar um botão, não repetir 15 campos de memória.

O mesmo vale para o `vercel.json`.

Repare no padrão dos segredos:

```yaml
- key: DATABASE_URL
  sync: false # a Render PEDE o valor e o guarda cifrado
```

`sync: false` significa "esta variável existe, mas o valor não está aqui". O arquivo é
público; a senha do banco não pode estar nele.

---

### 3.2 Migrations antes do tráfego

```json
"start:prod": "prisma migrate deploy && node dist/server.js"
```

A ordem importa e resolve um problema real. Se as migrations rodassem **depois** do
servidor subir (ou num passo separado), existiria uma janela de alguns segundos em que
o **código é novo e o schema do banco é velho** — e toda requisição que tocasse a coluna
nova quebraria.

Com `&&`, se a migration falhar o servidor **não sobe**. É melhor um deploy que falha
visivelmente do que um que sobe quebrado.

> `migrate deploy` (produção) ≠ `migrate dev` (desenvolvimento): o primeiro só aplica
> migrations já existentes, nunca gera arquivo novo nem pede confirmação. Rodar
> `migrate dev` em produção poderia **apagar o banco**.

---

### 3.3 Por que o seed **não** roda no deploy

Tentador colocar `db:seed` no start. Seria um erro: o seed é idempotente porque
**apaga e recria** os usuários de exemplo — e, por cascata, os anúncios deles. Rodando a
cada deploy, apagaria dados reais.

O seed roda **uma vez**, manualmente, apontando para o banco de produção.

---

### 3.4 O cache que congela a aplicação

A decisão menos óbvia do `vercel.json`:

```json
{
  "source": "/sw.js",
  "headers": [{ "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }]
}
```

Por que o Service Worker **não pode** ter cache longo:

1. o navegador guardaria o `sw.js` antigo;
2. esse SW antigo serve o app antigo, que está no **precache dele**;
3. resultado: a aplicação fica **congelada numa versão velha** e nenhum deploy chega ao
   usuário — mesmo com o servidor já atualizado.

É um bug especialmente cruel porque não aparece para quem está desenvolvendo (o DevTools
costuma estar com "Update on reload" ligado).

Já os arquivos em `/assets/` podem ter `max-age=31536000, immutable` porque têm **hash
no nome**: quando o conteúdo muda, a URL muda.

---

### 3.5 Variáveis `VITE_*` são públicas e congeladas no build

```
VITE_API_URL=https://circula-api.onrender.com
```

Duas consequências que pegam muita gente:

- **São embutidas no bundle em tempo de build.** Mudar no painel da Vercel não tem
  efeito nenhum até um **redeploy**.
- **Vão para o JavaScript que qualquer pessoa lê.** Nunca coloque segredo numa variável
  `VITE_*`. É por isso que o `JWT_SECRET` vive só no servidor.

---

### 3.6 A hibernação da Render, e por que ela importa aqui

O plano gratuito **hiberna o serviço após ~15 minutos** sem requisições. A próxima
chamada leva de 30 a 60 segundos para acordar.

Num projeto pessoal isso é aceitável. Aqui não: o edital prevê um **vídeo de 6 minutos**
e uma banca abrindo o link. Quarenta segundos de tela branca passariam a impressão de
aplicação quebrada.

O keep-alive é um workflow do GitHub Actions que chama `/health` a cada 10 minutos —
justamente a rota **rasa**, que não toca o banco, para não consumir conexões do Postgres
só para manter o processo vivo.

> ⚠️ Limitação honesta: o agendador do GitHub Actions **não é pontual** e pode atrasar
> em horários de pico. Por isso o workflow também aceita disparo manual, e o guia
> recomenda acordar a API na mão antes de gravar.

---

### 3.7 A URL relativa no OpenAPI

Bug encontrado ao revisar para produção:

```ts
servers: [
  { url: '/', description: 'Este servidor' },        // ← precisa vir primeiro
  { url: 'http://localhost:4000', … },
];
```

O Swagger UI usa o **primeiro** servidor da lista por padrão. Com `localhost:4000` no
topo, o botão **Try it out** da documentação publicada tentaria chamar a máquina de quem
está lendo — e falharia. A URL relativa funciona em qualquer ambiente.

---

## 4. 🔬 O que já foi verificado

Rodei a API **compilada**, com `NODE_ENV=production`, exatamente como a Render fará:

```bash
npm run build:shared && npm run build --workspace @circula/api
```

```bash
NODE_ENV=production CORS_ORIGINS="https://desafio-vortex-api.vercel.app" node dist/server.js
```

| Verificação                            | Resultado                                |
| -------------------------------------- | ---------------------------------------- |
| API compilada sobe                     | ✅ `/health` → 200                       |
| Logs em JSON puro (não coloridos)      | ✅ formato que a Render indexa           |
| CORS aceita a origem de produção       | ✅ `vercel.app` → 200                    |
| CORS **rejeita** localhost em produção | ✅ → **403**                             |
| CORS rejeita a rede local em produção  | ✅ → **403**                             |
| HSTS ativo                             | ✅ `max-age=31536000; includeSubDomains` |
| `X-Content-Type-Options`               | ✅ `nosniff`                             |
| Stack trace **não** vaza               | ✅ erro genérico no envelope JSON        |
| `servers` do OpenAPI                   | ✅ URL relativa em primeiro              |

> A liberação de `localhost` e da rede local que fizemos na Sprint 4 vale **só em
> desenvolvimento** — confirmado aqui com `NODE_ENV=production`.

---

## 5. 🛠️ Alterações manuais na publicação

Toda a seção 3 defende **infraestrutura como código**. Esta seção é a contrapartida
honesta: o que **não** deu para versionar, e por quê.

O `render.yaml` e o `vercel.json` descrevem _o serviço_. Eles não descrevem, e não devem
descrever, três coisas: quem é o dono da conta, quais são os segredos, e qual endereço a
plataforma sorteou. Isso é feito na mão, uma vez, e é o que está registrado abaixo.

### 5.1 O que foi feito no painel

| #   | Onde   | Ação                                                                                                                                  |
| --- | ------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Render | Criação da conta e do serviço `circula-api` via **New → Blueprint**, apontando para o repositório                                     |
| 2   | Render | Preenchimento dos três segredos `sync: false`: `DATABASE_URL` (Neon), `JWT_SECRET` (gerado novo, diferente do local) e `CORS_ORIGINS` |
| 3   | Vercel | Criação da conta e do projeto, ligado ao mesmo repositório, com **Root Directory** na raiz do monorepo                                |
| 4   | Vercel | Cadastro da `VITE_API_URL` em _Environment Variables_ → **Production**, seguido de **redeploy**                                       |
| 5   | Neon   | Banco de produção provisionado e populado uma única vez com `db:seed`, rodando da máquina local                                       |

Os valores finais das duas variáveis que ligam as pontas:

```
# na Render
CORS_ORIGINS=https://desafio-vortex-api.vercel.app

# na Vercel
VITE_API_URL=https://circula-api.onrender.com
```

Nenhuma das duas com barra no final. A comparação de origem do CORS é literal:
`https://x.vercel.app/` **≠** `https://x.vercel.app`.

### 5.2 O domínio que já tinha dono

O `DEPLOY.md` sugeria `circula.vercel.app` como valor provisório do CORS. Esse
subdomínio **pertence a outra pessoa** — hoje serve um app Next.js sem relação com este
projeto. O endereço real que a Vercel atribuiu foi `desafio-vortex-api.vercel.app`.

A lição é geral: `*.vercel.app` e `*.onrender.com` são namespaces globais, por ordem de
chegada. O endereço só se conhece **depois** de criar o serviço — e é exatamente por isso
que ele não pode estar chumbado no arquivo versionado.

### 5.3 Os dois deploys que falharam antes deste

Publicar não foi "conectar e pronto". Duas falhas apareceram, e as duas só existiam em
produção:

| Falha                                         | Causa                                                                                        | Correção                                        |
| --------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Build da API morria em `TS2688`               | `NODE_ENV=production` fazia o `npm ci` podar as devDependencies, e `@types/node` é uma delas | `npm ci --include=dev` no `buildCommand`        |
| PWA no ar acusando "O servidor não respondeu" | `VITE_API_URL` não chegou ao build; o bundle caiu no fallback `http://localhost:4000`        | Cadastrar a variável na Vercel **e redeployar** |

A segunda é a mais instrutiva. O ajuste de rede local do `api-client` (feito na Sprint 4
para testar o PWA no celular) reescreve o hostname quando a API está configurada como
local mas a página veio de outro host. Em produção, sem a variável, ele transformou o
fallback em `http://desafio-vortex-api.vercel.app:4000` — porta que não existe **e**
conteúdo misto numa página `https`. Uma conveniência de desenvolvimento virou um sintoma
enganoso em produção.

O relato completo, com os prompts e o método de diagnóstico, está na
[sessão 07 do Diário de Bordo](../ai-logbook/2026-08-05-sessao-07.md).

### 5.4 Verificação após a publicação — 06/08/2026

| Verificação                       | Resultado                                                    |
| --------------------------------- | ------------------------------------------------------------ |
| `GET /health`                     | ✅ `200` · `{"status":"ok"}`                                 |
| `GET /health/ready`               | ✅ `200` · `{"database":"ok"}`                               |
| `GET /api/v1/announcements`       | ✅ `200` com dados reais                                     |
| Preflight da origem da Vercel     | ✅ `204` + `access-control-allow-origin` com o domínio certo |
| Origem não autorizada             | ✅ **`403`** — a allowlist é mesmo restrita                  |
| `/docs` publicado                 | ✅ `200`                                                     |
| URL congelada no bundle da Vercel | ✅ `https://circula-api.onrender.com`                        |

> Durante os testes o serviço devolveu `502` por alguns minutos. Não era falha: salvar
> uma variável de ambiente na Render **reinicia o serviço**, e nessa janela não existe
> deploy ativo para receber a requisição. O `uptimeSeconds` do `/health` confirmou depois
> que o processo tinha acabado de subir.

---

## 6. 🔬 Testes manuais — depois de publicar

Siga [`docs/DEPLOY.md`](../DEPLOY.md) e então:

### Teste 1 — A API está viva e enxerga o banco

```bash
curl https://SEU-SERVICO.onrender.com/health
```

```bash
curl https://SEU-SERVICO.onrender.com/health/ready
```

✅ **Esperado:** o primeiro sempre 200; o segundo 200 com `"database": "ok"`.

❓ Se o segundo der **503**, o serviço está no ar mas não alcança o Neon — olhe a
`DATABASE_URL` na Render.

---

### Teste 2 — A documentação publicada

Abra `https://SEU-SERVICO.onrender.com/docs` e use **Try it out** em
`GET /api/v1/announcements`.

✅ **Esperado:** funciona. Prova que os `servers` do OpenAPI usam URL relativa.

---

### Teste 3 — O CORS de produção

Abra o PWA publicado e veja a vitrine carregar.

❓ **Prove que o CORS está restrito:** no console do navegador, em qualquer outro site,
rode:

```js
fetch('https://SEU-SERVICO.onrender.com/api/v1/announcements').then((r) => r.json());
```

✅ **Esperado:** erro de CORS. Só o domínio da Vercel é autorizado.

---

### Teste 4 — HTTPS de ponta a ponta

DevTools → Network, no PWA publicado.

✅ **Esperado:** todas as requisições em `https://`. Nenhum aviso de conteúdo misto — o
navegador bloquearia uma chamada `http://` a partir de uma página `https://`.

---

### Teste 5 — O PWA instalável em produção ⭐

No celular, abra a URL da Vercel.

✅ **Esperado:** o Chrome oferece "Adicionar à tela inicial"; instalado, abre sem barra
de endereço, com a barra de status azul.

> Só agora isso pode ser testado num aparelho real: **Service Worker exige HTTPS** (ou
> `localhost`). É o teste do minuto 1:00–3:00 do vídeo.

---

### Teste 6 — O cold start

Deixe o app fechado por 20 minutos, sem o keep-alive ativo, e abra.

✅ **Esperado:** a primeira requisição demora ~40s. É a hibernação da Render.

Agora configure a variável `API_URL` no GitHub, espere um ciclo, e repita.

✅ **Esperado:** resposta imediata.

---

## 7. Perguntas que a banca pode fazer

<details>
<summary><b>"Como você faz o deploy?"</b></summary>

A configuração está versionada: `render.yaml` descreve o serviço da API e `vercel.json`
o do PWA. Publicar é conectar o repositório e preencher os segredos, que ficam marcados
como `sync: false` justamente para não entrarem no arquivo público.

</details>

<details>
<summary><b>"E as migrations de banco?"</b></summary>

Rodam no `start:prod`, com `prisma migrate deploy` antes de o servidor subir. Se
falharem, o servidor não sobe — melhor um deploy que falha visivelmente do que um que
sobe com o schema velho. E uso `migrate deploy`, não `migrate dev`: o segundo pode
recriar o banco.

</details>

<details>
<summary><b>"O que muda entre desenvolvimento e produção?"</b></summary>

O CORS deixa de aceitar localhost e a rede local; os logs saem em JSON em vez de
coloridos; o HSTS é ativado; e o stack trace para de aparecer nas respostas de erro.
Verifiquei os quatro rodando a API compilada com `NODE_ENV=production`.

</details>

<details>
<summary><b>"Por que o Service Worker não pode ser cacheado?"</b></summary>

Porque o navegador guardaria o SW antigo, que serve o app antigo do precache dele. A
aplicação ficaria congelada numa versão velha e nenhum deploy chegaria ao usuário. Por
isso `sw.js` vai com `max-age=0`, enquanto os assets com hash no nome podem ter cache
eterno.

</details>

---

## 8. Próxima sprint

**Sprint 7 — Entrega:** README final com os links de produção, Diário de Bordo
consolidado, roteiro cronometrado e gravação do vídeo de 6 minutos.
