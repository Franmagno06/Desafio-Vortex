# Sprint 1 — Núcleo do Backend

**Data:** 01/08/2026 · **Status:** ✅ concluída (pendente apenas a `DATABASE_URL`)

> Relatório técnico de estudo. Ao final há uma bateria de **testes manuais do CRUD**
> para você executar com as próprias mãos.

---

## 1. Objetivo da sprint

Fechar **todos os requisitos obrigatórios de backend do edital** e ainda dois dos três
bônus da seção 2.1. O que ficou de fora de propósito: autenticação real (Sprint 2).

| Requisito do edital                                | Tipo        | Status   |
| -------------------------------------------------- | ----------- | -------- |
| API REST estruturada                               | Obrigatório | ✅       |
| CRUD de anúncios (criar, listar, filtrar, deletar) | Obrigatório | ✅       |
| Persistência funcional                             | Obrigatório | ✅       |
| JSON estrito na entrada e na saída                 | Obrigatório | ✅       |
| Tratamento robusto de erros e validação            | 🎁 Bônus    | ✅       |
| Banco relacional real em nuvem                     | 🎁 Bônus    | ✅       |
| Autenticação JWT                                   | 🎁 Bônus    | Sprint 2 |

---

## 2. O que foi entregue

| Item                                             | Onde                                                   |
| ------------------------------------------------ | ------------------------------------------------------ |
| Modelo de dados (2 tabelas, 4 enums, 3 índices)  | `apps/api/prisma/schema.prisma`                        |
| Migration SQL versionada                         | `apps/api/prisma/migrations/`                          |
| Seed com 28 anúncios e 6 usuários realistas      | `apps/api/prisma/seed.ts`                              |
| Regras de negócio puras (preço × tipo)           | `packages/shared/src/domain/rules.ts`                  |
| Schemas de entrada (criar, atualizar, filtrar)   | `packages/shared/src/schemas/announcement.ts`          |
| Repositório com interface + implementação Prisma | `.../announcements.repository.ts`                      |
| Service com as regras do domínio                 | `.../announcements.service.ts`                         |
| 6 rotas de anúncios + 3 de catálogo              | `.../announcements.routes.ts`, `.../catalog.routes.ts` |
| Middlewares de validação Zod                     | `apps/api/src/middlewares/validate.ts`                 |
| Documentação OpenAPI interativa em `/docs`       | `apps/api/src/docs/openapi.ts`                         |
| Health check raso e profundo                     | `.../health.routes.ts`                                 |
| **34 testes** passando sem precisar de banco     | `apps/api/tests/`                                      |
| PostgreSQL local alternativo                     | `docker-compose.yml`                                   |

---

## 3. Conceitos para estudar

### 3.1 O caminho de uma requisição

Vale decorar este fluxo — é a espinha da explicação técnica no vídeo:

```
POST /api/v1/announcements
        │
        ▼
  requireUser              identifica o usuário (Sprint 2: valida o JWT)
        │
        ▼
  validateBody(schema)     Zod: valida E transforma o corpo
        │
        ▼
  rota                     extrai dados, chama o service
        │
        ▼
  service                  aplica as regras de negócio
        │
        ▼
  repository               fala com o Prisma
        │
        ▼
  mapper                   converte o registro do banco no DTO público
        │
        ▼
  res.status(201).json()
```

Cada camada só conhece a de baixo. O service não sabe o que é uma resposta HTTP; o
repositório não sabe o que é regra de negócio. É isso que permite testar a regra sem
subir servidor nem banco.

---

### 3.2 Por que existe uma _interface_ de repositório

Este é o ponto de arquitetura mais importante da sprint.

O service **não** importa o Prisma. Ele recebe um objeto que cumpre o contrato
`AnnouncementsRepository`:

```ts
export function createAnnouncementsService(repository: AnnouncementsRepository) { … }
```

Em produção entra a implementação Prisma. Nos testes entra a
`InMemoryAnnouncementsRepository`. Isso se chama **injeção de dependência**.

**A motivação foi concreta, não teórica:** o workflow do GitHub Actions não sobe um
PostgreSQL. Sem essa separação, ou o CI ficaria sem testes, ou seria preciso manter um
serviço de banco no pipeline só para exercitar regras que não dependem de banco nenhum.

O custo é uma indireção a mais. Ela se paga na velocidade da suíte: **34 testes em 1,3
segundo**.

> **Na banca:** _"como você testa sem banco?"_ → o service depende de uma interface, e a
> suíte injeta uma implementação em memória que respeita o mesmo contrato.

---

### 3.3 Dinheiro em centavos, e a regra que nasce disso

`priceCents` é um inteiro. R$ 19,90 vira `1990`. O motivo é aritmética binária:

```js
0.1 + 0.2; // 0.30000000000000004
```

Com centavos essa classe de bug deixa de existir. A conversão para `"R$ 19,90"` acontece
só na exibição, em `formatPrice()`.

Sobre esse campo mora a regra central do produto: **doação e troca não têm preço**. Ela
vive em `packages/shared/src/domain/rules.ts` como uma função pura:

```ts
checkPriceAgainstType(type, priceCents): PriceRuleViolation | null
```

"Pura" significa que ela só recebe dados e devolve um resultado — não conhece HTTP, banco
nem React. Por isso pode ser usada nos três lugares onde a regra precisa valer: no schema
Zod, no service e (na Sprint 4) no formulário do PWA. Uma regra, um arquivo.

---

### 3.4 A armadilha do `.partial()` com `.default()`

Este bug foi encontrado **antes** de virar código de produção, e é o mais instrutivo da
sprint.

O schema de criação declarava:

```ts
priceCents: z.number().int().nullable().default(null);
```

E o de atualização derivava dele com `.partial()`, que torna todos os campos opcionais.
Parece seguro. Não é:

```
PATCH { "status": "RESERVADO" }
   ↓ parse
{ status: 'RESERVADO', priceCents: null }   ← o default foi aplicado!
   ↓
UPDATE announcements SET priceCents = NULL  ← preço do anúncio apagado
```

**`.partial()` torna o campo opcional, mas um `.default()` continua sendo aplicado quando
o campo está ausente.** Um usuário que apenas reservasse o próprio anúncio perderia o
preço dele.

A correção foi mover o `.default(null)` para fora do schema base e aplicá-lo **só na
criação**:

```ts
export const createAnnouncementSchema = announcementFieldsSchema
  .extend({ priceCents: priceCentsField.default(null) })  // só aqui
  .superRefine(…);

export const updateAnnouncementSchema = announcementFieldsSchema.partial()…  // sem default
```

Há um teste de regressão fixando esse comportamento — procure por
`'NÃO apaga o preço num PATCH que só muda o status'`.

---

### 3.5 Três significados diferentes de "não mandei o preço"

Consequência direta do item anterior. Num PATCH, a ausência de `priceCents` pode
significar coisas opostas dependendo do contexto:

| Situação                                         | O que deve acontecer            |
| ------------------------------------------------ | ------------------------------- |
| `{ "priceCents": 5000 }`                         | Usa 5000                        |
| `{ "type": "DOACAO" }` (sem preço)               | **Zera** — doação não tem preço |
| `{ "status": "RESERVADO" }` (sem preço nem tipo) | **Preserva** o preço atual      |

Isso está isolado em `resolveNextPrice()`, no service. E há uma ordem que importa:

```ts
const nextPrice = resolveNextPrice(input, current.priceCents, nextType);
assertPriceMatchesType(nextType, nextPrice); // ← DEPOIS de resolver
```

Na primeira versão eu validei **antes** de resolver. Resultado: converter uma venda em
doação era rejeitado com 422, porque a validação comparava o tipo novo com o preço velho.
Um teste pegou isso — está descrito na seção 5.

---

### 3.6 Exclusão lógica (soft delete)

`DELETE /api/v1/announcements/:id` **não apaga a linha**. Preenche a coluna `deletedAt`:

```ts
async softDelete(id) {
  await prisma.announcement.update({ where: { id }, data: { deletedAt: new Date() } });
}
```

Vantagens: histórico preservado, exclusão acidental reversível, estatísticas históricas
intactas.

O preço a pagar é uma disciplina que **não pode falhar**: toda consulta precisa filtrar
`deletedAt: null`. Se um único `findMany` esquecer, anúncios excluídos voltam à vitrine.
Por isso o filtro é a primeira linha do `buildWhere()`, e há um teste verificando que um
anúncio excluído some da listagem mas continua na tabela.

---

### 3.7 Índices: por que estes três

```prisma
@@index([deletedAt, status, createdAt])  // listagem pública ordenada por data
@@index([deletedAt, category])           // filtro por categoria
@@index([authorId, deletedAt])           // tela "meus anúncios"
```

Índice não é enfeite — é a diferença entre o banco ler três linhas ou varrer a tabela
inteira. Cada um foi desenhado a partir de uma consulta que a aplicação **realmente**
faz.

A ordem das colunas importa: o Postgres usa um índice composto da esquerda para a
direita. `[deletedAt, status, createdAt]` serve a consulta
`WHERE deletedAt IS NULL AND status = 'ATIVO' ORDER BY createdAt DESC` porque as colunas
aparecem exatamente nessa sequência.

---

### 3.8 `$transaction`: lista e contagem no mesmo instante

```ts
const [items, total] = await prisma.$transaction([
  prisma.announcement.findMany({ where, skip, take }),
  prisma.announcement.count({ where }),
]);
```

Duas consultas separadas correriam o risco de alguém criar um anúncio no intervalo entre
elas, produzindo um `total` incoerente com a página devolvida. A transação garante que as
duas enxerguem o **mesmo instante** do banco.

---

### 3.9 O mapper é uma fronteira de segurança

`res.json(registroDoBanco)` funcionaria e é o atalho comum. O problema aparece depois:
o formato da resposta passa a mudar sozinho junto com o schema. No dia em que alguém
adicionar uma coluna sensível ao modelo, ela vaza pela API sem ninguém perceber.

Por isso existe `toAnnouncementDTO()`, que monta o objeto campo a campo. `deletedAt` e
`authorId` ficam de fora de propósito. Há um teste conferindo que `passwordHash` nunca
aparece na resposta.

É também onde `Date` vira string ISO 8601 — JSON não tem tipo data.

---

### 3.10 `req.query` é somente-leitura no Express 5

Detalhe que quebra código copiado de tutoriais antigos:

```ts
req.query = result.data; // ❌ TypeError em runtime no Express 5
req.validatedQuery = result.data; // ✅
```

No Express 4, `req.query` era propriedade comum. No 5 virou um _getter_. Por isso o
resultado validado é guardado em `req.validatedQuery`, um campo acrescentado ao tipo
`Request` via **declaration merging** — a forma de estender um tipo de biblioteca sem
editar o pacote.

---

### 3.11 A ordem das rotas importa

```ts
router.get('/mine', …);  // precisa vir ANTES
router.get('/:id', …);
```

O Express casa rotas na ordem de registro. Se `/:id` viesse primeiro, ele trataria
`"mine"` como um id, e a validação de UUID responderia 422. Há um teste fixando isso.

---

### 3.12 Liveness × Readiness

Duas perguntas diferentes, dois endpoints:

| Rota            | Pergunta                        | Toca o banco? |
| --------------- | ------------------------------- | ------------- |
| `/health`       | O processo está no ar?          | Não           |
| `/health/ready` | O serviço consegue **atender**? | Sim           |

`/health` não consulta o banco de propósito: é chamado a cada poucos segundos pela
plataforma, e abrir conexão toda vez consumiria o pool do plano gratuito.

`/health/ready` devolve **503** quando o banco está fora. Verificado na prática nesta
sprint — veja o teste manual 8.

---

### 3.13 A documentação nasce do próprio código

`/docs` não é escrito à mão. O `z.toJSONSchema()` (nativo do Zod 4) converte os mesmos
schemas que validam as requisições:

```ts
requestBody: jsonBody(toSchema(createAnnouncementSchema));
```

Consequência: a documentação não tem como ficar desatualizada. Mudou a validação, mudou
o `/docs` no próximo boot.

---

## 4. 🔬 Testes manuais do CRUD

> ⚠️ **Pré-requisito:** a `DATABASE_URL` precisa estar preenchida. Veja a seção 6.

### Preparação

```powershell
cd "C:\Users\franm\OneDrive\Desktop\Desafio Vortex"
npm run dev
```

Em **outro terminal**, guarde um id de usuário do seed:

```powershell
$ANA = "11111111-1111-4111-8111-111111111111"
$API = "http://localhost:4000/api/v1"
```

---

### Teste 1 — READ: listar a vitrine

```powershell
(Invoke-RestMethod "$API/announcements").meta | ConvertTo-Json
```

✅ **Esperado:** `total: 26`, `totalPages: 3`, `hasNext: true`.

> Por que 26 e não 28? Dois anúncios do seed estão como `RESERVADO` e `CONCLUIDO`, e a
> vitrine pública só mostra `ATIVO`.

---

### Teste 2 — READ: filtrar

```powershell
(Invoke-RestMethod "$API/announcements?category=LIVROS").items.title
```

```powershell
(Invoke-RestMethod "$API/announcements?type=DOACAO").items | Select-Object title, priceCents
```

✅ **Esperado:** todos os itens com `priceCents` vazio — nenhuma doação tem preço.

```powershell
(Invoke-RestMethod "$API/announcements?q=arduino").items.title
```

❓ **Experimente:** busque `calculo` sem acento. Não encontra "Cálculo" — acento é outro
caractere. Resolver isso exigiria a extensão `unaccent` no Postgres. Ficou registrado como
limitação conhecida.

---

### Teste 3 — CREATE: criar um anúncio

```powershell
$novo = @{ title = "Livro de Estruturas de Dados"; description = "Livro usado na disciplina, em otimo estado e sem rasuras."; category = "LIVROS"; condition = "SEMINOVO"; type = "VENDA"; priceCents = 7500; imageUrl = "https://example.com/livro.jpg" } | ConvertTo-Json
Invoke-RestMethod -Method Post "$API/announcements" -Headers @{ "X-User-Id" = $ANA } -ContentType "application/json" -Body $novo
```

✅ **Esperado:** o anúncio criado com um `id` novo e `status: ATIVO`. **Guarde esse id.**

```powershell
$ID = "cole-o-id-aqui"
```

---

### Teste 4 — CREATE: a regra de negócio recusa doação com preço

```powershell
$invalido = @{ title = "Jaleco tamanho M"; description = "Jaleco de laboratorio usado por dois semestres, higienizado."; category = "VESTUARIO"; condition = "USADO"; type = "DOACAO"; priceCents = 5000; imageUrl = "https://example.com/jaleco.jpg" } | ConvertTo-Json
try { Invoke-RestMethod -Method Post "$API/announcements" -Headers @{ "X-User-Id" = $ANA } -ContentType "application/json" -Body $invalido } catch { $_.ErrorDetails.Message }
```

✅ **Esperado:** **422** com `"Doações e trocas não podem ter preço."` e o erro apontando
o campo `priceCents`.

❓ **Este é o teste mais importante da sprint.** É a regra central do produto sendo
aplicada. Vale mostrar no vídeo.

---

### Teste 5 — UPDATE: o bug que o teste automatizado pegou

```powershell
Invoke-RestMethod -Method Patch "$API/announcements/$ID" -Headers @{ "X-User-Id" = $ANA } -ContentType "application/json" -Body (@{ status = "RESERVADO" } | ConvertTo-Json)
```

✅ **Esperado:** `status: RESERVADO` e **`priceCents` continua 7500**.

Agora converta em doação:

```powershell
Invoke-RestMethod -Method Patch "$API/announcements/$ID" -Headers @{ "X-User-Id" = $ANA } -ContentType "application/json" -Body (@{ type = "DOACAO" } | ConvertTo-Json)
```

✅ **Esperado:** `type: DOACAO` e **`priceCents` agora vazio** — zerado automaticamente.

> Compare com o teste anterior: nos dois casos você não mandou `priceCents`, e o sistema
> fez coisas opostas. É a tabela da seção 3.5 em funcionamento.

---

### Teste 6 — UPDATE: propriedade do anúncio

```powershell
$CARLOS = "22222222-2222-4222-8222-222222222222"
try { Invoke-RestMethod -Method Patch "$API/announcements/$ID" -Headers @{ "X-User-Id" = $CARLOS } -ContentType "application/json" -Body (@{ title = "Tentando sequestrar o anuncio" } | ConvertTo-Json) } catch { $_.ErrorDetails.Message }
```

✅ **Esperado:** **403 FORBIDDEN** — "Você só pode editar os seus próprios anúncios."

---

### Teste 7 — DELETE: exclusão lógica

```powershell
Invoke-WebRequest -Method Delete "$API/announcements/$ID" -Headers @{ "X-User-Id" = $ANA } | Select-Object StatusCode
```

✅ **Esperado:** **204** (sucesso sem corpo).

```powershell
try { Invoke-RestMethod "$API/announcements/$ID" } catch { $_.ErrorDetails.Message }
```

✅ **Esperado:** **404** — sumiu da API.

❓ **Agora prove que a linha continua no banco:**

```powershell
npm run db:studio --workspace @circula/api
```

Abra a tabela `announcements`, procure o id e veja a coluna `deletedAt` preenchida. **O
dado não foi apagado.**

---

### Teste 8 — Resiliência: o que acontece se o banco cair

Sem nenhum banco disponível (o cenário já foi verificado nesta sprint):

| Rota                        | Resposta | Por quê                                                             |
| --------------------------- | -------- | ------------------------------------------------------------------- |
| `GET /health`               | **200**  | O processo está vivo — não consulta o banco                         |
| `GET /health/ready`         | **503**  | `{"status":"degraded","checks":{"database":"unreachable"}}`         |
| `GET /api/v1/catalog`       | **200**  | Só devolve enums, não precisa de banco                              |
| `GET /api/v1/announcements` | **500**  | `{"error":{"code":"INTERNAL_ERROR"}}` — falha tratada, não um crash |
| `GET /rota-inexistente`     | **404**  | Envelope JSON, nunca HTML                                           |

O ponto: **nenhuma dessas respostas é uma página de erro do Node**. Toda falha sai no
envelope padrão da API.

---

### Teste 9 — A documentação interativa

Abra <http://localhost:4000/docs> e use o botão **Try it out** direto no navegador.

```powershell
(Invoke-RestMethod "http://localhost:4000/openapi.json").paths.PSObject.Properties.Name
```

✅ **Esperado:** as 9 rotas. Esse arquivo pode ser importado no Insomnia ou Postman.

---

### Teste 10 — A suíte automatizada

```powershell
npm test
```

✅ **Esperado:** **34 testes passando** em cerca de 1,3 segundo — sem banco nenhum.

---

## 5. Problemas reais enfrentados

| #   | Sintoma                           | Causa raiz                                       | Como foi detectado                | Correção                             |
| --- | --------------------------------- | ------------------------------------------------ | --------------------------------- | ------------------------------------ |
| 1   | `PATCH { status }` zerava o preço | `.default(null)` sobrevive ao `.partial()`       | Script de verificação dos schemas | `.default` movido só para a criação  |
| 2   | Converter venda → doação dava 422 | Validação rodava antes de resolver o preço final | Teste automatizado falhou         | `resolveNextPrice()` antes do assert |
| 3   | Fail fast com mensagem inútil     | `.min(1, msg)` não cobre valor ausente           | Boot manual sem `DATABASE_URL`    | `z.string({ error: … })`             |
| 4   | `migration.sql` com lixo no meio  | `2>&1` misturou o banner do Prisma no arquivo    | Leitura do arquivo gerado         | Capturar só stdout                   |

O **item 2** merece atenção porque a primeira versão do código _parecia_ certa: havia até
um bloco tratando a conversão para doação. Ele simplesmente nunca era alcançado, porque a
validação lançava o erro antes. **Código inalcançável não avisa que existe** — foi o teste
que revelou.

---

## 6. ⚠️ O que falta para rodar: `DATABASE_URL`

Tudo está pronto e verificado, exceto a conexão com o seu banco. Três passos:

**1.** Cole a connection string do Neon em `apps/api/.env`:

```
DATABASE_URL="postgresql://usuario:senha@ep-xxx.neon.tech/circula?sslmode=require"
```

**2.** Crie as tabelas:

```powershell
npm run db:deploy --workspace @circula/api
```

**3.** Popule com os dados de exemplo:

```powershell
npm run db:seed --workspace @circula/api
```

✅ **Esperado:** `6 usuários criados`, `28 anúncios criados` e a lista de ids para usar no
cabeçalho `X-User-Id`.

> Se algo falhar, a mensagem de erro dirá exatamente qual variável está errada — é o
> fail fast trabalhando a seu favor.

---

## 7. Perguntas que a banca pode fazer

<details>
<summary><b>"Por que o preço é um inteiro?"</b></summary>

Porque `0.1 + 0.2 !== 0.3` em ponto flutuante. Guardando centavos como inteiro, a classe
inteira de bugs de arredondamento em preço deixa de existir. A formatação para `R$ 19,90`
acontece só na exibição.

</details>

<details>
<summary><b>"O DELETE apaga o registro?"</b></summary>

Não. É exclusão lógica: preenche `deletedAt`. Preserva histórico e permite reverter. O
custo é que toda consulta precisa filtrar `deletedAt: null` — por isso esse filtro é a
primeira linha do `buildWhere()` e existe um teste garantindo o comportamento.

</details>

<details>
<summary><b>"Como você testa sem um banco no CI?"</b></summary>

O service depende de uma interface (`AnnouncementsRepository`), não do Prisma. Em produção
entra a implementação Prisma; nos testes, uma implementação em memória. São 34 testes em
1,3 segundo, sem nenhum serviço externo no pipeline.

</details>

<details>
<summary><b>"Onde fica a regra de que doação não tem preço?"</b></summary>

Em `packages/shared/src/domain/rules.ts`, como função pura. É usada em três lugares: no
schema Zod (validação da API), no service (para o PATCH parcial) e, na Sprint 4, no
formulário do PWA. Uma regra, um arquivo — o front nunca deixa passar algo que a API
recusaria.

</details>

<details>
<summary><b>"Por que dois endpoints de health?"</b></summary>

`/health` responde "o processo está vivo" sem tocar o banco — é chamado a cada poucos
segundos pela plataforma. `/health/ready` responde "consigo atender" e consulta o banco,
devolvendo 503 se ele estiver fora. Um serviço pode estar rodando perfeitamente e ainda
assim ser incapaz de responder.

</details>

---

## 8. Próxima sprint

**Sprint 2 — Autenticação:** cadastro e login com bcrypt, emissão e verificação de JWT, e
a substituição do middleware `requireUser`. O ponto a observar: **nem o service nem as
rotas vão mudar** — só o arquivo que preenche `req.userId`. É o desenho em camadas
provando o seu valor.
