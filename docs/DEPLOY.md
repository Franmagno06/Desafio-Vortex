# Guia de deploy — Circula

Passo a passo para publicar a API na **Render**, o PWA na **Vercel** e o banco no
**Neon**. Tudo em plano gratuito, sem cartão de crédito.

> **Ordem importa.** A API precisa existir antes do PWA (o PWA precisa da URL dela), e
> o PWA precisa existir antes de configurar o CORS definitivo da API. Por isso o passo
> 4 volta na Render.

---

## Arquitetura publicada

```
   Vercel                      Render                    Neon
┌──────────────┐   HTTPS    ┌──────────────┐         ┌──────────────┐
│  PWA         │ ─────────▶ │  API REST    │ ──────▶ │  PostgreSQL  │
│  (estático)  │            │  (Node)      │         │              │
└──────────────┘            └──────────────┘         └──────────────┘
   CDN global                 hiberna em 15min          já configurado
                              (ver keep-alive)          desde a Sprint 1
```

---

## 1. Banco — Neon

Já feito na Sprint 1. Só confirme que a `DATABASE_URL` em mãos é a **Pooled
connection** (contém `-pooler` no host).

> **Por que a pooled:** a Render pode rodar várias instâncias e cada uma abre seu
> próprio pool. A connection string direta esgotaria o limite de conexões do plano
> gratuito; a pooled coloca um intermediário que multiplexa.

---

## 2. API — Render

### 2.1 Criar o serviço

1. Acesse [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**
2. Conecte a conta do GitHub e escolha o repositório `Desafio-Vortex`
3. A Render lê o [`render.yaml`](../render.yaml) da raiz e já propõe o serviço
   `circula-api` configurado

### 2.2 Preencher os segredos

A Render vai pedir os três valores marcados como `sync: false` (eles não ficam no
arquivo justamente por serem segredos):

| Variável       | Valor                                                                 |
| -------------- | --------------------------------------------------------------------- |
| `DATABASE_URL` | A connection string do Neon, entre aspas                              |
| `JWT_SECRET`   | Gere um valor novo — **não reaproveite o local**                      |
| `CORS_ORIGINS` | Deixe `https://circula.vercel.app` por enquanto; ajustamos no passo 4 |

Gere o segredo de produção com:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

> ⚠️ **Use um `JWT_SECRET` diferente do de desenvolvimento.** Quem tiver esse valor
> consegue forjar um token válido para qualquer usuário. O do `.env` local já circulou
> na sua máquina e em backups.

### 2.3 O que a Render vai executar

```
build : npm ci && npm run build --workspace=@circula/shared && npm run build:prod --workspace=@circula/api
start : npm run start:prod --workspace=@circula/api
```

O `start:prod` roda `prisma migrate deploy` **antes** de subir o servidor. Se o deploy
trouxer uma coluna nova, ela existe no banco antes da primeira requisição — nunca uma
janela em que o código é novo e o schema é velho.

### 2.4 Popular o banco (uma vez)

O seed não roda no deploy de propósito: rodar a cada deploy apagaria os anúncios reais.
Rode uma vez, **da sua máquina**, apontando para o banco de produção:

```bash
npm run db:seed --workspace @circula/api
```

(Com a `DATABASE_URL` de produção no `.env`, ou passando-a na frente do comando.)

### 2.5 Conferir

```bash
curl https://SEU-SERVICO.onrender.com/health
```

E abra `https://SEU-SERVICO.onrender.com/docs` — a documentação interativa deve
carregar, com o **Try it out** funcionando (os `servers` do OpenAPI usam URL relativa
justamente para isso).

---

## 3. PWA — Vercel

1. [vercel.com](https://vercel.com) → **Add New** → **Project** → importe o repositório

2. ⚠️ **Confira o "Root Directory": tem que ser a raiz do repositório**, não `apps/web`
   nem `apps/api`.

   Na tela de importação, o campo **Root Directory** deve estar vazio ou como `./`. Se a
   Vercel tiver escolhido uma subpasta sozinha (ela faz isso ao detectar vários
   `package.json` num monorepo), clique em **Edit** e volte para a raiz.

   > **Por que isso quebra o build:** os comandos usam workspaces do npm, que só existem
   > a partir da raiz. Rodando de dentro de `apps/api`, o npm procura os scripts no
   > `package.json` daquela pasta e falha com
   > `Missing script: "build:shared" — workspace @circula/api`. Foi exatamente o erro
   > que apareceu na primeira tentativa de deploy deste projeto.

   Se o projeto já foi criado com a pasta errada:
   **Settings → Build and Deployment → Root Directory** → deixe vazio → **Save** →
   **Deployments** → nos três pontinhos do último → **Redeploy**.

3. A Vercel lê o [`vercel.json`](../vercel.json); **não** altere build nem output

4. Em **Environment Variables**, adicione:

| Variável       | Valor                                                       |
| -------------- | ----------------------------------------------------------- |
| `VITE_API_URL` | `https://SEU-SERVICO.onrender.com` — **sem barra no final** |

> ⚠️ `VITE_*` é embutida no bundle **em tempo de build**. Mudar essa variável exige um
> **redeploy**; não basta salvar no painel. E nunca coloque segredo numa variável
> `VITE_*`: ela vai para o JavaScript que qualquer pessoa lê.

5. **Deploy**

### Por que o `vercel.json` é assim

Duas decisões que não são óbvias:

**`sw.js` com `max-age=0, must-revalidate`.** Se o Service Worker fosse cacheado como
os outros arquivos, o navegador continuaria usando o SW antigo — que serve o app antigo
do precache. O resultado é uma aplicação **congelada numa versão velha**, e nenhum
deploy chega ao usuário. Os arquivos em `/assets/` podem ter cache eterno porque têm
hash no nome: quando mudam, mudam de URL.

**Rewrite de tudo para `/index.html`.** É uma SPA: rotas como `/explorar` não existem
como arquivo. A Vercel checa o sistema de arquivos **antes** de aplicar rewrites, então
os assets reais continuam sendo servidos normalmente.

---

## 4. Fechar o CORS (voltar na Render)

Com a URL real da Vercel em mãos, atualize a variável na Render:

```
CORS_ORIGINS=https://SEU-PROJETO.vercel.app
```

Salve — a Render reinicia o serviço sozinho.

> **Sem barra no final.** A comparação de origem é literal:
> `https://x.vercel.app/` ≠ `https://x.vercel.app`.

Para autorizar também os previews da Vercel, separe por vírgula:

```
CORS_ORIGINS=https://circula.vercel.app,https://circula-git-main-seu-usuario.vercel.app
```

---

## 5. Keep-alive (evita o cold start na gravação)

O plano gratuito da Render **hiberna o serviço após ~15 minutos** sem requisições. A
próxima chamada leva de 30 a 60 segundos para acordar — tempo em que a aplicação parece
quebrada.

O workflow [`keep-alive.yml`](../.github/workflows/keep-alive.yml) faz um ping a cada
10 minutos. Para ativá-lo:

**GitHub → Settings → Secrets and variables → Actions → aba _Variables_ → New**

| Nome      | Valor                              |
| --------- | ---------------------------------- |
| `API_URL` | `https://SEU-SERVICO.onrender.com` |

> 🎥 **Antes de gravar o vídeo:** o agendador do GitHub Actions não é pontual e pode
> atrasar. Abra a URL da API manualmente uns 2 minutos antes, ou dispare o workflow na
> mão pela aba **Actions** → _Keep-alive da API_ → **Run workflow**.

---

## 6. Checklist final

- [ ] `GET /health` responde 200
- [ ] `GET /health/ready` responde 200 com `"database": "ok"`
- [ ] `/docs` abre e o **Try it out** funciona
- [ ] A landing carrega com os contadores reais
- [ ] O filtro por categoria funciona (prova que o CORS está certo)
- [ ] Login com `ana.lima@edu.unifor.br` / `circula2026`
- [ ] Criar um anúncio funciona
- [ ] O Chrome oferece **instalar** o app
- [ ] Instalado, abre **sem barra de endereço**
- [ ] Em modo avião, a vitrine já visitada continua abrindo
- [ ] `API_URL` configurada nas Variables do GitHub
- [ ] **Repositório público** (exigência do edital)
- [ ] Links de produção no `README.md`

---

## Solução de problemas

| Sintoma                                  | Causa provável                              | Onde olhar                                |
| ---------------------------------------- | ------------------------------------------- | ----------------------------------------- |
| Vitrine vazia, console com erro de CORS  | `CORS_ORIGINS` errado ou com barra no final | Variável na Render                        |
| Tudo falha com "servidor não respondeu"  | `VITE_API_URL` errada, ou faltou redeploy   | Vercel → Settings → Environment Variables |
| Primeira visita demora ~40s              | Cold start da Render                        | Esperado no plano free; ver keep-alive    |
| `/health` 200 mas `/health/ready` 503    | Banco inacessível                           | `DATABASE_URL` na Render                  |
| Deploy falha no build                    | Cliente do Prisma não gerado                | Confirme que o build usa `build:prod`     |
| App preso numa versão antiga             | `sw.js` sendo cacheado                      | Headers do `vercel.json`                  |
| Login funciona local e falha em produção | `JWT_SECRET` ausente na Render              | Variáveis da Render                       |
